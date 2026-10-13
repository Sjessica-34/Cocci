/**
 * Catalogue Stripe privé de Cocci.
 *
 * Les IDs Stripe proviennent exclusivement des variables d'environnement du
 * serveur. Les clients web ne reçoivent ni Product ID ni Price ID et ne
 * peuvent transmettre qu'une intention métier : une tranche d'effectif ou
 * l'action `additional_user`.
 */

export type EffectifKey =
  | "1-5"
  | "6-10"
  | "11-25"
  | "26-50"
  | "51-100"
  | "101-250";

export type CheckoutAction = "additional_user";

export interface CatalogOffer {
  offerName: string;
  maxEmployees: number | null;
  effectifKey: EffectifKey | null;
  action: CheckoutAction | null;
  productId: string;
  priceId: string;
}

function env(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function cocciProductId(): string | null {
  return env("STRIPE_COCCI_PRODUCT_ID");
}

const EFFECTIF_CATALOG: Record<EffectifKey, Omit<CatalogOffer, "productId" | "priceId"> & { priceEnv: string }> = {
  "1-5": {
    offerName: "Cocci — 1 à 5 salariés",
    maxEmployees: 5,
    effectifKey: "1-5",
    action: null,
    priceEnv: "STRIPE_COCCI_PRICE_1_5",
  },
  "6-10": {
    offerName: "Cocci — 6 à 10 salariés",
    maxEmployees: 10,
    effectifKey: "6-10",
    action: null,
    priceEnv: "STRIPE_COCCI_PRICE_6_10",
  },
  "11-25": {
    offerName: "Cocci — 11 à 25 salariés",
    maxEmployees: 25,
    effectifKey: "11-25",
    action: null,
    priceEnv: "STRIPE_COCCI_PRICE_11_25",
  },
  "26-50": {
    offerName: "Cocci — 26 à 50 salariés",
    maxEmployees: 50,
    effectifKey: "26-50",
    action: null,
    priceEnv: "STRIPE_COCCI_PRICE_26_50",
  },
  "51-100": {
    offerName: "Cocci — 51 à 100 salariés",
    maxEmployees: 100,
    effectifKey: "51-100",
    action: null,
    priceEnv: "STRIPE_COCCI_PRICE_51_100",
  },
  "101-250": {
    offerName: "Cocci — 101 à 250 salariés",
    maxEmployees: 250,
    effectifKey: "101-250",
    action: null,
    priceEnv: "STRIPE_COCCI_PRICE_101_250",
  },
};

function configuredOffer(
  definition: Omit<CatalogOffer, "productId" | "priceId"> & { priceEnv: string },
  productId: string | null,
): CatalogOffer | null {
  const priceId = env(definition.priceEnv);
  if (!productId || !priceId) return null;

  const { priceEnv: _priceEnv, ...offer } = definition;
  return { ...offer, productId, priceId };
}

/** Détermine la formule uniquement à partir de sa clé métier. */
export function resolveEffectifOffer(effectifKey: unknown): CatalogOffer | null {
  if (typeof effectifKey !== "string") return null;
  const definition = EFFECTIF_CATALOG[effectifKey as EffectifKey];
  if (!definition) return null;
  return configuredOffer(definition, cocciProductId());
}

/** Détermine le complément à partir d'une action métier autorisée. */
export function resolveActionOffer(action: unknown): CatalogOffer | null {
  if (action !== "additional_user") return null;
  return configuredOffer(
    {
      offerName: "Cocci — Utilisateur supplémentaire",
      maxEmployees: null,
      effectifKey: null,
      action: "additional_user",
      priceEnv: "STRIPE_ADDITIONAL_USER_PRICE_ID",
    },
    env("STRIPE_ADDITIONAL_USER_PRODUCT_ID"),
  );
}

/**
 * Point d'entrée unique pour le checkout. Un frontend ne peut pas y choisir
 * de Product ID ou Price ID : seuls `effectifKey` et `action` sont acceptés.
 */
export function resolveCheckoutOffer(input: {
  effectifKey?: unknown;
  action?: unknown;
}): CatalogOffer | null {
  if (input.action !== undefined) return resolveActionOffer(input.action);
  return resolveEffectifOffer(input.effectifKey);
}

/** Une formule payante est une hausse uniquement si sa capacité augmente. */
export function isEffectifUpgrade(
  currentMaxEmployees: number | null | undefined,
  targetOffer: CatalogOffer | null | undefined,
): boolean {
  return currentMaxEmployees != null
    && targetOffer?.maxEmployees != null
    && targetOffer.maxEmployees > currentMaxEmployees;
}

/** Liste des formules configurées, pour les réponses publiques sans IDs Stripe. */
export function configuredEffectifOffers(): CatalogOffer[] {
  return (Object.keys(EFFECTIF_CATALOG) as EffectifKey[])
    .map((key) => resolveEffectifOffer(key))
    .filter((offer): offer is CatalogOffer => offer !== null);
}
