export type IssueLibraryItem = {
  key: string;
  category: string;
  label: string;
};

export const ISSUE_LIBRARY: IssueLibraryItem[] = [
  // Changements climatiques
  { key: "cli_01", category: "Changements climatiques", label: "Changements climatiques" },
  { key: "cli_02", category: "Changements climatiques", label: "Solutions d'efficacité énergétique" },
  { key: "cli_03", category: "Changements climatiques", label: "Réduction de l'empreinte carbone" },
  { key: "cli_04", category: "Changements climatiques", label: "Impact environnemental des activités" },
  { key: "cli_05", category: "Changements climatiques", label: "Mobilité et déplacements responsables" },
  { key: "cli_06", category: "Changements climatiques", label: "Réduction de la pression sur les ressources en eau" },
  { key: "cli_07", category: "Changements climatiques", label: "Risques liés au changement climatique" },
  { key: "cli_08", category: "Changements climatiques", label: "Prévention de la pollution" },
  { key: "cli_09", category: "Changements climatiques", label: "Valorisation des matériaux en fin de cycle de vie" },
  // Biodiversité
  { key: "bio_01", category: "Biodiversité", label: "Préservation de la biodiversité" },
  { key: "bio_02", category: "Biodiversité", label: "Dépendance aux services écosystémiques" },
  { key: "bio_03", category: "Biodiversité", label: "Réduction des impacts sur les écosystèmes" },
  { key: "bio_04", category: "Biodiversité", label: "Gestion écologique des espaces" },
  { key: "bio_05", category: "Biodiversité", label: "Préservation des espèces et habitats" },
  { key: "bio_06", category: "Biodiversité", label: "Artificialisation des sols" },
  { key: "bio_07", category: "Biodiversité", label: "Renaturation des sites" },
  { key: "bio_08", category: "Biodiversité", label: "Gestion durable des ressources naturelles" },
  // Communication / Marketing
  { key: "com_01", category: "Communication / Marketing", label: "Communication responsable" },
  { key: "com_02", category: "Communication / Marketing", label: "Réponse aux attentes des clients" },
  { key: "com_03", category: "Communication / Marketing", label: "Stratégie de marketing responsable" },
  { key: "com_04", category: "Communication / Marketing", label: "Promotion de la RSE dans sa sphère d'influence" },
  // Pratiques responsables des affaires
  { key: "pra_01", category: "Pratiques responsables des affaires", label: "Respect des droits de l'Homme" },
  { key: "pra_02", category: "Pratiques responsables des affaires", label: "Achats responsables" },
  { key: "pra_03", category: "Pratiques responsables des affaires", label: "Sécurisation des approvisionnements" },
  { key: "pra_04", category: "Pratiques responsables des affaires", label: "Pratiques d'influence responsables" },
  { key: "pra_05", category: "Pratiques responsables des affaires", label: "Intégration du numérique responsable dans les offres" },
  { key: "pra_06", category: "Pratiques responsables des affaires", label: "Promotion de produits éco-conçus" },
  { key: "pra_07", category: "Pratiques responsables des affaires", label: "Utilisation d'outils éco-conçus" },
  { key: "pra_08", category: "Pratiques responsables des affaires", label: "Accessibilité numérique" },
  { key: "pra_09", category: "Pratiques responsables des affaires", label: "Intégration de la RSE dans les métiers" },
  { key: "pra_10", category: "Pratiques responsables des affaires", label: "Réputation" },
  { key: "pra_11", category: "Pratiques responsables des affaires", label: "Culture de la transparence" },
  { key: "pra_12", category: "Pratiques responsables des affaires", label: "Lutte contre la corruption et éthique des affaires" },
  { key: "pra_13", category: "Pratiques responsables des affaires", label: "Tarification équitable" },
  { key: "pra_14", category: "Pratiques responsables des affaires", label: "Protection des données personnelles et cybersécurité" },
  { key: "pra_15", category: "Pratiques responsables des affaires", label: "Traçabilité" },
  { key: "pra_16", category: "Pratiques responsables des affaires", label: "Culture de conformité" },
  // Diversité, égalité et inclusion
  { key: "div_01", category: "Diversité, égalité et inclusion", label: "Équité et partage de la valeur" },
  { key: "div_02", category: "Diversité, égalité et inclusion", label: "Rémunération juste" },
  { key: "div_03", category: "Diversité, égalité et inclusion", label: "Accessibilité PMR" },
  { key: "div_04", category: "Diversité, égalité et inclusion", label: "Égalité, diversité et inclusion" },
  { key: "div_05", category: "Diversité, égalité et inclusion", label: "Parité" },
  { key: "div_06", category: "Diversité, égalité et inclusion", label: "Intégration, reconversion et seconde chance" },
  // Santé et sécurité
  { key: "san_01", category: "Santé et sécurité", label: "Sécurité des collaborateurs" },
  { key: "san_02", category: "Santé et sécurité", label: "Santé des collaborateurs" },
  { key: "san_03", category: "Santé et sécurité", label: "Accès à la formation" },
  { key: "san_04", category: "Santé et sécurité", label: "Formation aux premiers secours" },
  // Économie circulaire
  { key: "eco_01", category: "Économie circulaire", label: "Gestion des déchets" },
  { key: "eco_02", category: "Économie circulaire", label: "Matières premières durables" },
  // Bien-être et vie quotidienne
  { key: "bie_01", category: "Bien-être et vie quotidienne", label: "Transformation digitale au service des clients" },
  { key: "bie_02", category: "Bien-être et vie quotidienne", label: "Lutte contre la discrimination" },
  { key: "bie_03", category: "Bien-être et vie quotidienne", label: "Temps de travail et rémunération équitable" },
  { key: "bie_04", category: "Bien-être et vie quotidienne", label: "Écoute et dialogue social" },
  { key: "bie_05", category: "Bien-être et vie quotidienne", label: "Résolution des griefs" },
  { key: "bie_06", category: "Bien-être et vie quotidienne", label: "Conditions de travail" },
  { key: "bie_07", category: "Bien-être et vie quotidienne", label: "Solutions répondant aux besoins individuels" },
  // Excellence opérationnelle
  { key: "exc_01", category: "Excellence opérationnelle", label: "Qualité de l'expérience client" },
  { key: "exc_02", category: "Excellence opérationnelle", label: "Efficacité opérationnelle et profitabilité" },
  { key: "exc_03", category: "Excellence opérationnelle", label: "Capacité d'innovation" },
  { key: "exc_04", category: "Excellence opérationnelle", label: "Développement des collaborateurs" },
  { key: "exc_05", category: "Excellence opérationnelle", label: "Accueil des alternants et soutien éducatif" },
  { key: "exc_06", category: "Excellence opérationnelle", label: "Engagement des salariés et intrapreneuriat" },
  { key: "exc_07", category: "Excellence opérationnelle", label: "Approche partenariale" },
  { key: "exc_08", category: "Excellence opérationnelle", label: "Transformation digitale au service de l'efficacité opérationnelle" },
  // Création de valeur locale
  { key: "val_01", category: "Création de valeur locale", label: "Synergie locale avec les parties prenantes" },
  { key: "val_02", category: "Création de valeur locale", label: "Investissements sur les marchés de croissance" },
  { key: "val_03", category: "Création de valeur locale", label: "Partenariats locaux pour les projets de plantation" },
  { key: "val_04", category: "Création de valeur locale", label: "Soutien au développement économique local et à l'emploi" },
  { key: "val_05", category: "Création de valeur locale", label: "Partenariats locaux pour les fournitures" },
  // Patrimoine et ancrage territorial
  { key: "pat_01", category: "Patrimoine et ancrage territorial", label: "Labellisation et certification" },
  { key: "pat_02", category: "Patrimoine et ancrage territorial", label: "Intégration au territoire" },
  { key: "pat_03", category: "Patrimoine et ancrage territorial", label: "Mécénat et soutien associatif" },
  { key: "pat_04", category: "Patrimoine et ancrage territorial", label: "Performances énergétiques" },
];

export const ISSUE_CATEGORIES = [...new Set(ISSUE_LIBRARY.map((i) => i.category))];
