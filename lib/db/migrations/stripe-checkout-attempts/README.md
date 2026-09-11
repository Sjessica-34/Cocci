# Tentatives Checkout Stripe

Cette migration crée le registre qui distingue une nouvelle tentative de paiement
d'un ancien événement Stripe retardé ou rejoué.

Elle est additive et idempotente. Elle ne modifie aucune ligne de `subscriptions`
et ne doit pas être exécutée automatiquement sur Neon préproduction.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f lib/db/migrations/stripe-checkout-attempts/phase1_schema.sql
```