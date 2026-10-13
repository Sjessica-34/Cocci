BEGIN;

CREATE TABLE IF NOT EXISTS additional_user_seat_requests (
  organization_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed')),
  stripe_subscription_id text NOT NULL,
  stripe_update_params jsonb NOT NULL,
  max_users integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS additional_user_seat_requests_one_pending_org_idx
  ON additional_user_seat_requests (organization_id)
  WHERE status = 'pending';

COMMIT;
