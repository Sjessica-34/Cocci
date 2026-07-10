-- Exercice Annuel rollout — PHASE 3 (destructive-if-run-early).
--
-- Enforces NOT NULL on `exercise_id` across every business table. This
-- MUST only run after:
--   1. phase1_add_nullable.sql has been applied, AND
--   2. `pnpm --filter @workspace/scripts run backfill-exercises` has run, AND
--   3. `pnpm --filter @workspace/scripts run verify-exercise-backfill` exits 0.
--
-- Running this against a table that still has NULL exercise_id rows will
-- fail the whole transaction (it is wrapped in BEGIN/COMMIT), so it is safe
-- to attempt speculatively — but always run verify first to avoid a wasted
-- failed deploy.
--
-- Apply with:
--   psql "$DATABASE_URL" -f lib/db/migrations/exercise-rollout/phase3_enforce_not_null.sql

BEGIN;

ALTER TABLE bio_dependencies      ALTER COLUMN exercise_id SET NOT NULL;
ALTER TABLE bio_connections       ALTER COLUMN exercise_id SET NOT NULL;
ALTER TABLE bio_issues            ALTER COLUMN exercise_id SET NOT NULL;
ALTER TABLE carbon_bilans         ALTER COLUMN exercise_id SET NOT NULL;
ALTER TABLE custom_issues         ALTER COLUMN exercise_id SET NOT NULL;
ALTER TABLE impact_score_results  ALTER COLUMN exercise_id SET NOT NULL;
ALTER TABLE issue_analyses        ALTER COLUMN exercise_id SET NOT NULL;
ALTER TABLE issue_ratings         ALTER COLUMN exercise_id SET NOT NULL;
ALTER TABLE labels                ALTER COLUMN exercise_id SET NOT NULL;
ALTER TABLE nr_meta               ALTER COLUMN exercise_id SET NOT NULL;
ALTER TABLE nr_responses          ALTER COLUMN exercise_id SET NOT NULL;
ALTER TABLE stakeholders          ALTER COLUMN exercise_id SET NOT NULL;
ALTER TABLE suppliers             ALTER COLUMN exercise_id SET NOT NULL;

-- The uniqueness scope on these three tables changed from
-- organization-scoped to exercise-scoped in lib/db/src/schema/*.ts (a
-- single org now has one row per exercise, not one row total/per
-- criterion/key). Drop the old organization-scoped unique
-- constraints/indexes and (re)create the exercise-scoped ones so upserts
-- in numeriqueResponsable.ts and issues.ts don't hit stale unique
-- violations on an upgraded database. Guards make this safe to run
-- idempotently and also on a fresh database, where the old constraint
-- names never existed and the new ones are already created by
-- `drizzle push` (ADD CONSTRAINT/CREATE INDEX are skipped if present).
ALTER TABLE issue_ratings DROP CONSTRAINT IF EXISTS issue_ratings_org_key_unique;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'issue_ratings_exercise_key_unique'
  ) THEN
    ALTER TABLE issue_ratings ADD CONSTRAINT issue_ratings_exercise_key_unique UNIQUE (exercise_id, issue_key);
  END IF;
END $$;

DROP INDEX IF EXISTS nr_responses_org_criterion_idx;
CREATE UNIQUE INDEX IF NOT EXISTS nr_responses_exercise_criterion_idx ON nr_responses (exercise_id, criterion_id);

DROP INDEX IF EXISTS impact_score_results_org_idx;
CREATE UNIQUE INDEX IF NOT EXISTS impact_score_results_exercise_idx ON impact_score_results (exercise_id);

COMMIT;
