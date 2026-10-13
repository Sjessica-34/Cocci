BEGIN;

CREATE TABLE IF NOT EXISTS organization_invitations (
  id serial PRIMARY KEY,
  organization_id integer NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id integer REFERENCES members(id) ON DELETE SET NULL,
  email text NOT NULL,
  role text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  clerk_invitation_id text,
  invited_by_user_id integer REFERENCES users(id) ON DELETE SET NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS organization_invitations_clerk_id_idx
  ON organization_invitations (clerk_invitation_id)
  WHERE clerk_invitation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS organization_invitations_org_status_idx
  ON organization_invitations (organization_id, status, created_at DESC);

COMMIT;
