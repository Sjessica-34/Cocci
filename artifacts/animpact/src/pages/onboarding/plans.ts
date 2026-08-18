/**
 * Définition des formules Cocci et mapping effectif → formule.
 *
 * Architecture Stripe-ready :
 *   - Renseigner `stripeProductId` et `stripePriceId` lors de l'intégration Stripe.
 *   - Le parcours d'onboarding stocke la clé effectif dans sessionStorage[EFFECTIF_SESSION_KEY].
 *   - Le bouton "Souscrire" devra ouvrir Stripe Checkout avec `plan.stripePriceId`.
 */

export type EffectifKey =
  | "1-5"
  | "6-10"
  | "11-25"
  | "26-50"
  | "51-100"
  | "101-250"
  | "250+";

export interface Plan {
  /** Libellé de la tranche d'effectif. */
  effectifLabel: string;
  /** Prix TTC mensuel en euros. null = sur devis. */
  pricePerMonth: number | null;
  /** Effectif maximum de la tranche (pour subscriptions.max_employees). null = illimité. */
  maxEmployees: number | null;
  // ── Placeholders Stripe ──────────────────────────────────────────────────
  // À renseigner lors de l'intégration Stripe Checkout.
  stripeProductId: string | null;
  stripePriceId: string | null;
}

/** Options présentées à l'utilisateur sur l'écran "Effectif". */
export const EFFECTIF_OPTIONS: { key: EffectifKey; label: string }[] = [
  { key: "1-5",     label: "1 à 5 salariés" },
  { key: "6-10",    label: "6 à 10 salariés" },
  { key: "11-25",   label: "11 à 25 salariés" },
  { key: "26-50",   label: "26 à 50 salariés" },
  { key: "51-100",  label: "51 à 100 salariés" },
  { key: "101-250", label: "101 à 250 salariés" },
  { key: "250+",    label: "Plus de 250 salariés" },
];

/** Catalogue des formules indexé par clé d'effectif. */
export const PLANS: Record<EffectifKey, Plan> = {
  "1-5":     { effectifLabel: "1 à 5 salariés",       pricePerMonth: 19.99,  maxEmployees: 5,   stripeProductId: null, stripePriceId: null },
  "6-10":    { effectifLabel: "6 à 10 salariés",      pricePerMonth: 29.99,  maxEmployees: 10,  stripeProductId: null, stripePriceId: null },
  "11-25":   { effectifLabel: "11 à 25 salariés",     pricePerMonth: 39.99,  maxEmployees: 25,  stripeProductId: null, stripePriceId: null },
  "26-50":   { effectifLabel: "26 à 50 salariés",     pricePerMonth: 59.99,  maxEmployees: 50,  stripeProductId: null, stripePriceId: null },
  "51-100":  { effectifLabel: "51 à 100 salariés",    pricePerMonth: 89.99,  maxEmployees: 100, stripeProductId: null, stripePriceId: null },
  "101-250": { effectifLabel: "101 à 250 salariés",   pricePerMonth: 129.99, maxEmployees: 250, stripeProductId: null, stripePriceId: null },
  "250+":    { effectifLabel: "Plus de 250 salariés", pricePerMonth: null,   maxEmployees: null,stripeProductId: null, stripePriceId: null },
};

/** Clé sessionStorage utilisée pour transmettre la tranche entre les étapes. */
export const EFFECTIF_SESSION_KEY = "cocci_onboarding_effectif";

/** Retourne la formule correspondant à une clé d'effectif. */
export function effectifToPlan(key: EffectifKey): Plan {
  return PLANS[key];
}
