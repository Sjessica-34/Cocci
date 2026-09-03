# Migration des autorisations d’upload privées

Exécuter `phase1_pending_uploads.sql` avant de déployer la version qui utilise la
finalisation ACL. La migration est idempotente et ne modifie aucune donnée
existante.

Après déploiement, les lignes expirées ou consommées peuvent être supprimées par
une maintenance périodique. Un objet sans ACL reste inaccessible par défaut.