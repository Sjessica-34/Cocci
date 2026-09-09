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

Pour les `PUT` présignés envoyés directement par le navigateur, configurer le
client AWS SDK avec `requestChecksumCalculation: 'WHEN_REQUIRED'` et ne pas
ajouter de checksum au `PutObjectCommand` tant que le frontend n’envoie pas
explicitement un checksum correspondant au fichier.

**Pourquoi:** les versions récentes du SDK peuvent ajouter automatiquement un
CRC32 vide dans la query string de l’URL présignée. R2 peut alors rejeter le
preflight ou le `PUT` avant de renvoyer les en-têtes CORS, même si l’origine,
la méthode et `Content-Type` sont autorisés.

**Comment appliquer:** après toute mise à jour du SDK S3, générer une URL de
test et vérifier l’absence de `x-amz-checksum-crc32` et
`x-amz-sdk-checksum-algorithm` pour les uploads navigateur.