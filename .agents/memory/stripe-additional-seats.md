---
name: Sièges supplémentaires Stripe
description: Décision métier sur la facturation et le suivi des utilisateurs Cocci supplémentaires.
---

Chaque utilisateur supplémentaire est ajouté comme article récurrent de 3 € TTC/mois à l’abonnement Stripe actif de l’organisation. Ne pas créer un abonnement Stripe séparé par siège.

**Why:** l’application suit un abonnement par organisation; un abonnement distinct risquerait de remplacer l’abonnement principal et ses droits.

Chaque siège supplémentaire correspond à une invitation réelle envoyée à une adresse e-mail pour rejoindre la même organisation Cocci. Les invitations en attente occupent un siège réservé; à l’acceptation, le compte Clerk doit être rattaché à l’adhésion locale.

**Why:** le client achète l’accès d’un collaborateur, pas une hausse abstraite d’une limite.

**How to apply:** après confirmation Stripe, envoyer l’invitation Clerk avec l’organisation et le rôle visés; ne jamais créer une nouvelle organisation ou un abonnement séparé. Conserver la réservation si l’envoi doit être relancé, sans refacturer le siège.

**How to apply:** conserver la validation serveur du prix inclusif de 3 € et synchroniser le quota de membres avec la quantité d’articles sur l’abonnement existant. Une facture `subscription_update` refusée ne doit pas suspendre l’abonnement payé de base : `error_if_incomplete` laisse l’ajustement non appliqué.

Une demande d’ajout doit enregistrer les paramètres exacts de mise à jour avant l’appel Stripe, puis reprendre une tentative en attente avec ces mêmes paramètres et la même clé Stripe. Une autre clé ne doit pas démarrer tant que cette tentative est en attente.

**Why:** Stripe peut accepter la mise à jour avant qu’un serveur ne perde sa réponse ou ne réussisse à enregistrer le résultat local; recalculer la quantité au nouvel essai pourrait facturer un deuxième siège.

**How to apply:** persister une tentative par organisation avec son résultat attendu, utiliser une clé Stripe dérivée de la clé de requête du client et compléter le quota local et le résultat idempotent dans une transaction après l’acceptation Stripe.
