---
name: Tests isolés des routes API
description: Particularités du lancement des tests de route Express autonomes dans cet espace de travail.
---

Les tests de route autonomes peuvent être compilés avec esbuild au format CommonJS. Les bundler en ESM peut échouer sur les `require()` dynamiques de dépendances Node. Avec le logger applicatif importé, définir `NODE_ENV=production` pendant l'exécution évite qu'un worker de transport Pino Pretty survive au test et fasse échouer le runner après les assertions.

**Why:** le dépôt ne fournit pas de runner `tsx` pour ces fichiers de test, et le transport de logs de développement est asynchrone.

**How to apply:** pour exécuter un fichier de test de route sans ajouter de dépendance, produire un bundle CommonJS avec esbuild et lancer Node en mode production; conserver les dépendances natives externes selon les besoins du test.
