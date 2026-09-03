---
name: Catalogue Stripe côté serveur
description: Règle de sécurité pour la sélection des produits et prix Stripe de Cocci.
---

Les Product IDs et Price IDs Stripe ne doivent jamais être inclus dans le frontend, ni être acceptés dans une requête provenant du navigateur. Le frontend ne transmet que la tranche d'effectif (`effectifKey`) ou une action métier autorisée (par exemple `additional_user`). Pour une formule liée à l'effectif, le serveur doit aussi refuser toute tranche dont le plafond est inférieur à l'effectif déclaré de l'organisation ; la désactivation frontend n'est qu'un retour visuel. Tant que les anciennes organisations peuvent avoir `employeeCount` vide, le contrôle doit reprendre l'effectif Capital humain comme valeur de secours.

**Why:** Un identifiant Stripe fourni par le client permettrait de tenter d'ouvrir un Checkout sur un prix arbitraire. Les prix configurés doivent aussi pouvoir différer entre les environnements Stripe sans publication du frontend.

**How to apply:** Conserver les IDs dans les variables d'environnement du serveur. Toute session Checkout doit résoudre les IDs depuis le catalogue métier privé, contrôler la compatibilité avec `employeeCount` ou, s'il est absent, avec le dernier effectif Capital humain, puis vérifier côté Stripe que le prix actif appartient au produit configuré. Les endpoints publics de formules ne renvoient jamais ces IDs.