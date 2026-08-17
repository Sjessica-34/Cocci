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
- **Bouton partage** : dans `rapport-rse/index.tsx` onglet "Générer", state `publicToken`/`publicUrl`, fetch via `customFetch`

## Pièges connus

- `db.execute(sql\`...\`)` retourne 500 silencieux dans ce projet — utiliser `pool.query()` directement pour le SQL brut
- La table `barometre_campaigns` n'a PAS de colonnes `nb_repondants` / `taux_participation` — ces valeurs sont calculées depuis `barometre_responses`
- Les labels renvoyés par `pool.query()` sont en snake_case — il faut normaliser manuellement vers camelCase avant de renvoyer au frontend

**Why:** `db.execute(sql\`...\`)` fonctionne en isolation mais échoue silencieusement dans ce contexte esbuild/runtime. `pool.query()` est plus fiable pour le SQL brut de l'endpoint public.
