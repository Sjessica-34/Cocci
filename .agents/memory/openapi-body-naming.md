---
name: OpenAPI body schema naming — éviter TS2308
description: Les body schemas dans openapi.yaml doivent être nommés selon l'entité, jamais selon l'opération.
---

# OpenAPI Body Schema Naming

## Règle
Tout body de requête doit être dans `components/schemas` avec un nom d'entité (ex: `NoteInput`, `OrganizationUpdate`).
Ne jamais nommer `CreateNoteBody` ou `UpdateNoteBody` — cela crée une collision avec ce qu'Orval génère automatiquement.

**Why:** Orval génère automatiquement `<OperationIdPascal>Body` dans `api.ts`. Si le composant a le même nom, `lib/api-zod` produit une erreur TS2308 "Module already exported a member named X". Le build échoue silencieusement après codegen.

## How to apply
- `operationId: createNote` → composant body: `NoteInput` (pas `CreateNoteBody`)
- `operationId: updateOrganization` → composant body: `OrganizationUpdate` (pas `UpdateOrganizationBody`)
- Toujours vérifier après codegen que `pnpm run typecheck:libs` passe sans erreur.
