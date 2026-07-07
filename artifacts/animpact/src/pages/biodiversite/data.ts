export const CATEGORIES_SUBCATEGORIES: Record<string, string[]> = {
  "Eau": [
    "Disponibilité en eau douce", "Qualité de l'eau", "Recharge des nappes",
    "Régulation des débits", "Prévention des inondations", "Épuration naturelle", "Zones humides",
  ],
  "Sols": [
    "Fertilité", "Érosion", "Stockage du carbone", "Matière organique",
    "Structure", "Infiltration", "Activité biologique",
  ],
  "Climat": [
    "Régulation climatique", "Stockage du carbone", "Rafraîchissement naturel",
    "Sécheresse", "Tempêtes", "Humidité",
  ],
  "Pollinisation": [
    "Pollinisation des cultures", "Pollinisation naturelle", "Reproduction des espèces",
  ],
  "Régulation biologique": [
    "Lutte contre les ravageurs", "Contrôle des maladies", "Espèces invasives",
  ],
  "Biodiversité": [
    "Habitats", "Espèces", "Corridors écologiques", "Diversité génétique",
  ],
  "Air": [
    "Qualité de l'air", "Filtration des particules", "Captation des polluants",
  ],
  "Ressources naturelles": [
    "Bois", "Biomasse", "Fibres", "Ressources halieutiques", "Ressources génétiques", "Minéraux",
  ],
  "Production biologique": [
    "Agriculture", "Sylviculture", "Pêche", "Production alimentaire",
  ],
  "Services culturels": [
    "Paysages", "Tourisme", "Loisirs", "Patrimoine", "Bien-être",
  ],
  "Fonctions écologiques": [
    "Cycle de l'eau", "Cycle des nutriments", "Décomposition", "Fonctionnement des habitats",
  ],
  "Autre": ["Autre"],
};

export const CHAIN_POSITIONS = [
  { value: "amont",   label: "Amont" },
  { value: "in-situ", label: "In situ" },
  { value: "aval",    label: "Aval" },
];

export function dependencyColor(level: number | null | undefined): string {
  if (!level) return "bg-slate-100 text-slate-600 border-slate-200";
  if (level <= 2) return "bg-green-100 text-green-800 border-green-200";
  if (level === 3) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-red-100 text-red-800 border-red-200";
}

export function masteryColor(level: number | null | undefined): string {
  if (!level) return "text-slate-400";
  if (level >= 4) return "text-green-600";
  if (level === 3) return "text-yellow-600";
  return "text-red-600";
}

export function chainLabel(pos: string | null | undefined): string {
  if (pos === "amont") return "Amont";
  if (pos === "in-situ") return "In situ";
  if (pos === "aval") return "Aval";
  return "—";
}
