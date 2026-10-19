export const STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES = ["sepa_debit"] as const;

const terminalStripeSubscriptionStatuses = new Set(["canceled", "incomplete_expired"]);

export function getInitialStripeSubscriptionStatus(
  paymentStatus: string | null | undefined,
): "active" | "trial" {
  return paymentStatus === "paid" ? "active" : "trial";
}

export function shouldBlockNewStripeCheckout(input: {
  mode: string | null | undefined;
  localStatus: string | null | undefined;
  stripeSubscriptionId: string | null | undefined;
  stripeSubscriptionStatus?: string | null;
}): boolean {
  if (input.mode !== "stripe") return false;
  if (input.localStatus === "active" || input.localStatus === "trial") return true;
  if (input.localStatus !== "suspended" || !input.stripeSubscriptionId) return false;

  // If Stripe cannot confirm that the previous subscription is terminal, fail
  // closed rather than creating a second subscription for the same customer.
  return !input.stripeSubscriptionStatus
    || !terminalStripeSubscriptionStatuses.has(input.stripeSubscriptionStatus);
}

export type StripeAccessTransitionEvent = {
  type: "invoice.payment_succeeded" | "invoice.payment_failed" | "charge.dispute.created";
  subscriptionId: string | null;
  currentSubscriptionId: string | null;
  localStatus: string | null;
  invoicePaid?: boolean;
  paymentIntentStatus?: string | null;
  stripeSubscriptionStatus?: string | null;
  isSepaDebit?: boolean;
  hasOutstandingInvoice?: boolean;
  hasUnresolvedSepaDispute?: boolean;
};

export type StripeAccessTransition = "activate" | "suspend" | "ignore";

export function decideStripeAccessTransition(
  event: StripeAccessTransitionEvent,
): StripeAccessTransition {
  if (!event.subscriptionId || event.subscriptionId !== event.currentSubscriptionId) {
    return "ignore";
  }

  if (event.type === "invoice.payment_failed") {
    if (event.invoicePaid || !["active", "trial"].includes(event.localStatus ?? "")) {
      return "ignore";
    }
    return "suspend";
  }

  if (event.type === "charge.dispute.created") {
    if (!event.isSepaDebit || !["active", "trial"].includes(event.localStatus ?? "")) {
      return "ignore";
    }
    return "suspend";
  }

  if (
    !event.invoicePaid
    || event.paymentIntentStatus !== "succeeded"
    || event.hasOutstandingInvoice
    || event.hasUnresolvedSepaDispute
    || !["trial", "suspended"].includes(event.localStatus ?? "")
    || !["active", "trialing"].includes(event.stripeSubscriptionStatus ?? "")
  ) {
    return "ignore";
  }
  return "activate";
}
