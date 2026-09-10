BEGIN;

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Additive migration for the single-primary-organization invariant.
-- It intentionally fails before changing data if the existing data is ambiguous.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM members m
    JOIN organizations o ON o.id = m.organization_id
    WHERE m.status <> 'suspended'
      AND m.archived_at IS NULL
      AND o.parent_id IS NULL
    GROUP BY m.user_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot migrate: at least one user has multiple current root organizations';
  END IF;
END $$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS primary_organization_id integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_primary_organization_id_fkey'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_primary_organization_id_fkey
      FOREIGN KEY (primary_organization_id)
      REFERENCES organizations(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS users_primary_organization_id_idx
  ON users (primary_organization_id);

-- Existing active root memberships are the only safe source for the initial
-- primary organization value. No rows are deleted or rewritten otherwise.
UPDATE users u
SET primary_organization_id = roots.organization_id,
    updated_at = now()
FROM (
  SELECT m.user_id, min(m.organization_id) AS organization_id
  FROM members m
  JOIN organizations o ON o.id = m.organization_id
  WHERE m.status <> 'suspended'
    AND m.archived_at IS NULL
    AND o.parent_id IS NULL
  GROUP BY m.user_id
) roots
WHERE u.id = roots.user_id
  AND u.primary_organization_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS members_one_current_user_idx
  ON members (user_id)
  WHERE archived_at IS NULL AND status <> 'suspended';

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started',
  effectif_key text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS onboarding_progress_user_unique
  ON onboarding_progress (user_id);

INSERT INTO onboarding_progress (user_id, status, created_at, updated_at)
SELECT
  u.id,
  CASE WHEN u.primary_organization_id IS NULL
    THEN 'not_started'
    ELSE 'organization_created'
  END,
  now(),
  now()
FROM users u
ON CONFLICT (user_id) DO NOTHING;

COMMIT;