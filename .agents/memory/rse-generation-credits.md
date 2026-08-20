---
name: Crédits de génération RSE
description: Règles de gestion des crédits de génération de rapports RSE attribués par l’administration.
---

Les générations supplémentaires sont des crédits **cumulatifs** attribués uniquement par un superadmin, pour un couple organisation/exercice. Le plafond effectif est le quota de base plus ces crédits ; le compteur de générations déjà utilisées n’est jamais réinitialisé lors d’une attribution.

**Why:** Un client bloqué par le plafond doit pouvoir reprendre la génération sur l’exercice concerné sans modifier son historique ni créer un droit durable pour d’autres exercices.

**How to apply:** Garder les champs de quota exclusivement côté serveur, hors des mises à jour ordinaires de brouillon. Toute attribution doit être isolée par exercice et respectée par la réservation atomique de génération, y compris lors de la première création de brouillon. Toute route qui produit un rapport, y compris un ancien téléchargement direct, doit utiliser cette même réservation.