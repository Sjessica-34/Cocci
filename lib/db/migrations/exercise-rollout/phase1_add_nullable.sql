-- Exercice Annuel rollout — PHASE 1 (safe on populated databases).
--
-- Creates the `exercises` and `document_exercise_links` tables, and adds
-- `exercise_id` to every business table as NULLABLE. No existing row is
-- rejected by this phase — it only adds structure.
--
-- Apply with:
--   psql "$DATABASE_URL" -f lib/db/migrations/exercise-rollout/phase1_add_nullable.sql
-- Then continue with:
--   pnpm --filter @workspace/scripts run backfill-exercises
--   pnpm --filter @workspace/scripts run verify-exercise-backfill
-- Only once verify passes, apply phase3_enforce_not_null.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS exercises (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT exercises_org_year_unique UNIQUE (organization_id, year)
);

CREATE TABLE IF NOT EXISTS document_exercise_links (
  id SERIAL PRIMARY KEY,
  document_id INTEGER NOT NULL,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT document_exercise_links_unique UNIQUE (document_id, exercise_id)
);

ALTER TABLE bio_dependencies      ADD COLUMN IF NOT EXISTS exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE;
ALTER TABLE bio_connections       ADD COLUMN IF NOT EXISTS exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE;
ALTER TABLE bio_issues            ADD COLUMN IF NOT EXISTS exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE;
ALTER TABLE carbon_bilans         ADD COLUMN IF NOT EXISTS exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE;
ALTER TABLE custom_issues         ADD COLUMN IF NOT EXISTS exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE;
ALTER TABLE impact_score_results  ADD COLUMN IF NOT EXISTS exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE;
ALTER TABLE issue_analyses        ADD COLUMN IF NOT EXISTS exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE;
ALTER TABLE issue_ratings         ADD COLUMN IF NOT EXISTS exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE;
ALTER TABLE labels                ADD COLUMN IF NOT EXISTS exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE;
ALTER TABLE nr_meta               ADD COLUMN IF NOT EXISTS exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE;
ALTER TABLE nr_responses          ADD COLUMN IF NOT EXISTS exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE;
ALTER TABLE stakeholders          ADD COLUMN IF NOT EXISTS exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE;
ALTER TABLE suppliers             ADD COLUMN IF NOT EXISTS exercise_id INTEGER REFERENCES exercises(id) ON DELETE CASCADE;

COMMIT;
