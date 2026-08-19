import Stripe from "stripe";

function requiredStripeVariable(
  name: "STRIPE_SECRET_KEY" | "STRIPE_WEBHOOK_SECRET",
): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is required for this Stripe operation. Configure it in the deployment environment.`,
    );
  }
  return value;
}

export function getStripeSecretKey(): string {
  return requiredStripeVariable("STRIPE_SECRET_KEY");
}

export function getStripeWebhookSecret(): string {
  return requiredStripeVariable("STRIPE_WEBHOOK_SECRET");
}

export function getUncachableStripeClient(): Stripe {
  return new Stripe(getStripeSecretKey());
}
