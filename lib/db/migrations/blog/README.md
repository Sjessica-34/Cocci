# Blog — migration de préproduction

Ces migrations sont destinées au projet Neon **Cocci-preprod** uniquement.
Ne pas les lancer depuis le preview Replit, dont la base PostgreSQL est distincte,
ni depuis Infomaniak ou **Cocci-prod**.

## Fichiers

- `phase1_schema.sql` crée les tables et index du blog s’ils n’existent pas.
- `phase2_visia_sync.sql` ajoute de façon idempotente les champs SEO/synchronisation
  et la table de configuration. Elle complète aussi les installations antérieures.

Les scripts sont transactionnels et ne suppriment ni ne mettent à jour les
articles existants. La synchronisation Visia reste désactivée par défaut.

## Exécution sur Render

Dans le Shell du service Render de **préproduction**, après avoir vérifié dans
Neon que son `DATABASE_URL` correspond à **Cocci-preprod** (et non Cocci-prod),
exécuter depuis la racine du dépôt :

```sh
test "${APP_ENV:-}" = "preprod" && test -n "${DATABASE_URL:-}" || {
  echo "Arrêt : vérifier le service Render preprod et sa DATABASE_URL."
  exit 1
}

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f lib/db/migrations/blog/phase1_schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f lib/db/migrations/blog/phase2_visia_sync.sql
```

Ne jamais afficher ou copier la valeur de `DATABASE_URL` dans un terminal partagé.
Si `psql` n’est pas disponible dans le Shell Render, arrêter et utiliser un client
PostgreSQL sécurisé configuré avec la branche **Cocci-preprod** dans Neon.

Après migration, vérifier dans Neon que les tables `blog_posts` et
`blog_sync_settings` existent. Tester ensuite création, modification,
publication et retrait de publication avec un article clairement marqué comme
test. Ne pas importer ni synchroniser de contenu Visia pendant ces vérifications.
