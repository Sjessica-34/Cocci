---
name: Clerk multi-tenancy pour A-NIM-PACT
description: Replit-managed Clerk ne supporte pas les Organizations — gérer le multi-tenant en DB propre.
---

# Clerk multi-tenancy

## Règle
Les Clerk Organizations ne sont PAS supportées par Replit-managed Clerk. Ne pas les utiliser.

**Why:** La documentation Replit-managed Clerk indique explicitement : "Not supported today: SMS/phone sign-in, MFA, organization tenants".

## How to apply
- Toutes les "organisations" (entreprises clientes) sont gérées en base de données (table `organizations`).
- La table `members` fait le lien entre `users` et `organizations` avec un rôle (owner/admin/member/viewer).
- JIT-provisioning : les users sont créés en DB à leur première requête authentifiée via `getOrCreateUser(clerkUserId)`.
- `requireAuth` middleware extrait `clerkUserId` via `getAuth(req)` de `@clerk/express`.
