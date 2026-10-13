---
name: Invitations Clerk préconstruites
description: Conserver le parcours standard Clerk pour les invités Cocci sans compte.
---

Les invités Cocci sans compte doivent pouvoir créer leur compte et leur mot de passe dans le parcours préconstruit Clerk, puis arriver dans l’organisation invitante sans onboarding de création d’organisation.

Le flux d’invitation exige aussi que la migration `organization-invitations/phase1_schema.sql` soit appliquée à chaque base cible avant l’envoi. L’API crée l’invitation Clerk puis la consigne dans `organization_invitations`; si cette écriture échoue, elle révoque l’invitation Clerk et annule l’adhésion locale.

**Why:** Sans `redirectUrl`, Clerk a envoyé les invités Cocci sur `default_redirect`, une page de Clerk non connectée à l’application. Avec un `redirectUrl` Cocci, Clerk ajoute `__clerk_ticket`; la route de retour doit monter le composant préconstruit `<SignUp />`, qui gère l’invitation, puis finaliser le rattachement côté Cocci.

**How to apply:** Fournir `/accept-invitation` comme `redirectUrl` à la création et au renvoi, avec `organizationId` et l’adresse invitée; cette route doit monter `<SignUp />` avec le ticket Clerk présent dans l’URL et rediriger après connexion vers la même route pour rattacher l’invité à l’organisation avant `/dashboard`. Si une autre adresse est déjà connectée, fermer cette session et reprendre le ticket pour permettre la création du compte invité. Appliquer et vérifier la migration des invitations sur la base de chaque environnement avant les essais. Ne pas appeler `signUp.ticket()` sauf si le flux préconstruit est remplacé par un flux personnalisé.
