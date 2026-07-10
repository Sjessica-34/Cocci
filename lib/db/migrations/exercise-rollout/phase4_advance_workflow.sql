-- Exercice Annuel rollout — PHASE 4 (automatic advance workflow).
--
-- Adds `organizations.exercise_opening_month` (the month from which
-- "Clôturer et créer l'exercice suivant" becomes available, default
-- December) and enforces a single active exercise per organization via a
-- partial unique index.
--
-- Idempotent / IF EXISTS guarded, safe to run on both fresh and populated
-- databases. If a populated database already has more than one "active"
-- exercise per organization (leftover from the previous manual-exercise
-- workflow), this script closes all but the most recent one for that
-- organization before creating the index, so the index creation cannot
-- fail on duplicates.
--
-- Apply with:
--   psql "$DATABASE_URL" -f lib/db/migrations/exercise-rollout/phase4_advance_workflow.sql

BEGIN;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS exercise_opening_month INTEGER NOT NULL DEFAULT 12;

-- Defensive cleanup: keep only the most recent "active" exercise per
-- organization (by year) so the partial unique index below can be created.
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY organization_id ORDER BY year DESC) AS rn
  FROM exercises
  WHERE status = 'active'
)
UPDATE exercises
SET status = 'closed'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS exercises_org_single_active_idx
  ON exercises (organization_id)
  WHERE status = 'active';

COMMIT;
