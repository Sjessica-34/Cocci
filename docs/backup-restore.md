# Sauvegarde et restauration de Cocci

## Périmètre et objectifs

Les données à protéger forment un ensemble cohérent :

- PostgreSQL contient les organisations, utilisateurs applicatifs, exercices, données RSE, liens entre exercices et documents, ainsi que le contenu binaire des documents déposés dans « Mes documents » ;
- App Storage contient les fichiers éventuellement déposés par les parcours utilisant le stockage objet ;
- Clerk contient les identités et sessions, mais PostgreSQL reste la source des rôles et appartenances métier ;
- Stripe contient les clients, abonnements et paiements, tandis que PostgreSQL conserve les identifiants Stripe et l’état applicatif synchronisé par webhook.

Objectifs proposés : **RPO 24 h** pour une perte totale, **RTO 4 h** pour PostgreSQL et les documents, avec restauration prioritaire de l’accès en lecture.

## Politique de sauvegarde

### PostgreSQL

- Activer un point de restauration complet quotidien dans l’outil Database de Replit.
- Conserver 28 jours lorsque le plan le permet ; sinon, la rétention disponible est de 7 jours.
- Utiliser également la restauration à un instant donné avant une opération sensible.
- Produire chaque semaine un export logique chiffré hors du projet Replit et le conserver 90 jours.
- Ne jamais placer une sauvegarde, une URL signée ou une chaîne de connexion dans Git.

Les sauvegardes Replit couvrent aussi les documents binaires actuellement stockés dans la colonne `documents.content`.

### Fichiers dans App Storage

- Réaliser quotidiennement un inventaire versionné (chemin, taille, type et empreinte SHA-256).
- Copier quotidiennement les objets vers un bucket de sauvegarde séparé, chiffré et non accessible par l’application.
- Activer la rétention ou le verrouillage d’objets du bucket de sauvegarde quand le fournisseur le permet.
- Conserver 30 versions quotidiennes et 12 versions mensuelles.

### Clerk et Stripe

Clerk et Stripe ne sont pas restaurés à partir d’un dump PostgreSQL. Après restauration, la base est rapprochée des systèmes fournisseurs :

1. Clerk : vérifier que chaque membre actif référence une identité existante ; une identité absente reste désactivée jusqu’à régularisation.
2. Stripe : relire les abonnements depuis Stripe, puis rejouer ou resynchroniser les webhooks depuis le point de restauration.
3. Ne jamais recréer un paiement ni réactiver un abonnement uniquement depuis une ancienne ligne PostgreSQL.

## Autorisations

- Une restauration de production doit être lancée par un superadministrateur technique explicitement habilité.
- La validation fonctionnelle doit être faite par un second responsable avant réouverture en écriture.
- Les propriétaires et administrateurs d’organisation ne peuvent ni lancer ni choisir un point de restauration global.
- Toute restauration est précédée d’un export de sécurité et enregistrée dans l’audit opérationnel sans secret.

## Procédure complète

1. Placer l’application en maintenance ou en lecture seule et suspendre les tâches annuelles ainsi que les traitements de webhooks.
2. Noter l’heure de l’incident, le point cible et les derniers événements Clerk/Stripe connus.
3. Effectuer une sauvegarde de sécurité de l’état courant, même dégradé.
4. Restaurer PostgreSQL vers une base isolée, jamais directement par-dessus la base active.
5. Restaurer les objets dans un préfixe ou bucket isolé.
6. Vérifier les migrations, les contraintes, les volumes par organisation/exercice, les liens document–exercice et les empreintes des fichiers.
7. Comparer les membres avec Clerk et les abonnements avec Stripe ; corriger uniquement depuis les sources fournisseurs.
8. Rejouer les webhooks Stripe manquants de façon idempotente.
9. Basculer l’application vers l’ensemble restauré, puis exécuter les contrôles en lecture.
10. Réactiver les écritures, les webhooks et le traitement annuel.
11. Conserver les preuves du test et analyser tout écart.

## Immutabilité des documents entre exercices

Un fichier physique possède une seule ligne `documents`. Chaque exercice possède seulement une liaison dans `document_exercise_links`.

- Lors du passage annuel, la liaison est recopiée vers le nouvel exercice : aucun octet du fichier n’est dupliqué ou modifié.
- « Modifier » ou remplacer un document doit créer une nouvelle ligne `documents` et une nouvelle liaison dans l’exercice courant.
- La liaison de l’exercice historique reste attachée à l’ancienne ligne et continue donc d’afficher exactement l’ancien fichier.
- Supprimer un document d’un exercice retire uniquement sa liaison. Le fichier physique n’est supprimé que lorsqu’aucun exercice ne le référence plus.

Ainsi, un remplacement futur ne peut pas altérer le document visible dans un exercice historique.

## Test de restauration

Le test doit être exécuté sur la base de développement vers une base temporaire isolée :

1. créer un dump PostgreSQL au format custom ;
2. créer une base temporaire vide sur le même serveur ;
3. restaurer le dump dans cette base ;
4. comparer les nombres d’organisations, exercices, documents et liaisons ;
5. comparer l’empreinte agrégée des contenus de documents ;
6. vérifier les clés étrangères ;
7. supprimer la base temporaire.

Pour App Storage, le test équivalent restaure un échantillon dans un préfixe temporaire et compare taille et SHA-256. Aucun objet actif n’est écrasé.

### Résultat du test du 3 septembre 2026

- dump PostgreSQL complet restauré dans une base temporaire isolée ;
- 16 organisations, 16 exercices, 8 documents et 8 liaisons retrouvés à l’identique ;
- empreinte agrégée du contenu binaire identique avant et après restauration ;
- zéro liaison document–exercice orpheline ;
- archive `pg_dump` lisible par `pg_restore` ;
- base temporaire et dump supprimés après vérification.

Le test App Storage reste dépendant de la mise à disposition d’un bucket de sauvegarde séparé. Les documents de « Mes documents » sont déjà couverts par le test PostgreSQL, car leur contenu binaire réside dans la base.