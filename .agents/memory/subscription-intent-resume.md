---
name: Reprise d’intention de souscription
description: Règle produit pour conserver une demande de souscription pendant l’authentification et l’onboarding.
---

Conserver l’intention explicite de souscrire séparément de la simple formule sélectionnée. Ne créer une session Stripe Checkout qu’après une authentification réussie, la création de l’organisation, la vérification des droits et du statut d’abonnement.

**Why:** le parcours doit demander un seul clic sur « Souscrire » tout en évitant de créer des clients, sessions ou abonnements Stripe sans utilisateur ni organisation associés.

**How to apply:** propager l’intention à travers connexion, inscription et onboarding ; la consommer quand Checkout est effectivement créé ; l’effacer si un abonnement Stripe actif est détecté. Ne pas reprendre Checkout après une simple consultation de formule.