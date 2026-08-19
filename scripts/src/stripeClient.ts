import Stripe from "stripe";

function getStripeSecretKey(): string {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is required to run Stripe catalogue scripts.",
    );
  }
  return secretKey;
}

export function getUncachableStripeClient(): Stripe {
  return new Stripe(getStripeSecretKey());
}
