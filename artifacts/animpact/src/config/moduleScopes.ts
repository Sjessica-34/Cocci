/**
 * Registre central des scopes de modules.
 *
 * "group"      → une seule instance pour tout le groupe.
 *                Les filiales voient ces données en lecture seule.
 *                Depuis "Vue Groupe" : édition normale.
 *
 * "subsidiary" → chaque entité (filiale ou entreprise solo) possède ses propres données.
 *                Depuis "Vue Groupe" : vue consolidée (à implémenter module par module).
 *
 * Pour ajouter un nouveau module : une ligne ici suffit.
 * Aucune modification du routeur, des gardes ou des composants de navigation.
 */
export type ModuleScope = "group" | "subsidiary";

export const MODULE_SCOPES = {
  // ── Modules Groupe ──────────────────────────────────────────────────────────
  "parties-prenantes":     "group",
  "enjeux":                "group",   // Matrice de matérialité
  "numerique-responsable": "group",
  "administration":        "group",   // Paramètres, membres, filiales
  "captation-carbone":     "group",

  // ── Modules Filiale ─────────────────────────────────────────────────────────
  "bilan-carbone":         "subsidiary",
  "barometre-social":      "subsidiary",
  "capital-humain":        "subsidiary",
  "achats-responsables":   "subsidiary",
} satisfies Record<string, ModuleScope>;
