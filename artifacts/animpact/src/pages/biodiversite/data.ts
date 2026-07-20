// ─── Familles d'éléments ─────────────────────────────────────────────────────

export type ElementFamily = "Ressource" | "Activité" | "Lieu" | "Acteur";

export const FAMILIES: {
  value: ElementFamily;
  label: string;
  icon: string;
  color: string;
  bg: string;
}[] = [
  { value: "Ressource", label: "Ressource / Service écosystémique", icon: "🌿", color: "#10B981", bg: "#ECFDF5" },
  { value: "Activité",  label: "Activité / Processus",              icon: "⚙️", color: "#6366F1", bg: "#EEF2FF" },
  { value: "Lieu",      label: "Lieu",                              icon: "📍", color: "#F59E0B", bg: "#FFFBEB" },
  { value: "Acteur",    label: "Acteur",                            icon: "👥", color: "#3B82F6", bg: "#EFF6FF" },
];

export const SUBTYPES: Record<ElementFamily, string[]> = {
  Ressource: [
    "Eau", "Sols", "Air", "Climat", "Pollinisation", "Biodiversité",
    "Ressources naturelles", "Bois", "Biomasse", "Terres rares",
    "Fibres naturelles", "Minéraux", "Autre",
  ],
  Activité: [
    "Approvisionnement", "Production", "Fabrication", "Transformation",
    "Transport", "Stockage", "Distribution", "Vente", "Utilisation",
    "Maintenance", "Communication", "Gestion des déchets", "Recyclage",
    "Prestations", "Autre",
  ],
  Lieu: [
    "Siège social", "Agence", "Bureaux", "Atelier", "Entrepôt",
    "Usine", "Chantier", "Magasin", "Data center", "Site client", "Autre",
  ],
  Acteur: [
    "Fournisseurs", "Sous-traitants", "Prestataires", "Clients",
    "Transporteurs", "Distributeurs", "Collectivités", "Autre",
  ],
};

export const RELATION_TYPES = [
  "Approvisionne", "Utilise", "Produit", "Transporte", "Dépend de",
  "Recycle", "Communique avec", "Valorise", "Protège", "Impacte", "Alimente", "Autre",
];

export const CHAIN_POSITIONS = [
  { value: "amont",   label: "Amont" },
  { value: "in-situ", label: "In situ" },
  { value: "aval",    label: "Aval" },
];

// ─── Helpers visuels ─────────────────────────────────────────────────────────

export function familyData(family: string | null | undefined) {
  return FAMILIES.find(f => f.value === family) ?? null;
}

export function familyIcon(family: string | null | undefined): string {
  return familyData(family)?.icon ?? "◆";
}

export function familyColor(family: string | null | undefined): string {
  return familyData(family)?.color ?? "#94A3B8";
}

export function familyBg(family: string | null | undefined): string {
  return familyData(family)?.bg ?? "#F8FAFC";
}

export function familyLabel(family: string | null | undefined): string {
  return familyData(family)?.label ?? (family ?? "");
}

/**
 * Retourne le libellé à afficher — jamais "Sans nom".
 * Ordre : nom > sous-type > famille
 */
export function elementLabel(
  name: string | null | undefined,
  category: string | null | undefined,
  subCategory: string | null | undefined,
): string {
  if (name?.trim())        return name.trim();
  if (subCategory?.trim()) return subCategory.trim();
  if (category?.trim())    return category.trim();
  return "";
}

export function chainLabel(pos: string | null | undefined): string {
  if (pos === "amont")   return "Amont";
  if (pos === "in-situ") return "In situ";
  if (pos === "aval")    return "Aval";
  return pos ?? "—";
}

// ─── Types d'enjeux ───────────────────────────────────────────────────────────

export const ISSUE_TYPES = [
  { value: "Risque physique",      label: "Risque physique",      icon: "⚠️", color: "#EF4444", bg: "#FEF2F2" },
  { value: "Risque de transition", label: "Risque de transition", icon: "🔄", color: "#F97316", bg: "#FFF7ED" },
  { value: "Opportunité",          label: "Opportunité",          icon: "✨", color: "#10B981", bg: "#ECFDF5" },
  { value: "Enjeu réglementaire",  label: "Enjeu réglementaire",  icon: "⚖️", color: "#6366F1", bg: "#EEF2FF" },
  { value: "Dépendance critique",  label: "Dépendance critique",  icon: "🔗", color: "#F59E0B", bg: "#FFFBEB" },
  { value: "Autre",                label: "Autre",                icon: "•",  color: "#94A3B8", bg: "#F8FAFC" },
] as const;

export type IssueTypeValue = (typeof ISSUE_TYPES)[number]["value"];

export function issueTypeData(type: string | null | undefined) {
  return ISSUE_TYPES.find(t => t.value === type) ?? null;
}

// ─── Enjeux ──────────────────────────────────────────────────────────────────

export function importanceBg(importance: number | null | undefined): {
  bg: string; border: string; text: string;
} {
  if (!importance) return { bg: "#F8FAFC", border: "#E2E8F0", text: "#64748B" };
  const map: Record<number, { bg: string; border: string; text: string }> = {
    1: { bg: "#F0FDF4", border: "#86EFAC", text: "#166534" },
    2: { bg: "#EFF6FF", border: "#93C5FD", text: "#1E40AF" },
    3: { bg: "#FEFCE8", border: "#FCD34D", text: "#92400E" },
    4: { bg: "#FFF7ED", border: "#FDBA74", text: "#9A3412" },
    5: { bg: "#FEF2F2", border: "#FCA5A5", text: "#991B1B" },
  };
  return map[importance] ?? map[5];
}

export function importanceLabel(importance: number | null | undefined): string {
  if (!importance) return "Non défini";
  const labels: Record<number, string> = {
    1: "Faible", 2: "Modérée", 3: "Importante", 4: "Élevée", 5: "Critique",
  };
  return labels[importance] ?? "—";
}

// ─── Familles / Thèmes d'enjeux ───────────────────────────────────────────────

export const ISSUE_FAMILIES = [
  "Eau",
  "Biodiversité locale",
  "Climat",
  "Sols",
  "Air",
  "Espèces protégées",
  "Déchets",
  "Achats responsables",
  "Énergie",
  "Autre",
] as const;

export type IssueFamilyValue = (typeof ISSUE_FAMILIES)[number];

// ─── Positionnement par défaut ────────────────────────────────────────────────

export function defaultElementPosition(
  chainPosition: string | null | undefined,
  indexInZone: number,
): { x: number; y: number } {
  // ZONE_W doit correspondre à CANVAS_ZONE_W dans TabCartoDependances.tsx
  const ZONE_W  = 390;
  // Largeur approximative d'une carte (entre minWidth:140 et maxWidth:190)
  const CARD_W  = 160;
  const COL_GAP = 20; // espace entre les 2 colonnes
  // Marge gauche pour centrer la grille (2 cartes) dans la zone
  const MARGIN  = Math.round((ZONE_W - 2 * CARD_W - COL_GAP) / 2); // = 25 px

  const zoneStart =
    chainPosition === "in-situ" ? ZONE_W
    : chainPosition === "aval"  ? ZONE_W * 2
    : 0;

  const col = indexInZone % 2;
  const row = Math.floor(indexInZone / 2);

  return {
    x: zoneStart + MARGIN + col * (CARD_W + COL_GAP),
    y: 60 + row * 130,
  };
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
