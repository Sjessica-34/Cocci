---
name: Autorité des tentatives Checkout Stripe
description: Règle de cohérence entre Checkouts, souscriptions, PaymentIntents et accès local.
---

Un événement Stripe ne doit modifier l’abonnement local que s’il est rattaché à la tentative Checkout courante de l’organisation, avec cohérence d’organisation, customer, session et souscription lorsque ces identifiants sont disponibles.

**Why:** Les événements Stripe peuvent arriver en retard, être dupliqués ou être rejoués après une nouvelle tentative. Une correspondance limitée au customer ou à l’organisation peut donc réactiver ou suspendre la mauvaise tentative.

**How to apply:** Conserver une seule tentative `pending` exploitable par organisation, rendre les précédentes `superseded`, et faire vérifier la tentative avant toute transition `suspended → trial`, `trial → suspended` ou `trial → active`.