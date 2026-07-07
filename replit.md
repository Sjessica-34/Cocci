# cocci

Plateforme SaaS de pilotage RSE (Responsabilité Sociétale des Entreprises) destinée aux TPE, PME et ETI françaises.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/animpact run dev` — run the frontend (port 22474)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend:** React + Vite, Tailwind v4, shadcn/ui, Wouter, React Query
- **Auth:** Clerk (Replit-managed tenant) — `@clerk/react` (frontend) + `@clerk/express` (backend)
- **API:** Express 5, OpenAPI-first (lib/api-spec/openapi.yaml)
- **DB:** PostgreSQL + Drizzle ORM
- **Validation:** Zod (zod/v4), drizzle-zod
- **API codegen:** Orval (from OpenAPI spec → React Query hooks + Zod schemas)
- **Build:** esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source de vérité du contrat API
- `lib/db/src/schema/` — schémas Drizzle (users.ts, organizations.ts, members.ts)
- `artifacts/api-server/src/routes/` — routes Express (users, organizations, members, dashboard, health)
- `artifacts/api-server/src/middlewares/` — requireAuth.ts, clerkProxyMiddleware.ts
- `artifacts/animpact/src/` — frontend React (pages, components, hooks)
- `lib/api-client-react/src/generated/` — hooks React Query générés par Orval
- `lib/api-zod/src/generated/` — schémas Zod générés par Orval

## Architecture decisions

- **OpenAPI-first** : toute modification d'API part du fichier `openapi.yaml`, jamais du code. Toujours relancer le codegen après.
- **Clerk multi-tenant** : Clerk gère l'authentification. Le concept "organisation" est géré dans notre DB (pas via les Clerk Organizations, non supportées par Replit-managed Clerk). JIT-provisioning des users à la première requête.
- **requireAuth middleware** : extrait `clerkUserId` depuis `getAuth(req)` et le place sur `req.clerkUserId`. Toutes les routes protégées l'utilisent.
- **RBAC simple** : rôles owner/admin/member/viewer stockés en DB. Les rôles owner et admin peuvent gérer les membres.
- **Développement module par module** : chaque fonctionnalité RSE est un module indépendant. Ne jamais développer plusieurs modules en même temps.

## Product — Modules planifiés

| # | Module | Statut |
|---|---|---|
| 1 | Auth + Multi-tenancy (Clerk + Organizations + Users + Members) | ✅ Livré |
| 2 | Gestion entreprises & utilisateurs (UI avancée) | À faire |
| 2b | Achats & Fournisseurs Responsables (CRUD fournisseurs, évaluation RSE, tableau de bord géo) | ✅ Livré |
| 3 | Abonnements | À faire |
| 4 | Diagnostic RSE + Bibliothèque de questions | À faire |
| 5 | Matrice de matérialité | À faire |
| 6 | Cartographie parties prenantes | À faire |
| 7 | Plan d'actions + KPI | À faire |
| 8 | Gestion documentaire | À faire |
| 9 | Bilan carbone (import + estimation) | ✅ Livré |
| 10 | Rapport RSE + Comparaison annuelle | À faire |
| 11 | Tableau de bord avancé | À faire |
| 12 | IA | À faire |

## User preferences

- Ne jamais prendre d'initiative fonctionnelle sans consulter le client
- Privilégier architecture professionnelle, évolutive et maintenable
- Travailler module par module — ne jamais développer plusieurs fonctionnalités importantes en même temps
- Avant chaque développement, expliquer les choix techniques
- Qualité du code > rapidité
- Toujours expliquer les choix avant de coder
- Signaler tout problème d'architecture détecté

## Gotchas

- **Clerk + Replit-managed** : les Clerk Organizations ne sont pas supportées → gérer le multi-tenant en DB.
- **`publishableKeyFromHost`** : toujours utiliser cette fonction (jamais la raw env var) dans le frontend Clerk.
- **`proxyUrl={clerkProxyUrl}`** est inconditionnel (vide en dev, auto-peuplé en prod).
- **Routes Clerk** : MUST be exactly `path="/sign-in/*?"` and `path="/sign-up/*?"` — le `/*?` est obligatoire.
- **Body schemas OpenAPI** : nommer les composants avec des noms d'entité (NoteInput, OrgUpdate), jamais operation-shaped (CreateNoteBody) pour éviter les collisions TS2308.
- **Express 5** : wildcard routes → `/{*splat}` pas `*`. Optional params → `/todos{/:id}` pas `/todos/:id?`.
- **`req.params.id`** : toujours parser avec `Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id)`.
- Après chaque changement de `lib/*`, relancer `pnpm run typecheck:libs` avant les checks des artifacts.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `clerk-auth` skill for Clerk setup details
