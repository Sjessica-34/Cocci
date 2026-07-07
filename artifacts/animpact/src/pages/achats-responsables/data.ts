export const SUPPLIER_CATEGORIES = [
  "Matières premières",
  "Sous-traitance",
  "Prestations de services",
  "Logistique & transport",
  "Équipements & machines",
  "Informatique & télécom",
  "Énergie & fluides",
  "Maintenance & entretien",
  "Fournitures de bureau",
  "Communication & marketing",
  "Ressources humaines",
  "Formation",
  "Consulting",
  "Autre",
];

// French departments → région
const DEPT_TO_REGION: Record<string, string> = {
  "01": "Auvergne-Rhône-Alpes", "03": "Auvergne-Rhône-Alpes", "07": "Auvergne-Rhône-Alpes",
  "15": "Auvergne-Rhône-Alpes", "26": "Auvergne-Rhône-Alpes", "38": "Auvergne-Rhône-Alpes",
  "42": "Auvergne-Rhône-Alpes", "43": "Auvergne-Rhône-Alpes", "63": "Auvergne-Rhône-Alpes",
  "69": "Auvergne-Rhône-Alpes", "73": "Auvergne-Rhône-Alpes", "74": "Auvergne-Rhône-Alpes",

  "21": "Bourgogne-Franche-Comté", "25": "Bourgogne-Franche-Comté", "39": "Bourgogne-Franche-Comté",
  "58": "Bourgogne-Franche-Comté", "70": "Bourgogne-Franche-Comté", "71": "Bourgogne-Franche-Comté",
  "89": "Bourgogne-Franche-Comté", "90": "Bourgogne-Franche-Comté",

  "22": "Bretagne", "29": "Bretagne", "35": "Bretagne", "56": "Bretagne",

  "18": "Centre-Val de Loire", "28": "Centre-Val de Loire", "36": "Centre-Val de Loire",
  "37": "Centre-Val de Loire", "41": "Centre-Val de Loire", "45": "Centre-Val de Loire",

  "2A": "Corse", "2B": "Corse",

  "08": "Grand Est", "10": "Grand Est", "51": "Grand Est", "52": "Grand Est",
  "54": "Grand Est", "55": "Grand Est", "57": "Grand Est", "67": "Grand Est",
  "68": "Grand Est", "88": "Grand Est",

  "02": "Hauts-de-France", "59": "Hauts-de-France", "60": "Hauts-de-France",
  "62": "Hauts-de-France", "80": "Hauts-de-France",

  "75": "Île-de-France", "77": "Île-de-France", "78": "Île-de-France",
  "91": "Île-de-France", "92": "Île-de-France", "93": "Île-de-France",
  "94": "Île-de-France", "95": "Île-de-France",

  "14": "Normandie", "27": "Normandie", "50": "Normandie", "61": "Normandie", "76": "Normandie",

  "16": "Nouvelle-Aquitaine", "17": "Nouvelle-Aquitaine", "19": "Nouvelle-Aquitaine",
  "23": "Nouvelle-Aquitaine", "24": "Nouvelle-Aquitaine", "33": "Nouvelle-Aquitaine",
  "40": "Nouvelle-Aquitaine", "47": "Nouvelle-Aquitaine", "64": "Nouvelle-Aquitaine",
  "79": "Nouvelle-Aquitaine", "86": "Nouvelle-Aquitaine", "87": "Nouvelle-Aquitaine",

  "09": "Occitanie", "11": "Occitanie", "12": "Occitanie", "30": "Occitanie",
  "31": "Occitanie", "32": "Occitanie", "34": "Occitanie", "46": "Occitanie",
  "48": "Occitanie", "65": "Occitanie", "66": "Occitanie", "81": "Occitanie",
  "82": "Occitanie",

  "44": "Pays de la Loire", "49": "Pays de la Loire", "53": "Pays de la Loire",
  "72": "Pays de la Loire", "85": "Pays de la Loire",

  "04": "Provence-Alpes-Côte d'Azur", "05": "Provence-Alpes-Côte d'Azur",
  "06": "Provence-Alpes-Côte d'Azur", "13": "Provence-Alpes-Côte d'Azur",
  "83": "Provence-Alpes-Côte d'Azur", "84": "Provence-Alpes-Côte d'Azur",

  "971": "Guadeloupe", "972": "Martinique", "973": "Guyane",
  "974": "La Réunion", "976": "Mayotte",
};

const EUROPE_COUNTRIES = new Set([
  "Allemagne", "Germany", "Autriche", "Austria", "Belgique", "Belgium",
  "Bulgarie", "Bulgaria", "Chypre", "Cyprus", "Croatie", "Croatia",
  "Danemark", "Denmark", "Espagne", "Spain", "Estonie", "Estonia",
  "Finlande", "Finland", "France", "Grèce", "Greece", "Hongrie", "Hungary",
  "Irlande", "Ireland", "Italie", "Italy", "Lettonie", "Latvia",
  "Lituanie", "Lithuania", "Luxembourg", "Malte", "Malta",
  "Pays-Bas", "Netherlands", "Pologne", "Poland", "Portugal",
  "Roumanie", "Romania", "Slovaquie", "Slovakia", "Slovénie", "Slovenia",
  "Suède", "Sweden", "Tchéquie", "Czech Republic", "Czechia",
  "Suisse", "Switzerland", "Norvège", "Norway", "Islande", "Iceland",
  "Liechtenstein", "Royaume-Uni", "United Kingdom", "UK",
]);

export function getDeptFromPostalCode(postalCode: string | null | undefined): string | null {
  if (!postalCode) return null;
  const code = postalCode.trim().toUpperCase();
  if (code.startsWith("97") && code.length >= 3) return code.slice(0, 3);
  if (code.startsWith("2A") || code.startsWith("2B")) return code.slice(0, 2);
  if (code.length >= 2) return code.slice(0, 2).replace(/^0(\d)$/, "0$1");
  return null;
}

export function getRegionFromDept(dept: string | null | undefined): string | null {
  if (!dept) return null;
  return DEPT_TO_REGION[dept] ?? null;
}

export type GeoTier = "France" | "Europe" | "Hors Europe";

export function getGeoTier(country: string | null | undefined): GeoTier {
  if (!country || country.trim() === "" || country === "France" || country === "FR") return "France";
  if (EUROPE_COUNTRIES.has(country.trim())) return "Europe";
  return "Hors Europe";
}

export interface GeoDistribution {
  france: number;
  europe: number;
  horsEurope: number;
  byRegion: Record<string, number>;
  total: number;
}

export interface SupplierLike {
  country?: string | null;
  postalCode?: string | null;
  department?: string | null;
  region?: string | null;
  criticality?: number | null;
  riskLevel?: number | null;
  dependency?: number | null;
}

export function computeGeoDistribution(suppliers: SupplierLike[]): GeoDistribution {
  const result: GeoDistribution = { france: 0, europe: 0, horsEurope: 0, byRegion: {}, total: suppliers.length };
  for (const s of suppliers) {
    const tier = getGeoTier(s.country);
    if (tier === "France") {
      result.france++;
      const dept   = s.department ?? getDeptFromPostalCode(s.postalCode);
      const region = s.region ?? getRegionFromDept(dept) ?? "Région inconnue";
      result.byRegion[region] = (result.byRegion[region] ?? 0) + 1;
    } else if (tier === "Europe") {
      result.europe++;
    } else {
      result.horsEurope++;
    }
  }
  return result;
}

const IDENTITY_FIELDS: Array<keyof SupplierLike> = [];
const ALL_COMPLETION_FIELDS = [
  "name", "category", "contactName", "phone", "email",
  "website", "address", "postalCode", "city", "country",
  "siret", "annualAmount", "criticality", "riskLevel", "dependency",
];

export function computeCompletion(supplier: Record<string, unknown>): number {
  const filled = ALL_COMPLETION_FIELDS.filter(f => {
    const v = supplier[f];
    return v !== null && v !== undefined && v !== "";
  }).length;
  return Math.round((filled / ALL_COMPLETION_FIELDS.length) * 100);
}

// Unused export to satisfy import
export { IDENTITY_FIELDS };
