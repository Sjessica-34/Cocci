# Configuration Stripe portable

L'application utilise le SDK officiel `stripe` et le Checkout hébergé. Elle ne
dépend d'aucun connecteur, domaine ou schéma de base de données propre à un
hébergeur.

## Variables du serveur

Configurer ces variables dans chaque environnement (développement, préproduction
et production) :

| Variable                 | Obligatoire                                 | Usage                                                                                                 |
| ------------------------ | ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`      | Oui pour les opérations Stripe              | Clé secrète `sk_test_…` ou `sk_live_…` utilisée par l'API et les scripts de catalogue.                |
| `STRIPE_WEBHOOK_SECRET`  | Oui pour recevoir les webhooks              | Secret de signature `whsec_…` de l'endpoint propre à cet environnement.                               |
| `APP_URL`                | Oui pour Checkout, le portail et les emails | URL publique absolue de la SPA, par exemple `https://app.example.com`, sans query string ni fragment. |
| `STRIPE_PUBLISHABLE_KEY` | Non actuellement                            | Clé publiable `pk_test_…` ou `pk_live_…`, à réserver à un futur usage de Stripe.js.                   |

Le Checkout actuel est entièrement hébergé par Stripe : le navigateur demande
une session à l'API puis suit l'URL retournée. Il ne charge pas Stripe.js et ne
doit donc pas recevoir `STRIPE_PUBLISHABLE_KEY`.

Les identifiants de produits et de prix restent également des variables privées
du serveur (`STRIPE_COCCI_PRODUCT_ID`, `STRIPE_COCCI_PRICE_*`,
`STRIPE_ADDITIONAL_USER_PRODUCT_ID` et
`STRIPE_ADDITIONAL_USER_PRICE_ID`). Le navigateur ne peut transmettre qu'une
clé métier de tranche d'effectif ou l'action autorisée.

L'ajout d'un utilisateur s'applique à l'abonnement Stripe existant comme un
article récurrent distinct. Le prix doit être de **3,00 EUR, avec
`tax_behavior=inclusive`**, récurrent mensuellement. Le serveur refuse tout
prix qui n'est pas exactement configuré ainsi. L'ajout facture le prorata
immédiatement, puis le montant mensuel complet à chaque renouvellement.
Configurer le portail client Stripe pour permettre la gestion des articles de
l'abonnement; les webhooks synchronisent la limite de membres si la quantité
de cet article est modifiée dans Stripe.

## Endpoint webhook Stripe

Créer manuellement, dans le Dashboard Stripe de chaque environnement, un
endpoint vers :

```text
https://<domaine-api>/api/stripe/webhook
```

Copier son secret de signature dans `STRIPE_WEBHOOK_SECRET`. Les événements
traités par l'application sont :

- `checkout.session.completed`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

La route lit le corps brut, vérifie la signature avant tout traitement, puis met
à jour la table locale `subscriptions`. Une signature invalide ou une erreur de
traitement reçoit une réponse non-2xx pour permettre à Stripe de réessayer.

Les anciennes tables `stripe.*` peuvent rester dans une base migrée, mais elles
ne sont plus consultées ni synchronisées par l'application.

## Scripts de catalogue

Les scripts utilisent eux aussi uniquement `STRIPE_SECRET_KEY` :

```bash
pnpm --filter @workspace/scripts run seed:stripe
pnpm --filter @workspace/scripts exec tsx src/seed-onboarding-plans.ts
```

Exécuter les scripts avec une clé de test ou de production selon le catalogue
visé, puis reporter les IDs affichés dans les variables privées du serveur.