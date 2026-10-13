---
name: Sièges supplémentaires Stripe
description: Décision métier sur la facturation et le suivi des utilisateurs Cocci supplémentaires.
---

Chaque utilisateur supplémentaire est ajouté comme article récurrent de 3 € TTC/mois à l’abonnement Stripe actif de l’organisation. Ne pas créer un abonnement Stripe séparé par siège.

**Why:** l’application suit un abonnement par organisation; un abonnement distinct risquerait de remplacer l’abonnement principal et ses droits.

Chaque siège supplémentaire correspond à une invitation réelle envoyée à une adresse e-mail pour rejoindre la même organisation Cocci. Les invitations en attente occupent un siège réservé; à l’acceptation, le compte Clerk doit être rattaché à l’adhésion locale.

**Why:** le client achète l’accès d’un collaborateur, pas une hausse abstraite d’une limite.

**How to apply:** après confirmation Stripe, envoyer l’invitation Clerk avec l’organisation et le rôle visés; ne jamais créer une nouvelle organisation ou un abonnement séparé. Conserver la réservation si l’envoi doit être relancé, sans refacturer le siège.

Une organisation peut envoyer plusieurs invitations tant qu’elle a des sièges disponibles. Chaque invitation conserve son adresse, son rôle, son initiateur et son état (en attente, acceptée, expirée ou révoquée); une expiration libère le siège, et un renvoi réutilise le siège déjà acheté.

**Why:** les sièges couvrent des personnes réelles, et une invitation non acceptée ne doit ni bloquer le quota indéfiniment ni déclencher une seconde facturation lors d’un renvoi.

**How to apply:** faire revenir les liens Clerk vers Cocci pour finaliser l’adhésion locale dans la même organisation; autoriser renvoi et annulation depuis la liste des membres et ne jamais ajouter un article Stripe au seul motif d’un renvoi.

Après acceptation d’une invitation Clerk, rattacher l’utilisateur à l’adhésion de l’organisation invitante et marquer son onboarding comme terminé. Une invitation en attente doit être résolue avant les redirections d’onboarding; `not_started` avec une organisation principale n’est pas une demande de création d’entreprise.

**Why:** les comptes invités peuvent commencer avec un état d’onboarding vierge; les traiter comme de nouveaux clients provoque des boucles entre les étapes et peut proposer une organisation en double.

**How to apply:** finaliser l’adhésion et l’état d’onboarding côté serveur, attendre la résolution des données dans les guards et afficher un état de chargement ou d’erreur explicite plutôt qu’une page blanche.

**How to apply:** conserver la validation serveur du prix inclusif de 3 € et synchroniser le quota de membres avec la quantité d’articles sur l’abonnement existant. Une facture `subscription_update` refusée ne doit pas suspendre l’abonnement payé de base : `error_if_incomplete` laisse l’ajustement non appliqué.

Une demande d’ajout doit enregistrer les paramètres exacts de mise à jour avant l’appel Stripe, puis reprendre une tentative en attente avec ces mêmes paramètres et la même clé Stripe. Une autre clé ne doit pas démarrer tant que cette tentative est en attente.

**Why:** Stripe peut accepter la mise à jour avant qu’un serveur ne perde sa réponse ou ne réussisse à enregistrer le résultat local; recalculer la quantité au nouvel essai pourrait facturer un deuxième siège.

**How to apply:** persister une tentative par organisation avec son résultat attendu, utiliser une clé Stripe dérivée de la clé de requête du client et compléter le quota local et le résultat idempotent dans une transaction après l’acceptation Stripe.
