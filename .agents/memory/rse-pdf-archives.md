---
name: Archives PDF RSE
description: Invariants fonctionnels et de sécurité des rapports RSE archivés.
---

La génération d’un rapport RSE doit d’abord persister la dernière version du brouillon, puis créer le PDF privé, le lier à l’exercice et seulement ensuite consommer une unité de quota dans la même transaction protégée de la concurrence.

**Why:** un quota limité ne doit jamais être perdu pour une version obsolète, un fichier non archivé ou une demande concurrente. Les archives d’un exercice ne doivent ni exposer les données ni afficher les documents d’un autre exercice.

**How to apply:** toute évolution de la génération, du téléchargement ou du changement d’exercice doit préserver la sauvegarde forcée côté client, l’accès réservé aux membres actifs, la séparation par exercice et la cohérence document-lien-quota côté serveur.