---
name: Diagnostic Stripe admin
description: Invariants de sécurité pour expliquer à un administrateur une suspension liée à Stripe.
---

Un diagnostic Stripe destiné à l’administration renvoie uniquement les indicateurs nécessaires (facture impayée, paiement en attente, litige non résolu). Il ne modifie jamais l’accès et ne divulgue ni montants, ni identifiants Stripe, ni moyens de paiement, ni détails de litige. Une vérification indisponible signifie « inconnu », jamais « aucun blocage ».

**Why:** Une réponse Stripe indisponible ne prouve pas que les paiements sont réglés; réactiver l’accès à partir d’un état inconnu créerait un contournement de suspension.

**How to apply:** Garder les vérifications d’administration en lecture seule, réduire leur réponse à des indicateurs sans donnée de paiement, et rendre l’état indisponible distinct d’un diagnostic sans blocage.
