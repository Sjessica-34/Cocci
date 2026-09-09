---
name: Redirection après réinitialisation du mot de passe
description: Parcours attendu pour une connexion Clerk classique après récupération de compte.
---

La réinitialisation du mot de passe est un retour vers la connexion classique : une connexion réussie via la page SignIn doit forcer `/dashboard`. Le parcours d’onboarding reste réservé aux comptes authentifiés qui n’ont encore aucune organisation.

**Pourquoi:** Clerk peut conserver une URL de retour liée au parcours de récupération, et une liste d’organisations encore en rafraîchissement peut être momentanément vide.

**Comment appliquer:** conserver la redirection forcée de SignIn vers le tableau de bord et attendre la fin du chargement/rafraîchissement de la liste des organisations avant de rediriger vers onboarding.