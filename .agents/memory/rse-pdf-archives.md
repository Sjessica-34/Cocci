---
name: Génération DOCX RSE
description: Invariants fonctionnels et de sécurité du flux de génération DOCX RSE.
---

La génération RSE doit d’abord persister le dernier brouillon local, puis réserver une unité de quota via l’endpoint de comptage avant d’ouvrir le visualiseur DOCX. La vérification du plafond et son incrément doivent être atomiques et isolés par organisation/exercice.

**Why:** le flux DOCX historique ne crée pas d’archive PDF. Un quota limité ne doit toutefois jamais être dépassé par des demandes concurrentes, partagé entre exercices ou associé à une version obsolète du brouillon.

**How to apply:** toute évolution de la génération, du visualiseur ou du changement d’exercice doit préserver l’accès réservé aux membres actifs, la sauvegarde forcée du brouillon, la séparation par exercice et une réservation atomique avant la redirection.