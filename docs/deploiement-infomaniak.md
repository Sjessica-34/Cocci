# Déploiement de Cocci sur un site Node.js Infomaniak

Le dépôt est un monorepo `pnpm`. Le build utilise `npx` pour amorcer la version
pnpm verrouillée, sans dépendre d’un pnpm global. L’API Express sert aussi le build Vite de
l’interface, ce qui permet de déployer les deux sur un seul site et une seule
origine. La base reste PostgreSQL; ne pas la remplacer par MariaDB.

## Réglages du site Infomaniak

- **Version Node.js :** Node.js 22 LTS.
- **Dossier d’exécution :** `./` (racine du dépôt, qui contient
  `pnpm-workspace.yaml`).
- **Commande Build :**

  ```sh
  npx --yes pnpm@10.26.1 install --frozen-lockfile && npx --yes pnpm@10.26.1 run build:infomaniak
  ```

- **Commande Start :**

  ```sh
  node artifacts/api-server/dist/index.mjs
  ```

- **Port :** reprendre celui configuré dans le Manager. Infomaniak le transmet
  dans `PORT`; ne pas le fixer dans le code.

Le build Vite utilise `/` comme base par défaut hors Replit. Sur Infomaniak, ne
pas définir `BASE_PATH` ni `VITE_API_URL`. `VITE_CLERK_PUBLISHABLE_KEY` doit
être disponible pendant le build frontend; la modifier nécessite un nouveau
build.

## Variables d’environnement

À définir dans la configuration du site Node.js, jamais dans Git.

### Obligatoires

| Variable | Utilisation |
| --- | --- |
| `NODE_ENV=production` | Active les réglages de production. |
| `PORT` | Fourni par Infomaniak; le code refuse de démarrer sans lui. |
| `DATABASE_URL` | URL de la base PostgreSQL de production, avec TLS si le fournisseur l’exige. |
| `APP_URL` | Origine publique HTTPS, par exemple `https://cocci.example`; utilisée par les retours Stripe et les liens d’e-mail. |
| `ALLOWED_ORIGINS` | URL exacte d’`APP_URL`, même si interface et API sont sur la même origine. |
| `CLERK_SECRET_KEY` | Clé secrète de l’instance Clerk de production. |
| `CLERK_PUBLISHABLE_KEY` | Clé publique Clerk utilisée par le serveur. |
| `VITE_CLERK_PUBLISHABLE_KEY` | Même clé publique, injectée au build Vite. |
| `ANTHROPIC_API_KEY` | Clé Anthropic directe pour les analyses IA. |
| `OPENAI_API_KEY` | Clé OpenAI directe pour les textes IA du rapport. |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe LIVE. |
| `STRIPE_WEBHOOK_SECRET` | Secret de signature du webhook Stripe LIVE. |
| `STRIPE_COCCI_PRODUCT_ID` | Produit Stripe Cocci. |
| `STRIPE_COCCI_PRICE_1_5`, `STRIPE_COCCI_PRICE_6_10`, `STRIPE_COCCI_PRICE_11_25`, `STRIPE_COCCI_PRICE_26_50`, `STRIPE_COCCI_PRICE_51_100`, `STRIPE_COCCI_PRICE_101_250` | Prix Stripe LIVE associés aux tranches d’effectif. |
| `STRIPE_ADDITIONAL_USER_PRODUCT_ID`, `STRIPE_ADDITIONAL_USER_PRICE_ID` | Produit et prix LIVE pour un utilisateur supplémentaire. |

### Requises si les fichiers et pièces jointes sont utilisés

Le stockage R2 est indépendant de l’hébergeur Node.js. Conserver le bucket
Cloudflare R2 et définir `R2_ACCOUNT_ID` (ou `R2_ENDPOINT`), `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY` et `R2_BUCKET_NAME`. Régler aussi le CORS du bucket pour
l’origine de Cocci afin d’autoriser les uploads présignés du navigateur.
`R2_PUBLIC_PREFIXES` et `R2_PRIVATE_PREFIX` sont facultatives et ont des valeurs
par défaut.

### Facultatives

- Pour un domaine API distinct, ajouter son origine et les autres origines
  autorisées, séparées par des virgules, à `ALLOWED_ORIGINS`.
- `OPENAI_REPORT_MODEL` : modèle OpenAI des textes du rapport; défaut
  `gpt-4o-mini`.
- `OPENAI_BASE_URL`, `ANTHROPIC_BASE_URL` : uniquement pour un endpoint
  compatible différent des APIs officielles.
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` : envoi des e-mails transactionnels.
- `LOG_LEVEL` : niveau Pino, défaut `info`.

Les variables `AI_INTEGRATIONS_*`, `REPL_ID`, `BASE_PATH`,
`DEFAULT_OBJECT_STORAGE_BUCKET_ID` et les autres variables propres à Replit ne
sont pas nécessaires sur Infomaniak.

## Base et opérations avant mise en production

1. Créer une base PostgreSQL externe, autoriser les connexions depuis
   l’hébergement Infomaniak et définir `DATABASE_URL`.
2. Sauvegarder la base de production avant toute évolution du schéma. Examiner
   les scripts SQL versionnés dans `lib/db/migrations/` et appliquer les
   migrations nécessaires explicitement; ne pas lancer `drizzle-kit push` à
   chaque démarrage ni dans une mise à jour non vérifiée.
3. Créer/configurer les clés de production Clerk, le domaine autorisé et les
   URLs de redirection/sign-in. Utiliser les clés de production, pas les clés
   Clerk de développement.
4. Configurer le webhook Stripe LIVE sur
   `https://<domaine>/api/stripe/webhook` et utiliser son secret de signature.
5. Vérifier le CORS R2, les e-mails de départ, les offres Stripe et les clés
   OpenAI/Anthropic avant d’ouvrir les comptes clients.

## Source des consignes Infomaniak

- [Modifier la configuration d’un site Node.js](https://www.infomaniak.com/fr/support/faq/2535/modifier-la-configuration-dun-site-nodejs-infomaniak)
- [Résoudre un problème de site Node.js](https://www.infomaniak.com/fr/support/faq/2536/resoudre-un-probleme-de-site-nodejs)
