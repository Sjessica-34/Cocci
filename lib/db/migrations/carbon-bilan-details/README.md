# Détails du Bilan Carbone

Cette migration ajoute les tables relationnelles `carbon_bilan_travel_items` et
`carbon_bilan_usage_items`. Elle est additive : les colonnes historiques
`carbon_bilans.deplacements` et `carbon_bilans.utilisation` restent présentes.

Les nouvelles lignes utilisent les mêmes `organization_id` et `exercise_id` que
leur bilan parent afin de rester compatibles avec le cycle annuel et la
duplication d'exercice.

Ne pas exécuter automatiquement cette migration sur Neon préproduction.