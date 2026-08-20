---
name: Confirmation de souscription
description: Règle de parcours après un paiement Stripe réussi.
---

Après un paiement Stripe réussi, revenir sur une page de confirmation dédiée plutôt que sur le catalogue d'offres. Cette page doit afficher la formule souscrite, proposer l'accès à l'espace pour une session valide et la connexion dans le cas contraire.

**Why:** un retour vers les offres juste après le paiement donne l'impression que la souscription n'est pas terminée et invite à choisir de nouveau une formule.

**How to apply:** construire l'URL de succès Checkout côté serveur avec une clé métier de formule, jamais un identifiant Stripe ; laisser le catalogue à la gestion volontaire de l'abonnement.