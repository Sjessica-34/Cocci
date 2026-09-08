# Préproduction Render avec Cloudflare R2

L’API utilise l’API S3 compatible de Cloudflare R2 pour les fichiers objets.
PostgreSQL, Clerk et le modèle métier restent inchangés.

## Variables Render

À définir dans l’environnement Render de l’API :

- `NODE_ENV=production`
- `R2_ACCOUNT_ID` **ou** `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

Variables facultatives :

- `R2_PRIVATE_PREFIX` — préfixe privé, par défaut `objects`
- `R2_PUBLIC_PREFIXES` — préfixes publics séparés par des virgules, par défaut
  `public`

Les deux variables d’accès R2 sont des secrets. Elles sont lues uniquement via
`process.env`, ne doivent pas être copiées dans le dépôt et ne doivent pas être
transmises dans le chat.

Si `R2_ENDPOINT` n’est pas renseigné, l’API construit l’endpoint standard à
partir de `R2_ACCOUNT_ID` :
`https://<account-id>.r2.cloudflarestorage.com`.

## CORS du bucket R2

Les uploads sont envoyés directement depuis le navigateur vers l’URL présignée.
Le bucket R2 doit donc autoriser l’origine Render de l’application. Exemple à
adapter au domaine de préproduction :

```json
[
  {
    "AllowedOrigins": ["https://<domaine-render-de-preproduction>"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Cette règle ne rend pas les objets privés publics. Les objets privés sont servis
par l’API après vérification de l’adhésion active et de la politique ACL stockée
dans les métadonnées R2.

## Flux conservé

1. L’API vérifie la session Clerk et l’adhésion à l’organisation.
2. L’API crée une autorisation temporaire en PostgreSQL et renvoie une URL R2
   présignée `PUT`.
3. Le navigateur envoie directement le fichier vers R2.
4. L’API vérifie l’autorisation, l’existence de l’objet et l’adhésion encore
   active, puis écrit la politique ACL dans les métadonnées R2.
5. Les téléchargements passent par l’API et conservent les contrôles
   propriétaire/organisation existants.

## Vérification de préproduction

Avec des valeurs R2 configurées uniquement dans Render :

1. vérifier que le build et le démarrage se font avec `NODE_ENV=production` ;
2. demander une URL d’upload et vérifier qu’elle cible R2, sans la journaliser ;
3. envoyer un petit fichier puis appeler la finalisation ;
4. vérifier le téléchargement par un membre autorisé ;
5. vérifier le refus pour une autre organisation ;
6. révoquer l’adhésion et vérifier le refus immédiat ;
7. vérifier les préfixes publics si `R2_PUBLIC_PREFIXES` est utilisé.

Aucune clé Cloudflare n’est nécessaire dans le dépôt ou dans le frontend.