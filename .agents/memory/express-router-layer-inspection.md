---
name: Inspection des routeurs Express 5
description: Contrôle de l’ordre des routeurs montés dans les tests serveur Express 5.
---

Pour vérifier l’ordre de montage d’un routeur Express 5, inspecter les routes imbriquées dans `layer.handle.stack`. Les layers parents créés par `router.use()` n’exposent pas nécessairement leur préfixe dans `route.path` ou `regexp`.

**Why:** une vérification naïve des propriétés du layer parent peut conclure à tort qu’une route n’est pas montée ou qu’elle n’est pas placée avant un middleware de protection.

**How to apply:** repérer le sous-routeur grâce à ses chemins dans `handle.stack`, puis comparer son index à celui du middleware nommé qui doit le suivre.