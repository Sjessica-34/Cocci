---
name: Invitations Clerk préconstruites
description: Conserver le parcours standard Clerk pour les invités Cocci sans compte.
---

Les invités Cocci sans compte doivent pouvoir créer leur compte et leur mot de passe dans le parcours préconstruit Clerk, puis arriver dans l’organisation invitante sans onboarding de création d’organisation.

**Why:** Sans `redirectUrl`, Clerk a envoyé les invités Cocci sur `default_redirect`, une page de Clerk non connectée à l’application. Avec un `redirectUrl` Cocci, Clerk ajoute `__clerk_ticket`; la route de retour doit monter le composant préconstruit `<SignUp />`, qui gère l’invitation, puis finaliser le rattachement côté Cocci.

**How to apply:** Fournir `/accept-invitation` comme `redirectUrl` à la création et au renvoi; cette route doit conserver `organizationId`, monter `<SignUp />` avec le ticket Clerk présent dans l’URL et rediriger après connexion vers la même route pour rattacher l’invité à l’organisation avant `/dashboard`. Ne pas appeler `signUp.ticket()` sauf si le flux préconstruit est remplacé par un flux personnalisé.
