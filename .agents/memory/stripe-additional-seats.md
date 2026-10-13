---
name: Sièges supplémentaires Stripe
description: Décision métier sur la facturation et le suivi des utilisateurs Cocci supplémentaires.
---

Chaque utilisateur supplémentaire est ajouté comme article récurrent de 3 € TTC/mois à l’abonnement Stripe actif de l’organisation. Ne pas créer un abonnement Stripe séparé par siège.

**Why:** l’application suit un abonnement par organisation; un abonnement distinct risquerait de remplacer l’abonnement principal et ses droits.

**How to apply:** conserver la validation serveur du prix inclusif de 3 € et synchroniser le quota de membres avec la quantité d’articles sur l’abonnement existant. Une facture `subscription_update` refusée ne doit pas suspendre l’abonnement payé de base : `error_if_incomplete` laisse l’ajustement non appliqué.
