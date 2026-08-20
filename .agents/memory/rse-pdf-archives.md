---
name: Génération DOCX RSE
description: Invariants fonctionnels et de sécurité du flux de génération DOCX RSE.
---

La génération RSE réserve une unité de quota via l’endpoint de comptage, puis ouvre le visualiseur qui produit le DOCX. La vérification du plafond et son incrément doivent être atomiques et isolés par organisation/exercice.

**Why:** le flux DOCX historique ne crée pas d’archive PDF. Un quota limité ne doit toutefois jamais être dépassé par des demandes concurrentes ni être partagé entre exercices.

**How to apply:** toute évolution de la génération, du visualiseur ou du changement d’exercice doit préserver l’accès réservé aux membres actifs, la séparation par exercice et une réservation atomique avant la redirection.