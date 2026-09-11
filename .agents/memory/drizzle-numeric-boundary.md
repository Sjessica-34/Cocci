---
name: Drizzle numeric insertion boundary
description: Les colonnes PostgreSQL numeric de Drizzle attendent des chaînes lors des insertions et renvoient des valeurs à normaliser avant les calculs.
---

Les valeurs destinées aux colonnes `numeric` doivent être converties en chaînes au moment des insertions Drizzle, puis normalisées en nombres avant les calculs ou la sérialisation métier.

**Why:** Le type d’insertion Drizzle refuse les nombres JavaScript pour ces colonnes, alors que les référentiels et contrats API manipulent naturellement des nombres.

**How to apply:** Garder la conversion chaîne dans les objets `insert`/`update`, et convertir explicitement les lignes relues avant d’appeler un calcul partagé ou de construire un rapport.