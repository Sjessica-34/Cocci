---
name: Cloudflare R2 sur Render
description: Contraintes durables du stockage objet R2 pour les uploads directs et les ACL privées.
---

Le stockage R2 utilisé par Render doit exposer les uploads directs via des URLs
présignées S3 et conserver la politique ACL dans les métadonnées utilisateur de
l’objet. Les noms de métadonnées doivent rester compatibles avec les en-têtes
S3, donc utiliser une clé normalisée sans caractère `:` et lire l’ancienne clé
en compatibilité si nécessaire.

**Pourquoi:** le navigateur ne passe pas par l’API pour envoyer le contenu, et
R2 ne fournit pas les contrôles métier d’organisation. L’API doit donc signer
l’upload, finaliser l’objet après vérification, puis refaire le contrôle ACL à
chaque téléchargement. Les URLs présignées depuis un navigateur nécessitent
également une règle CORS sur le bucket R2 pour le domaine Render.

**Comment appliquer:** ne jamais mettre les identifiants R2 dans le frontend ou
le dépôt; lire uniquement `process.env`, garder PostgreSQL/Clerk indépendants,
et tester le refus inter-organisation ainsi que le refus après révocation
d’adhésion dans l’environnement Render.