---
name: Vérification des références GitHub
description: Vérifier les branches distantes quand l’authentification Git et l’état local divergent.
---

Après un push refusé ou ambigu, contrôler les références distantes séparément de l’état local. Ne pas conclure qu’un commit est poussé à partir du HEAD local, ni qu’il ne l’est pas uniquement à partir du message d’erreur.

**Why:** Dans cet espace de travail, l’authentification HTTPS du remote GitHub a refusé un push alors que l’état distant observé ne correspondait pas toujours au HEAD local; le statut de l’intégration ne suffisait pas à conclure.

**How to apply:** Avant et après tout push vers `preprod`, comparer les références distantes ciblées. Pousser explicitement la branche autorisée et ne jamais supposer que `main` ou Infomaniak sont inchangées sans les vérifier.
