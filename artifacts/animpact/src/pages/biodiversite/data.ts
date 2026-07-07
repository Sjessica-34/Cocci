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

export const RELATION_TYPES = [
  "Approvisionne", "Utilise", "Produit", "Dépend de", "Transporte",
  "Transforme", "Recycle", "Communique avec", "Valorise", "Protège",
  "Impacte", "Alimente", "Autre",
];

export function chainLabel(pos: string | null | undefined): string {
  if (pos === "amont")   return "Amont";
  if (pos === "in-situ") return "In situ";
  if (pos === "aval")    return "Aval";
  return pos ?? "—";
}

export function getCategoryEmoji(category: string | null | undefined): string {
  const map: Record<string, string> = {
    "Eau": "💧", "Sols": "🌱", "Climat": "☁️", "Pollinisation": "🌸",
    "Régulation biologique": "🦋", "Biodiversité": "🌿", "Air": "🌬️",
    "Ressources naturelles": "🪨", "Production biologique": "🌾",
    "Services culturels": "🏞️", "Fonctions écologiques": "♻️", "Autre": "⭐",
  };
  return category ? (map[category] ?? "🌿") : "🌿";
}

export function categoryBorderColor(category: string | null | undefined): string {
  const map: Record<string, string> = {
    "Eau": "#3B82F6", "Sols": "#84CC16", "Climat": "#6B7280",
    "Pollinisation": "#F59E0B", "Régulation biologique": "#8B5CF6",
    "Biodiversité": "#10B981", "Air": "#60A5FA", "Ressources naturelles": "#92400E",
    "Production biologique": "#22C55E", "Services culturels": "#EC4899",
    "Fonctions écologiques": "#14B8A6", "Autre": "#6B7280",
  };
  return category ? (map[category] ?? "#6B7280") : "#6B7280";
}

export function depDotColor(level: number | null | undefined, n: number): string {
  if (!level || n > level) return "bg-slate-200";
  if (level <= 2) return "bg-green-500";
  if (level === 3) return "bg-yellow-400";
  return "bg-red-500";
}

export function importanceBg(importance: number | null | undefined): { bg: string; border: string; text: string } {
  if (!importance) return { bg: "#F8FAFC", border: "#E2E8F0", text: "#64748B" };
  if (importance >= 5) return { bg: "#FEF2F2", border: "#FCA5A5", text: "#991B1B" };
  if (importance >= 4) return { bg: "#FFF7ED", border: "#FDBA74", text: "#9A3412" };
  if (importance >= 3) return { bg: "#FEFCE8", border: "#FCD34D", text: "#92400E" };
  if (importance >= 2) return { bg: "#EFF6FF", border: "#93C5FD", text: "#1E40AF" };
  return { bg: "#F0FDF4", border: "#86EFAC", text: "#166534" };
}

export function importanceLabel(importance: number | null | undefined): string {
  if (!importance) return "Non défini";
  const labels: Record<number, string> = {
    1: "Faible", 2: "Modéré", 3: "Significatif", 4: "Fort", 5: "Critique",
  };
  return labels[importance] ?? "—";
}

export function defaultElementPosition(
  chainPosition: string | null | undefined,
  indexInZone: number,
): { x: number; y: number } {
  const ZONE_W = 360;
  const baseX =
    chainPosition === "in-situ" ? ZONE_W + 20
    : chainPosition === "aval"  ? ZONE_W * 2 + 20
    : 20;
  const col = indexInZone % 2;
  const row = Math.floor(indexInZone / 2);
  return { x: baseX + col * 160, y: 60 + row * 130 };
}

export function defaultIssuePosition(
  chainPosition: string | null | undefined,
  importance: number | null | undefined,
  issueIndex: number,
): { x: number; y: number } {
  const xMap: Record<string, number> = { "amont": 80, "in-situ": 430, "aval": 780 };
  const xBase = xMap[chainPosition ?? "in-situ"] ?? 430;
  const yBase = importance ? 400 - (importance - 1) * 90 : 200;
  return {
    x: xBase + (issueIndex % 2) * 80,
    y: yBase + Math.floor(issueIndex / 2) * 20,
  };
}

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
