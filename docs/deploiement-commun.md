# Déploiement commun : Render et Infomaniak

Les deux hébergements exécutent le même code et doivent promouvoir le même
commit : Render sert la préproduction, puis ce commit validé est déployé sur
Infomaniak. Les différences d’origine et de mode sont configurées par
l’environnement, pas par des branches de code.

## Variables partagées

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | PostgreSQL de l’environnement concerné. Le schéma et le code restent communs. |
| `APP_ENV` | `preprod` sur Render, `production` sur Infomaniak, `development` en local. |
| `APP_URL` | URL publique de l’application; utilisée côté serveur pour Stripe et les liens. |
| `VITE_APP_URL` | URL publique injectée au build frontend. Les liens locaux peuvent utiliser l’origine courante en remplacement. |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clé publique Clerk injectée au build frontend. |
| `CLERK_PUBLISHABLE_KEY` | Clé publique du même tenant Clerk, côté API. |
| `CLERK_SECRET_KEY` | Clé secrète Clerk, côté API uniquement. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Clés Stripe propres à chaque environnement. |
| `RESEND_API_KEY` | Clé d’envoi des e-mails, si activée. |
| `ANTHROPIC_API_KEY` | Clé Anthropic directe hors Replit. |
| `OPENAI_API_KEY` | Clé OpenAI utilisée par la génération de rapports, si activée. |

Ne jamais utiliser les clés Stripe ou Clerk de production dans la préproduction.
Les clés et identifiants sensibles restent dans le gestionnaire de secrets de
chaque hébergeur.

## Différences de routage

- `VITE_API_URL` est une variable de build frontend. Sur Render, elle pointe
  vers l’origine du service API si le frontend et l’API sont séparés.
- Sur un déploiement monolithique où le frontend et l’API partagent une origine,
  `VITE_API_URL` peut être vide afin que les appels `/api/...` restent relatifs.
- `VITE_APP_URL` et `APP_URL` correspondent à l’origine publique de l’application
  dans l’environnement concerné. `APP_URL` est requis côté API pour les retours
  Stripe; l’API l’autorise aussi pour CORS.
- `ALLOWED_ORIGINS` est une liste séparée par des virgules des origines frontend
  supplémentaires. Elle est nécessaire quand le frontend et l’API sont sur des
  domaines distincts et que `APP_URL` ne couvre pas toutes les origines.
- `API_URL` n’est pas utilisé par le code actuel. `PORT` est fourni au serveur
  par l’hébergeur et lu dans `process.env.PORT`.
- Clerk est chargé directement depuis son SDK. Ne pas définir de proxy
  `/api/__clerk` : aucune route proxy Clerk n’est montée par l’API.

Render et Infomaniak peuvent avoir des commandes de build/démarrage différentes
selon leur topologie, mais ils construisent et exécutent les mêmes sources.
Configurer les variables au moment du build pour `VITE_*`, et au démarrage pour
les variables serveur.
