import type Stripe from "stripe";
import { pool } from "@workspace/db";
import { getStripeObjectId } from "./stripeCheckoutAttempts";
import { decideStripeAccessTransition } from "./stripeSubscriptionTransitions";

type InvoiceReference = Stripe.Invoice & {
  subscription?: string | { id: string } | null;
  payment_intent?: string | Stripe.PaymentIntent | null;
  payments?: {
    data?: Array<{ payment?: { payment_intent?: string | Stripe.PaymentIntent | null } }>;
  };
  parent?: {
    subscription_details?: { subscription?: string | { id: string } | null } | null;
  } | null;
};

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const value = invoice as InvoiceReference;
  return getStripeObjectId(value.subscription)
    ?? getStripeObjectId(value.parent?.subscription_details?.subscription);
}

export function getInvoicePaymentIntentId(invoice: Stripe.Invoice): string | null {
  const value = invoice as InvoiceReference;
  return getStripeObjectId(value.payment_intent)
    ?? getStripeObjectId(value.payments?.data?.[0]?.payment?.payment_intent);
}

export async function hasUnresolvedSepaDispute(
  stripe: Stripe,
  invoice: Stripe.Invoice,
): Promise<boolean> {
  const paymentIntentId = getInvoicePaymentIntentId(invoice);
  if (!paymentIntentId) return false;
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const chargeId = getStripeObjectId(paymentIntent.latest_charge);
  if (!chargeId) return false;
  const charge = await stripe.charges.retrieve(chargeId);
  if (charge.payment_method_details?.type !== "sepa_debit") return false;
  const disputes = await stripe.disputes.list({ charge: chargeId, limit: 10 });
  return disputes.data.some((dispute) => dispute.status !== "won");
}

/**
 * Restore local access only after Stripe confirms the current subscription's
 * invoice is paid, its payment succeeded, and no debt or SEPA dispute remains.
 */
export async function activateRecoveredSubscriptionIfSettled(input: {
  stripe: Stripe;
  organizationId: number;
  customerId: string;
  subscriptionId: string;
  invoiceId?: string;
}): Promise<boolean> {
  const subscription = await input.stripe.subscriptions.retrieve(input.subscriptionId);
  if (
    getStripeObjectId(subscription.customer) !== input.customerId
    || !["active", "trialing"].includes(subscription.status)
  ) return false;

  const invoiceId = input.invoiceId ?? getStripeObjectId(subscription.latest_invoice);
  if (!invoiceId) return false;
  const invoice = await input.stripe.invoices.retrieve(invoiceId, { expand: ["payment_intent"] });
  if (
    invoice.status !== "paid"
    || getStripeObjectId(invoice.customer) !== input.customerId
    || getInvoiceSubscriptionId(invoice) !== input.subscriptionId
  ) return false;

  const paymentIntentId = getInvoicePaymentIntentId(invoice);
  if (!paymentIntentId) return false;
  const paymentIntent = await input.stripe.paymentIntents.retrieve(paymentIntentId);
  const openInvoices = await input.stripe.invoices.list({
    customer: input.customerId,
    status: "open",
    limit: 100,
  });
  const hasOutstandingInvoice = openInvoices.data.some((openInvoice) =>
    getInvoiceSubscriptionId(openInvoice) === input.subscriptionId
    && openInvoice.amount_remaining > 0
  );
  const hasDispute = await hasUnresolvedSepaDispute(input.stripe, invoice);

  const local = await pool.query<{ mode: string; status: string; stripe_subscription_id: string }>(
    `SELECT mode, status, stripe_subscription_id
     FROM subscriptions
     WHERE organization_id = $1
     LIMIT 1`,
    [input.organizationId],
  );
  const current = local.rows[0];
  if (
    current?.mode !== "stripe"
    || current.stripe_subscription_id !== input.subscriptionId
  ) return false;
  if (current.status === "active") return true;

  const transition = decideStripeAccessTransition({
    type: "invoice.payment_succeeded",
    subscriptionId: input.subscriptionId,
    currentSubscriptionId: current.stripe_subscription_id,
    localStatus: current.status,
    invoicePaid: true,
    paymentIntentStatus: paymentIntent.status,
    stripeSubscriptionStatus: subscription.status,
    hasOutstandingInvoice,
    hasUnresolvedSepaDispute: hasDispute,
  });
  if (transition !== "activate") return false;

  const updated = await pool.query(
    `UPDATE subscriptions
     SET status = 'active', updated_at = NOW()
     WHERE organization_id = $1
       AND stripe_subscription_id = $2
       AND status IN ('trial', 'suspended')
     RETURNING organization_id`,
    [input.organizationId, input.subscriptionId],
  );
  return Boolean(updated.rows[0]);
}
