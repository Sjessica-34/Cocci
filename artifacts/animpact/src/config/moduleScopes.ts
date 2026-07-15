/**
 * Registre central des scopes et stratégies de consolidation des modules.
 *
 * scope "group"      → une seule instance pour tout le groupe.
 *                      Les filiales voient ces données en lecture seule.
 *                      Depuis "Vue Groupe" : édition normale.
 *
 * scope "subsidiary" → chaque entité (filiale ou entreprise solo) possède ses propres données.
 *                      Depuis "Vue Groupe" : données consolidées selon la stratégie définie.
 *
 * Stratégies de consolidation (scope "subsidiary" uniquement) :
 *   NONE       → pas de consolidation (ex: Diagnostic RSE en attente, modules Groupe)
 *   SUM        → additionner les valeurs brutes de toutes les filiales
 *   RECALCULATE→ additionner les données brutes puis recalculer tous les indicateurs dérivés
 *   LIST       → lister toutes les entrées de toutes les filiales (avec filtre filiale)
 *
 * Règle d'or : NE JAMAIS calculer un indicateur groupe en faisant une moyenne de pourcentages.
 * Toujours consolider à partir des données brutes.
 *
 * Pour ajouter un nouveau module : une ligne ici suffit.
 * Aucune modification du routeur, des gardes ou des composants de navigation.
 */
export type ModuleScope = "group" | "subsidiary";

export type ConsolidationStrategy = "NONE" | "SUM" | "RECALCULATE" | "LIST";

export interface ModuleConfig {
  scope: ModuleScope;
  /**
   * Stratégie de consolidation lorsque le contexte "Groupe" consulte ce module.
   * Ignorée pour les modules de scope "group" (ils n'ont qu'une seule instance).
   */
  consolidation: ConsolidationStrategy;
}

export const MODULE_CONFIG = {
  // ── Modules Groupe (une seule instance, pas de consolidation) ───────────────
  "parties-prenantes":     { scope: "group",      consolidation: "NONE"        },
  "enjeux":                { scope: "group",      consolidation: "NONE"        }, // Matrice de matérialité
  "numerique-responsable": { scope: "group",      consolidation: "NONE"        },
  "administration":        { scope: "group",      consolidation: "NONE"        },
  "captation-carbone":     { scope: "group",      consolidation: "NONE"        },
  "impact-score":          { scope: "group",      consolidation: "NONE"        },
  "mes-labels":            { scope: "group",      consolidation: "NONE"        },

  // ── Modules Filiale (consolidation selon stratégie) ─────────────────────────
  "bilan-carbone":         { scope: "subsidiary", consolidation: "SUM"         },
  "barometre-social":      { scope: "subsidiary", consolidation: "RECALCULATE" },
  "capital-humain":        { scope: "subsidiary", consolidation: "RECALCULATE" },
  "achats-responsables":   { scope: "subsidiary", consolidation: "RECALCULATE" },
  "diagnostic":            { scope: "subsidiary", consolidation: "NONE"        }, // vue consolidée à venir
  "mes-actions":           { scope: "subsidiary", consolidation: "LIST"        },
} satisfies Record<string, ModuleConfig>;

// Rétrocompatibilité — préférer MODULE_CONFIG pour les nouveaux modules
export const MODULE_SCOPES = Object.fromEntries(
  Object.entries(MODULE_CONFIG).map(([k, v]) => [k, v.scope]),
) as Record<keyof typeof MODULE_CONFIG, ModuleScope>;
