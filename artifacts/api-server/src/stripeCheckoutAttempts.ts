import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";

export function getStripeObjectId(
  value: string | { id: string } | null | undefined,
): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export async function createPendingCheckoutAttempt(opts: {
  organizationId: number;
  stripeCustomerId: string;
}): Promise<string> {
  const attemptId = randomUUID();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE stripe_checkout_attempts
       SET status = 'superseded', updated_at = NOW()
       WHERE organization_id = $1 AND status = 'pending'`,
      [opts.organizationId],
    );
    await client.query(
      `INSERT INTO stripe_checkout_attempts
         (id, organization_id, status, stripe_customer_id, created_at, updated_at)
       VALUES ($1, $2, 'pending', $3, NOW(), NOW())`,
      [attemptId, opts.organizationId, opts.stripeCustomerId],
    );
    await client.query("COMMIT");
    return attemptId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function attachStripeCheckoutSession(opts: {
  attemptId: string;
  stripeCheckoutSessionId: string;
  stripeSubscriptionId?: string | null;
  stripePaymentIntentId?: string | null;
}): Promise<void> {
  await pool.query(
    `UPDATE stripe_checkout_attempts
     SET stripe_checkout_session_id = $2,
         stripe_subscription_id = COALESCE($3, stripe_subscription_id),
         stripe_payment_intent_id = COALESCE($4, stripe_payment_intent_id),
         updated_at = NOW()
     WHERE id = $1`,
    [
      opts.attemptId,
      opts.stripeCheckoutSessionId,
      opts.stripeSubscriptionId ?? null,
      opts.stripePaymentIntentId ?? null,
    ],
  );
}

export async function cancelCheckoutAttempt(attemptId: string): Promise<void> {
  await pool.query(
    `UPDATE stripe_checkout_attempts
     SET status = CASE WHEN status = 'pending' THEN 'cancelled' ELSE status END,
         updated_at = NOW()
     WHERE id = $1`,
    [attemptId],
  );
}