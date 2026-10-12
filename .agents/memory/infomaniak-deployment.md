---
name: Hébergement Infomaniak de Cocci
description: Choix durables pour héberger Cocci hors de Replit.
---

Pour Infomaniak, conserver le schéma PostgreSQL avec une base externe et utiliser les APIs OpenAI et Anthropic directes, avec leurs clés configurées dans l’environnement d’hébergement. L’application doit fonctionner comme un seul site Node.js qui sert l’API et le frontend sur la même origine.

**Why:** le produit utilise PostgreSQL et ses fonctions IA reposaient sur les proxys Replit; l’utilisateur a choisi explicitement la base PostgreSQL externe et les fournisseurs directs.

**How to apply:** ne pas migrer vers MariaDB ni dépendre des variables/proxys Replit pour une future mise en production hors Replit.
