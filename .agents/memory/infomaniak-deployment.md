---
name: Hébergement Infomaniak de Cocci
description: Choix durables pour héberger Cocci hors de Replit.
---

Pour Infomaniak, conserver le schéma PostgreSQL avec une base externe et utiliser les APIs OpenAI et Anthropic directes, avec leurs clés configurées dans l’environnement d’hébergement. L’application doit fonctionner comme un seul site Node.js qui sert l’API et le frontend sur la même origine.

Render est la préproduction et Infomaniak la production : promouvoir le même commit testé, sans branches de code divergentes. Les différences d’hébergement doivent rester configurées par variables d’environnement.

**Why:** le produit utilise PostgreSQL externe et les fournisseurs IA directs hors Replit; l’utilisateur exige aussi que Render préprod et Infomaniak prod restent sur le même commit.

**How to apply:** ne pas migrer vers MariaDB ni dépendre des variables/proxys Replit pour une future mise en production hors Replit. Garder Render et Infomaniak sur le même code; régler leurs origines, clés et connexions via l’environnement.
