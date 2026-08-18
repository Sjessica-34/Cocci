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

## Pas de webhook_secret dans settings

La clé `settings.webhook_secret` n'existe pas dans la réponse connectors. Le secret webhook est géré automatiquement par `stripeSync.findOrCreateManagedWebhook(url)`.

**Why:** La réponse API des connectors Replit ne retourne pas le webhook secret — il est géré côté stripe-replit-sync via la table `stripe._managed_webhooks`.
