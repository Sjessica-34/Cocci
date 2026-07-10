# Baromètre Social — migrations

Hand-written idempotent SQL runbooks, applied via `psql -f <file> "$DATABASE_URL"`.
Same pattern as `lib/db/migrations/exercise-rollout/` (no formal migration runner in this repo).

## Phase 1 — schema (`phase1_schema.sql`)

Creates the module's tables:
- `barometre_campaigns` — one row per campaign (name, mode, status, dates, public token, `nb_collaborateurs`).
- `barometre_custom_questions` — org-added questions appended after the Cocci referential.
- `barometre_responses` / `barometre_answers` — one response per respondent, one answer row per question.
- `barometre_actions` — dedicated action table so "Créer une action" works today without depending on
  the not-yet-built "Mes actions" module (module 7). Intentionally NOT linked to any external actions
  table; when "Mes actions" ships, these rows should be migrated/linked, not duplicated.
- `barometre_ai_summaries` — cached AI summary of free-text comments per campaign, regenerated on demand
  (never computed synchronously on every page load, to keep AI usage minimal as requested).

Run: `psql "$DATABASE_URL" -f lib/db/migrations/barometre-social/phase1_schema.sql`
