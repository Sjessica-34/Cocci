---
name: Hausses de formule Cocci
description: Règle métier pour les changements de formule d’un abonnement Stripe actif.
---

Un client Cocci ayant un abonnement Stripe actif peut choisir toute formule d’effectif supérieure à la formule actuelle. La hausse modifie l’abonnement Stripe existant et applique immédiatement le prorata Stripe. Les formules égales ou inférieures ne sont pas sélectionnables.

**Why:** l’utilisateur a confirmé que toutes les formules supérieures doivent être disponibles et que la hausse prend effet immédiatement avec prorata.

**How to apply:** lors de changements au catalogue, au parcours d’abonnement ou aux webhooks, ne jamais créer une deuxième souscription pour une hausse; conserver les éventuels sièges supplémentaires et synchroniser la formule depuis Stripe.
