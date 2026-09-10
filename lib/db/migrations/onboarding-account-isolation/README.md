# Isolation du compte et reprise d'onboarding

Exécuter `phase1_schema.sql` uniquement après avoir contrôlé la base cible.
La migration est additive et idempotente :

- elle ajoute `users.primary_organization_id` et son index ;
- elle ajoute `members.archived_at` ;
- elle crée l'index unique des relations courantes ;
- elle crée `onboarding_progress` et initialise les utilisateurs existants ;
- elle ne supprime aucune ligne et ne supprime aucune organisation.

Elle s'arrête avant modification si un utilisateur possède plusieurs
organisations racines courantes. Dans ce cas, il faut arbitrer les données
manuellement avant de relancer la migration.

## Procédure développement Replit

1. Vérifier la base de développement avec `checkDatabase` ou une connexion
   `DATABASE_URL` de développement.
2. Exécuter le contrôle préalable suivant :

   ```sql
   SELECT u.id, u.email, count(*) AS root_organizations
   FROM users u
   JOIN members m ON m.user_id = u.id
   JOIN organizations o ON o.id = m.organization_id
   WHERE m.status <> 'suspended'
     AND m.archived_at IS NULL
     AND o.parent_id IS NULL
   GROUP BY u.id, u.email
   HAVING count(*) > 1;
   ```

   Le résultat doit être vide. `phase1_schema.sql` répète ce contrôle dans sa
   transaction et s'arrête avant toute modification si le résultat n'est pas
   vide.
3. Appliquer `phase1_schema.sql` contre la base de développement. Le script
   est transactionnel, additif et idempotent :

   ```bash
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
     -f lib/db/migrations/onboarding-account-isolation/phase1_schema.sql
   ```

4. Vérifier `onboarding_progress`, `users.primary_organization_id`,
   `members.archived_at`, `members_one_current_user_idx` et
   `onboarding_progress_user_unique`. Aucun `DELETE`, `DROP` ou remplacement de
   donnée n'est effectué.

## Préproduction Neon / Render

Cette procédure concerne uniquement une base Neon explicitement ciblée par le
service Render. Ne jamais réutiliser la `DATABASE_URL` Replit ou une URL de
production par défaut.

1. Créer un snapshot/backup Neon et arrêter temporairement les déploiements
   qui écrivent dans la base, ou appliquer la migration pendant une fenêtre
   contrôlée.
2. Copier la `DATABASE_URL` de préproduction dans l'environnement de
   migration sécurisé de Render/Neon, sans la mettre dans le dépôt ni dans le
   terminal partagé.
3. Exécuter le contrôle préalable ci-dessus avec cette connexion.
4. Exécuter le même fichier SQL avec `ON_ERROR_STOP=1`.
5. Vérifier les index, les contraintes et les comptes d'onboarding, puis
   redémarrer l'API et vérifier les routes authentifiées.
6. Si le contrôle préalable détecte plusieurs organisations racines pour un
   utilisateur, arrêter la procédure, choisir la racine conservée avec le
   propriétaire des données, puis relancer après correction documentée.

Replit utilise la base de développement liée au workspace et gère les
changements de schéma de la base publiée via le flux Publish. Render/Neon
utilise une base externe : le backup, le ciblage de la connexion, la fenêtre
de migration et la validation post-déploiement restent à la charge de
l'équipe d'exploitation.