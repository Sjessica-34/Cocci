---
name: Subsidiary exercise isolation
description: Chaque organisation (racine ET filiale) doit avoir son propre exercice — pas d'héritage depuis le parent.
---

## Règle

Toute organisation créée (root ou filiale) reçoit son propre exercice dans `exercises` lors de la création.
`resolveExercise` ne remonte JAMAIS vers le parent — chaque org est autonome.

**Why:** Le fallback parent dans `resolveExercise` faisait que toutes les filiales partageaient `exerciseId` du groupe. La consolidation (`getSubsidiaryExercises`) cherche des exercices avec `organizationId IN [subIds]` — introuvables si les filiales n'en ont pas. Les données semblaient partagées entre filiales (même `exerciseId`) et la consolidation ne fonctionnait jamais.

**How to apply:**
- `organizations.ts` POST : `INSERT INTO exercises` est exécuté pour TOUTES les orgs, pas seulement les root.
- `exercise.ts resolveExercise` : aucun fallback vers `parentId`. Si pas d'exercice pour cet orgId → retourne null.
- `consolidation.ts getSubsidiaryExercises` : cherche les exercices des filiales par `organizationId IN [subIds]`. Fonctionne uniquement si les filiales ont leurs propres exercices.
- Migration DB nécessaire pour les filiales existantes : créer l'exercice, puis `UPDATE exercise_id` sur toutes les tables métier.
