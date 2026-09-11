-- Registre des tentatives Checkout Stripe.
-- À appliquer séparément sur chaque base cible après validation.

BEGIN;

CREATE TABLE IF NOT EXISTS stripe_checkout_attempts (
  id TEXT PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'superseded', 'cancelled')),
  stripe_customer_id TEXT,
  stripe_checkout_session_id TEXT,
  stripe_subscription_id TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS stripe_checkout_attempts_one_pending_org_idx
  ON stripe_checkout_attempts (organization_id)
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS stripe_checkout_attempts_checkout_session_id_idx
  ON stripe_checkout_attempts (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS stripe_checkout_attempts_org_status_idx
  ON stripe_checkout_attempts (organization_id, status);

CREATE INDEX IF NOT EXISTS stripe_checkout_attempts_subscription_id_idx
  ON stripe_checkout_attempts (stripe_subscription_id);

CREATE INDEX IF NOT EXISTS stripe_checkout_attempts_payment_intent_id_idx
  ON stripe_checkout_attempts (stripe_payment_intent_id);

COMMIT;