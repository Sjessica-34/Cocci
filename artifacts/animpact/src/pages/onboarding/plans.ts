/**
 * Définition des formules Cocci et mapping effectif → formule.
 *
 * Les identifiants Stripe ne sont volontairement pas présents dans le frontend.
 * Le parcours transmet uniquement la clé d'effectif au backend, qui choisit
 * lui-même le produit et le prix autorisés.
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
  "1-5":     { effectifLabel: "1 à 5 salariés",       pricePerMonth: 19.99,  maxEmployees: 5 },
  "6-10":    { effectifLabel: "6 à 10 salariés",      pricePerMonth: 29.99,  maxEmployees: 10 },
  "11-25":   { effectifLabel: "11 à 25 salariés",     pricePerMonth: 39.99,  maxEmployees: 25 },
  "26-50":   { effectifLabel: "26 à 50 salariés",     pricePerMonth: 59.99,  maxEmployees: 50 },
  "51-100":  { effectifLabel: "51 à 100 salariés",    pricePerMonth: 89.99,  maxEmployees: 100 },
  "101-250": { effectifLabel: "101 à 250 salariés",   pricePerMonth: 129.99, maxEmployees: 250 },
  "250+":    { effectifLabel: "Plus de 250 salariés", pricePerMonth: null,   maxEmployees: null },
};

/** Clé historique conservée pour migrer les choix sessionStorage vers localStorage. */
export const EFFECTIF_SESSION_KEY = "cocci_onboarding_effectif";

/**
 * Distinct de la tranche sélectionnée : cette clé confirme que l'utilisateur
 * a explicitement demandé à payer. Elle permet de reprendre Checkout après
 * l'authentification et la création de l'organisation, sans déclencher un
 * paiement après une simple consultation de formule.
 */
export const SUBSCRIPTION_INTENT_SESSION_KEY = "cocci_subscription_intent_effectif";

/** Marque la continuation immédiate du parcours après la création de l'organisation. */
export const ONBOARDING_CONTINUATION_SESSION_KEY = "cocci_onboarding_continuation";
export const ORGANIZATION_NAME_DRAFT_KEY = "cocci_onboarding_organization_name";
export const ORGANIZATION_TYPE_DRAFT_KEY = "cocci_onboarding_organization_type";

function readPersistentValue(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const persistent = window.localStorage.getItem(key);
    if (persistent) return persistent;
  } catch {
    // Fall back to the current tab when persistent storage is unavailable.
  }
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writePersistentValue(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Preserve the flow for this tab if local storage is unavailable.
  }
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Session storage may also be disabled by browser policy.
  }
}

function removePersistentValue(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Continue clearing the other storage backend.
  }
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Storage may be disabled by browser policy.
  }
}

export function readEffectifSelection(): EffectifKey | null {
  const value = readPersistentValue(EFFECTIF_SESSION_KEY);
  return EFFECTIF_OPTIONS.some((option) => option.key === value)
    ? value as EffectifKey
    : null;
}

export function saveEffectifSelection(key: EffectifKey): void {
  writePersistentValue(EFFECTIF_SESSION_KEY, key);
}

export function readSubscriptionIntent(): EffectifKey | null {
  const value = readPersistentValue(SUBSCRIPTION_INTENT_SESSION_KEY);
  return EFFECTIF_OPTIONS.some((option) => option.key === value)
    ? value as EffectifKey
    : null;
}

export function saveSubscriptionIntent(key: EffectifKey): void {
  saveEffectifSelection(key);
  writePersistentValue(SUBSCRIPTION_INTENT_SESSION_KEY, key);
}

export function clearOnboardingChoices(): void {
  removePersistentValue(EFFECTIF_SESSION_KEY);
  removePersistentValue(SUBSCRIPTION_INTENT_SESSION_KEY);
  removePersistentValue(ONBOARDING_CONTINUATION_SESSION_KEY);
  removePersistentValue(ORGANIZATION_NAME_DRAFT_KEY);
  removePersistentValue(ORGANIZATION_TYPE_DRAFT_KEY);
}

export function readOrganizationNameDraft(): string {
  return readPersistentValue(ORGANIZATION_NAME_DRAFT_KEY) ?? "";
}

export function saveOrganizationNameDraft(name: string): void {
  if (name.trim()) writePersistentValue(ORGANIZATION_NAME_DRAFT_KEY, name);
  else removePersistentValue(ORGANIZATION_NAME_DRAFT_KEY);
}

export function clearOrganizationNameDraft(): void {
  removePersistentValue(ORGANIZATION_NAME_DRAFT_KEY);
  removePersistentValue(ORGANIZATION_TYPE_DRAFT_KEY);
}

export function readOrganizationTypeDraft(): "entreprise" | "groupe" {
  return readPersistentValue(ORGANIZATION_TYPE_DRAFT_KEY) === "groupe" ? "groupe" : "entreprise";
}

export function saveOrganizationTypeDraft(type: "entreprise" | "groupe"): void {
  writePersistentValue(ORGANIZATION_TYPE_DRAFT_KEY, type);
}

/** Retourne la formule correspondant à une clé d'effectif. */
export function effectifToPlan(key: EffectifKey): Plan {
  return PLANS[key];
}
