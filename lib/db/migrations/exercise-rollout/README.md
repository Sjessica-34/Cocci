# Exercice Annuel rollout — migration runbook

This repo has no formal migration system (`drizzle-kit push` is dev-only and
non-transactional with data changes). The `exercise_id` scoping column was
added as NOT NULL directly in `lib/db/src/schema/*.ts`, which `drizzle push`
cannot apply safely to a database that already has rows in those tables. Use
this three-phase SQL runbook instead of `drizzle push` the first time this
change reaches a populated database (any environment other than a fresh/empty
one).

1. **Phase 1 — add nullable structure**
   ```
   psql "$DATABASE_URL" -f lib/db/migrations/exercise-rollout/phase1_add_nullable.sql
   ```
   Creates `exercises` + `document_exercise_links`, adds `exercise_id` to
   every business table as nullable. Safe on populated data.

2. **Phase 2 — backfill**
   ```
   pnpm --filter @workspace/scripts run backfill-exercises
   ```
   Creates a default exercise per organization, links pre-existing documents,
   and backfills `exercise_id` on every business row still missing one.

3. **Phase 2.5 — verify**
   ```
   pnpm --filter @workspace/scripts run verify-exercise-backfill
   ```
   Must print `OK` and exit 0 before continuing.

4. **Phase 3 — enforce NOT NULL + migrate uniqueness scope**
   ```
   psql "$DATABASE_URL" -f lib/db/migrations/exercise-rollout/phase3_enforce_not_null.sql
   ```
   Only after phase 2.5 passes. This matches the schema already committed in
   `lib/db/src/schema/*.ts`, so after this phase `pnpm --filter @workspace/db
   run push` will report no pending changes for these columns. It also drops
   the old organization-scoped unique constraint/index on `issue_ratings`,
   `nr_responses`, and `impact_score_results` and (re)creates the
   exercise-scoped equivalents — those three tables' uniqueness moved from
   "one row per organization/key" to "one row per exercise/key" as part of
   this rollout, so the old uniques must be migrated or upserts in
   `issues.ts` / `numeriqueResponsable.ts` will hit spurious unique
   violations across exercises. All statements are idempotent/`IF EXISTS`
   guarded, so this is also safe to run on a fresh database.

On a fresh/empty database, none of this matters: `pnpm --filter
@workspace/db run push` against the current schema is sufficient, since there
is no pre-existing data to violate the NOT NULL constraint.

5. **Phase 4 — automatic advance workflow**
   ```
   psql "$DATABASE_URL" -f lib/db/migrations/exercise-rollout/phase4_advance_workflow.sql
   ```
   Adds `organizations.exercise_opening_month` (default 12/December) and the
   partial unique index enforcing a single "active" exercise per
   organization. Defensively closes any extra active exercises (keeping the
   most recent by year) before creating the index, so it is safe to run even
   if a populated database has leftover duplicate-active rows from the
   previous manual-exercise workflow. Idempotent — safe on fresh databases
   too.
