---
name: Invitations Clerk préconstruites
description: Conserver le parcours standard Clerk pour les invités Cocci sans compte.
---

Les invités Cocci sans compte doivent pouvoir créer leur compte et leur mot de passe dans le parcours préconstruit Clerk, puis arriver dans l’organisation invitante sans onboarding de création d’organisation.

**Why:** Dans l’API Clerk, `createInvitation.redirectUrl` sélectionne un flux d’invitation personnalisé qui ajoute `__clerk_ticket`; la page doit alors traiter ce ticket avec `signUp.ticket()`. Le handler Cocci ne le faisait pas et renvoyait l’invité à la connexion.

**How to apply:** Pour le flux préconstruit, omettre `redirectUrl` lors de la création et du renvoi d’invitations. Après authentification, laisser le provisioning JIT rattacher l’invitation en attente, puis choisir `primaryOrganizationId` comme organisation active si aucune sélection valide n’existe déjà.
