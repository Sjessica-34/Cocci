---
name: Stripe Replit credentials
description: Comment accéder aux credentials Stripe via l'API Replit connectors — champs exacts et pièges.
---

## Champ exact du secret Stripe

Le secret key Stripe s'appelle **`settings.secret`** (pas `secret_key`).
La publishable key s'appelle **`settings.publishable`**.

```typescript
const settings = data.items?.[0]?.settings;
const secretKey = settings.secret;         // ✅
// settings.secret_key                     // ❌ undefined
```

## Endpoint et header corrects

```typescript
const resp = await fetch(
  `https://${process.env.REPLIT_CONNECTORS_HOSTNAME}/api/v2/connection?include_secrets=true&connector_names=stripe`,
  { headers: { "X-Replit-Token": "repl " + process.env.REPL_IDENTITY } }
);
```

**Le header s'appelle `X-Replit-Token`** (tiret, pas underscore).

## Migrations stripe-replit-sync

`runMigrations({ databaseUrl })` — le paramètre `schema` n'existe pas (il est ignoré).
**La première fois**, les tables peuvent ne pas être créées lors du premier démarrage serveur si le schéma venait d'être créé dans la même session. Lancer une fois manuellement :
```
node --input-type=module -e "import { runMigrations } from 'stripe-replit-sync'; await runMigrations({ databaseUrl: process.env.DATABASE_URL });"
```

## Leçons durables stripe-replit-sync

- `syncBackfill()` sans paramètre ne synchronise RIEN — utiliser les syncs explicites (produits, prix, clients, abonnements).
- Le secret webhook vit dans `stripe._managed_webhooks`, jamais dans les settings du connector. Le résoudre par **URL d'endpoint** (plusieurs lignes coexistent après un changement de domaine) et vérifier la signature soi-même avant tout traitement — le lookup interne de la lib fait un `LIMIT 1` par compte, ambigu.
- Un échec de traitement webhook (secret introuvable, signature, erreur DB) doit répondre non-2xx, sinon Stripe ne réessaie jamais.

**How to apply:** toute intégration webhook/sync Stripe sur ce projet.

## Pas de webhook_secret dans settings

La clé `settings.webhook_secret` n'existe pas dans la réponse connectors. Le secret webhook est géré automatiquement par `stripeSync.findOrCreateManagedWebhook(url)`.

**Why:** La réponse API des connectors Replit ne retourne pas le webhook secret — il est géré côté stripe-replit-sync via la table `stripe._managed_webhooks`.
