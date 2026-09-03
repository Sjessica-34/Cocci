# Architecture cible et plan de migration définitive de Cocci

**Statut :** proposition d’architecture — aucune ressource ne doit être créée et aucune migration ne doit être lancée sur la seule base de ce document.  
**Date de référence :** 3 septembre 2026  
**Cible :** première version publique de Cocci hébergée hors de Replit, avec environ 500 entreprises clientes à moyen terme.

## 1. Décision recommandée

Je recommande **Infomaniak Public Cloud** comme socle principal, avec :

- deux projets Cloud distincts : `cocci-preprod` et `cocci-prod` ;
- un cluster PostgreSQL managé par environnement ;
- un stockage objet S3-compatible privé par environnement ;
- deux nœuds applicatifs en production derrière un load balancer managé ;
- un nœud applicatif unique en préproduction ;
- Docker Compose sur les machines applicatives, pas Kubernetes au démarrage ;
- une sauvegarde objet et PostgreSQL dans un espace séparé, avec des identifiants différents ;
- un export périodique supplémentaire vers un second fournisseur ou un compte indépendant lorsque le niveau de résilience le justifiera.

Cette architecture est le meilleur compromis pour Cocci aujourd’hui : elle est portable, compréhensible par une petite équipe, compatible avec la croissance et évite de transformer trop tôt l’exploitation en projet Kubernetes.

### Pourquoi Public Cloud plutôt que des VPS classiques ?

Le VPS Cloud reste adapté à un petit site ou à un monolithe simple. Pour Cocci, le Public Cloud est préférable parce qu’il propose déjà les briques dont la plateforme aura besoin :

- réseau privé ;
- load balancer ;
- stockage bloc ;
- stockage objet compatible S3 ;
- bases de données managées, dont PostgreSQL ;
- snapshots et sauvegardes ;
- Kubernetes managé disponible plus tard si l’échelle l’exige ;
- déploiement par API, Terraform/OpenTofu ou Ansible.

Un VPS reste une option de repli économique pour la préproduction, mais il ferait porter à Cocci la maintenance de PostgreSQL, des sauvegardes, de la haute disponibilité et d’une partie de la sécurité. Ce n’est pas le bon endroit pour économiser au début.

### Pourquoi pas Kubernetes immédiatement ?

Kubernetes apporterait de l’autoscaling et des rolling updates, mais aussi un coût opérationnel important : cluster, ingress, secrets, observabilité, stockage persistant, certificats et procédures de reprise. Pour environ 500 entreprises, le risque principal est d’abord la fiabilité des données et des déploiements, pas le nombre de pods.

Docker Compose sur des nœuds dédiés est suffisant au lancement. Une migration vers Kubernetes pourra être envisagée lorsque l’un des seuils suivants sera atteint :

- plusieurs déploiements quotidiens nécessitant des rolling updates sans capacité de bascule simple ;
- trafic API soutenu nécessitant plus de deux nœuds applicatifs ;
- workers asynchrones nombreux et indépendants ;
- besoin établi d’autoscaling ou de plusieurs zones de déploiement.

## 2. Isolation préproduction / production

Les environnements ne doivent pas être deux dossiers sur le même serveur ni deux bases dans le même schéma.

| Élément | Préproduction | Production |
|---|---|---|
| Projet Cloud | `cocci-preprod` | `cocci-prod` |
| Réseau privé | `cocci-preprod-net` | `cocci-prod-net` |
| Base PostgreSQL | cluster et identifiants propres | cluster et identifiants propres |
| Stockage privé | bucket `cocci-preprod-private` | bucket `cocci-prod-private` |
| Sauvegardes | bucket/projet de sauvegarde préprod | bucket/projet de sauvegarde prod |
| Clerk | instance de développement ou instance dédiée préprod | instance production dédiée |
| Stripe | compte ou mode de test dédié | compte live dédié |
| Secrets | coffre/jeu de secrets préprod | coffre/jeu de secrets prod |
| DNS | `preprod.cocci.fr` | `app.cocci.fr` |
| Données | données synthétiques ou copie anonymisée | données clients réelles |
| Accès humain | équipe technique limitée | accès nominatif et MFA |

La préproduction ne doit jamais utiliser le `DATABASE_URL`, le bucket, le webhook Stripe, le tenant Clerk ou les secrets de production. Une copie de production vers la préproduction devra être anonymisée et validée avant chaque opération.

## 3. Nombre de serveurs et organisation Docker

### Production : deux serveurs applicatifs

**Deux instances généralistes** dans le réseau privé, derrière un load balancer :

- 4 vCPU ;
- 8 Go de RAM ;
- 80 à 100 Go de disque système rapide ;
- aucune donnée métier persistante sur le disque local ;
- image Docker identique sur les deux nœuds ;
- déploiement immuable depuis le registre d’images.

Le load balancer distribue les requêtes HTTP vers les deux nœuds. La session applicative doit rester compatible avec plusieurs nœuds : session signée et stockée dans PostgreSQL ou Redis managé, jamais uniquement dans la mémoire du processus.

### Préproduction : un serveur applicatif

**Une instance généraliste** :

- 2 à 4 vCPU ;
- 4 à 8 Go de RAM ;
- 50 à 80 Go de disque système ;
- dimensionnement ajustable après les tests de charge.

La préproduction n’a pas besoin de haute disponibilité au départ, mais elle doit utiliser les mêmes images et la même organisation Docker que la production.

### Conteneurs par environnement

```text
reverse-proxy / TLS
        |
        +-- web : frontend React/Vite compilé, servi comme fichiers statiques
        |
        +-- api : serveur Express/Node
        |
        +-- worker : tâches annuelles, génération et traitements asynchrones
        |
        +-- migrate : conteneur ponctuel exécuté avant chaque version
```

Le proxy peut être le load balancer Infomaniak en frontal, complété par Nginx ou Caddy sur chaque nœud pour servir le frontend et relayer `/api`. Le conteneur `migrate` ne doit jamais démarrer automatiquement en parallèle de deux déploiements.

Le traitement annuel actuel, lancé au démarrage et périodiquement par l’API, devra devenir un worker explicite. Une serrure PostgreSQL advisory lock ou une table de verrouillage doit empêcher deux workers de traiter la même organisation. Le planning recommandé est :

- exécution quotidienne avec rattrapage idempotent ;
- contrôle périodique toutes les six heures si le besoin métier est conservé ;
- alerte si une exécution échoue ;
- déclenchement manuel réservé à un rôle d’administration.

## 4. PostgreSQL

### Topologie

Créer **un service PostgreSQL managé par environnement**, et non une base partagée :

- préproduction : cluster simple avec sauvegardes activées ;
- production : cluster dimensionné pour la haute disponibilité et les sauvegardes managées ;
- réseau privé uniquement ;
- accès accepté seulement depuis les nœuds applicatifs et les opérations d’administration autorisées ;
- TLS obligatoire ;
- rôles distincts pour l’application, les migrations, les sauvegardes et la lecture d’urgence.

À l’intérieur de chaque cluster, une base `cocci` suffit au lancement. Les environnements restent isolés par leurs clusters, leurs réseaux et leurs identifiants. Il n’est pas nécessaire de créer une base par entreprise : le modèle multi-tenant actuel utilise l’organisation comme frontière logique et doit continuer à appliquer cette frontière sur chaque requête.

### Sauvegardes PostgreSQL

- sauvegarde automatique quotidienne au minimum ;
- point-in-time recovery si proposé par le niveau de service choisi ;
- conservation opérationnelle courte pour les erreurs récentes ;
- conservation mensuelle et annuelle pour les obligations de reprise ;
- copie vers un projet ou compte de sauvegarde distinct ;
- chiffrement au repos et en transit ;
- test de restauration au moins trimestriel ;
- aucune restauration de test dans la base de production.

La sauvegarde doit couvrir les lignes et les contenus binaires de `documents.content`. Elle ne couvre pas automatiquement les images ou autres objets du stockage objet : ceux-ci ont une stratégie séparée.

### Schéma et migrations

Les migrations doivent être versionnées dans le dépôt et exécutées par le conteneur `migrate` avec un compte limité. Avant chaque migration :

1. sauvegarde vérifiée ;
2. contrôle de compatibilité avec la version précédente ;
3. migration additive lorsque possible ;
4. vérification des volumes et des contraintes ;
5. fenêtre de retour arrière documentée.

Les changements destructifs, comme une suppression de colonne ou une modification pouvant tronquer des lignes, exigent une migration dédiée relue et validée. Aucun `push` automatique non interactif ne doit pouvoir supprimer ou tronquer des données.

## 5. Stockage des documents

### Stockage primaire

Le stockage primaire doit être un bucket S3-compatible privé par environnement :

- `cocci-preprod-private` ;
- `cocci-prod-private`.

Les documents doivent rester privés par défaut. Le chemin d’un objet n’est pas une autorisation. L’API doit vérifier :

1. l’identité ;
2. l’organisation courante ;
3. l’exercice demandé lorsque le document est annuel ;
4. la permission métier ;
5. l’existence d’un lien document–organisation ou document–exercice valide.

Les uploads utilisent des URLs présignées de courte durée. L’API crée l’autorisation avant l’upload, puis confirme l’objet et attache sa politique d’accès après l’upload. Les objets non finalisés sont nettoyés après une période de quarantaine.

Les rapports DOCX/PDF générés doivent être traités comme des objets privés immuables. Un remplacement crée une nouvelle version ou un nouveau document ; il ne faut pas écraser physiquement l’objet historique.

### Fichiers déjà stockés en PostgreSQL

Les documents dont le contenu est actuellement dans `documents.content` ne doivent pas être migrés précipitamment vers l’objet storage. Ils restent disponibles pendant la transition. Une migration ultérieure peut les exporter avec un checksum et mettre à jour les références après rapprochement.

### Assets publics

Les assets réellement publics peuvent utiliser un bucket ou un préfixe séparé, sans jamais partager le chemin privé des documents clients. Un fichier ne doit pas devenir public uniquement parce qu’il a été placé dans un répertoire connu du frontend.

## 6. Sauvegarde et restauration des fichiers

La copie de sauvegarde ne doit pas être un simple préfixe du bucket de production. La cible recommandée est :

- projet ou compte de sauvegarde distinct ;
- bucket de sauvegarde séparé par environnement ;
- clés d’accès différentes ;
- droit d’écriture pour le job de sauvegarde ;
- aucun droit de suppression pour l’application ;
- versioning et verrouillage de rétention si disponibles et compatibles avec la politique de protection ;
- copie périodique hors du compte principal pour les données les plus critiques.

### Fréquence proposée

| Donnée | Fréquence | Conservation initiale |
|---|---:|---:|
| PostgreSQL production | quotidien + PITR si disponible | 35 jours |
| PostgreSQL préproduction | quotidien | 14 jours |
| Objets production | quotidien, incrémental si disponible | 35 jours |
| Objets préproduction | quotidien | 14 jours |
| Rapport mensuel de contrôle | mensuel | 24 mois |
| Export annuel légal ou contractuel | annuel | selon obligation contractuelle |

### RPO/RTO proposés

- **Production :** RPO cible de 24 heures pour la sauvegarde quotidienne, à réduire avec PITR ; RTO cible de 4 heures.
- **Préproduction :** RPO de 24 heures ; RTO d’un jour ouvré.
- **Documents critiques :** RPO inférieur à 24 heures si la copie objet est exécutée plusieurs fois par jour.

Ces objectifs sont des cibles de conception, pas des garanties tant qu’un contrat de service et un test réel ne les ont pas confirmés.

### Test de restauration

Au moins une fois par trimestre :

1. restaurer PostgreSQL dans une base temporaire ;
2. restaurer un échantillon d’objets dans un bucket temporaire ;
3. comparer tailles, types et SHA-256 ;
4. vérifier les organisations, exercices, liens et ACL ;
5. tester un accès autorisé et un refus inter-organisation ;
6. mesurer le RPO/RTO ;
7. supprimer l’environnement temporaire ;
8. conserver le rapport sans conserver de données clients dans l’environnement de test.

## 7. Authentification, Stripe et secrets

### Clerk

Prévoir deux instances ou tenants indépendants :

- Clerk préproduction avec clés et domaine propres ;
- Clerk production avec clés et domaine propres.

La migration doit conserver les identifiants de liaison nécessaires sans recopier des secrets ni rendre le tenant Replit indispensable. Il faut décider avant la migration si les utilisateurs réinitialisent leur mot de passe, s’ils sont importés avec une procédure de migration d’identité, ou si une reconnexion contrôlée est prévue.

### Stripe

La préproduction ne doit jamais utiliser les webhooks live ni un compte bancaire de production. La cible idéale est :

- compte ou configuration Stripe test dédiée à la préproduction ;
- compte Stripe live dédié à la production ;
- produits et prix créés par script idempotent ;
- URLs de succès, portail et webhook distincts ;
- secrets séparés ;
- vérification de signature sur chaque environnement.

Le catalogue ne doit pas être identifié par des IDs codés dans le frontend. Les clés métier restent côté API.

### Secrets

Aucun secret ne doit être stocké dans Git, dans une image Docker ou dans un fichier Compose versionné. Prévoir :

- un jeu de secrets préproduction ;
- un jeu de secrets production ;
- rotation indépendante ;
- accès nominatif avec MFA ;
- journal des consultations ;
- secrets injectés au déploiement ;
- procédure de révocation et de remplacement.

Si aucun gestionnaire de secrets adapté n’est retenu chez Infomaniak, une solution pragmatique est d’utiliser les secrets chiffrés du système CI/CD et de les injecter via une connexion de déploiement limitée. Ce choix doit être confirmé lors de la validation de l’infrastructure.

## 8. Domaines et DNS

### Domaines recommandés

| Usage | Nom |
|---|---|
| Application production | `app.cocci.fr` |
| API production | `api.cocci.fr` |
| Préproduction | `preprod.cocci.fr` |
| API préproduction | `api.preprod.cocci.fr` |
| Site public / institutionnel | `cocci.fr` |
| Statut et maintenance | `status.cocci.fr` |
| Assets publics, uniquement si nécessaire | `assets.cocci.fr` |

Le frontend doit utiliser une configuration de base d’API adaptée à l’environnement. Aucun domaine Replit ne doit rester dans les URLs canoniques, les emails, les webhooks ou les liens de rapport.

Le DNS peut être géré chez Infomaniak. Les certificats TLS doivent être automatiques, renouvelés avant expiration et vérifiés dans les deux environnements. Avant la bascule, réduire le TTL quelques jours à l’avance ; après stabilisation, remonter le TTL.

## 9. Services Infomaniak à créer après validation

Ne rien créer avant la validation de cette architecture et du budget. La liste cible est :

### Obligatoire

1. Public Cloud, projet `cocci-preprod`.
2. Public Cloud, projet `cocci-prod`.
3. Réseaux privés séparés.
4. Load balancer de production.
5. Instances applicatives.
6. Database Service PostgreSQL préproduction.
7. Database Service PostgreSQL production.
8. Stockage objet privé préproduction.
9. Stockage objet privé production.
10. Espaces de sauvegarde séparés, avec comptes et clés distincts.
11. Gestion DNS et certificats.
12. Registre d’images privé ou registre externe choisi.

### À confirmer selon les besoins

- Redis managé pour sessions, files et cache ;
- monitoring et alerting ;
- service mail transactionnel ou relais SMTP ;
- Kubernetes managé, uniquement si les seuils d’exploitation sont atteints ;
- deuxième fournisseur de stockage pour la copie de sauvegarde hors compte principal.

## 10. Dimensionnement et coûts estimés

Les prix du Public Cloud Infomaniak sont à la consommation et hors TVA. La page tarifaire consultée le 3 septembre 2026 affichait notamment :

- instance généraliste 2 vCPU / 4 Go sans disque : **0,00725 € / heure**, soit environ **5,30 € / mois** ;
- instance généraliste 4 vCPU / 8 Go sans disque : **0,0145 € / heure**, soit environ **10,60 € / mois**.

Ces chiffres concernent l’instance seule. Ils ne constituent pas le prix de la plateforme : PostgreSQL managé, disques, stockage objet, snapshots, load balancer, réseau, supervision, sauvegardes et éventuels services complémentaires s’ajoutent.

### Fourchette budgétaire de travail

| Poste | Préproduction / mois | Production initiale / mois |
|---|---:|---:|
| Instances et disques | 20–80 € | 50–180 € |
| PostgreSQL managé | 30–120 € | 100–350 € |
| Stockage objet et sauvegardes | 10–60 € | 30–180 € |
| Load balancer, réseau et supervision | 0–40 € | 30–120 € |
| Total Cloud de travail | **60–300 €** | **210–830 €** |

Pour préparer le budget sans sous-estimer l’exploitation, retenir provisoirement **300 à 1 000 € HT par mois pour les deux environnements**, puis remplacer cette fourchette par un devis ou un calculateur rempli avec les volumes réels :

- nombre de Go de documents ;
- volume de téléchargements ;
- taille et IOPS PostgreSQL ;
- rétention des sauvegardes ;
- nombre de nœuds et niveau de réplication ;
- besoin de Redis, monitoring et support.

Ajouter séparément le coût annuel du domaine, du mail transactionnel et d’un éventuel fournisseur de sauvegarde externe. Les tarifs changent : toute décision financière doit être confirmée auprès d’Infomaniak avant commande.

## 11. Dépendances actuelles à Replit et remplacements

| Dépendance actuelle | Indice dans le projet | Remplacement cible |
|---|---|---|
| Replit Object Storage / sidecar | `127.0.0.1:1106`, `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS` | SDK S3-compatible, buckets privés séparés |
| Bucket et variables générées Replit | `DEFAULT_OBJECT_STORAGE_BUCKET_ID` et variables associées | variables propres par environnement, injectées hors Git |
| PostgreSQL provisionné Replit | `DATABASE_URL` | Database Service PostgreSQL Infomaniak par environnement |
| Clerk géré par Replit | `@clerk/react`, `@clerk/express`, proxy Clerk | instances Clerk indépendantes et domaines de production |
| Workflows Replit | `artifact.toml`, workflows web/API | Docker Compose + CI/CD + supervision |
| Port dynamique Replit | `PORT`, configuration Vite | ports internes fixes derrière proxy/load balancer |
| Maintenance annuelle au démarrage | `exerciseLifecycle.ts`, index API | worker dédié, cron externe ou scheduler, verrou idempotent |
| Secrets Replit | variables et secrets du workspace | gestionnaire de secrets ou secrets CI/CD séparés |
| Stripe connecté au workspace | clés, webhook et scripts catalogue | comptes/configurations Stripe indépendants |
| Codegen et scripts locaux | pnpm, scripts TypeScript | pipeline CI reproductible avec versions verrouillées |
| Logs de workflow | stdout/stderr Replit | logs centralisés, alertes et rotation hors Replit |
| Déploiement et preview | proxy d’artefact et domaines Replit | DNS, TLS, CI/CD et reverse proxy Infomaniak |

Le code doit aussi supprimer les hypothèses de domaine Replit dans les URLs publiques, les callbacks Clerk, les webhooks Stripe, les liens de partage et les procédures opératoires.

## 12. Procédure de migration sans seconde migration

### Phase 0 — Décision et gel de périmètre

1. Valider cette architecture ou la modifier explicitement.
2. Choisir la région et le niveau de service Infomaniak.
3. Décider où résideront les sauvegardes indépendantes.
4. Valider le budget et les responsables d’exploitation.
5. Ne créer que les ressources définitives : aucun environnement Replit intermédiaire.

### Phase 1 — Rendre l’application portable

1. Remplacer les appels directs au sidecar par une interface S3-compatible.
2. Rendre les endpoints, domaines et secrets entièrement configurables par environnement.
3. Séparer le worker annuel de l’API.
4. Ajouter les health checks, métriques, logs structurés et alertes.
5. Vérifier que les migrations sont versionnées et réexécutables.
6. Construire une image Docker reproductible du frontend et de l’API.

### Phase 2 — Créer les environnements définitifs

1. Créer les deux projets Cloud et leurs réseaux.
2. Créer les deux PostgreSQL, les buckets privés et les buckets de sauvegarde.
3. Créer les deux configurations Clerk et Stripe.
4. Configurer les secrets, DNS de préproduction et certificats.
5. Mettre en place CI/CD avec approbation obligatoire pour la production.

### Phase 3 — Préparer les exports Replit

1. Exporter PostgreSQL avec `pg_dump` et vérifier que l’archive est lisible.
2. Inventorier les objets Replit : chemin, taille, type, checksum et référence en base.
3. Exporter les objets privés avec leurs ACL et leur rattachement organisation/exercice.
4. Préparer l’export ou la reprise des identités Clerk selon le mécanisme retenu.
5. Exporter le catalogue Stripe, les clients, les abonnements et les webhooks selon la procédure Stripe.
6. Copier les configurations sans copier les secrets dans le dépôt.

### Phase 4 — Restaurer et tester la préproduction

1. Restaurer une copie anonymisée des données dans PostgreSQL préproduction.
2. Importer les objets dans le bucket préproduction et vérifier les checksums.
3. Régénérer les tokens publics de test ; ne jamais réutiliser les liens publics production.
4. Tester connexion, organisations, filiales, exercices, rapports, documents, paiements en mode test et emails.
5. Tester l’isolation : compte préproduction, clés préproduction et données préproduction uniquement.
6. Tester une restauration complète depuis les sauvegardes.
7. Corriger les problèmes avant toute préparation de production.

### Phase 5 — Répétition de bascule

1. Réduire les TTL DNS.
2. Répéter l’export complet dans un environnement jetable.
3. Mesurer le temps d’export, de restauration et de vérification.
4. Vérifier le plan de retour arrière.
5. Fixer une fenêtre de bascule avec une courte période de lecture seule.

### Phase 6 — Bascule production

1. Annoncer la fenêtre de maintenance.
2. Désactiver temporairement les écritures métier et les jobs non essentiels.
3. Exécuter un dump PostgreSQL final et le restaurer dans PostgreSQL production.
4. Copier les objets nouveaux ou modifiés depuis le dernier inventaire.
5. Comparer volumes, checksums et relations organisation/exercice.
6. Exécuter les migrations et les contrôles de cohérence.
7. Activer l’API, le worker, le frontend, Clerk production et les webhooks Stripe production.
8. Basculer le DNS.
9. Surveiller les erreurs, connexions, uploads, paiements et générations RSE.

### Phase 7 — Stabilisation et sortie de Replit

1. Conserver Replit en lecture seule pendant la période de retour arrière définie.
2. Comparer quotidiennement les volumes et erreurs.
3. Vérifier une restauration depuis les sauvegardes définitives.
4. Révoquer les clés et webhooks Replit devenus inutiles.
5. Exporter les journaux et preuves nécessaires.
6. Désactiver seulement après validation métier et technique.

## 13. Critères de go-live

La mise en ligne ne doit être approuvée que lorsque :

- les deux environnements sont réellement indépendants ;
- aucun secret de production n’est présent dans Git ou préproduction ;
- un utilisateur d’une organisation ne peut pas lire un objet d’une autre organisation ;
- les documents historiques et les liens publics sont vérifiés ;
- la création d’un nouvel exercice est idempotente et reprend après interruption ;
- les webhooks Stripe production et préproduction sont séparés ;
- les identités Clerk et les domaines correspondent à l’environnement ;
- une restauration PostgreSQL est démontrée ;
- une restauration d’objet avec contrôle de checksum est démontrée ;
- les sauvegardes disposent d’une rétention et d’un accès d’administration documentés ;
- les alertes d’erreur et de sauvegarde sont testées ;
- le plan de retour arrière est répétable ;
- la durée d’indisponibilité observée respecte l’objectif validé.

## 14. Sources et points à confirmer

Sources Infomaniak consultées le 3 septembre 2026 :

- [Public Cloud — tarifs](https://www.infomaniak.com/fr/hebergement/public-cloud/tarifs)
- [Public Cloud — présentation](https://www.infomaniak.com/fr/hebergement/public-cloud)
- [Public Cloud — bases de données managées](https://www.infomaniak.com/fr/hebergement/public-cloud/database)
- [VPS Cloud — tarifs](https://www.infomaniak.com/fr/hebergement/vps-cloud/tarifs)
- [FAQ Public Cloud](https://www.infomaniak.com/fr/support/faq/admin2/public-cloud)

À confirmer avant commande :

- prix exact du profil PostgreSQL choisi et de sa réplication ;
- disponibilité de la région et des zones souhaitées ;
- politique de versioning/immutabilité du stockage objet ;
- mécanisme de sauvegarde objet vers un projet ou compte séparé ;
- service de secrets, supervision et alerting retenu ;
- modalités d’import/migration Clerk ;
- séparation Stripe test/live ou création de comptes distincts ;
- engagement de support et SLA adaptés à Cocci.

## Conclusion

La bonne décision immédiate est de **ne pas lancer de migration maintenant** et de ne pas créer de second bucket Replit provisoire. Il faut valider l’architecture et le budget, réserver directement les ressources définitives, puis rendre l’application portable avant de transférer les données. Cette séquence évite une première migration technique temporaire suivie d’une seconde migration vers l’hébergement public.