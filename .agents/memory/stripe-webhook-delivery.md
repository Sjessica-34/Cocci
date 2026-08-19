---
name: Livraison webhook Stripe
description: Règle de configuration et de validation des webhooks Stripe pour synchroniser les abonnements.
---

Un secret API Stripe et un secret de webhook ne suffisent pas : le compte Stripe doit aussi posséder un endpoint webhook **activé** dans le bon mode (Test ou Live), abonné aux événements métier, et son secret de signature doit correspondre à celui du serveur.

**Why:** Checkout peut finaliser le paiement et rediriger l’utilisateur correctement alors qu’aucun événement n’est livré. Dans ce cas, l’abonnement local reste absent, les droits ne sont pas activés et le portail client est indisponible.

**How to apply:** après toute création ou modification d’endpoint, redémarrer le serveur qui vérifie les signatures puis effectuer un paiement de test réel. Vérifier indépendamment le `POST /api/stripe/webhook` en `200`, l’enregistrement local en statut actif et l’ouverture du portail. Créer un endpoint distinct avec le secret correspondant pour chaque environnement public (développement, production).