export type StakeholderCategory = {
  key: string;
  label: string;
  icon: string;
  subcategories: string[];
};

export const STAKEHOLDER_CATEGORIES: StakeholderCategory[] = [
  {
    key: "internal",
    label: "Parties prenantes internes",
    icon: "👥",
    subcategories: [
      "Dirigeants",
      "Salariés",
      "Représentants du personnel / CSE",
      "Actionnaires / Associés",
      "Alternants, stagiaires et apprentis",
    ],
  },
  {
    key: "clients",
    label: "Clients et utilisateurs",
    icon: "🤝",
    subcategories: ["Clients", "Prospects", "Consommateurs / Utilisateurs finaux"],
  },
  {
    key: "suppliers",
    label: "Fournisseurs et partenaires",
    icon: "🏭",
    subcategories: [
      "Fournisseurs",
      "Sous-traitants",
      "Prestataires",
      "Partenaires commerciaux",
      "Organismes de certification / labellisation",
    ],
  },
  {
    key: "institutions",
    label: "Institutions et pouvoirs publics",
    icon: "🏛",
    subcategories: [
      "État",
      "Collectivités territoriales",
      "Administrations",
      "Organismes de contrôle",
      "Autorités réglementaires",
    ],
  },
  {
    key: "education",
    label: "Formation, recherche et innovation",
    icon: "🎓",
    subcategories: ["Écoles", "Universités", "Organismes de formation", "Centres de recherche"],
  },
  {
    key: "civil",
    label: "Société civile",
    icon: "🌍",
    subcategories: ["Associations", "ONG", "Riverains", "Médias", "Grand public"],
  },
  {
    key: "networks",
    label: "Réseaux professionnels",
    icon: "💼",
    subcategories: [
      "Organisations professionnelles",
      "Fédérations",
      "Réseaux d'entreprises",
      "Chambres consulaires (CCI, CMA...)",
    ],
  },
  {
    key: "environment",
    label: "Environnement",
    icon: "🌿",
    subcategories: ["Biodiversité", "Ressources naturelles", "Climat", "Générations futures"],
  },
];

export const CATEGORY_COLORS: Record<string, string> = {
  internal: "#14b8a6",
  clients: "#3b82f6",
  suppliers: "#f59e0b",
  institutions: "#6366f1",
  education: "#8b5cf6",
  civil: "#10b981",
  networks: "#f97316",
  environment: "#22c55e",
};

export const CATEGORY_LIGHT_COLORS: Record<string, string> = {
  internal: "#ccfbf1",
  clients: "#dbeafe",
  suppliers: "#fef3c7",
  institutions: "#e0e7ff",
  education: "#ede9fe",
  civil: "#d1fae5",
  networks: "#ffedd5",
  environment: "#dcfce7",
};

export function getCategoryByKey(key: string): StakeholderCategory | undefined {
  return STAKEHOLDER_CATEGORIES.find((c) => c.key === key);
}

export function getQuadrant(influence: number, interest: number): string {
  const highInfluence = influence >= 3;
  const highInterest = interest >= 3;
  if (highInfluence && highInterest) return "Partenaires clés";
  if (highInfluence && !highInterest) return "À gérer avec attention";
  if (!highInfluence && highInterest) return "À impliquer";
  return "À surveiller";
}

export function getQuadrantColor(influence: number, interest: number): string {
  const highInfluence = influence >= 3;
  const highInterest = interest >= 3;
  if (highInfluence && highInterest) return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (highInfluence && !highInterest) return "text-amber-600 bg-amber-50 border-amber-200";
  if (!highInfluence && highInterest) return "text-blue-600 bg-blue-50 border-blue-200";
  return "text-slate-500 bg-slate-50 border-slate-200";
}
