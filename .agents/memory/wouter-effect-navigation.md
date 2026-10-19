---
name: Redirections React avec Wouter
description: Prévenir les boucles de navigation déclenchées par des effets d’onboarding.
---

Les effets React qui redirigent avec Wouter doivent comparer leur destination à la route courante avant d’appeler `setLocation`. Une navigation de remplacement vers la route déjà active peut déclencher un nouvel événement `history.replaceState` et réexécuter la mise à jour React.

**Why:** Un stack minifié en production a relié l’erreur React 185 à l’effet de redirection de l’onboarding et au callback Wouter `replaceState`.

**How to apply:** Pour les redirections d’onboarding ou d’authentification faites dans un effet, rendre le changement idempotent et ne pas appeler `setLocation` si la route cible est déjà affichée.
