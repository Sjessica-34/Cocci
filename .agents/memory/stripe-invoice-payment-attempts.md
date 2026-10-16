---
name: Tentatives de paiement Stripe
description: Reprise d’accès lorsque plusieurs tentatives de paiement sont liées à une même facture Stripe.
---

Une facture Stripe peut contenir plusieurs tentatives de paiement, par exemple un prélèvement SEPA refusé puis un autre réussi. Le champ de paiement historique ou le premier élément de `payments.data` peut donc ne pas représenter le résultat final.

**Why:** Un paiement réussi de facture restait ignoré quand la logique choisissait seulement le premier PaymentIntent, laissant le compte suspendu malgré la régularisation.

**How to apply:** Pour confirmer une facture payée, récupérer tous les PaymentIntents liés à la facture et retenir un PaymentIntent `succeeded`. Conserver en parallèle les contrôles de facture payée, abonnement courant, dettes ouvertes et litiges.
