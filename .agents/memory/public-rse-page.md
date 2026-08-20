---
name: Page publique RSE
description: Architecture et points techniques de la page publique partageable /p/:token
---

## Architecture

- **Table DB** : `public_links` (id, organization_id, exercise_id, token UUID unique, created_at) — contrainte UNIQUE sur (org, exercise)
- **Backend** : `artifacts/api-server/src/routes/publicRse.ts` enregistré dans `routes/index.ts`
  - `GET /api/public/rse/:token` — agrège toutes les données sans auth via `pool.query()` (pas `db.execute(sql\`...\`)` qui causait des 500 silencieux)
  - `GET/POST/DELETE /organizations/:orgId/public-link` — gestion du token (auth requise)
- **Frontend** : `artifacts/animpact/src/pages/public-rse/index.tsx` — route `/p/:token` dans `AppRoutes` (hors ClerkProvider)

## Positionnement dans le produit

La gestion de la page publique RSE (lien, QR code et révocation) doit rester sur sa page dédiée, et ne doit pas apparaître dans l’éditeur du rapport RSE.

**Why:** le rapport reste concentré sur sa préparation, sa génération et ses archives ; le partage public est un parcours distinct.

**How to apply:** ne pas ajouter de carte, QR code ni commande de lien public dans le rapport RSE. Conserver la page publique partageable et son écran de gestion dédié.

## Pièges connus

- `db.execute(sql\`...\`)` retourne 500 silencieux dans ce projet — utiliser `pool.query()` directement pour le SQL brut
- La table `barometre_campaigns` n'a PAS de colonnes `nb_repondants` / `taux_participation` — ces valeurs sont calculées depuis `barometre_responses`
- Les labels renvoyés par `pool.query()` sont en snake_case — il faut normaliser manuellement vers camelCase avant de renvoyer au frontend

**Why:** `db.execute(sql\`...\`)` fonctionne en isolation mais échoue silencieusement dans ce contexte esbuild/runtime. `pool.query()` est plus fiable pour le SQL brut de l'endpoint public.
