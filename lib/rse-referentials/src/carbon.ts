export type CarbonScope = "1" | "2" | "3";

export interface CarbonTravelItem {
  id?: number;
  carbonBilanId?: number;
  categoryKey: string;
  label: string;
  quantity: number;
  unit: string;
  emissionFactor?: number | null;
  emissions?: number | null;
  scope?: CarbonScope;
  createdAt?: string;
  updatedAt?: string;
}

export interface CarbonUsageItem {
  id?: number;
  carbonBilanId?: number;
  productName: string;
  unitsSold: number;
  lifespanYears: number;
  consumesEnergy: boolean;
  energyType?: string | null;
  consumptionPerYear?: number | null;
  unit?: string | null;
  country?: string | null;
  emissionFactor?: number | null;
  emissions?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CarbonDetailTotals {
  travelTotal: number;
  usageTotal: number;
  globalTotal: number;
  scope1: number;
  scope2: number;
  scope3: number;
  byCategory: Record<string, number>;
  missingTravelFactors: string[];
  missingUsageFactors: string[];
}

export const TRAVEL_CATEGORIES = [
  { key: "voiture_thermique", label: "Voiture thermique", scope: "3" as const },
  { key: "voiture_hybride", label: "Voiture hybride", scope: "3" as const },
  { key: "voiture_electrique", label: "Voiture électrique", scope: "3" as const },
  { key: "deux_roues_motorise", label: "Deux-roues motorisé", scope: "3" as const },
  { key: "train", label: "Train", scope: "3" as const },
  { key: "bus_car", label: "Bus / car", scope: "3" as const },
  { key: "avion_court_courrier", label: "Avion court-courrier", scope: "3" as const },
  { key: "avion_moyen_courrier", label: "Avion moyen-courrier", scope: "3" as const },
  { key: "avion_long_courrier", label: "Avion long-courrier", scope: "3" as const },
] as const;

/**
 * Factors already present in the application.
 *
 * Factors supplied from the ADEME references selected for this calculator.
 * A missing factor must never silently become zero in a user's carbon assessment.
 */
export const TRAVEL_EMISSION_FACTORS: Record<string, number | null> = {
  voiture_thermique: 0.000142,
  voiture_hybride: 0.000147,
  voiture_electrique: 0.0000674,
  deux_roues_motorise: 0.0000763,
  train: 0.00000293,
  bus_car: 0.0000376,
  avion_court_courrier: 0.000225,
  avion_moyen_courrier: 0.000185,
  avion_long_courrier: 0.000178,
};

export const TRAVEL_FACTOR_SOURCES: Record<string, string> = {
  voiture_thermique: "ADEME — voiture moyenne diesel (142 gCO₂e/km)",
  voiture_hybride: "ADEME — moyenne hybride non rechargeable (147 gCO₂e/km)",
  voiture_electrique: "ADEME — voiture électrique moyenne (67,4 gCO₂e/km)",
  deux_roues_motorise: "ADEME — scooter thermique, valeur simplifiée (76,3 gCO₂e/km)",
  train: "ADEME — TGV (2,93 gCO₂e/km)",
  bus_car: "ADEME — autocar thermique (37,6 gCO₂e/km)",
  avion_court_courrier: "ADEME — avion court-courrier, 300–1 000 km (225 gCO₂e/km)",
  avion_moyen_courrier: "ADEME — avion moyen-courrier, 1 000–2 000 km (185 gCO₂e/km)",
  avion_long_courrier: "ADEME — avion long-courrier, plus de 5 000 km (178 gCO₂e/km)",
};

export const USAGE_EMISSION_FACTORS: Record<string, Record<string, number>> = {
  kwh: { france: 0.052, europe: 0.233, monde: 0.429 },
  litres: { france: 2.28, europe: 2.28, monde: 2.28 },
  m3: { france: 2.20, europe: 2.20, monde: 2.20 },
  go: { france: 0.012, europe: 0.025, monde: 0.040 },
};

export const LEGACY_CARBON_CATEGORIES = [
  { key: "energie1", label: "Énergie 1", scope: "1" as const },
  { key: "energie2", label: "Énergie 2", scope: "2" as const },
  { key: "horsEnergie1", label: "Hors énergie 1", scope: "1" as const },
  { key: "horsEnergie2", label: "Hors énergie 2", scope: "1" as const },
  { key: "intrantsBiens", label: "Intrants — biens et matières", scope: "3" as const },
  { key: "intrantsServices", label: "Intrants — services", scope: "3" as const },
  { key: "futursEmballages", label: "Futurs emballages", scope: "3" as const },
  { key: "fret", label: "Fret", scope: "3" as const },
  { key: "deplacements", label: "Déplacements professionnels", scope: "3" as const },
  { key: "dechetsDirects", label: "Déchets directs", scope: "3" as const },
  { key: "immobilisations", label: "Immobilisations", scope: "3" as const },
  { key: "utilisation", label: "Utilisation des produits vendus", scope: "3" as const },
  { key: "finDeVie", label: "Fin de vie", scope: "3" as const },
] as const;

function finiteOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function calculateTravelEmissions(
  categoryKey: string,
  quantity: number,
  emissionFactor = TRAVEL_EMISSION_FACTORS[categoryKey] ?? null,
): number | null {
  const factor = finiteOrNull(emissionFactor);
  const km = finiteOrNull(quantity);
  if (factor === null || km === null) return null;
  return Math.round(km * factor * 1000) / 1000;
}

export function calculateUsageEmissions(item: Pick<CarbonUsageItem, "unitsSold" | "lifespanYears" | "consumesEnergy" | "energyType" | "consumptionPerYear" | "unit" | "country" | "emissionFactor">): number | null {
  if (!item.consumesEnergy) return 0;
  const units = finiteOrNull(item.unitsSold);
  const lifespan = finiteOrNull(item.lifespanYears);
  const consumption = finiteOrNull(item.consumptionPerYear);
  if (units === null || lifespan === null || consumption === null) return null;

  const unit = item.unit ?? "kwh";
  const factor = finiteOrNull(
    item.emissionFactor ??
      (item.energyType ? USAGE_EMISSION_FACTORS[item.energyType]?.[item.country ?? "france"] : null),
  );
  if (factor === null) return null;

  const annualConsumption = unit === "go" ? consumption * 12 : consumption;
  return Math.round((units * lifespan * annualConsumption * factor) / 1000 * 1000) / 1000;
}

export function calculateCarbonDetailTotals(
  legacy: Record<string, unknown>,
  travelItems: CarbonTravelItem[] = [],
  usageItems: CarbonUsageItem[] = [],
): CarbonDetailTotals {
  const hasTravelDetails = travelItems.length > 0;
  const hasUsageDetails = usageItems.length > 0;
  const byCategory: Record<string, number> = {};
  let travelTotal = 0;
  let usageTotal = 0;
  const missingTravelFactors: string[] = [];
  const missingUsageFactors: string[] = [];

  for (const item of travelItems) {
    const emissions = finiteOrNull(item.emissions) ?? calculateTravelEmissions(item.categoryKey, item.quantity, item.emissionFactor);
    if (emissions === null) {
      missingTravelFactors.push(item.categoryKey);
      continue;
    }
    travelTotal += emissions;
    byCategory[item.categoryKey] = (byCategory[item.categoryKey] ?? 0) + emissions;
  }

  for (const item of usageItems) {
    const emissions = finiteOrNull(item.emissions) ?? calculateUsageEmissions(item);
    if (emissions === null) {
      missingUsageFactors.push(item.productName);
      continue;
    }
    usageTotal += emissions;
    byCategory["utilisation"] = (byCategory["utilisation"] ?? 0) + emissions;
  }

  let globalTotal = 0;
  let scope1 = 0;
  let scope2 = 0;
  let scope3 = 0;
  for (const category of LEGACY_CARBON_CATEGORIES) {
    const value = category.key === "deplacements" && hasTravelDetails
      ? travelTotal
      : category.key === "utilisation" && hasUsageDetails
        ? usageTotal
        : finiteOrNull(legacy[category.key]) ?? 0;
    byCategory[category.key] = value;
    globalTotal += value;
    if (category.scope === "1") scope1 += value;
    else if (category.scope === "2") scope2 += value;
    else scope3 += value;
  }

  return {
    travelTotal,
    usageTotal,
    globalTotal,
    scope1,
    scope2,
    scope3,
    byCategory,
    missingTravelFactors: [...new Set(missingTravelFactors)],
    missingUsageFactors: [...new Set(missingUsageFactors)],
  };
}