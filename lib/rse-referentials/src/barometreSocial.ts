export type BarometreQuestionType = "scale" | "text";

export interface BarometreQuestion {
  code: string;
  theme: string;
  text: string;
  type: BarometreQuestionType;
}

export const BAROMETRE_SCALE_LABELS: Record<number, string> = {
  1: "Pas du tout d'accord",
  2: "Plutôt pas d'accord",
  3: "Neutre",
  4: "Plutôt d'accord",
  5: "Tout à fait d'accord",
};

export const BAROMETRE_THEMES = [
  "Bien-être des collaborateurs",
  "Évolution professionnelle",
  "Communication et dynamique d'équipe",
  "Charge de travail",
  "Rémunération et avantages",
  "Culture d'entreprise",
] as const;

export type BarometreTheme = (typeof BAROMETRE_THEMES)[number];

export const BAROMETRE_REFERENTIAL: BarometreQuestion[] = [
  // Bien-être des collaborateurs
  { code: "q1", theme: "Bien-être des collaborateurs", text: "Trouvez-vous un sens à votre travail ? Est-ce une source d'émulation ?", type: "scale" },
  { code: "q2", theme: "Bien-être des collaborateurs", text: "Vous sentez-vous apprécié à votre juste valeur au sein de l'entreprise ?", type: "scale" },
  { code: "q3", theme: "Bien-être des collaborateurs", text: "Savez-vous clairement quels sont les objectifs stratégiques de l'entreprise et comment vous contribuez à leur réussite ?", type: "scale" },
  { code: "q4", theme: "Bien-être des collaborateurs", text: "Votre travail a-t-il parfois un impact négatif sur votre bien-être ou votre vie personnelle ?", type: "scale" },
  { code: "q5", theme: "Bien-être des collaborateurs", text: "Pensez-vous que l'entreprise met en œuvre les actions nécessaires pour favoriser le bien-être des collaborateurs ?", type: "scale" },
  { code: "q6", theme: "Bien-être des collaborateurs", text: "De manière générale, comment évaluez-vous votre bien-être au sein de l'entreprise ?", type: "scale" },

  // Évolution professionnelle
  { code: "q7", theme: "Évolution professionnelle", text: "Connaissez-vous les possibilités d'évolution proposées par l'entreprise ?", type: "scale" },
  { code: "q8", theme: "Évolution professionnelle", text: "Vous sentez-vous motivé par vos missions ?", type: "scale" },
  { code: "q9", theme: "Évolution professionnelle", text: "Avez-vous bénéficié d'une opportunité d'évolution ou de développement au cours des 12 derniers mois ?", type: "scale" },
  { code: "q10", theme: "Évolution professionnelle", text: "Savez-vous quelles actions entreprendre pour évoluer professionnellement ?", type: "scale" },
  { code: "q11", theme: "Évolution professionnelle", text: "Disposez-vous de toutes les ressources nécessaires pour évoluer ?", type: "scale" },
  { code: "q12", theme: "Évolution professionnelle", text: "Si non, de quoi auriez-vous besoin ?", type: "text" },
  { code: "q13", theme: "Évolution professionnelle", text: "Avez-vous régulièrement l'occasion de relever de nouveaux défis ?", type: "scale" },
  { code: "q14", theme: "Évolution professionnelle", text: "Commentaires libres sur votre évolution professionnelle.", type: "text" },

  // Communication et dynamique d'équipe
  { code: "q15", theme: "Communication et dynamique d'équipe", text: "Vous sentez-vous bien intégré au sein de votre équipe ?", type: "scale" },
  { code: "q16", theme: "Communication et dynamique d'équipe", text: "La collaboration avec vos collègues est-elle satisfaisante ?", type: "scale" },
  { code: "q17", theme: "Communication et dynamique d'équipe", text: "Vous sentez-vous soutenu par votre responsable ?", type: "scale" },
  { code: "q18", theme: "Communication et dynamique d'équipe", text: "Comprenez-vous les différents canaux de communication utilisés ?", type: "scale" },
  { code: "q19", theme: "Communication et dynamique d'équipe", text: "Pensez-vous que la communication interne est claire et efficace ?", type: "scale" },
  { code: "q20", theme: "Communication et dynamique d'équipe", text: "Si non, comment pourrait-elle être améliorée ?", type: "text" },
  { code: "q21", theme: "Communication et dynamique d'équipe", text: "Savez-vous qui est votre interlocuteur social référent ?", type: "scale" },
  { code: "q22", theme: "Communication et dynamique d'équipe", text: "Êtes-vous satisfait des événements de cohésion proposés ?", type: "scale" },
  { code: "q23", theme: "Communication et dynamique d'équipe", text: "Avez-vous des idées d'événements de cohésion ?", type: "text" },

  // Charge de travail
  { code: "q24", theme: "Charge de travail", text: "Disposez-vous de suffisamment de temps et de ressources pour accomplir vos missions ?", type: "scale" },
  { code: "q25", theme: "Charge de travail", text: "Vos responsabilités sont-elles clairement définies ?", type: "scale" },

  // Rémunération et avantages
  { code: "q26", theme: "Rémunération et avantages", text: "Pensez-vous être rémunéré à votre juste valeur ?", type: "scale" },
  { code: "q27", theme: "Rémunération et avantages", text: "Êtes-vous satisfait de votre régime de retraite ?", type: "scale" },
  { code: "q28", theme: "Rémunération et avantages", text: "Êtes-vous satisfait de votre couverture d'assurance ?", type: "scale" },
  { code: "q29", theme: "Rémunération et avantages", text: "Êtes-vous satisfait des avantages proposés par l'entreprise ?", type: "scale" },
  { code: "q30", theme: "Rémunération et avantages", text: "Disposez-vous d'un équilibre satisfaisant entre travail et congés ?", type: "scale" },

  // Culture d'entreprise
  { code: "q31", theme: "Culture d'entreprise", text: "Êtes-vous satisfait de la culture de l'entreprise ?", type: "scale" },
  { code: "q32", theme: "Culture d'entreprise", text: "Pensez-vous que la diversité et l'inclusion sont réellement prises en compte ?", type: "scale" },
  { code: "q33", theme: "Culture d'entreprise", text: "Pensez-vous que chacun bénéficie des mêmes opportunités ?", type: "scale" },
  { code: "q34", theme: "Culture d'entreprise", text: "Pensez-vous que l'entreprise est ouverte au changement ?", type: "scale" },
  { code: "q35", theme: "Culture d'entreprise", text: "Pensez-vous que les informations sont communiquées de manière transparente ?", type: "scale" },
  { code: "q36", theme: "Culture d'entreprise", text: "Expression libre.", type: "text" },
];

export function getBarometreQuestion(code: string): BarometreQuestion | undefined {
  return BAROMETRE_REFERENTIAL.find((q) => q.code === code);
}

export function getBarometreScaleQuestions(): BarometreQuestion[] {
  return BAROMETRE_REFERENTIAL.filter((q) => q.type === "scale");
}

export function getBarometreTextQuestions(): BarometreQuestion[] {
  return BAROMETRE_REFERENTIAL.filter((q) => q.type === "text");
}
