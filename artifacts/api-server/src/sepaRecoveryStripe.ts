import type Stripe from "stripe";

export type RecoveryInvoice = {
  id: string;
  status: string | null;
  amount_remaining: number;
  payment_intent?: string | { id: string } | null;
  payments?: {
    data?: Array<{ payment?: { payment_intent?: string | { id: string } | null } }>;
  };
};

function objectId(value: string | { id: string } | null | undefined): string | null {
  return typeof value === "string" ? value : value?.id ?? null;
}

export function getRecoverySetupSessionReferences(
  session: Stripe.Checkout.Session,
  expected: { customerId: string; organizationId: number; subscriptionId: string },
): { invoiceId: string; setupIntentId: string } | null {
  const metadata = session.metadata ?? {};
  const invoiceId = metadata.invoice_id;
  const setupIntentId = objectId(session.setup_intent as string | { id: string } | null);
  if (
    session.mode !== "setup"
    || session.status !== "complete"
    || objectId(session.customer as string | { id: string } | null) !== expected.customerId
    || metadata.cocci_flow !== "sepa_recovery"
    || metadata.organization_id !== String(expected.organizationId)
    || metadata.subscription_id !== expected.subscriptionId
    || !invoiceId
    || !setupIntentId
  ) return null;
  return { invoiceId, setupIntentId };
}

export function getRecoverySetupPaymentMethod(
  setupIntent: Stripe.SetupIntent,
  expected: {
    customerId: string;
    organizationId: number;
    subscriptionId: string;
    invoiceId: string;
  },
): string | null {
  const metadata = setupIntent.metadata ?? {};
  const paymentMethodId = objectId(
    setupIntent.payment_method as string | { id: string } | null,
  );
  if (
    setupIntent.status !== "succeeded"
    || objectId(setupIntent.customer as string | { id: string } | null) !== expected.customerId
    || metadata.cocci_flow !== "sepa_recovery"
    || metadata.organization_id !== String(expected.organizationId)
    || metadata.subscription_id !== expected.subscriptionId
    || metadata.invoice_id !== expected.invoiceId
    || !paymentMethodId
  ) return null;
  return paymentMethodId;
}

export async function createRecoverySetupCheckout(
  stripe: Stripe,
  input: {
    baseUrl: string;
    organizationId: number;
    customerId: string;
    subscriptionId: string;
    invoiceId: string;
  },
): Promise<Stripe.Checkout.Session> {
  const metadata = {
    cocci_flow: "sepa_recovery",
    organization_id: String(input.organizationId),
    subscription_id: input.subscriptionId,
    invoice_id: input.invoiceId,
  };
  return stripe.checkout.sessions.create({
    mode: "setup",
    customer: input.customerId,
    payment_method_types: ["sepa_debit"],
    setup_intent_data: { metadata },
    metadata,
    success_url: `${input.baseUrl}/abonnement?sepaRecoverySession={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.baseUrl}/abonnement?recoveryCancelled=1`,
    locale: "fr",
  });
}

export async function payExistingRecoveryInvoice(
  stripe: Stripe,
  input: {
    subscriptionId: string;
    invoice: RecoveryInvoice;
    paymentMethodId: string;
    setupIntentId: string;
  },
): Promise<"paid" | "processing"> {
  if (input.invoice.status !== "open" || input.invoice.amount_remaining <= 0) {
    throw new Error("Recovery invoice is no longer payable");
  }

  const paymentIntentId = objectId(input.invoice.payment_intent)
    ?? objectId(input.invoice.payments?.data?.[0]?.payment?.payment_intent);
  if (paymentIntentId) {
    const currentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (currentIntent.status === "processing") return "processing";
  }

  await stripe.subscriptions.update(input.subscriptionId, {
    default_payment_method: input.paymentMethodId,
  });
  const paidInvoice = await stripe.invoices.pay(
    input.invoice.id,
    { payment_method: input.paymentMethodId, off_session: true },
    { idempotencyKey: `cocci-sepa-recovery-${input.invoice.id}-${input.setupIntentId}` },
  );
  return paidInvoice.status === "paid" ? "paid" : "processing";
}
