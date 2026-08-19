# Audit de sortie de Replit

Date de l’audit : 19 août 2026  
Périmètre : API, application web, Canvas/mockup sandbox, scripts et bibliothèques partagées  
Nature : audit documentaire en lecture seule

## 1. Synthèse

Le projet n’est pas entièrement portable en l’état. Son socle Node.js, React, Express,
PostgreSQL, Drizzle et pnpm est standard, mais quatre fonctions de production reposent
sur des services ou conventions Replit :

1. **Paiement Stripe** : récupération des credentials via le connecteur Replit,
   synchronisation `stripe-replit-sync`, webhook géré et tables `stripe.*`.
2. **Authentification** : tenant Clerk géré par Replit, résolution de clé par hostname
   et proxy Clerk spécifique au déploiement Replit.
3. **Stockage d’objets** : credentials et URLs signées fournis par un sidecar local
   Replit inaccessible sur un hébergeur classique.
4. **Fonctions IA** : appels Anthropic et OpenAI acheminés par les proxies Replit AI
   Integrations et leurs variables dédiées.

La base PostgreSQL est techniquement portable grâce à `DATABASE_URL`, mais sa migration
est un prérequis majeur : elle contient les données métier, les identifiants Clerk,
les abonnements locaux, ainsi qu’une partie des fichiers directement en `bytea`.

Les plugins Vite `@replit/*`, les fichiers d’artifact, `.replit`, les workflows et le
Canvas sont principalement des outils de développement et de prévisualisation. Ils ne
sont pas nécessaires au fonctionnement métier en production, mais leurs conventions
de ports, de chemins de base et de routage doivent être reproduites par l’hébergeur
cible.

## 2. Niveaux de criticité

| Niveau | Définition |
|---|---|
| **Bloquant** | L’application ou une fonction essentielle ne peut pas fonctionner hors Replit sans remplacement préalable. |
| **Fonctionnel** | Le cœur de l’application démarre, mais une fonction identifiée devient indisponible. |
| **Configuration** | Le composant est portable, mais exige une nouvelle URL, variable ou configuration d’hébergement. |
| **Développement** | Dépendance utile uniquement à l’Agent, au Canvas, à la prévisualisation ou au confort de développement. |

## 3. Matrice des dépendances

### 3.1 Paiement Stripe

**Criticité : Bloquant pour Checkout, portail et suivi d’abonnement**

| Élément Replit | Preuves | Impact hors Replit | Remplacement portable |
|---|---|---|---|
| Broker de credentials Stripe | `artifacts/api-server/src/stripeClient.ts:4-34`, `scripts/src/stripeClient.ts:3-30` | Absence de `REPLIT_CONNECTORS_HOSTNAME`, `REPL_IDENTITY` et `WEB_REPL_RENEWAL` ; aucune clé Stripe n’est disponible. | SDK officiel `stripe` avec `STRIPE_SECRET_KEY` dans le gestionnaire de secrets de l’hébergeur. |
| Synchronisation propriétaire | `package.json:22-25`, `artifacts/api-server/src/stripeClient.ts:41-50`, `artifacts/api-server/src/index.ts:3-27` | Migrations, webhook géré et backfill ne démarrent plus. | Webhook Stripe officiel, logique métier locale et migrations applicatives versionnées. |
| Secret de webhook en table gérée | `artifacts/api-server/src/webhookHandlers.ts:46-105` | La signature ne peut plus être vérifiée car le secret est recherché dans `stripe._managed_webhooks`. | `STRIPE_WEBHOOK_SECRET`, corps HTTP brut et `stripe.webhooks.constructEvent`. |
| État synchronisé `stripe.*` | `artifacts/api-server/src/routes/subscriptions.ts:66-80` | La consultation d’abonnement dépend d’un schéma alimenté par `stripe-replit-sync`. | Base métier locale alimentée par les webhooks, complétée au besoin par des lectures Stripe directes. |
| Domaine de webhook et retours | `artifacts/api-server/src/index.ts:14-15`, `artifacts/api-server/src/routes/subscriptions.ts:145-162,199-207`, `artifacts/api-server/src/webhookHandlers.ts:176-185` | `REPLIT_DOMAINS` disparaît ; webhook, retours Checkout/portail et liens email peuvent être invalides. | URL publique explicite, par exemple `APP_PUBLIC_URL` et éventuellement `API_PUBLIC_URL`. |

La **Task #52 — Migrer Stripe vers SDK officiel** traite déjà ce sous-ensemble. Cet
audit ne duplique pas sa mise en œuvre.

**Données à préserver**

- table métier `subscriptions`, notamment les associations organisation, Customer ID
  et Subscription ID ;
- statuts, formule, limites d’effectif, dates et éventuelles dérogations ;
- état utile actuellement présent dans `stripe.*` tant que la nouvelle logique ne sait
  pas le reconstruire ;
- comportement de retry des webhooks : une erreur métier persistante doit produire une
  réponse non-2xx pour permettre une nouvelle tentative Stripe.

### 3.2 Authentification Clerk gérée par Replit

**Criticité : Bloquant pour toute route authentifiée**

| Élément Replit | Preuves | Impact hors Replit | Remplacement portable |
|---|---|---|---|
| Tenant Clerk géré par Replit | `replit.md:19,39,76-79` | Les clés et la configuration du tenant ne sont pas automatiquement disponibles chez le nouvel hébergeur. | Application Clerk standard détenue par le projet, ou fournisseur alternatif avec migration explicite des identités. |
| Résolution de clé par hostname | `artifacts/animpact/src/App.tsx:2-4,66-77`, `artifacts/api-server/src/app.ts:5-7,123-131` | `publishableKeyFromHost` et le package interne Clerk supposent la configuration Replit. | Clé publiable fixe de l’instance cible, injectée côté web ; clé secrète uniquement côté API. |
| Proxy Clerk spécifique | `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts:1-81`, `artifacts/api-server/src/app.ts:69-70`, `artifacts/animpact/src/App.tsx:70,282-290` | `VITE_CLERK_PROXY_URL` peut pointer vers un proxy absent ou incorrect. | Accès Clerk standard sans proxy, ou proxy/custom domain Clerk configuré selon la documentation du fournisseur. |
| Dépendance interne frontend | `artifacts/animpact/package.json:79-89` | Le lien `@clerk/react/internal` n’est pas un contrat public à conserver. | API publique de `@clerk/react` et configuration Clerk standard. |

Les éléments standard peuvent rester : `@clerk/react`, `@clerk/express`,
`clerkMiddleware`, `getAuth`, le bearer token et le RBAC stocké en base.

**Données et contraintes à préserver**

- les lignes `users`, `members`, `organizations` et les rôles applicatifs ;
- la correspondance entre `users.clerk_id` et les utilisateurs du nouveau tenant ;
- les emails temporaires `@pending.local`, qui ne doivent pas servir seuls à fusionner
  des identités ;
- les sessions de l’ancien tenant ne survivront pas à un changement de clés : prévoir
  une reconnexion générale ;
- les Clerk user IDs étant liés à une instance, prévoir un export/import supporté ou
  une table de correspondance vérifiée, sans fusion automatique par email non vérifié.

### 3.3 Replit Object Storage

**Criticité : Bloquant pour les fichiers stockés par URL d’objet**

| Élément Replit | Preuves | Impact hors Replit | Remplacement portable |
|---|---|---|---|
| Sidecar local Replit | `artifacts/api-server/src/lib/objectStorage.ts:13-31,235-272` | `127.0.0.1:1106` n’existe pas ; l’obtention de credentials et la signature échouent. | S3 compatible avec AWS SDK v3, ou GCS avec compte de service/workload identity. |
| Conventions de bucket | `artifacts/api-server/src/lib/objectStorage.ts:44-71,114-181` | `PRIVATE_OBJECT_DIR` et `PUBLIC_OBJECT_SEARCH_PATHS` décrivent des chemins fournis par Replit, pas une configuration universelle. | Bucket, région, endpoint, préfixes publics/privés et credentials explicites. |
| Upload direct signé | `artifacts/api-server/src/routes/storage.ts:39-72`, `lib/object-storage-web/src/use-upload.ts:56-128`, `artifacts/animpact/src/hooks/useStorageUpload.ts:15-50` | Plus aucune URL PUT signée ne peut être émise. | URLs présignées S3/GCS, CORS du bucket, expiration courte et contrôle serveur des métadonnées. |
| Lecture privée incomplètement protégée | `artifacts/api-server/src/routes/storage.ts:117-166` | Le remplacement à l’identique reproduirait une route privée sans contrôle d’accès effectif. | Vérification utilisateur, organisation, propriété du fichier et autorisation avant téléchargement. |

Le projet possède parallèlement un stockage documentaire **dans PostgreSQL** :

- `lib/db/src/schema/documents.ts:9-25` stocke le contenu en `bytea` ;
- `artifacts/api-server/src/routes/documents.ts:53-124` charge et sert les fichiers
  authentifiés, avec une limite de 10 Mo.

Ce second mécanisme ne dépend pas de Replit Object Storage, mais rend la migration de
la base indispensable. Il est recommandé de le conserver lors de la première bascule
pour éviter de cumuler deux migrations de fichiers.

**Données à préserver**

- tous les objets du bucket, leurs clés, tailles, types MIME et checksums ;
- les colonnes URL telles que `justification_url` et `file_url` ;
- les `documents.content` en `bytea` et leurs tables de liens ;
- la correspondance entre anciennes URLs `/objects/...` et nouvelles clés ;
- les règles d’accès par organisation et exercice.

### 3.4 PostgreSQL géré

**Criticité : Bloquant, mais faible verrouillage technique**

| Élément | Preuves | Impact hors Replit | Remplacement portable |
|---|---|---|---|
| Connexion par `DATABASE_URL` | `lib/db/src/index.ts:1-14`, `lib/db/drizzle.config.ts:4-13` | L’API refuse de démarrer sans base. | PostgreSQL managé Railway/Render/Neon/RDS/Cloud SQL/OVH, ou PostgreSQL administré sur VPS. |
| Base automatiquement provisionnée sur Replit | `replit.md:12-13` | Le nouvel hébergeur ne reprend ni schéma ni données. | `pg_dump`/`pg_restore`, TLS, sauvegardes, restauration testée et migrations contrôlées. |

Le code Drizzle et le driver PostgreSQL sont portables. Les sujets à préparer sont
opérationnels :

- version PostgreSQL compatible ;
- connexion TLS et limite de connexions ;
- pooler si nécessaire ;
- sauvegardes et restauration ponctuelle ;
- ordre des migrations SQL ;
- vérification des extensions, collations et fuseaux horaires ;
- conservation intégrale des blobs `bytea`.

Ne pas utiliser `drizzle push` comme stratégie de migration de production.

### 3.5 Replit AI Integrations

**Criticité : Fonctionnelle — les parcours IA deviennent indisponibles**

| Élément Replit | Preuves | Fonction affectée | Remplacement portable |
|---|---|---|---|
| Proxy Anthropic | `lib/integrations-anthropic-ai/src/client.ts:1-18`, `lib/integrations-anthropic-ai/package.json:10-14` | Biodiversité, enjeux et synthèse du Baromètre Social. | API Anthropic directe avec clé fournisseur et base URL officielle, ou autre modèle avec couche d’abstraction. |
| Proxy OpenAI-compatible | `artifacts/api-server/src/routes/reportDraft.ts:180-186`, `artifacts/api-server/src/lib/generateReport.ts:200-224` | Génération de brouillons et contenus du rapport RSE. | SDK/API OpenAI directe, modèle explicitement configurable et clé fournisseur. |

Variables actuelles à remplacer :

- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY`
- `AI_INTEGRATIONS_OPENAI_BASE_URL`
- `AI_INTEGRATIONS_OPENAI_API_KEY`

Le changement de fournisseur doit conserver les timeouts, retries, limites de
concurrence et comportements de dégradation actuels. Les rapports et brouillons déjà
persistés en base doivent être conservés ; aucun état de modèle durable distinct n’a
été identifié.

### 3.6 Routage, domaine et déploiement

**Criticité : Configuration**

| Élément Replit | Preuves | Impact hors Replit | Remplacement portable |
|---|---|---|---|
| Configuration `.replit` | `.replit:1-36` | Les modules Nix, autoscale, router, workflow et post-build ne sont pas lus ailleurs. | Commandes de build/start du PaaS, ou systemd + Nginx/Caddy sur VPS. |
| Descripteurs d’artifacts | `artifacts/api-server/.replit-artifact/artifact.toml`, `artifacts/animpact/.replit-artifact/artifact.toml`, `artifacts/mockup-sandbox/.replit-artifact/artifact.toml` | Ports, chemins de preview, healthcheck et réécriture SPA ne sont pas recréés automatiquement. | Deux services ou un reverse proxy : API, frontend statique avec fallback SPA, Canvas optionnel. |
| `BASE_PATH` obligatoire | `artifacts/animpact/vite.config.ts:7-30`, `artifacts/mockup-sandbox/vite.config.ts:7-30` | Un build sans variable échoue. | Définir `/` sur un domaine dédié, ou conserver un préfixe reproduit par le reverse proxy. |
| `PORT` obligatoire | `artifacts/api-server/src/index.ts:35-47`, configurations Vite | Le processus refuse de démarrer si l’hébergeur ne fournit pas le port. | Variable `$PORT` du PaaS ; port fixe configuré pour systemd/VPS. |
| Origines Replit en développement | `artifacts/api-server/src/app.ts:13-44` | Sans `ALLOWED_ORIGINS`, le frontend de production externe est refusé. | Liste stricte des origines HTTPS du frontend. |

Le nouvel environnement doit définir clairement :

- l’URL publique frontend ;
- l’URL publique API ;
- le chemin de base frontend ;
- le routage `/api` vers Express ;
- les réécritures SPA ;
- les origines CORS ;
- les URLs de redirection Clerk et Stripe ;
- le domaine HTTPS et le renouvellement des certificats.

### 3.7 Plugins Vite et Canvas

**Criticité : Développement**

| Élément | Preuves | Décision hors Replit |
|---|---|---|
| Cartographer et bannière Replit | `artifacts/animpact/package.json:41-43`, `artifacts/animpact/vite.config.ts:35-47` | Supprimables ; déjà chargés seulement en développement lorsque `REPL_ID` existe. |
| Runtime error modal | `artifacts/animpact/vite.config.ts:5,31-35`, `artifacts/mockup-sandbox/vite.config.ts:5,31-44` | Remplacer par l’overlay Vite, Sentry/GlitchTip, ou aucun outil. |
| Catalogues et exclusions pnpm | `pnpm-workspace.yaml:9-12,35-37` | Nettoyage de dépendances, sans impact fonctionnel. |
| Canvas/mockup sandbox | `artifacts/mockup-sandbox/package.json`, `artifacts/mockup-sandbox/mockupPreviewPlugin.ts`, artifact TOML Canvas | Peut rester un serveur Vite local séparé ; ne pas le déployer en production si inutile. |

Les commentaires `@replit` dans quelques composants UI indiquent une provenance de
design et n’ont aucun effet d’exécution.

## 4. Inventaire des variables

### 4.1 Variables spécifiques à Replit à éliminer ou remplacer

| Variable | Usage actuel | Remplacement envisagé |
|---|---|---|
| `REPLIT_CONNECTORS_HOSTNAME` | Broker Stripe | Aucun ; SDK fournisseur direct. |
| `REPL_IDENTITY` | Authentification du broker en développement | Aucun. |
| `WEB_REPL_RENEWAL` | Authentification du broker en déploiement | Aucun. |
| `REPLIT_DOMAINS` | Webhook, redirections et liens | `APP_PUBLIC_URL` / `API_PUBLIC_URL`. |
| `REPL_ID` | Activation de plugins Vite Replit | Aucun. |
| `AI_INTEGRATIONS_ANTHROPIC_*` | Proxy Anthropic | Clé/base URL fournisseur standard. |
| `AI_INTEGRATIONS_OPENAI_*` | Proxy OpenAI | Clé/base URL fournisseur standard. |
| `PRIVATE_OBJECT_DIR` | Préfixe bucket privé Replit | Configuration S3/GCS explicite. |
| `PUBLIC_OBJECT_SEARCH_PATHS` | Préfixes publics Replit | Bucket/préfixes publics explicites. |

### 4.2 Variables standard à conserver ou reconfigurer

- `DATABASE_URL`
- `PORT`
- `NODE_ENV`
- `ALLOWED_ORIGINS`
- `LOG_LEVEL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

`VITE_CLERK_PROXY_URL` doit être supprimée si le futur Clerk fonctionne sans proxy, ou
reconfigurée uniquement si un proxy Clerk standard est volontairement maintenu.

`BASE_PATH` reste une convention générique, mais doit être explicitement fixée à `/`
ou au chemin publié par le nouvel hébergeur.

### 4.3 Variables futures probables

Les noms exacts devront être validés lors de chaque migration :

- Stripe : `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`,
  `STRIPE_WEBHOOK_SECRET` ;
- URLs : `APP_PUBLIC_URL`, éventuellement `API_PUBLIC_URL` ;
- stockage S3 : bucket, région, endpoint, access key et secret key ;
- ou GCS : project ID, bucket et identité de service ;
- IA : clés fournisseur, base URL et modèle sélectionné.

## 5. Données à sauvegarder avant toute bascule

1. **PostgreSQL complet**
   - dump schéma + données ;
   - tables métier et migrations ;
   - blobs `documents.content` ;
   - abonnements et identifiants externes ;
   - brouillons/rapports IA.
2. **Replit Object Storage**
   - inventaire exhaustif des clés ;
   - export des objets ;
   - tailles, types MIME et checksums ;
   - correspondance avec les URLs stockées en base.
3. **Clerk**
   - export des utilisateurs selon les possibilités du tenant ;
   - mapping ancien Clerk ID → nouveau Clerk ID ;
   - inventaire des comptes à email temporaire ;
   - plan de reconnexion.
4. **Stripe**
   - produits et prix utilisés ;
   - Customer IDs et Subscription IDs ;
   - statut des abonnements ;
   - endpoints et événements webhook utiles ;
   - données `stripe.*` nécessaires à la transition.
5. **Configuration**
   - liste des variables, sans copier les valeurs secrètes dans le dépôt ;
   - domaines, origines, redirects et callbacks ;
   - paramètres email et modèles IA.

Chaque export doit être chiffré, stocké hors du Repl et validé par une restauration ou
un échantillonnage avec checksums.

## 6. Checklist Railway, Render, OVH ou VPS

### Runtime et build

- [ ] Node.js 24 disponible.
- [ ] pnpm/Corepack disponible et lockfile respecté.
- [ ] Commande de build de tous les packages validée.
- [ ] Processus API lancé avec `PORT`.
- [ ] Frontend Vite construit puis servi statiquement.
- [ ] Réécriture SPA vers `index.html`.
- [ ] Healthcheck API configuré.
- [ ] Logs persistants et supervision minimale configurés.

### Domaine et réseau

- [ ] Domaine frontend HTTPS.
- [ ] Domaine ou route API HTTPS.
- [ ] Reverse proxy `/api` correctement routé.
- [ ] `BASE_PATH` aligné avec le domaine ou préfixe.
- [ ] `ALLOWED_ORIGINS` limité aux origines attendues.
- [ ] Sorties HTTPS autorisées vers Clerk, Stripe, stockage, email et IA.
- [ ] Taille maximale des requêtes et uploads alignée avec l’application.

### PostgreSQL

- [ ] Instance PostgreSQL cible créée.
- [ ] `DATABASE_URL` installée dans le gestionnaire de secrets.
- [ ] TLS et pooling configurés.
- [ ] `pg_dump` source vérifié.
- [ ] Restauration testée avant la coupure.
- [ ] Blobs `bytea` contrôlés.
- [ ] Migrations applicatives exécutées dans un ordre maîtrisé.
- [ ] Sauvegardes et restauration ponctuelle activées.

### Authentification

- [ ] Instance Clerk standard ou fournisseur cible créé.
- [ ] Clés frontend/backend configurées séparément.
- [ ] Domaines, redirects, URLs sign-in/sign-up et origines autorisées.
- [ ] Décision explicite sur le proxy Clerk.
- [ ] Export/import ou mapping des utilisateurs validé.
- [ ] Organisations, membres et rôles applicatifs préservés.
- [ ] Communication prévue pour la reconnexion des utilisateurs.

### Paiement

- [ ] Task #52 finalisée et validée.
- [ ] Clé Stripe TEST puis LIVE dans le gestionnaire de secrets.
- [ ] Produits/prix reconnus dans le bon mode Stripe.
- [ ] Webhook officiel configuré sur l’URL publique API.
- [ ] Secret webhook configuré.
- [ ] Checkout, portail et retours testés.
- [ ] Webhooks avec retry et idempotence testés.
- [ ] Abonnements locaux rapprochés des abonnements Stripe.

### Fichiers

- [ ] Fournisseur S3/GCS cible choisi.
- [ ] Bucket privé par défaut.
- [ ] IAM à privilèges minimaux.
- [ ] CORS autorisant uniquement le frontend attendu.
- [ ] URLs présignées courtes.
- [ ] Contrôles taille/type, propriété et organisation.
- [ ] Objets exportés avec checksums.
- [ ] URLs stockées en base réécrites ou redirigées.
- [ ] Téléchargements privés protégés avant mise en production.

### IA et email

- [ ] Compte et clés Anthropic/OpenAI ou fournisseur alternatif.
- [ ] Modèles disponibles et configurables.
- [ ] Timeouts, retries et limites de concurrence conservés.
- [ ] Comportements sans IA testés.
- [ ] Clés Resend et adresse expéditrice vérifiées.
- [ ] DNS email (SPF, DKIM, DMARC) configuré pour le domaine cible.

## 7. Ordre de préparation recommandé

1. **Geler l’architecture cible** : domaines, séparation web/API, hébergeur et
   fournisseurs externes.
2. **Sauvegarder et restaurer PostgreSQL** sur un environnement cible non public.
3. **Préparer l’authentification** et le mapping des utilisateurs sans couper le tenant
   actuel.
4. **Migrer le stockage d’objets** et sécuriser les téléchargements privés.
5. **Finaliser la Task #52 Stripe**, d’abord en TEST, puis préparer le LIVE.
6. **Remplacer les proxies IA** ou accepter explicitement la désactivation temporaire
   des fonctions concernées.
7. **Reproduire le routage web/API**, CORS, HTTPS, variables et healthchecks.
8. **Exécuter des tests de non-régression** : connexion, organisations, documents,
   rapports, IA, Checkout, portail et webhooks.
9. **Faire une répétition de bascule** avec restauration de données récente et
   rapprochement des objets/abonnements.
10. **Basculer DNS et webhooks**, surveiller les erreurs, puis conserver Replit en
    lecture seule pendant une période de retour arrière.

## 8. Risques principaux

1. **Perte d’accès utilisateur** si les Clerk IDs changent sans mapping.
2. **Fichiers orphelins** si les objets et les URLs en base sont migrés séparément.
3. **Abonnements incohérents** si les données locales et Stripe ne sont pas rapprochées.
4. **Webhooks silencieusement non reçus** en cas d’URL, secret ou routage incorrect.
5. **Application partiellement fonctionnelle** si les proxies IA sont retirés sans
   comportement de remplacement clairement testé.
6. **Dépassement de connexions PostgreSQL** sans pooling adapté à l’autoscaling.
7. **Exposition de fichiers privés** si la route actuelle est reproduite sans ACL.
8. **Liens et redirections invalides** si une URL Replit demeure dans la configuration.

## 9. Conclusion

La sortie de Replit est réalisable sans réécriture générale. Les composants standards
peuvent être conservés, mais la migration doit traiter explicitement Stripe,
l’identité Clerk, le sidecar Object Storage et les proxies IA. PostgreSQL doit être
migré comme source de vérité, avec une attention particulière aux Clerk IDs, aux
abonnements et aux fichiers binaires.

Les fichiers d’artifact, plugins Vite et outils Canvas ne sont pas des blocages métier.
Ils peuvent être retirés après la migration fonctionnelle ou conservés localement
comme outils de développement.