-- Secure one-time invitations for the existing free subscription mechanism.
-- Prepared for review only: do not execute without explicit authorization.
BEGIN;

CREATE TABLE IF NOT EXISTS gift_invitations (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  offer_name TEXT NOT NULL,
  effectif_key TEXT NOT NULL,
  max_employees INTEGER,
  duration_months INTEGER CHECK (duration_months IS NULL OR duration_months IN (1, 3, 6, 12)),
  expires_at TIMESTAMPTZ NOT NULL,
  created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS gift_invitations_email_idx ON gift_invitations (email);
CREATE INDEX IF NOT EXISTS gift_invitations_status_idx
  ON gift_invitations (expires_at, claimed_at, revoked_at);

COMMIT;
