---
name: Employment module conventions
description: Patterns used for the Emploi & Compétences module, reusable for future RSE modules (readOnly gating, custom-KPI formula builder, generated-hook query keys).
---

## Exercise-closed readOnly gating
No shared hook exposes exercise `status` directly — `useCurrentExercise()` only returns the id. Compute `readOnly` per-page by combining `useCurrentExercise()` (for the id) with `useListExercises(orgId)` and finding the matching exercise, same pattern as `ClosedExerciseBanner`. Thread the resulting boolean down as a `readOnly` prop to disable inputs/save buttons.

**Why:** avoids duplicating exercise-status logic and keeps closed-exercise UX consistent across modules.

## Guided custom-KPI formula builder (mathjs)
For "no free-code eval" formula builders: give the user a plain text `Input` for the formula plus buttons/select that append tokens (operators, variable codes) into that string. This satisfies "guided, no free-code" because the *available* tokens are constrained and server-side evaluation only allows a restricted mathjs scope (see `employmentIndicators.ts` for the evaluator pattern) — the client input is just a convenience, real safety is enforced server-side.

**How to apply:** reuse this component shape (`CustomKpiSection.tsx`) for future modules needing user-defined KPIs: mode toggle (manual value vs formula), variable picker sourced from a `list-formula-variables` endpoint, operators as buttons, formula stored as plain string.

## Generated hooks require explicit queryKey
Every generated `useXxx` hook query option requires `queryKey: getXxxQueryKey(...)` — omitting it is a TS2741 error, not a runtime one. Always pass `query: { enabled, queryKey: getGetXxxQueryKey(id) }` explicitly when calling generated hooks.

**Why:** the generated types don't default `queryKey`, unlike vanilla React Query usage elsewhere.

## api-server dev script is build+run, not hot-reload
`artifacts/api-server`'s `dev` script is `build && start` (esbuild bundle, no watch). New/changed Express routes only take effect after a workflow restart — until then, the old dist bundle keeps serving, and hitting a newly-added route returns Express's raw `Cannot GET ...` 404 (not a JSON 404), which looks identical to a routing bug.

**Why:** wasted time chasing a "missing route" bug in `app.ts`/router mounting when the real cause was a stale build; the raw-HTML 404 body (vs a JSON error body from the app's own 404 handler) is the tell.

**How to apply:** if a route that's clearly registered in code 404s with an HTML "Cannot GET" body, restart the `API Server` workflow before debugging routing/middleware order.

## Never hand-enter a value the app should compute
Per project convention (see replit.md), no rate/index should be a free manual input if it can be derived from other fields already collected — `indexEgaliteHf` (manual Egapro score in TabDiversite) was replaced with an auto-computed `indice_parite_hf` (parity proxy from nbHommes/nbFemmes) shown in Synthèse, since the app lacks the pay/promotion data for the real Egapro methodology.

**Why:** matches the client's explicit preference for computed KPIs over manual entry, and avoids a field that silently drifts from the underlying headcount data.
