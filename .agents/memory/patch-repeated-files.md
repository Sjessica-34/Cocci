---
name: Patch de fichiers répétés
description: Méthode de récupération lorsqu’un fichier contient plusieurs copies identiques d’un module.
---

Lorsqu’un fichier contient des blocs répétés, conserver le premier bloc et supprimer les copies suivantes avec une mise à jour ciblée du fichier plutôt que tenter une suppression/recréation immédiate.

**Why:** L’outil de patch peut conserver l’existence logique du fichier après une suppression et refuser sa recréation dans l’opération suivante, alors qu’une mise à jour ciblée s’applique correctement.

**How to apply:** Comparer les blocs, cibler leur séquence exacte avec `apply_patch` — notamment le nom complet de la route avant un `res.json(updated)` — puis vérifier le nombre de déclarations et relancer le typecheck complet.