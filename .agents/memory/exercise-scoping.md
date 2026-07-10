---
name: Exercise (fiscal year) scoping architecture
description: How the Exercise entity scopes multi-tenant RSE data across backend and frontend in cocci
---

## Backend

- Scoping must be centralized as middleware, not per-route manual checks: resolve org membership + active exercise once, attach to `req`, and reuse shared query helpers for the `organizationId`+`exerciseId` filter/insert-values. Code review treats manual per-route filtering as insufficient even if functionally correct.
- **A schema-declared NOT NULL scoping column requires a real multi-phase migration, not just `drizzle push`.** This repo has no formal migration system, so rolling out a new required column against a populated DB needs: nullable column → idempotent backfill script → executable verify script (non-zero exit while unscoped rows remain) → NOT NULL enforcement, with each phase as a committed, runnable artifact (SQL files / scripts), not just described in prose.
- **Changing a table's uniqueness scope (e.g. org-scoped unique → exercise-scoped unique) is part of that same migration, not a schema-only change.** The old constraint/index must be explicitly dropped and the new one created in the migration script — leaving it to `drizzle push` alone risks stale org-scoped uniques rejecting valid per-exercise writes on an already-populated database.
- **"Future modules need no dedicated work, just the shared convention" is a real, checked requirement — not just an aspiration.** If duplication/backfill/verification logic each hardcode their own copy of the scoped-table list, adding a table later means editing N places, which review treats as violating that requirement even if every individual list is currently correct. Put the table list in exactly one shared registry that every consumer imports.
- **Route param name must match the membership middleware's expected param.** A membership middleware bound to `:id` silently 400s on routes declared with a different param name (e.g. `:orgId`) — this isn't caught by routing or typecheck, only by calling the endpoint live.
- Entities that logically span multiple scoped contexts (e.g. a document usable across several exercises) should stay scoped at their natural level and link into the scoping entity via a join table, not duplicate the row per scope.
- Duplicating a scoped context must remap internal FK references between the entity's own rows (e.g. record A → record B within the same duplicated set), not just copy rows independently.

## Frontend

- **Don't gate cross-cutting UI (selectors, read-only banners) on a URL-prefix heuristic** (e.g. `location.startsWith("/organizations/")`). If business modules live at top-level routes rather than nested under that prefix, the heuristic silently hides the UI everywhere it's actually needed. Gate on the real precondition instead (e.g. "an org is selected") and exclude only routes that genuinely lack that context.
- When a cross-request context value (like an active exercise id) isn't part of any generated React Query key, switching it must trigger a broad `queryClient.invalidateQueries()` — otherwise stale data from the previous context lingers in cache.
- For read-only-on-close style UX, prefer marking the shared layout's content wrapper `inert` over touching every module's forms individually — one cross-cutting change instead of N per-page changes.
