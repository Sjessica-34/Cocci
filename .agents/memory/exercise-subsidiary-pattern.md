---
name: Exercise ownership and subsidiary inheritance
description: Exercises belong only to root orgs; subsidiaries inherit via server-side fallback
---

**Rule:** Exercises are created and owned exclusively by the root (parent) organization. Subsidiary orgs have no exercises of their own.

**Why:** The data model enforces this (exercises table has orgId = root org id). When a subsidiary tries to load a module that requires an exercise, it must use the parent org's exercise.

**How to apply:**
- Backend (`exercise.ts` → `resolveExercise`): added `getParentOrgId()` helper. When the requested exerciseId doesn't match the subsidiary's org, falls back to fetching the parent org's exercises and resolves from there.
- Frontend (`layout.tsx` → ExerciseSelector): always passes `exerciseOrgId = rootOrg?.id ?? currentOrgId` so subsidiaries see the root org's exercises in the selector (not an empty list).
