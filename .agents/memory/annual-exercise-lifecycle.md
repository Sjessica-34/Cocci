---
name: Cycle annuel des exercices
description: Règles non évidentes du passage annuel automatique et de la période de finalisation.
---

Le passage annuel utilise une seule opération transactionnelle et idempotente pour le traitement planifié, le rattrapage et la commande manuelle superadministrateur. L’exercice courant est `active`; le précédent est `grace` et modifiable jusqu’au 28 février inclus; les plus anciens sont `closed`.

**Why:** Des chemins de transition distincts créeraient des écarts de duplication et des exercices partiellement initialisés après une indisponibilité ou une relance.

**How to apply:** Toute nouvelle donnée annuelle doit être déclarée explicitement comme dupliquée, réinitialisée ou traitée spécialement. Ne jamais ajouter une seconde logique de création/clôture d’exercice.