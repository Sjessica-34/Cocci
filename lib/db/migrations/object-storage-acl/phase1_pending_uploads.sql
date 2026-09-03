BEGIN;

CREATE TABLE IF NOT EXISTS pending_object_uploads (
  object_path text PRIMARY KEY,
  owner_clerk_id text NOT NULL,
  organization_id integer REFERENCES organizations(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pending_object_uploads_expires_at_idx
  ON pending_object_uploads (expires_at);

COMMIT;