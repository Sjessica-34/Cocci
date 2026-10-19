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

function getInvoicePaymentIntentIds(invoice: Stripe.Invoice): string[] {
  const value = invoice as InvoiceReference;
  return [...new Set([
    getStripeObjectId(value.payment_intent),
    ...(value.payments?.data ?? []).map((payment) =>
      getStripeObjectId(payment.payment?.payment_intent),
    ),
  ].filter((id): id is string => id !== null))];
}

async function retrieveInvoicePaymentIntents(
  stripe: Stripe,
  invoice: Stripe.Invoice,
): Promise<Stripe.PaymentIntent[]> {
  const paymentIntentIds = getInvoicePaymentIntentIds(invoice);
  return Promise.all(paymentIntentIds.map((id) => stripe.paymentIntents.retrieve(id)));
}

export async function getSuccessfulInvoicePaymentIntent(
  stripe: Stripe,
  invoice: Stripe.Invoice,
): Promise<Stripe.PaymentIntent | null> {
  const paymentIntents = await retrieveInvoicePaymentIntents(stripe, invoice);
  return paymentIntents.find((paymentIntent) => paymentIntent.status === "succeeded") ?? null;
}

export type StripeAccessDiagnosis = {
  hasUnpaidInvoice: boolean;
  hasPendingPayment: boolean;
  hasUnresolvedDispute: boolean;
};

const PENDING_PAYMENT_INTENT_STATUSES = new Set([
  "processing",
  "requires_action",
  "requires_confirmation",
  "requires_capture",
]);
const RESOLVED_DISPUTE_STATUSES = new Set([
  "won",
  "lost",
  "warning_closed",
  "prevented",
]);

/**
 * Read-only, privacy-safe summary of outstanding Stripe blockers for the
 * subscription currently linked to an organization. Never return Stripe
 * objects, identifiers, payment details, amounts, or dispute metadata.
 */
export async function diagnoseStripeAccessRecovery(
  stripe: Stripe,
  customerId: string,
  subscriptionId: string,
): Promise<StripeAccessDiagnosis> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (getStripeObjectId(subscription.customer) !== customerId) {
    throw new Error("Stripe subscription does not match the linked customer");
  }

  const relevantInvoices: Stripe.Invoice[] = [];
  let invoicePage = await stripe.invoices.list({
    customer: customerId,
    subscription: subscriptionId,
    limit: 100,
  });
  while (true) {
    for (const invoice of invoicePage.data) {
      if (
        getStripeObjectId(invoice.customer) === customerId
        && getInvoiceSubscriptionId(invoice) === subscriptionId
      ) {
        relevantInvoices.push(invoice);
      }
    }
    if (!invoicePage.has_more) break;

    const lastInvoice = invoicePage.data.at(-1);
    if (!lastInvoice) {
      throw new Error("Stripe returned an incomplete invoice page");
    }
    invoicePage = await stripe.invoices.list({
      customer: customerId,
      subscription: subscriptionId,
      limit: 100,
      starting_after: lastInvoice.id,
    });
  }

  const paymentIntentIds = new Set(relevantInvoices.flatMap(getInvoicePaymentIntentIds));
  const paymentChecks = await Promise.all([...paymentIntentIds].map(async (paymentIntentId) => {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const chargeId = getStripeObjectId(paymentIntent.latest_charge);
    if (!chargeId) {
      return {
        pending: PENDING_PAYMENT_INTENT_STATUSES.has(paymentIntent.status),
        unresolvedDispute: false,
      };
    }

    const disputes = await stripe.disputes.list({ charge: chargeId, limit: 10 });
    return {
      pending: PENDING_PAYMENT_INTENT_STATUSES.has(paymentIntent.status),
      unresolvedDispute: disputes.data.some(
        (dispute) => !RESOLVED_DISPUTE_STATUSES.has(dispute.status),
      ),
    };
  }));

  return {
    hasUnpaidInvoice: relevantInvoices.some((invoice) => invoice.status === "open"),
    hasPendingPayment: paymentChecks.some((payment) => payment.pending),
    hasUnresolvedDispute: paymentChecks.some((payment) => payment.unresolvedDispute),
  };
}

export async function hasUnresolvedSepaDispute(
  stripe: Stripe,
  invoice: Stripe.Invoice,
): Promise<boolean> {
  const paymentIntents = await retrieveInvoicePaymentIntents(stripe, invoice);
  return hasUnresolvedSepaDisputeForPaymentIntents(stripe, paymentIntents);
}

async function hasUnresolvedSepaDisputeForPaymentIntents(
  stripe: Stripe,
  paymentIntents: Stripe.PaymentIntent[],
): Promise<boolean> {
  for (const paymentIntent of paymentIntents) {
    const chargeId = getStripeObjectId(paymentIntent.latest_charge);
    if (!chargeId) continue;
    const charge = await stripe.charges.retrieve(chargeId);
    if (charge.payment_method_details?.type !== "sepa_debit") continue;
    const disputes = await stripe.disputes.list({ charge: chargeId, limit: 10 });
    if (disputes.data.some((dispute) => dispute.status !== "won")) return true;
  }
  return false;
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
  const invoice = await input.stripe.invoices.retrieve(invoiceId, {
    expand: ["payment_intent", "payments.data.payment.payment_intent"],
  });
  if (
    invoice.status !== "paid"
    || getStripeObjectId(invoice.customer) !== input.customerId
    || getInvoiceSubscriptionId(invoice) !== input.subscriptionId
  ) return false;

  const paymentIntents = await retrieveInvoicePaymentIntents(input.stripe, invoice);
  const successfulPaymentIntent = paymentIntents.find(
    (paymentIntent) => paymentIntent.status === "succeeded",
  );
  if (!successfulPaymentIntent) return false;
  const openInvoices = await input.stripe.invoices.list({
    customer: input.customerId,
    status: "open",
    limit: 100,
  });
  const hasOutstandingInvoice = openInvoices.data.some((openInvoice) =>
    getInvoiceSubscriptionId(openInvoice) === input.subscriptionId
    && openInvoice.amount_remaining > 0
  );
  const hasDispute = await hasUnresolvedSepaDisputeForPaymentIntents(input.stripe, paymentIntents);

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
    paymentIntentStatus: successfulPaymentIntent.status,
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
