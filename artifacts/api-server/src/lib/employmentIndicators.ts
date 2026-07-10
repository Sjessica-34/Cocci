import { create, all } from "mathjs";
import type {
  EmploymentWorkforce,
  EmploymentDiversity,
  EmploymentTraining,
} from "@workspace/db";

// Restricted mathjs instance: only arithmetic evaluation, no access to
// import/createUnit/parse-time functions that could be abused. Custom KPI
// formulas are built through a guided variable+operator picker in the
// frontend, never freehand code, but we still evaluate defensively.
const math = create(all, {});
math.import(
  {
    import: function () {
      throw new Error("Function import is disabled");
    },
    createUnit: function () {
      throw new Error("Function createUnit is disabled");
    },
    evaluate: function () {
      throw new Error("Function evaluate is disabled");
    },
    parse: function () {
      throw new Error("Function parse is disabled");
    },
    simplify: function () {
      throw new Error("Function simplify is disabled");
    },
  },
  { override: true },
);

export type IndicatorTrend = "up" | "down" | "stable" | "new" | "unknown";

export interface Indicator {
  code: string;
  label: string;
  value: number | null;
  unit: string | null;
  previousValue: number | null;
  trend: IndicatorTrend;
}

export interface FormulaVariable {
  code: string;
  label: string;
  value: number | null;
  unit: string | null;
}

function round(n: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

function pct(numerator: number | null | undefined, denominator: number | null | undefined): number | null {
  if (numerator == null || denominator == null || denominator <= 0) return null;
  return round((numerator / denominator) * 100);
}

/**
 * Builds the flat variable set (age/turnover-independent raw + derived
 * values) available to custom KPI formulas AND used internally to compute
 * the standard indicator list. Keeping a single source of variables means
 * a custom formula can reference any raw field or any built-in indicator
 * (e.g. "taux_femmes / 100 * effectif_total") without us maintaining two
 * separate lists.
 */
export function buildVariableMap(
  workforce: EmploymentWorkforce | null,
  diversity: EmploymentDiversity | null,
  training: EmploymentTraining | null,
): Record<string, number | null> {
  const w = workforce;
  const d = diversity;
  const t = training;

  const effectifTotal = w?.totalHeadcount ?? null;

  return {
    effectif_total: effectifTotal,
    nb_cdi: w?.nbCdi ?? null,
    nb_cdd: w?.nbCdd ?? null,
    nb_alternants: w?.nbAlternants ?? null,
    nb_apprentis: w?.nbApprentis ?? null,
    nb_stagiaires: w?.nbStagiaires ?? null,
    nb_interimaires: w?.nbInterimaires ?? null,
    nb_temps_plein: w?.nbTempsPlein ?? null,
    nb_temps_partiel: w?.nbTempsPartiel ?? null,
    nb_recrutements: w?.nbRecrutements ?? null,
    nb_departs: w?.nbDeparts ?? null,
    age_moyen: w?.avgAge ?? null,
    anciennete_moyenne: w?.avgSeniority ?? null,

    nb_hommes: d?.nbHommes ?? null,
    nb_femmes: d?.nbFemmes ?? null,
    nb_non_binaire: d?.nbNonBinaire ?? null,
    nb_handicap: d?.nbHandicap ?? null,
    index_egalite_hf: d?.indexEgaliteHf ?? null,

    nb_heures_formation: t?.nbHeuresFormation ?? null,
    budget_formation: t?.budgetFormation ?? null,
    nb_collaborateurs_formes: t?.nbCollaborateursFormes ?? null,
    nb_entretiens_annuels: t?.nbEntretiensAnnuels ?? null,
    nb_entretiens_professionnels: t?.nbEntretiensProfessionnels ?? null,
    nb_certifications: t?.nbCertifications ?? null,
    nb_evolutions_internes: t?.nbEvolutionsInternes ?? null,

    // Derived, exposed as variables too so custom KPIs can build on them.
    taux_cdi: pct(w?.nbCdi, effectifTotal),
    taux_cdd: pct(w?.nbCdd, effectifTotal),
    taux_alternants: pct(w?.nbAlternants, effectifTotal),
    taux_stagiaires: pct(w?.nbStagiaires, effectifTotal),
    taux_femmes: pct(d?.nbFemmes, effectifTotal),
    taux_hommes: pct(d?.nbHommes, effectifTotal),
    taux_formation: pct(t?.nbCollaborateursFormes, effectifTotal),
    turnover: computeTurnover(w),
  };
}

function computeTurnover(w: EmploymentWorkforce | null): number | null {
  if (!w || w.totalHeadcount == null || w.totalHeadcount <= 0) return null;
  if (w.nbRecrutements == null && w.nbDeparts == null) return null;
  const moyenneMouvements = ((w.nbRecrutements ?? 0) + (w.nbDeparts ?? 0)) / 2;
  return round((moyenneMouvements / w.totalHeadcount) * 100);
}

export const FORMULA_VARIABLE_LABELS: Record<string, { label: string; unit: string | null }> = {
  effectif_total: { label: "Effectif total", unit: null },
  nb_cdi: { label: "Nombre de CDI", unit: null },
  nb_cdd: { label: "Nombre de CDD", unit: null },
  nb_alternants: { label: "Nombre d'alternants", unit: null },
  nb_apprentis: { label: "Nombre d'apprentis", unit: null },
  nb_stagiaires: { label: "Nombre de stagiaires", unit: null },
  nb_interimaires: { label: "Nombre d'intérimaires", unit: null },
  nb_temps_plein: { label: "Nombre de temps pleins", unit: null },
  nb_temps_partiel: { label: "Nombre de temps partiels", unit: null },
  nb_recrutements: { label: "Nombre de recrutements", unit: null },
  nb_departs: { label: "Nombre de départs", unit: null },
  age_moyen: { label: "Âge moyen", unit: "ans" },
  anciennete_moyenne: { label: "Ancienneté moyenne", unit: "ans" },
  nb_hommes: { label: "Nombre d'hommes", unit: null },
  nb_femmes: { label: "Nombre de femmes", unit: null },
  nb_non_binaire: { label: "Nombre de non-binaires", unit: null },
  nb_handicap: { label: "Collaborateurs en situation de handicap", unit: null },
  index_egalite_hf: { label: "Index égalité H/F", unit: "pts" },
  nb_heures_formation: { label: "Heures de formation", unit: "h" },
  budget_formation: { label: "Budget formation", unit: "€" },
  nb_collaborateurs_formes: { label: "Collaborateurs formés", unit: null },
  nb_entretiens_annuels: { label: "Entretiens annuels", unit: null },
  nb_entretiens_professionnels: { label: "Entretiens professionnels", unit: null },
  nb_certifications: { label: "Certifications", unit: null },
  nb_evolutions_internes: { label: "Évolutions internes", unit: null },
  taux_cdi: { label: "% de CDI", unit: "%" },
  taux_cdd: { label: "% de CDD", unit: "%" },
  taux_alternants: { label: "% d'alternants", unit: "%" },
  taux_stagiaires: { label: "% de stagiaires", unit: "%" },
  taux_femmes: { label: "% de femmes", unit: "%" },
  taux_hommes: { label: "% d'hommes", unit: "%" },
  taux_formation: { label: "% de collaborateurs formés", unit: "%" },
  turnover: { label: "Turn-over", unit: "%" },
};

export function listFormulaVariables(
  workforce: EmploymentWorkforce | null,
  diversity: EmploymentDiversity | null,
  training: EmploymentTraining | null,
): FormulaVariable[] {
  const values = buildVariableMap(workforce, diversity, training);
  return Object.entries(FORMULA_VARIABLE_LABELS).map(([code, meta]) => ({
    code,
    label: meta.label,
    unit: meta.unit,
    value: values[code] ?? null,
  }));
}

export class FormulaEvaluationError extends Error {}

const ALLOWED_FORMULA_CHARS = /^[a-z0-9_+\-*/().\s]+$/i;

/**
 * Evaluates a custom KPI formula against the current variable set.
 *
 * Formulas are restricted to arithmetic over the predefined variable codes
 * (see FORMULA_VARIABLE_LABELS) — no free-form code, no function calls, no
 * string/member access. Returns null (not an error) when a referenced
 * variable's underlying data hasn't been entered yet, since every field in
 * this module is optional.
 */
export function evaluateFormula(formula: string, variables: Record<string, number | null>): number | null {
  const trimmed = formula.trim();
  if (!trimmed) throw new FormulaEvaluationError("La formule est vide");
  if (!ALLOWED_FORMULA_CHARS.test(trimmed)) {
    throw new FormulaEvaluationError("La formule ne peut contenir que des variables, chiffres et opérateurs (+ − × ÷ parenthèses)");
  }

  let node;
  try {
    node = math.parse(trimmed);
  } catch {
    throw new FormulaEvaluationError("Formule invalide");
  }

  const usedSymbols = new Set<string>();
  node.traverse((n) => {
    if (n.type === "SymbolNode") usedSymbols.add((n as unknown as { name: string }).name);
    if (n.type === "FunctionNode") {
      throw new FormulaEvaluationError("Les appels de fonction ne sont pas autorisés dans une formule");
    }
  });

  for (const symbol of usedSymbols) {
    if (!(symbol in FORMULA_VARIABLE_LABELS)) {
      throw new FormulaEvaluationError(`Variable inconnue : ${symbol}`);
    }
  }

  const hasMissingData = Array.from(usedSymbols).some((s) => variables[s] == null);
  if (hasMissingData) return null;

  const scope: Record<string, number> = {};
  for (const symbol of usedSymbols) scope[symbol] = variables[symbol] as number;

  try {
    const result = node.evaluate(scope);
    if (typeof result !== "number" || !Number.isFinite(result)) return null;
    return round(result, 2);
  } catch {
    return null;
  }
}

function trend(value: number | null, previous: number | null): IndicatorTrend {
  if (value == null) return "unknown";
  if (previous == null) return "new";
  if (value > previous) return "up";
  if (value < previous) return "down";
  return "stable";
}

/** Builds the full standard indicator list, with year-over-year comparison. */
export function computeStandardIndicators(
  current: { workforce: EmploymentWorkforce | null; diversity: EmploymentDiversity | null; training: EmploymentTraining | null },
  previous: { workforce: EmploymentWorkforce | null; diversity: EmploymentDiversity | null; training: EmploymentTraining | null } | null,
): Indicator[] {
  const cur = buildVariableMap(current.workforce, current.diversity, current.training);
  const prev = previous ? buildVariableMap(previous.workforce, previous.diversity, previous.training) : null;

  const codes: (keyof typeof FORMULA_VARIABLE_LABELS)[] = [
    "turnover",
    "taux_cdi",
    "taux_cdd",
    "taux_alternants",
    "taux_stagiaires",
    "taux_femmes",
    "taux_hommes",
    "taux_formation",
    "nb_heures_formation",
    "nb_recrutements",
    "nb_departs",
    "effectif_total",
  ];

  return codes.map((code) => {
    const meta = FORMULA_VARIABLE_LABELS[code];
    const value = cur[code] ?? null;
    const previousValue = prev ? prev[code] ?? null : null;
    return {
      code,
      label: meta.label,
      unit: meta.unit,
      value,
      previousValue,
      trend: trend(value, previousValue),
    };
  });
}
