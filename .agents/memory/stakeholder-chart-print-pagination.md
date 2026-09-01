---
name: Pagination des graphiques parties prenantes
description: Règle de mise en page PDF pour la cartographie et la matrice des parties prenantes.
---

La pile qui contient la cartographie et la matrice doit rester fragmentable entre les deux cartes. Chaque carte, en revanche, doit être insécable et conserver ensemble son titre, son SVG, ses libellés et sa légende. En impression, les SVG doivent conserver leurs proportions et ne pas être limités par les hauteurs maximales prévues pour l’écran.

**Why:** les deux graphiques ensemble dépassent une page A4 ; rendre leur conteneur insécable force le moteur d’impression à le déplacer ou à le fragmenter à un emplacement imprévisible.

**How to apply:** lors d’une modification de la mise en page du rapport, garder la dérogation d’impression sur le conteneur de pile et les protections de saut de page sur chaque carte de graphique.