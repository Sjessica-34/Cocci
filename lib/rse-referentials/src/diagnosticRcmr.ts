export type DiagnosticQuestion = {
  id: string;
  question: string;
  levels: [string, string, string, string];
};

export type DiagnosticSubcategory = {
  id: string;
  label: string;
  categoryId: "ENV" | "SOC" | "GOV";
  questions: DiagnosticQuestion[];
};

export type DiagnosticCategory = {
  id: "ENV" | "SOC" | "GOV";
  label: string;
  subcategories: DiagnosticSubcategory[];
};

const ENV_CLI: DiagnosticSubcategory = {
  id: "ENV-CLI",
  label: "Climat",
  categoryId: "ENV",
  questions: [
    { id: "ENV-CLI-001", question: "Votre entreprise a-t-elle réalisé un bilan carbone au cours des trois dernières années ?", levels: ["Aucun bilan carbone n'a été réalisé.", "La réalisation d'un bilan carbone est envisagée.", "Un bilan carbone a été réalisé.", "Le bilan carbone est actualisé et utilisé pour piloter les décisions."] },
    { id: "ENV-CLI-002", question: "Les principales sources d'émissions de gaz à effet de serre sont-elles identifiées ?", levels: ["Aucune source n'est identifiée.", "Quelques sources sont identifiées.", "Les principales sources sont connues.", "Toutes les sources significatives sont identifiées et suivies."] },
    { id: "ENV-CLI-003", question: "Votre entreprise s'est-elle fixé des objectifs de réduction de ses émissions ?", levels: ["Aucun objectif.", "Réflexion en cours.", "Des objectifs sont définis.", "Les objectifs sont suivis grâce à des indicateurs."] },
    { id: "ENV-CLI-004", question: "Un plan d'actions est-il mis en œuvre pour réduire les émissions ?", levels: ["Aucun plan.", "Quelques actions ponctuelles.", "Un plan structuré existe.", "Le plan est suivi et mis à jour régulièrement."] },
    { id: "ENV-CLI-005", question: "Les enjeux climatiques sont-ils pris en compte dans les décisions importantes de l'entreprise ?", levels: ["Jamais.", "Occasionnellement.", "Souvent.", "Ils sont pleinement intégrés à la stratégie."] },
    { id: "ENV-CLI-006", question: "Les collaborateurs sont-ils sensibilisés aux enjeux climatiques ?", levels: ["Jamais.", "Ponctuellement.", "Régulièrement.", "Dans le cadre d'un programme structuré."] },
    { id: "ENV-CLI-007", question: "Votre entreprise communique-t-elle sur ses engagements climatiques ?", levels: ["Jamais.", "Rarement.", "Régulièrement.", "Avec des résultats et des indicateurs."] },
    { id: "ENV-CLI-008", question: "Les déplacements professionnels sont-ils pris en compte dans votre démarche climat ?", levels: ["Non.", "Partiellement.", "Oui.", "Oui avec des actions de réduction."] },
    { id: "ENV-CLI-009", question: "Des actions sont-elles mises en place pour réduire l'impact des déplacements domicile-travail ?", levels: ["Aucune.", "Réflexion en cours.", "Quelques actions.", "Une politique de mobilité durable est déployée."] },
    { id: "ENV-CLI-010", question: "Les émissions liées aux achats sont-elles prises en compte ?", levels: ["Jamais.", "Pour certains achats.", "Pour les principaux achats.", "Pour l'ensemble des achats significatifs."] },
    { id: "ENV-CLI-011", question: "Les émissions liées au numérique sont-elles évaluées ?", levels: ["Jamais.", "Réflexion.", "Évaluation ponctuelle.", "Suivi régulier."] },
    { id: "ENV-CLI-012", question: "Votre entreprise mesure-t-elle les progrès réalisés en matière de climat ?", levels: ["Jamais.", "Ponctuellement.", "Chaque année.", "Grâce à des indicateurs suivis toute l'année."] },
    { id: "ENV-CLI-013", question: "Les résultats obtenus permettent-ils d'améliorer les actions mises en place ?", levels: ["Jamais.", "Exceptionnellement.", "Oui.", "Oui dans une logique d'amélioration continue."] },
    { id: "ENV-CLI-014", question: "La direction est-elle impliquée dans le pilotage de la démarche climat ?", levels: ["Pas du tout.", "Faiblement.", "Oui.", "Oui avec un suivi régulier des résultats."] },
    { id: "ENV-CLI-015", question: "Votre entreprise anticipe-t-elle les conséquences du changement climatique sur son activité ?", levels: ["Pas du tout.", "Quelques réflexions existent.", "Les principaux risques sont identifiés.", "Les risques sont intégrés dans la stratégie de l'entreprise."] },
  ],
};

const ENV_ENE: DiagnosticSubcategory = {
  id: "ENV-ENE",
  label: "Énergie",
  categoryId: "ENV",
  questions: [
    { id: "ENV-ENE-001", question: "Votre entreprise suit-elle régulièrement ses consommations d'énergie ?", levels: ["Aucun suivi.", "Quelques relevés ponctuels.", "Un suivi régulier est réalisé.", "Les consommations sont analysées avec des indicateurs et des objectifs."] },
    { id: "ENV-ENE-002", question: "Des objectifs de réduction des consommations d'énergie ont-ils été définis ?", levels: ["Aucun objectif.", "Réflexion en cours.", "Des objectifs existent.", "Ils sont suivis et révisés régulièrement."] },
    { id: "ENV-ENE-003", question: "L'éclairage de vos locaux est-il optimisé pour limiter les consommations ?", levels: ["Aucune action.", "Quelques améliorations.", "La majorité des éclairages est optimisée.", "L'ensemble des éclairages est optimisé et piloté."] },
    { id: "ENV-ENE-004", question: "Vos équipements sont-ils choisis en tenant compte de leur performance énergétique ?", levels: ["Jamais.", "Parfois.", "Souvent.", "Toujours selon des critères définis."] },
    { id: "ENV-ENE-005", question: "Des actions sont-elles mises en place pour limiter les consommations de chauffage ?", levels: ["Aucune.", "Quelques actions.", "Des actions régulières.", "Une stratégie globale est déployée."] },
    { id: "ENV-ENE-006", question: "Des actions sont-elles mises en place pour optimiser la climatisation ?", levels: ["Aucune.", "Quelques actions.", "Des actions régulières.", "Le système est piloté et optimisé."] },
    { id: "ENV-ENE-007", question: "Les postes informatiques et équipements sont-ils configurés pour économiser l'énergie ?", levels: ["Non.", "Partiellement.", "Oui pour la majorité.", "Oui avec une politique globale."] },
    { id: "ENV-ENE-008", question: "Votre entreprise utilise-t-elle des énergies renouvelables ?", levels: ["Non.", "Projet en réflexion.", "Partiellement.", "Majoritairement ou totalement."] },
    { id: "ENV-ENE-009", question: "Un audit énergétique a-t-il déjà été réalisé ?", levels: ["Jamais.", "Prévu.", "Réalisé une fois.", "Réalisé et utilisé pour piloter les investissements."] },
    { id: "ENV-ENE-010", question: "Les collaborateurs sont-ils sensibilisés aux économies d'énergie ?", levels: ["Jamais.", "Ponctuellement.", "Régulièrement.", "Dans le cadre d'un programme structuré."] },
    { id: "ENV-ENE-011", question: "Les consommations anormales sont-elles détectées et analysées ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui avec actions correctives systématiques."] },
    { id: "ENV-ENE-012", question: "Les investissements visant à réduire les consommations d'énergie sont-ils planifiés ?", levels: ["Jamais.", "Au cas par cas.", "Selon un plan d'investissement.", "Selon une feuille de route pluriannuelle."] },
    { id: "ENV-ENE-013", question: "Votre entreprise mesure-t-elle les économies d'énergie réalisées grâce à ses actions ?", levels: ["Jamais.", "Rarement.", "Oui.", "Oui avec comparaison annuelle."] },
    { id: "ENV-ENE-014", question: "La performance énergétique fait-elle l'objet d'une revue régulière par la direction ?", levels: ["Jamais.", "Occasionnellement.", "Chaque année.", "Plusieurs fois par an avec décisions d'amélioration."] },
    { id: "ENV-ENE-015", question: "Votre démarche énergétique s'inscrit-elle dans une logique d'amélioration continue ?", levels: ["Non.", "Quelques améliorations ponctuelles.", "Une amélioration régulière.", "Une démarche d'amélioration continue documentée est en place."] },
  ],
};

const ENV_EAU: DiagnosticSubcategory = {
  id: "ENV-EAU",
  label: "Eau",
  categoryId: "ENV",
  questions: [
    { id: "ENV-EAU-001", question: "Votre entreprise suit-elle régulièrement ses consommations d'eau ?", levels: ["Aucun suivi.", "Quelques relevés ponctuels.", "Un suivi régulier est réalisé.", "Les consommations sont analysées à l'aide d'indicateurs et d'objectifs."] },
    { id: "ENV-EAU-002", question: "Des objectifs de réduction des consommations d'eau ont-ils été définis ?", levels: ["Aucun objectif.", "Réflexion en cours.", "Des objectifs existent.", "Les objectifs sont suivis et révisés régulièrement."] },
    { id: "ENV-EAU-003", question: "Des actions sont-elles mises en œuvre pour réduire les consommations d'eau ?", levels: ["Aucune action.", "Quelques actions ponctuelles.", "Plusieurs actions sont déployées.", "Les actions sont évaluées et améliorées chaque année."] },
    { id: "ENV-EAU-004", question: "Votre entreprise contrôle-t-elle régulièrement les fuites ou consommations anormales ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui avec des procédures d'intervention rapides."] },
    { id: "ENV-EAU-005", question: "Des équipements économes en eau sont-ils installés ?", levels: ["Aucun.", "Quelques équipements.", "La majorité des équipements est optimisée.", "Tous les équipements pertinents sont économes et entretenus."] },
    { id: "ENV-EAU-006", question: "L'eau de pluie ou d'autres ressources alternatives sont-elles utilisées lorsque cela est possible ?", levels: ["Jamais.", "À l'étude.", "Partiellement.", "Oui lorsque cela est techniquement pertinent."] },
    { id: "ENV-EAU-007", question: "Les rejets d'eau sont-ils maîtrisés afin de limiter leur impact sur l'environnement ?", levels: ["Aucune démarche.", "Quelques contrôles.", "Des mesures sont mises en place.", "Les rejets sont suivis et continuellement améliorés."] },
    { id: "ENV-EAU-008", question: "Les collaborateurs sont-ils sensibilisés aux économies d'eau ?", levels: ["Jamais.", "Ponctuellement.", "Régulièrement.", "Dans le cadre d'un programme structuré."] },
    { id: "ENV-EAU-009", question: "Les consommations d'eau sont-elles analysées afin d'identifier des pistes d'amélioration ?", levels: ["Jamais.", "Rarement.", "Oui.", "Oui avec un plan d'amélioration annuel."] },
    { id: "ENV-EAU-010", question: "Votre entreprise tient-elle compte du risque de pénurie d'eau dans ses activités ?", levels: ["Pas du tout.", "Quelques réflexions existent.", "Les principaux risques sont identifiés.", "Le risque est intégré dans la stratégie de l'entreprise."] },
    { id: "ENV-EAU-011", question: "Des investissements sont-ils réalisés pour améliorer l'efficacité de l'utilisation de l'eau ?", levels: ["Jamais.", "Au cas par cas.", "Selon un plan défini.", "Selon une feuille de route pluriannuelle."] },
    { id: "ENV-EAU-012", question: "Votre démarche de gestion de l'eau s'inscrit-elle dans une logique d'amélioration continue ?", levels: ["Non.", "Quelques améliorations ponctuelles.", "Une amélioration régulière est observée.", "Une démarche d'amélioration continue documentée est en place."] },
  ],
};

const ENV_DEC: DiagnosticSubcategory = {
  id: "ENV-DEC",
  label: "Déchets & Économie circulaire",
  categoryId: "ENV",
  questions: [
    { id: "ENV-DEC-001", question: "Votre entreprise a-t-elle identifié les principaux déchets générés par son activité ?", levels: ["Aucun état des lieux.", "Les principaux déchets sont connus de manière informelle.", "Les principaux déchets sont identifiés et suivis.", "L'ensemble des flux de déchets est cartographié et analysé."] },
    { id: "ENV-DEC-002", question: "Le tri des déchets est-il organisé sur vos différents sites ?", levels: ["Aucun tri.", "Tri limité à certains déchets.", "Le tri est généralisé.", "Le tri est optimisé, contrôlé et régulièrement amélioré."] },
    { id: "ENV-DEC-003", question: "Les collaborateurs sont-ils informés des consignes de tri ?", levels: ["Jamais.", "Information ponctuelle.", "Information régulière.", "Sensibilisation continue avec rappels et supports adaptés."] },
    { id: "ENV-DEC-004", question: "Votre entreprise cherche-t-elle à réduire la quantité de déchets produite ?", levels: ["Aucune action.", "Quelques initiatives ponctuelles.", "Une démarche de réduction existe.", "Les résultats sont mesurés et améliorés chaque année."] },
    { id: "ENV-DEC-005", question: "Les déchets dangereux sont-ils identifiés et traités conformément à la réglementation ?", levels: ["Non.", "Partiellement.", "Oui.", "Oui avec un suivi documenté et des contrôles réguliers."] },
    { id: "ENV-DEC-006", question: "Les équipements électriques et électroniques en fin de vie sont-ils orientés vers une filière adaptée ?", levels: ["Jamais.", "Au cas par cas.", "Oui.", "Oui avec traçabilité des filières utilisées."] },
    { id: "ENV-DEC-007", question: "Les consommables (cartouches, piles, batteries...) sont-ils recyclés ?", levels: ["Jamais.", "Partiellement.", "Oui.", "Oui avec une filière de collecte organisée."] },
    { id: "ENV-DEC-008", question: "Votre entreprise privilégie-t-elle le réemploi avant le remplacement d'un équipement ?", levels: ["Jamais.", "Occasionnellement.", "Souvent.", "Le réemploi est privilégié dans une politique formalisée."] },
    { id: "ENV-DEC-009", question: "Les emballages sont-ils réduits ou optimisés lorsque cela est possible ?", levels: ["Aucune démarche.", "Quelques initiatives.", "Une politique de réduction existe.", "Les emballages sont régulièrement revus et optimisés."] },
    { id: "ENV-DEC-010", question: "Votre entreprise favorise-t-elle des solutions réutilisables plutôt que jetables ?", levels: ["Jamais.", "Pour certains usages.", "Oui dans la majorité des cas.", "Cette démarche est systématiquement privilégiée."] },
    { id: "ENV-DEC-011", question: "Les biodéchets sont-ils valorisés lorsque votre activité en produit ?", levels: ["Non applicable ou aucune valorisation.", "Quelques actions.", "Oui.", "Oui avec une filière pérenne et suivie."] },
    { id: "ENV-DEC-012", question: "Des indicateurs de suivi des déchets sont-ils mis en place ?", levels: ["Aucun indicateur.", "Quelques données sont collectées.", "Des indicateurs sont suivis.", "Les indicateurs servent au pilotage et à l'amélioration continue."] },
    { id: "ENV-DEC-013", question: "Votre entreprise travaille-t-elle avec des prestataires ou filières de recyclage reconnus ?", levels: ["Jamais.", "Ponctuellement.", "Oui.", "Oui avec une évaluation régulière des prestataires."] },
    { id: "ENV-DEC-014", question: "Les principes de l'économie circulaire sont-ils intégrés dans vos pratiques ?", levels: ["Pas du tout.", "Quelques initiatives.", "Une démarche existe.", "L'économie circulaire est intégrée dans les décisions de l'entreprise."] },
    { id: "ENV-DEC-015", question: "Les résultats de votre politique de gestion des déchets sont-ils évalués régulièrement ?", levels: ["Jamais.", "Rarement.", "Chaque année.", "Ils sont évalués, communiqués et améliorés en continu."] },
  ],
};

const ENV_BIO: DiagnosticSubcategory = {
  id: "ENV-BIO",
  label: "Biodiversité",
  categoryId: "ENV",
  questions: [
    { id: "ENV-BIO-001", question: "Votre entreprise a-t-elle identifié les principaux enjeux de biodiversité liés à son activité ?", levels: ["Aucune identification.", "Une première réflexion est engagée.", "Les principaux enjeux sont identifiés.", "Les enjeux sont régulièrement réévalués et intégrés aux décisions."] },
    { id: "ENV-BIO-002", question: "Les impacts de votre activité sur la biodiversité sont-ils évalués ?", levels: ["Jamais.", "Partiellement.", "Oui pour les principaux impacts.", "Oui avec un suivi régulier."] },
    { id: "ENV-BIO-003", question: "Les dépendances de votre activité à la biodiversité sont-elles identifiées ?", levels: ["Non.", "Réflexion en cours.", "Oui.", "Oui avec une analyse documentée."] },
    { id: "ENV-BIO-004", question: "Votre entreprise met-elle en œuvre des actions pour préserver la biodiversité ?", levels: ["Aucune action.", "Quelques actions ponctuelles.", "Un plan d'actions existe.", "Les actions sont suivies et améliorées chaque année."] },
    { id: "ENV-BIO-005", question: "Les espaces verts sont-ils gérés de manière favorable à la biodiversité ?", levels: ["Pas de démarche.", "Quelques pratiques favorables.", "Gestion écologique mise en place.", "Gestion écologique suivie avec objectifs."] },
    { id: "ENV-BIO-006", question: "Les espèces végétales locales sont-elles privilégiées lors des plantations ?", levels: ["Jamais.", "Occasionnellement.", "Oui dans la majorité des cas.", "Oui selon une politique formalisée."] },
    { id: "ENV-BIO-007", question: "Les produits phytosanitaires sont-ils limités ou supprimés ?", levels: ["Utilisation sans restriction.", "Réduction progressive.", "Usage très limité.", "Aucun produit phytosanitaire utilisé lorsque cela est possible."] },
    { id: "ENV-BIO-008", question: "Des actions sont-elles mises en place en faveur des pollinisateurs ?", levels: ["Aucune.", "Quelques initiatives.", "Plusieurs actions sont déployées.", "Ces actions sont intégrées dans une stratégie biodiversité."] },
    { id: "ENV-BIO-009", question: "Votre entreprise lutte-t-elle contre l'artificialisation ou favorise-t-elle la renaturation de ses espaces ?", levels: ["Aucune démarche.", "Réflexion en cours.", "Des actions existent.", "Les projets sont intégrés à une stratégie globale."] },
    { id: "ENV-BIO-010", question: "Les collaborateurs sont-ils sensibilisés aux enjeux de biodiversité ?", levels: ["Jamais.", "Ponctuellement.", "Régulièrement.", "Dans le cadre d'un programme structuré."] },
    { id: "ENV-BIO-011", question: "Votre entreprise travaille-t-elle avec des partenaires locaux pour préserver la biodiversité ?", levels: ["Jamais.", "Ponctuellement.", "Oui.", "Oui dans le cadre de partenariats durables."] },
    { id: "ENV-BIO-012", question: "Des indicateurs permettent-ils de suivre les actions en faveur de la biodiversité ?", levels: ["Aucun indicateur.", "Quelques données sont collectées.", "Des indicateurs sont suivis.", "Ils servent au pilotage et à l'amélioration continue."] },
    { id: "ENV-BIO-013", question: "Les projets d'aménagement tiennent-ils compte des enjeux de biodiversité ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui avec une analyse préalable systématique."] },
    { id: "ENV-BIO-014", question: "Votre entreprise contribue-t-elle à des actions de restauration ou de protection de la nature ?", levels: ["Jamais.", "Quelques actions ponctuelles.", "Des actions régulières sont menées.", "Ces actions font partie intégrante de la stratégie environnementale."] },
    { id: "ENV-BIO-015", question: "Votre démarche biodiversité s'inscrit-elle dans une logique d'amélioration continue ?", levels: ["Non.", "Quelques améliorations ponctuelles.", "Une amélioration régulière est observée.", "La démarche est revue, évaluée et améliorée en continu."] },
  ],
};

const ENV_MOB: DiagnosticSubcategory = {
  id: "ENV-MOB",
  label: "Mobilité",
  categoryId: "ENV",
  questions: [
    { id: "ENV-MOB-001", question: "Votre entreprise connaît-elle les principaux modes de déplacement de ses collaborateurs ?", levels: ["Aucune information n'est disponible.", "Quelques informations sont connues.", "Les principaux modes de déplacement sont identifiés.", "Les déplacements sont suivis régulièrement et analysés."] },
    { id: "ENV-MOB-002", question: "Un plan de mobilité a-t-il été mis en place ?", levels: ["Aucun plan.", "Réflexion en cours.", "Un plan existe.", "Le plan est piloté, évalué et régulièrement mis à jour."] },
    { id: "ENV-MOB-003", question: "Votre entreprise encourage-t-elle les mobilités douces (vélo, marche, trottinette...) ?", levels: ["Aucune action.", "Quelques initiatives ponctuelles.", "Plusieurs dispositifs sont proposés.", "Les mobilités douces sont pleinement intégrées à la politique de mobilité."] },
    { id: "ENV-MOB-004", question: "Des actions favorisant le covoiturage sont-elles mises en place ?", levels: ["Aucune.", "Quelques actions ponctuelles.", "Des solutions sont proposées aux collaborateurs.", "Le covoiturage est suivi et encouragé durablement."] },
    { id: "ENV-MOB-005", question: "Les déplacements professionnels sont-ils optimisés afin de limiter leur impact environnemental ?", levels: ["Jamais.", "Occasionnellement.", "Oui pour la majorité des déplacements.", "Une politique d'optimisation est formalisée et suivie."] },
    { id: "ENV-MOB-006", question: "Votre flotte de véhicules fait-elle l'objet d'une démarche de réduction de son impact ?", levels: ["Aucune démarche.", "Réflexion en cours.", "Des véhicules plus sobres sont progressivement intégrés.", "La flotte est pilotée selon des objectifs environnementaux."] },
    { id: "ENV-MOB-007", question: "Les alternatives à la voiture individuelle sont-elles encouragées ?", levels: ["Jamais.", "Ponctuellement.", "Oui par différents dispositifs.", "Elles sont intégrées dans la politique de mobilité."] },
    { id: "ENV-MOB-008", question: "Le télétravail est-il utilisé lorsque cela est pertinent afin de limiter les déplacements ?", levels: ["Jamais.", "Occasionnellement.", "Oui lorsque cela est possible.", "Le télétravail fait partie intégrante de l'organisation."] },
    { id: "ENV-MOB-009", question: "Les émissions liées aux déplacements sont-elles suivies ?", levels: ["Aucun suivi.", "Quelques estimations.", "Oui de manière régulière.", "Oui avec des objectifs de réduction."] },
    { id: "ENV-MOB-010", question: "Les collaborateurs sont-ils sensibilisés à l'écomobilité ?", levels: ["Jamais.", "Ponctuellement.", "Régulièrement.", "Dans le cadre d'un programme structuré."] },
    { id: "ENV-MOB-011", question: "Les infrastructures favorisant les mobilités durables (parking vélo, bornes, douches...) sont-elles développées ?", levels: ["Aucune infrastructure.", "Quelques équipements.", "Des infrastructures adaptées existent.", "Les infrastructures sont développées selon les besoins des collaborateurs."] },
    { id: "ENV-MOB-012", question: "Votre démarche mobilité fait-elle l'objet d'une amélioration continue ?", levels: ["Non.", "Quelques améliorations ponctuelles.", "Une amélioration régulière est observée.", "La démarche est évaluée, pilotée et améliorée en continu."] },
  ],
};

const ENV_ACH: DiagnosticSubcategory = {
  id: "ENV-ACH",
  label: "Achats responsables",
  categoryId: "ENV",
  questions: [
    { id: "ENV-ACH-001", question: "Votre entreprise dispose-t-elle d'une politique d'achats responsables ?", levels: ["Aucune politique.", "Réflexion en cours.", "Une politique existe.", "La politique est suivie et régulièrement mise à jour."] },
    { id: "ENV-ACH-002", question: "Des critères environnementaux sont-ils pris en compte lors des achats ?", levels: ["Jamais.", "Parfois.", "Oui pour les principaux achats.", "Oui de manière systématique."] },
    { id: "ENV-ACH-003", question: "Les critères sociaux sont-ils intégrés dans vos décisions d'achat ?", levels: ["Jamais.", "Occasionnellement.", "Oui pour certains achats.", "Oui selon une politique formalisée."] },
    { id: "ENV-ACH-004", question: "Privilégiez-vous les fournisseurs locaux lorsque cela est pertinent ?", levels: ["Jamais.", "Parfois.", "Souvent.", "Une politique d'achat local est définie."] },
    { id: "ENV-ACH-005", question: "Les fournisseurs sont-ils évalués sur leurs engagements RSE ?", levels: ["Jamais.", "De façon ponctuelle.", "Oui pour les principaux fournisseurs.", "Oui avec un suivi régulier."] },
    { id: "ENV-ACH-006", question: "Les produits écolabellisés ou certifiés sont-ils privilégiés ?", levels: ["Jamais.", "Occasionnellement.", "Oui dans la majorité des cas.", "Ils constituent le choix par défaut lorsque possible."] },
    { id: "ENV-ACH-007", question: "Votre entreprise cherche-t-elle à réduire les emballages liés à ses achats ?", levels: ["Aucune action.", "Quelques initiatives.", "Une démarche est engagée.", "Les résultats sont suivis et améliorés."] },
    { id: "ENV-ACH-008", question: "Le réemploi ou le reconditionné sont-ils privilégiés avant l'achat de matériel neuf ?", levels: ["Jamais.", "Parfois.", "Oui régulièrement.", "Une politique de réemploi est appliquée."] },
    { id: "ENV-ACH-009", question: "Vos fournisseurs sont-ils sensibilisés à votre démarche RSE ?", levels: ["Jamais.", "Ponctuellement.", "Oui régulièrement.", "La sensibilisation fait partie de la relation fournisseur."] },
    { id: "ENV-ACH-010", question: "Votre démarche d'achats responsables est-elle évaluée et améliorée dans le temps ?", levels: ["Jamais.", "Occasionnellement.", "Chaque année.", "Elle fait l'objet d'une amélioration continue pilotée."] },
  ],
};

const SOC_CH: DiagnosticSubcategory = {
  id: "SOC-CH",
  label: "Capital humain",
  categoryId: "SOC",
  questions: [
    { id: "SOC-CH-001", question: "Votre entreprise suit-elle l'évolution de ses effectifs ?", levels: ["Aucun suivi.", "Suivi ponctuel.", "Suivi régulier.", "Le suivi alimente les décisions RH."] },
    { id: "SOC-CH-002", question: "Les compétences nécessaires au développement de l'entreprise sont-elles identifiées ?", levels: ["Non.", "Partiellement.", "Oui.", "Elles sont cartographiées et réévaluées régulièrement."] },
    { id: "SOC-CH-003", question: "Les besoins futurs en recrutement sont-ils anticipés ?", levels: ["Jamais.", "Au cas par cas.", "Oui.", "Ils sont intégrés à une planification RH."] },
    { id: "SOC-CH-004", question: "Disposez-vous d'indicateurs pour suivre les mouvements de personnel (embauches, départs, turnover...) ?", levels: ["Aucun.", "Quelques données.", "Des indicateurs sont suivis.", "Ils servent au pilotage RH."] },
    { id: "SOC-CH-005", question: "L'intégration des nouveaux collaborateurs est-elle organisée ?", levels: ["Aucun parcours.", "Accueil informel.", "Parcours d'intégration existant.", "Parcours structuré avec suivi."] },
    { id: "SOC-CH-006", question: "Les rôles et responsabilités de chaque collaborateur sont-ils clairement définis ?", levels: ["Non.", "Partiellement.", "Oui.", "Ils sont revus régulièrement avec les collaborateurs."] },
    { id: "SOC-CH-007", question: "Les entretiens annuels sont-ils réalisés ?", levels: ["Jamais.", "Ponctuellement.", "Oui pour la majorité.", "Oui de manière systématique avec suivi."] },
    { id: "SOC-CH-008", question: "Les entretiens professionnels sont-ils réalisés conformément aux obligations ?", levels: ["Jamais.", "Partiellement.", "Oui.", "Oui avec exploitation des résultats."] },
    { id: "SOC-CH-009", question: "Les besoins en compétences sont-ils régulièrement réévalués ?", levels: ["Jamais.", "Occasionnellement.", "Chaque année.", "En continu selon les évolutions de l'activité."] },
    { id: "SOC-CH-010", question: "Votre entreprise mesure-t-elle la satisfaction globale de ses collaborateurs ?", levels: ["Jamais.", "Ponctuellement.", "Oui régulièrement.", "Les résultats conduisent à des plans d'actions."] },
    { id: "SOC-CH-011", question: "Les indicateurs RH sont-ils partagés avec la direction ?", levels: ["Jamais.", "Rarement.", "Oui.", "Oui avec revues régulières."] },
    { id: "SOC-CH-012", question: "Votre gestion du capital humain s'inscrit-elle dans une logique d'amélioration continue ?", levels: ["Non.", "Quelques améliorations.", "Une amélioration régulière est observée.", "La démarche est pilotée, évaluée et continuellement améliorée."] },
  ],
};

const SOC_REC: DiagnosticSubcategory = {
  id: "SOC-REC",
  label: "Recrutement & Intégration",
  categoryId: "SOC",
  questions: [
    { id: "SOC-REC-001", question: "Les besoins en recrutement sont-ils identifiés avant le lancement d'un recrutement ?", levels: ["Jamais.", "Au cas par cas.", "Oui selon un processus défini.", "Ils sont anticipés dans une planification RH."] },
    { id: "SOC-REC-002", question: "Les offres d'emploi sont-elles rédigées de manière inclusive et non discriminante ?", levels: ["Jamais.", "Parfois.", "Oui dans la majorité des cas.", "Une charte ou des règles encadrent leur rédaction."] },
    { id: "SOC-REC-003", question: "Les critères de sélection des candidats sont-ils clairement définis ?", levels: ["Non.", "Partiellement.", "Oui.", "Ils sont formalisés et partagés entre les recruteurs."] },
    { id: "SOC-REC-004", question: "Les candidatures sont-elles évaluées selon des critères objectifs ?", levels: ["Jamais.", "Souvent subjectivement.", "Oui pour la majorité des recrutements.", "Une méthode commune est appliquée à tous les recrutements."] },
    { id: "SOC-REC-005", question: "Votre entreprise veille-t-elle à favoriser l'égalité des chances lors des recrutements ?", levels: ["Aucune démarche.", "Quelques initiatives.", "Oui.", "Cette démarche est intégrée à la politique RH."] },
    { id: "SOC-REC-006", question: "Les nouveaux collaborateurs bénéficient-ils d'un parcours d'intégration ?", levels: ["Aucun parcours.", "Accueil informel.", "Parcours d'intégration défini.", "Parcours personnalisé avec suivi."] },
    { id: "SOC-REC-007", question: "Les nouveaux collaborateurs sont-ils accompagnés durant leurs premières semaines ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui avec un tuteur ou référent identifié."] },
    { id: "SOC-REC-008", question: "Les outils, accès et informations nécessaires sont-ils disponibles dès l'arrivée du collaborateur ?", levels: ["Rarement.", "Souvent incomplets.", "Oui dans la majorité des cas.", "Toujours disponibles grâce à un processus formalisé."] },
    { id: "SOC-REC-009", question: "L'intégration des nouveaux collaborateurs fait-elle l'objet d'un retour d'expérience ?", levels: ["Jamais.", "Ponctuellement.", "Oui.", "Les retours servent à améliorer le parcours d'intégration."] },
    { id: "SOC-REC-010", question: "Votre entreprise suit-elle des indicateurs liés au recrutement et à l'intégration ?", levels: ["Aucun indicateur.", "Quelques données.", "Des indicateurs sont suivis.", "Ils sont utilisés pour améliorer les pratiques RH."] },
    { id: "SOC-REC-011", question: "Les managers sont-ils impliqués dans l'accueil et l'intégration des nouveaux collaborateurs ?", levels: ["Jamais.", "Parfois.", "Oui.", "Leur rôle est défini et évalué."] },
    { id: "SOC-REC-012", question: "Votre démarche de recrutement et d'intégration s'inscrit-elle dans une logique d'amélioration continue ?", levels: ["Non.", "Quelques améliorations.", "Une amélioration régulière est observée.", "La démarche est pilotée, évaluée et continuellement améliorée."] },
  ],
};

const SOC_FOR: DiagnosticSubcategory = {
  id: "SOC-FOR",
  label: "Formation & Développement des compétences",
  categoryId: "SOC",
  questions: [
    { id: "SOC-FOR-001", question: "Les besoins en formation des collaborateurs sont-ils identifiés régulièrement ?", levels: ["Jamais.", "Ponctuellement.", "Chaque année.", "En continu selon l'évolution des métiers et des compétences."] },
    { id: "SOC-FOR-002", question: "Votre entreprise dispose-t-elle d'un plan de formation ?", levels: ["Aucun plan.", "Réflexion en cours.", "Un plan existe.", "Le plan est actualisé et suivi régulièrement."] },
    { id: "SOC-FOR-003", question: "Les formations proposées sont-elles adaptées aux besoins des collaborateurs et de l'entreprise ?", levels: ["Jamais évaluées.", "Partiellement adaptées.", "Globalement adaptées.", "Adaptées grâce à une analyse régulière des besoins."] },
    { id: "SOC-FOR-004", question: "Chaque collaborateur a-t-il la possibilité de développer ses compétences ?", levels: ["Rarement.", "Selon les opportunités.", "Oui pour la majorité.", "Oui dans le cadre d'une politique de développement des compétences."] },
    { id: "SOC-FOR-005", question: "Les nouveaux outils, réglementations ou méthodes de travail donnent-ils lieu à des formations ?", levels: ["Jamais.", "Occasionnellement.", "Oui dans la majorité des cas.", "Oui de manière systématique."] },
    { id: "SOC-FOR-006", question: "Les managers sont-ils accompagnés dans le développement de leurs compétences managériales ?", levels: ["Jamais.", "Ponctuellement.", "Oui.", "Oui avec un parcours spécifique."] },
    { id: "SOC-FOR-007", question: "Les formations font-elles l'objet d'une évaluation de leur efficacité ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui avec des indicateurs et des actions d'amélioration."] },
    { id: "SOC-FOR-008", question: "Les compétences acquises sont-elles valorisées au sein de l'entreprise ?", levels: ["Jamais.", "Parfois.", "Oui.", "Oui avec un suivi des évolutions professionnelles."] },
    { id: "SOC-FOR-009", question: "Votre entreprise encourage-t-elle le partage des connaissances entre collaborateurs ?", levels: ["Jamais.", "Quelques initiatives.", "Oui régulièrement.", "Le partage de connaissances fait partie de la culture de l'entreprise."] },
    { id: "SOC-FOR-010", question: "Les obligations légales en matière de formation sont-elles respectées ?", levels: ["Non.", "Partiellement.", "Oui.", "Oui avec un suivi documentaire et réglementaire."] },
    { id: "SOC-FOR-011", question: "Des indicateurs permettent-ils de suivre la politique de formation ?", levels: ["Aucun indicateur.", "Quelques données sont suivies.", "Des indicateurs sont analysés.", "Ils servent au pilotage de la politique de formation."] },
    { id: "SOC-FOR-012", question: "Votre politique de formation s'inscrit-elle dans une logique d'amélioration continue ?", levels: ["Non.", "Quelques améliorations.", "Une amélioration régulière est observée.", "La politique est évaluée, pilotée et continuellement améliorée."] },
  ],
};

const SOC_SST: DiagnosticSubcategory = {
  id: "SOC-SST",
  label: "Santé & Sécurité au travail",
  categoryId: "SOC",
  questions: [
    { id: "SOC-SST-001", question: "Votre entreprise évalue-t-elle régulièrement les risques professionnels ?", levels: ["Aucune évaluation.", "Une évaluation ponctuelle existe.", "Les risques sont évalués régulièrement.", "L'évaluation est revue à chaque évolution significative."] },
    { id: "SOC-SST-002", question: "Le Document Unique d'Évaluation des Risques Professionnels (DUERP) est-il à jour ?", levels: ["Inexistant.", "Présent mais non à jour.", "À jour.", "À jour et utilisé comme outil de pilotage."] },
    { id: "SOC-SST-003", question: "Des actions de prévention sont-elles mises en œuvre pour réduire les risques professionnels ?", levels: ["Aucune.", "Quelques actions ponctuelles.", "Un plan de prévention existe.", "Les actions sont suivies et améliorées en continu."] },
    { id: "SOC-SST-004", question: "Les collaborateurs sont-ils formés aux risques liés à leur poste ?", levels: ["Jamais.", "Ponctuellement.", "Oui pour la majorité.", "Oui selon un plan de formation structuré."] },
    { id: "SOC-SST-005", question: "Les accidents du travail et incidents sont-ils analysés afin d'éviter leur réapparition ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui avec des plans d'actions systématiques."] },
    { id: "SOC-SST-006", question: "Des exercices ou procédures d'urgence sont-ils régulièrement réalisés ?", levels: ["Jamais.", "Rarement.", "Oui.", "Ils sont planifiés et évalués."] },
    { id: "SOC-SST-007", question: "Les équipements de protection individuelle (EPI) sont-ils adaptés et disponibles ?", levels: ["Non.", "Partiellement.", "Oui.", "Oui avec contrôle régulier et renouvellement."] },
    { id: "SOC-SST-008", question: "Les postes de travail sont-ils aménagés pour limiter les risques ergonomiques ?", levels: ["Aucune démarche.", "Quelques aménagements.", "Les principaux postes sont adaptés.", "Une démarche ergonomique est intégrée à l'organisation."] },
    { id: "SOC-SST-009", question: "Les collaborateurs peuvent-ils signaler facilement une situation dangereuse ?", levels: ["Non.", "Difficilement.", "Oui.", "Oui avec suivi des signalements et actions correctives."] },
    { id: "SOC-SST-010", question: "Votre entreprise suit-elle des indicateurs de santé et sécurité (AT, MP, absentéisme...) ?", levels: ["Aucun indicateur.", "Quelques données.", "Des indicateurs sont suivis.", "Ils servent au pilotage de la prévention."] },
    { id: "SOC-SST-011", question: "La direction est-elle impliquée dans la politique Santé & Sécurité ?", levels: ["Pas du tout.", "Occasionnellement.", "Oui.", "Oui avec des revues régulières et des objectifs."] },
    { id: "SOC-SST-012", question: "Votre démarche Santé & Sécurité s'inscrit-elle dans une logique d'amélioration continue ?", levels: ["Non.", "Quelques améliorations.", "Une amélioration régulière est observée.", "La démarche est pilotée, évaluée et continuellement améliorée."] },
    { id: "SOC-SST-013", question: "Le Document Unique d'Évaluation des Risques Professionnels (DUERP) est-il utilisé pour piloter les actions de prévention de l'entreprise ?", levels: ["Le DUERP n'est pas utilisé après sa rédaction.", "Le DUERP est consulté uniquement lors de ses mises à jour obligatoires.", "Le DUERP sert à définir certaines actions de prévention.", "Le DUERP constitue un véritable outil de pilotage : les risques sont suivis, les actions sont planifiées, évaluées et mises à jour régulièrement."] },
  ],
};

const SOC_QVCT: DiagnosticSubcategory = {
  id: "SOC-QVCT",
  label: "Qualité de Vie et Conditions de Travail",
  categoryId: "SOC",
  questions: [
    { id: "SOC-QVCT-001", question: "Votre entreprise mène-t-elle des actions pour améliorer la qualité de vie et les conditions de travail ?", levels: ["Aucune action.", "Quelques initiatives ponctuelles.", "Une démarche existe.", "La démarche est pilotée et évaluée régulièrement."] },
    { id: "SOC-QVCT-002", question: "La charge de travail des collaborateurs est-elle suivie et ajustée lorsque nécessaire ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui grâce à un suivi régulier et des actions correctives."] },
    { id: "SOC-QVCT-003", question: "L'équilibre entre vie professionnelle et vie personnelle est-il pris en compte ?", levels: ["Jamais.", "Quelques aménagements ponctuels.", "Oui dans la majorité des situations.", "Cette dimension fait partie intégrante de la politique RH."] },
    { id: "SOC-QVCT-004", question: "Les collaborateurs disposent-ils des moyens matériels nécessaires pour travailler dans de bonnes conditions ?", levels: ["Rarement.", "Partiellement.", "Oui.", "Les besoins sont régulièrement évalués et anticipés."] },
    { id: "SOC-QVCT-005", question: "Le télétravail ou les modalités de travail flexibles sont-ils proposés lorsque cela est possible ?", levels: ["Jamais.", "Au cas par cas.", "Oui.", "Oui dans un cadre défini et suivi."] },
    { id: "SOC-QVCT-006", question: "Le bien-être des collaborateurs est-il régulièrement évalué ?", levels: ["Jamais.", "Ponctuellement.", "Oui grâce à des enquêtes ou échanges réguliers.", "Les résultats donnent lieu à des plans d'actions suivis."] },
    { id: "SOC-QVCT-007", question: "Des actions sont-elles mises en place pour prévenir les risques psychosociaux ?", levels: ["Aucune.", "Quelques actions ponctuelles.", "Une démarche est en place.", "Les risques sont évalués et pilotés dans la durée."] },
    { id: "SOC-QVCT-008", question: "Les espaces de travail sont-ils adaptés au confort et à la santé des collaborateurs ?", levels: ["Pas de démarche.", "Quelques améliorations.", "Les espaces sont globalement adaptés.", "Les aménagements sont régulièrement revus avec les collaborateurs."] },
    { id: "SOC-QVCT-009", question: "Les collaborateurs peuvent-ils exprimer leurs difficultés ou proposer des améliorations ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui avec un suivi des retours et des décisions prises."] },
    { id: "SOC-QVCT-010", question: "Des indicateurs permettent-ils de suivre la QVCT (absentéisme, satisfaction, turnover...) ?", levels: ["Aucun indicateur.", "Quelques données.", "Des indicateurs sont suivis.", "Ils servent au pilotage de la politique QVCT."] },
    { id: "SOC-QVCT-011", question: "La direction est-elle impliquée dans les actions de QVCT ?", levels: ["Pas du tout.", "Occasionnellement.", "Oui.", "Oui avec des objectifs et des revues régulières."] },
    { id: "SOC-QVCT-012", question: "Votre démarche QVCT s'inscrit-elle dans une logique d'amélioration continue ?", levels: ["Non.", "Quelques améliorations.", "Une amélioration régulière est observée.", "La démarche est pilotée, évaluée et continuellement améliorée."] },
  ],
};

const SOC_DIV: DiagnosticSubcategory = {
  id: "SOC-DIV",
  label: "Diversité, Inclusion & Égalité des chances",
  categoryId: "SOC",
  questions: [
    { id: "SOC-DIV-001", question: "Votre entreprise s'engage-t-elle en faveur de la diversité et de l'inclusion ?", levels: ["Aucune démarche.", "Réflexion en cours.", "Une démarche existe.", "La démarche est pilotée et évaluée régulièrement."] },
    { id: "SOC-DIV-002", question: "Les recrutements garantissent-ils l'égalité des chances ?", levels: ["Aucune mesure.", "Quelques bonnes pratiques.", "Des règles sont appliquées.", "Les pratiques sont suivies et évaluées."] },
    { id: "SOC-DIV-003", question: "Les collaborateurs sont-ils sensibilisés aux discriminations et aux biais ?", levels: ["Jamais.", "Ponctuellement.", "Régulièrement.", "Selon un programme structuré."] },
    { id: "SOC-DIV-004", question: "Votre entreprise favorise-t-elle l'égalité professionnelle entre les femmes et les hommes ?", levels: ["Aucune action.", "Quelques actions.", "Une politique existe.", "Les résultats sont suivis et améliorés."] },
    { id: "SOC-DIV-005", question: "Les personnes en situation de handicap peuvent-elles travailler dans de bonnes conditions ?", levels: ["Aucune démarche.", "Au cas par cas.", "Des aménagements sont proposés.", "L'accessibilité est intégrée dans la politique RH."] },
    { id: "SOC-DIV-006", question: "Les locaux et outils sont-ils accessibles lorsque cela est nécessaire ?", levels: ["Non.", "Partiellement.", "Oui dans la majorité des cas.", "Ils sont régulièrement évalués et améliorés."] },
    { id: "SOC-DIV-007", question: "Les différences d'âge, de parcours et d'expérience sont-elles considérées comme une richesse ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Cette diversité est valorisée dans les pratiques RH."] },
    { id: "SOC-DIV-008", question: "Les situations de discrimination ou de harcèlement peuvent-elles être signalées facilement ?", levels: ["Aucun dispositif.", "Dispositif informel.", "Un dispositif existe.", "Les signalements sont suivis avec une procédure claire."] },
    { id: "SOC-DIV-009", question: "Votre entreprise suit-elle des indicateurs liés à la diversité et à l'inclusion ?", levels: ["Aucun indicateur.", "Quelques données.", "Des indicateurs sont suivis.", "Ils servent au pilotage des actions."] },
    { id: "SOC-DIV-010", question: "La direction est-elle impliquée dans la politique de diversité et d'inclusion ?", levels: ["Pas du tout.", "Occasionnellement.", "Oui.", "Oui avec des objectifs et un suivi régulier."] },
    { id: "SOC-DIV-011", question: "Les partenaires et fournisseurs sont-ils sensibilisés à vos engagements en matière d'inclusion ?", levels: ["Jamais.", "Ponctuellement.", "Oui pour les principaux partenaires.", "Oui dans le cadre d'une politique globale."] },
    { id: "SOC-DIV-012", question: "Votre démarche Diversité & Inclusion s'inscrit-elle dans une logique d'amélioration continue ?", levels: ["Non.", "Quelques améliorations.", "Une amélioration régulière est observée.", "La démarche est pilotée, évaluée et continuellement améliorée."] },
  ],
};

const SOC_DIA: DiagnosticSubcategory = {
  id: "SOC-DIA",
  label: "Dialogue social & Communication interne",
  categoryId: "SOC",
  questions: [
    { id: "SOC-DIA-001", question: "Les collaborateurs sont-ils régulièrement informés de la vie et des projets de l'entreprise ?", levels: ["Jamais.", "Ponctuellement.", "Oui régulièrement.", "La communication est planifiée et évaluée."] },
    { id: "SOC-DIA-002", question: "Les objectifs de l'entreprise sont-ils clairement partagés avec les collaborateurs ?", levels: ["Jamais.", "Partiellement.", "Oui.", "Ils sont régulièrement rappelés et expliqués."] },
    { id: "SOC-DIA-003", question: "Les collaborateurs peuvent-ils facilement poser des questions ou faire remonter des difficultés ?", levels: ["Non.", "Difficilement.", "Oui.", "Oui avec un suivi des demandes et des réponses."] },
    { id: "SOC-DIA-004", question: "Les collaborateurs sont-ils consultés avant les changements importants ?", levels: ["Jamais.", "Occasionnellement.", "Oui pour les principaux changements.", "La consultation est intégrée aux pratiques de management."] },
    { id: "SOC-DIA-005", question: "Votre entreprise dispose-t-elle de canaux de communication interne adaptés ?", levels: ["Aucun canal structuré.", "Quelques outils.", "Des canaux sont identifiés.", "Les outils sont régulièrement évalués et améliorés."] },
    { id: "SOC-DIA-006", question: "Les représentants du personnel ou instances de dialogue sont-ils associés lorsque cela est nécessaire ?", levels: ["Jamais.", "Ponctuellement.", "Oui.", "Oui dans une logique de dialogue constructif."] },
    { id: "SOC-DIA-007", question: "Les décisions prises à la suite des retours des collaborateurs sont-elles communiquées ?", levels: ["Jamais.", "Rarement.", "Oui.", "Oui avec un retour systématique."] },
    { id: "SOC-DIA-008", question: "Les conflits ou tensions sont-ils traités rapidement et de manière équitable ?", levels: ["Pas de démarche.", "Au cas par cas.", "Oui.", "Une procédure claire est appliquée."] },
    { id: "SOC-DIA-009", question: "La qualité de la communication interne est-elle évaluée régulièrement ?", levels: ["Jamais.", "Ponctuellement.", "Oui.", "Les résultats servent à améliorer les pratiques."] },
    { id: "SOC-DIA-010", question: "Le baromètre social ou d'autres enquêtes internes sont-ils utilisés pour améliorer le dialogue social ?", levels: ["Jamais.", "Occasionnellement.", "Oui régulièrement.", "Les résultats alimentent un plan d'actions suivi."] },
    { id: "SOC-DIA-011", question: "La direction est-elle accessible et à l'écoute des collaborateurs ?", levels: ["Rarement.", "Parfois.", "Oui.", "Oui avec des temps d'échange réguliers et structurés."] },
    { id: "SOC-DIA-012", question: "Votre démarche de dialogue social et de communication interne s'inscrit-elle dans une logique d'amélioration continue ?", levels: ["Non.", "Quelques améliorations.", "Une amélioration régulière est observée.", "La démarche est pilotée, évaluée et continuellement améliorée."] },
  ],
};

const SOC_DEV: DiagnosticSubcategory = {
  id: "SOC-DEV",
  label: "Développement professionnel & Reconnaissance",
  categoryId: "SOC",
  questions: [
    { id: "SOC-DEV-001", question: "Les collaborateurs connaissent-ils les possibilités d'évolution au sein de l'entreprise ?", levels: ["Non.", "Partiellement.", "Oui.", "Oui grâce à une communication régulière et transparente."] },
    { id: "SOC-DEV-002", question: "Les évolutions professionnelles sont-elles étudiées lors des entretiens individuels ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui avec un suivi des engagements pris."] },
    { id: "SOC-DEV-003", question: "Les compétences et performances sont-elles reconnues de manière équitable ?", levels: ["Jamais.", "Parfois.", "Oui dans la majorité des cas.", "Oui selon des critères clairement définis."] },
    { id: "SOC-DEV-004", question: "Les collaborateurs sont-ils encouragés à développer de nouvelles compétences ?", levels: ["Jamais.", "Ponctuellement.", "Oui.", "Cette démarche fait partie de la politique RH."] },
    { id: "SOC-DEV-005", question: "Les mobilités internes sont-elles favorisées lorsque cela est pertinent ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui grâce à un processus structuré."] },
    { id: "SOC-DEV-006", question: "Les talents et les compétences clés sont-ils identifiés ?", levels: ["Non.", "Partiellement.", "Oui.", "Ils sont suivis dans une gestion prévisionnelle."] },
    { id: "SOC-DEV-007", question: "Les managers accompagnent-ils le développement professionnel de leurs équipes ?", levels: ["Rarement.", "Parfois.", "Oui.", "Oui avec des objectifs et un suivi."] },
    { id: "SOC-DEV-008", question: "Les réussites individuelles et collectives sont-elles valorisées ?", levels: ["Jamais.", "Ponctuellement.", "Oui.", "Oui de manière régulière et structurée."] },
    { id: "SOC-DEV-009", question: "Les collaborateurs disposent-ils des ressources nécessaires pour atteindre leurs objectifs ?", levels: ["Rarement.", "Partiellement.", "Oui.", "Les besoins sont régulièrement évalués et ajustés."] },
    { id: "SOC-DEV-010", question: "Les souhaits d'évolution exprimés par les collaborateurs sont-ils pris en compte ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Ils donnent lieu à un plan de développement personnalisé lorsque cela est possible."] },
    { id: "SOC-DEV-011", question: "Votre entreprise suit-elle des indicateurs liés au développement professionnel ?", levels: ["Aucun indicateur.", "Quelques données.", "Des indicateurs sont suivis.", "Ils servent au pilotage de la politique RH."] },
    { id: "SOC-DEV-012", question: "Votre démarche de développement professionnel s'inscrit-elle dans une logique d'amélioration continue ?", levels: ["Non.", "Quelques améliorations.", "Une amélioration régulière est observée.", "La démarche est pilotée, évaluée et continuellement améliorée."] },
  ],
};

const SOC_ENG: DiagnosticSubcategory = {
  id: "SOC-ENG",
  label: "Engagement territorial & sociétal",
  categoryId: "SOC",
  questions: [
    { id: "SOC-ENG-001", question: "Votre entreprise participe-t-elle à la vie de son territoire ?", levels: ["Aucune implication.", "Participation ponctuelle.", "Participation régulière à des initiatives locales.", "L'engagement territorial fait partie de la stratégie de l'entreprise."] },
    { id: "SOC-ENG-002", question: "Votre entreprise soutient-elle des associations, projets ou causes d'intérêt général ?", levels: ["Aucun soutien.", "Soutiens occasionnels.", "Des partenariats réguliers existent.", "Une politique de mécénat ou de soutien est structurée."] },
    { id: "SOC-ENG-003", question: "Votre entreprise favorise-t-elle les achats et prestataires locaux lorsque cela est pertinent ?", levels: ["Jamais.", "Occasionnellement.", "Oui dans la majorité des cas.", "Une politique d'ancrage territorial est définie."] },
    { id: "SOC-ENG-004", question: "Votre entreprise accueille-t-elle des stagiaires, alternants ou personnes en insertion ?", levels: ["Jamais.", "Ponctuellement.", "Oui régulièrement.", "Cette démarche est intégrée à la politique RH."] },
    { id: "SOC-ENG-005", question: "Vos collaborateurs sont-ils encouragés à participer à des actions solidaires ou citoyennes ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui avec des dispositifs dédiés."] },
    { id: "SOC-ENG-006", question: "Votre entreprise mène-t-elle des actions de sensibilisation auprès du grand public ou des écoles ?", levels: ["Jamais.", "Quelques actions.", "Oui régulièrement.", "Ces actions font partie de votre stratégie d'engagement."] },
    { id: "SOC-ENG-007", question: "Votre entreprise entretient-elle un dialogue avec les acteurs locaux (collectivités, associations, réseaux...) ?", levels: ["Jamais.", "Ponctuellement.", "Oui régulièrement.", "Ce dialogue nourrit les décisions de l'entreprise."] },
    { id: "SOC-ENG-008", question: "Les impacts positifs de votre entreprise sur le territoire sont-ils évalués ?", levels: ["Jamais.", "Quelques observations.", "Oui à travers certains indicateurs.", "Ils sont mesurés et communiqués régulièrement."] },
    { id: "SOC-ENG-009", question: "Votre entreprise contribue-t-elle au développement économique local ?", levels: ["Jamais.", "Indirectement.", "Oui par plusieurs actions.", "Cette contribution est intégrée dans la stratégie de développement."] },
    { id: "SOC-ENG-010", question: "Les actions sociétales menées sont-elles communiquées aux parties prenantes ?", levels: ["Jamais.", "Occasionnellement.", "Oui régulièrement.", "Oui avec des résultats et des indicateurs."] },
    { id: "SOC-ENG-011", question: "La direction est-elle impliquée dans les actions d'engagement territorial et sociétal ?", levels: ["Pas du tout.", "Occasionnellement.", "Oui.", "Oui avec des objectifs et un suivi annuel."] },
    { id: "SOC-ENG-012", question: "Votre démarche d'engagement territorial et sociétal s'inscrit-elle dans une logique d'amélioration continue ?", levels: ["Non.", "Quelques améliorations.", "Une amélioration régulière est observée.", "La démarche est pilotée, évaluée et continuellement améliorée."] },
  ],
};

const GOV_VIS: DiagnosticSubcategory = {
  id: "GOV-VIS",
  label: "Vision & Stratégie RSE",
  categoryId: "GOV",
  questions: [
    { id: "GOV-VIS-001", question: "La direction a-t-elle défini une vision claire de la démarche RSE de l'entreprise ?", levels: ["Aucune vision définie.", "Une réflexion est engagée.", "Une vision est formalisée.", "Elle est partagée, connue et régulièrement réévaluée."] },
    { id: "GOV-VIS-002", question: "Votre entreprise dispose-t-elle d'une stratégie RSE formalisée ?", levels: ["Aucune stratégie.", "Des actions existent sans stratégie globale.", "Une stratégie est formalisée.", "Elle est suivie à l'aide d'indicateurs et révisée régulièrement."] },
    { id: "GOV-VIS-003", question: "Les enjeux RSE sont-ils intégrés dans les décisions stratégiques ?", levels: ["Jamais.", "Occasionnellement.", "Oui pour les principales décisions.", "Ils sont systématiquement intégrés."] },
    { id: "GOV-VIS-004", question: "Des objectifs RSE mesurables ont-ils été définis ?", levels: ["Aucun objectif.", "Quelques intentions.", "Des objectifs existent.", "Ils sont suivis et actualisés régulièrement."] },
    { id: "GOV-VIS-005", question: "Les responsabilités liées à la RSE sont-elles clairement définies ?", levels: ["Aucune responsabilité.", "Répartition informelle.", "Des responsabilités sont identifiées.", "Les rôles sont formalisés et connus de tous."] },
    { id: "GOV-VIS-006", question: "La direction consacre-t-elle des ressources suffisantes au déploiement de la démarche RSE ?", levels: ["Aucune ressource.", "Quelques moyens ponctuels.", "Des ressources sont prévues.", "Les moyens sont planifiés et adaptés aux objectifs."] },
    { id: "GOV-VIS-007", question: "Les collaborateurs connaissent-ils les engagements RSE de l'entreprise ?", levels: ["Pas du tout.", "Partiellement.", "Oui dans la majorité des cas.", "Les engagements sont régulièrement communiqués et expliqués."] },
    { id: "GOV-VIS-008", question: "La stratégie RSE est-elle revue régulièrement ?", levels: ["Jamais.", "Occasionnellement.", "Oui chaque année.", "Oui avec une démarche d'amélioration continue."] },
    { id: "GOV-VIS-009", question: "Les parties prenantes sont-elles prises en compte lors de la définition de la stratégie RSE ?", levels: ["Jamais.", "Ponctuellement.", "Oui.", "Oui de manière structurée."] },
    { id: "GOV-VIS-010", question: "La stratégie RSE est-elle cohérente avec la stratégie globale de l'entreprise ?", levels: ["Pas du tout.", "Partiellement.", "Oui.", "Elle constitue un pilier de la stratégie globale."] },
    { id: "GOV-VIS-011", question: "Votre entreprise communique-t-elle sur sa vision et ses engagements RSE ?", levels: ["Jamais.", "Occasionnellement.", "Oui régulièrement.", "Oui avec des résultats et des indicateurs."] },
    { id: "GOV-VIS-012", question: "Votre démarche stratégique RSE s'inscrit-elle dans une logique d'amélioration continue ?", levels: ["Non.", "Quelques améliorations.", "Une amélioration régulière est observée.", "La stratégie est pilotée, évaluée et continuellement améliorée."] },
  ],
};

const GOV_PIL: DiagnosticSubcategory = {
  id: "GOV-PIL",
  label: "Pilotage & Indicateurs",
  categoryId: "GOV",
  questions: [
    { id: "GOV-PIL-001", question: "Votre entreprise suit-elle des indicateurs RSE ?", levels: ["Aucun indicateur.", "Quelques indicateurs ponctuels.", "Un tableau de bord existe.", "Les indicateurs pilotent les décisions."] },
    { id: "GOV-PIL-002", question: "Les objectifs RSE sont-ils associés à des indicateurs mesurables ?", levels: ["Jamais.", "Partiellement.", "Oui.", "Ils sont revus régulièrement."] },
    { id: "GOV-PIL-003", question: "Les indicateurs sont-ils mis à jour selon une fréquence définie ?", levels: ["Jamais.", "Ponctuellement.", "Oui.", "Oui avec un calendrier formalisé."] },
    { id: "GOV-PIL-004", question: "Les résultats sont-ils analysés par la direction ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui lors de revues de pilotage régulières."] },
    { id: "GOV-PIL-005", question: "Des plans d'actions sont-ils créés lorsque les objectifs ne sont pas atteints ?", levels: ["Jamais.", "Parfois.", "Oui.", "Oui avec suivi de leur efficacité."] },
    { id: "GOV-PIL-006", question: "Les responsables des actions et indicateurs sont-ils clairement identifiés ?", levels: ["Non.", "Partiellement.", "Oui.", "Oui avec un suivi des responsabilités."] },
    { id: "GOV-PIL-007", question: "Les données utilisées sont-elles fiables et vérifiées ?", levels: ["Aucune vérification.", "Quelques contrôles.", "Oui.", "Oui avec une procédure documentée."] },
    { id: "GOV-PIL-008", question: "Les progrès réalisés sont-ils comparés aux exercices précédents ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui avec analyse des tendances."] },
    { id: "GOV-PIL-009", question: "Les résultats RSE sont-ils partagés avec les collaborateurs ?", levels: ["Jamais.", "Rarement.", "Oui.", "Oui de façon régulière et pédagogique."] },
    { id: "GOV-PIL-010", question: "Votre entreprise utilise-t-elle les indicateurs pour prioriser ses actions ?", levels: ["Jamais.", "Parfois.", "Oui.", "Oui dans une logique d'amélioration continue."] },
    { id: "GOV-PIL-011", question: "Le tableau de bord RSE est-il revu périodiquement afin de rester pertinent ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui avec ajout, suppression ou évolution des indicateurs."] },
    { id: "GOV-PIL-012", question: "Votre système de pilotage RSE s'inscrit-il dans une logique d'amélioration continue ?", levels: ["Non.", "Quelques améliorations.", "Une amélioration régulière est observée.", "Le pilotage est évalué, optimisé et continuellement amélioré."] },
  ],
};

const GOV_ETH: DiagnosticSubcategory = {
  id: "GOV-ETH",
  label: "Éthique & Conformité",
  categoryId: "GOV",
  questions: [
    { id: "GOV-ETH-001", question: "Votre entreprise dispose-t-elle d'un code de conduite ou d'une charte éthique ?", levels: ["Aucun document.", "Projet en cours.", "Une charte existe.", "Elle est connue, appliquée et régulièrement mise à jour."] },
    { id: "GOV-ETH-002", question: "Les collaborateurs sont-ils sensibilisés aux règles éthiques de l'entreprise ?", levels: ["Jamais.", "Ponctuellement.", "Régulièrement.", "Selon un programme structuré avec suivi."] },
    { id: "GOV-ETH-003", question: "Des mesures permettent-elles de prévenir les conflits d'intérêts ?", levels: ["Aucune.", "Quelques bonnes pratiques.", "Une procédure existe.", "Elle est appliquée et contrôlée."] },
    { id: "GOV-ETH-004", question: "Votre entreprise a-t-elle mis en place un dispositif d'alerte interne ?", levels: ["Aucun dispositif.", "Réflexion en cours.", "Un dispositif existe.", "Il est connu, utilisé et suivi."] },
    { id: "GOV-ETH-005", question: "Les règles de lutte contre la corruption sont-elles formalisées ?", levels: ["Non.", "Partiellement.", "Oui.", "Oui avec contrôles et sensibilisation."] },
    { id: "GOV-ETH-006", question: "Les obligations réglementaires applicables sont-elles identifiées ?", levels: ["Non.", "Partiellement.", "Oui.", "Oui avec une veille réglementaire organisée."] },
    { id: "GOV-ETH-007", question: "Le respect du RGPD et de la protection des données est-il assuré ?", levels: ["Aucune démarche.", "Quelques actions.", "Une démarche conforme existe.", "Elle est auditée et améliorée régulièrement."] },
    { id: "GOV-ETH-008", question: "Les non-conformités ou incidents sont-ils enregistrés et traités ?", levels: ["Jamais.", "Au cas par cas.", "Oui.", "Oui avec analyse des causes et actions correctives."] },
    { id: "GOV-ETH-009", question: "Les fournisseurs sont-ils sensibilisés à vos exigences éthiques ?", levels: ["Jamais.", "Ponctuellement.", "Oui pour les principaux.", "Oui dans le cadre d'une politique globale."] },
    { id: "GOV-ETH-010", question: "La direction suit-elle les sujets d'éthique et de conformité ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui avec des revues régulières."] },
    { id: "GOV-ETH-011", question: "Des indicateurs permettent-ils de suivre les sujets d'éthique et de conformité ?", levels: ["Aucun.", "Quelques données.", "Des indicateurs existent.", "Ils servent au pilotage des actions."] },
    { id: "GOV-ETH-012", question: "Votre démarche d'éthique et de conformité s'inscrit-elle dans une logique d'amélioration continue ?", levels: ["Non.", "Quelques améliorations.", "Une amélioration régulière est observée.", "La démarche est pilotée, évaluée et continuellement améliorée."] },
  ],
};

const GOV_RIS: DiagnosticSubcategory = {
  id: "GOV-RIS",
  label: "Gestion des risques",
  categoryId: "GOV",
  questions: [
    { id: "GOV-RIS-001", question: "Votre entreprise a-t-elle identifié les principaux risques susceptibles d'impacter son activité ?", levels: ["Aucune identification.", "Quelques risques sont connus.", "Les principaux risques sont identifiés.", "Les risques sont cartographiés et revus régulièrement."] },
    { id: "GOV-RIS-002", question: "Les risques environnementaux, sociaux et de gouvernance (ESG) sont-ils pris en compte ?", levels: ["Jamais.", "Partiellement.", "Oui.", "Ils sont intégrés dans la stratégie de gestion des risques."] },
    { id: "GOV-RIS-003", question: "Les risques sont-ils évalués selon leur probabilité et leur impact ?", levels: ["Jamais.", "De manière informelle.", "Oui selon une méthode définie.", "L'évaluation est revue régulièrement."] },
    { id: "GOV-RIS-004", question: "Des plans d'actions sont-ils définis pour réduire les principaux risques ?", levels: ["Aucun plan.", "Quelques actions ponctuelles.", "Des plans existent.", "Ils sont suivis jusqu'à leur clôture."] },
    { id: "GOV-RIS-005", question: "Les responsables de chaque risque sont-ils clairement identifiés ?", levels: ["Non.", "Partiellement.", "Oui.", "Oui avec un suivi des responsabilités."] },
    { id: "GOV-RIS-006", question: "Les risques sont-ils revus à intervalles réguliers ?", levels: ["Jamais.", "Occasionnellement.", "Oui chaque année.", "Oui à chaque évolution importante ou revue périodique."] },
    { id: "GOV-RIS-007", question: "Votre entreprise dispose-t-elle d'un plan de continuité ou de reprise d'activité lorsque cela est pertinent ?", levels: ["Aucun plan.", "Réflexion en cours.", "Un plan existe.", "Le plan est testé et mis à jour régulièrement."] },
    { id: "GOV-RIS-008", question: "Les incidents significatifs font-ils l'objet d'une analyse afin d'éviter leur réapparition ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui avec analyse des causes et suivi des actions."] },
    { id: "GOV-RIS-009", question: "Les risques liés aux fournisseurs et partenaires sont-ils évalués ?", levels: ["Jamais.", "Pour certains partenaires.", "Oui pour les principaux.", "Ils sont intégrés au processus de sélection et de suivi."] },
    { id: "GOV-RIS-010", question: "Les collaborateurs sont-ils sensibilisés aux principaux risques liés à leur activité ?", levels: ["Jamais.", "Ponctuellement.", "Régulièrement.", "Dans le cadre d'un programme structuré."] },
    { id: "GOV-RIS-011", question: "La direction suit-elle régulièrement les principaux risques de l'entreprise ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui avec des revues formalisées."] },
    { id: "GOV-RIS-012", question: "Votre démarche de gestion des risques s'inscrit-elle dans une logique d'amélioration continue ?", levels: ["Non.", "Quelques améliorations.", "Une amélioration régulière est observée.", "La démarche est pilotée, évaluée et continuellement améliorée."] },
  ],
};

const GOV_PP: DiagnosticSubcategory = {
  id: "GOV-PP",
  label: "Parties prenantes",
  categoryId: "GOV",
  questions: [
    { id: "GOV-PP-001", question: "Votre entreprise a-t-elle identifié ses principales parties prenantes ?", levels: ["Aucune identification.", "Quelques parties prenantes sont connues.", "Les principales parties prenantes sont identifiées.", "Une cartographie complète est tenue à jour."] },
    { id: "GOV-PP-002", question: "Les attentes de vos parties prenantes sont-elles recueillies ?", levels: ["Jamais.", "Occasionnellement.", "Oui pour les principales parties prenantes.", "Oui selon un processus structuré et récurrent."] },
    { id: "GOV-PP-003", question: "Les parties prenantes sont-elles consultées avant certaines décisions importantes ?", levels: ["Jamais.", "Ponctuellement.", "Oui lorsque cela est pertinent.", "La consultation fait partie du processus décisionnel."] },
    { id: "GOV-PP-004", question: "Votre entreprise entretient-elle un dialogue régulier avec ses parties prenantes ?", levels: ["Jamais.", "De manière ponctuelle.", "Oui régulièrement.", "Oui avec des objectifs et un suivi."] },
    { id: "GOV-PP-005", question: "Les retours des parties prenantes sont-ils analysés ?", levels: ["Jamais.", "Parfois.", "Oui.", "Oui avec des plans d'actions associés."] },
    { id: "GOV-PP-006", question: "Les actions mises en œuvre à la suite des échanges sont-elles communiquées ?", levels: ["Jamais.", "Rarement.", "Oui.", "Oui de manière transparente et régulière."] },
    { id: "GOV-PP-007", question: "Votre entreprise évalue-t-elle le niveau de satisfaction de ses principales parties prenantes ?", levels: ["Jamais.", "Ponctuellement.", "Oui régulièrement.", "Les résultats sont analysés et comparés dans le temps."] },
    { id: "GOV-PP-008", question: "Les relations avec les parties prenantes sont-elles suivies à l'aide d'indicateurs ?", levels: ["Aucun indicateur.", "Quelques données.", "Des indicateurs sont suivis.", "Ils pilotent les décisions et les priorités."] },
    { id: "GOV-PP-009", question: "Les conflits ou réclamations des parties prenantes sont-ils traités de manière structurée ?", levels: ["Jamais.", "Au cas par cas.", "Oui.", "Oui avec une procédure formalisée et un suivi."] },
    { id: "GOV-PP-010", question: "Les parties prenantes sont-elles intégrées dans la définition de votre stratégie RSE ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui de façon systématique."] },
    { id: "GOV-PP-011", question: "La direction est-elle impliquée dans le dialogue avec les principales parties prenantes ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui avec des revues régulières."] },
    { id: "GOV-PP-012", question: "Votre démarche de gestion des parties prenantes s'inscrit-elle dans une logique d'amélioration continue ?", levels: ["Non.", "Quelques améliorations.", "Une amélioration régulière est observée.", "La démarche est pilotée, évaluée et continuellement améliorée."] },
  ],
};

const GOV_REP: DiagnosticSubcategory = {
  id: "GOV-REP",
  label: "Transparence & Reporting",
  categoryId: "GOV",
  questions: [
    { id: "GOV-REP-001", question: "Votre entreprise communique-t-elle sur ses engagements RSE ?", levels: ["Jamais.", "Occasionnellement.", "Oui régulièrement.", "La communication est planifiée et structurée."] },
    { id: "GOV-REP-002", question: "Les résultats de votre démarche RSE sont-ils partagés avec les parties prenantes ?", levels: ["Jamais.", "Ponctuellement.", "Oui pour les principaux résultats.", "Oui de manière transparente et régulière."] },
    { id: "GOV-REP-003", question: "Votre entreprise publie-t-elle un rapport ou un bilan RSE ?", levels: ["Jamais.", "Un projet est en cours.", "Oui.", "Oui avec une mise à jour régulière."] },
    { id: "GOV-REP-004", question: "Les informations publiées sont-elles fiables et vérifiées ?", levels: ["Aucune vérification.", "Quelques contrôles.", "Oui.", "Oui avec une procédure de validation."] },
    { id: "GOV-REP-005", question: "Les indicateurs communiqués sont-ils compréhensibles pour les parties prenantes ?", levels: ["Non.", "Partiellement.", "Oui.", "Ils sont accompagnés d'explications pédagogiques."] },
    { id: "GOV-REP-006", question: "Les objectifs RSE et leur niveau d'avancement sont-ils communiqués ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui avec un suivi annuel des progrès."] },
    { id: "GOV-REP-007", question: "Les difficultés ou axes d'amélioration sont-ils également présentés ?", levels: ["Jamais.", "Rarement.", "Oui.", "Oui dans une logique de transparence."] },
    { id: "GOV-REP-008", question: "Les supports de communication RSE sont-ils adaptés à vos différentes parties prenantes ?", levels: ["Non.", "Partiellement.", "Oui.", "Ils sont personnalisés selon les publics concernés."] },
    { id: "GOV-REP-009", question: "Les collaborateurs sont-ils informés des résultats de la démarche RSE ?", levels: ["Jamais.", "Ponctuellement.", "Oui régulièrement.", "Oui avec des échanges favorisant leur implication."] },
    { id: "GOV-REP-010", question: "Votre entreprise mesure-t-elle l'impact de sa communication RSE ?", levels: ["Jamais.", "Quelques observations.", "Oui.", "Oui avec des indicateurs et des ajustements."] },
    { id: "GOV-REP-011", question: "La direction valide-t-elle les principales communications RSE ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui dans le cadre d'un processus formalisé."] },
    { id: "GOV-REP-012", question: "Votre démarche de transparence et de reporting s'inscrit-elle dans une logique d'amélioration continue ?", levels: ["Non.", "Quelques améliorations.", "Une amélioration régulière est observée.", "La démarche est pilotée, évaluée et continuellement améliorée."] },
  ],
};

const GOV_AMI: DiagnosticSubcategory = {
  id: "GOV-AMI",
  label: "Innovation & Amélioration continue",
  categoryId: "GOV",
  questions: [
    { id: "GOV-AMI-001", question: "Votre entreprise encourage-t-elle les propositions d'amélioration de ses collaborateurs ?", levels: ["Jamais.", "Occasionnellement.", "Oui régulièrement.", "Les idées sont suivies et valorisées."] },
    { id: "GOV-AMI-002", question: "Les plans d'actions RSE sont-ils revus régulièrement ?", levels: ["Jamais.", "Ponctuellement.", "Oui chaque année.", "Oui avec ajustements continus."] },
    { id: "GOV-AMI-003", question: "Les retours d'expérience permettent-ils d'améliorer les pratiques ?", levels: ["Jamais.", "Parfois.", "Oui.", "Ils alimentent systématiquement les décisions."] },
    { id: "GOV-AMI-004", question: "Votre entreprise réalise-t-elle une revue annuelle de sa démarche RSE ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui avec compte rendu et décisions."] },
    { id: "GOV-AMI-005", question: "Les objectifs RSE sont-ils adaptés en fonction des résultats obtenus ?", levels: ["Jamais.", "Parfois.", "Oui.", "Oui grâce à une démarche d'amélioration continue."] },
    { id: "GOV-AMI-006", question: "Votre entreprise met-elle en place des innovations pour réduire ses impacts environnementaux ou sociaux ?", levels: ["Jamais.", "Quelques initiatives.", "Oui régulièrement.", "L'innovation est intégrée à la stratégie."] },
    { id: "GOV-AMI-007", question: "Les bonnes pratiques sont-elles partagées entre les équipes ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui grâce à des processus de capitalisation."] },
    { id: "GOV-AMI-008", question: "Les évolutions réglementaires ou normatives sont-elles intégrées dans votre démarche RSE ?", levels: ["Jamais.", "Avec retard.", "Oui.", "Oui de façon anticipée."] },
    { id: "GOV-AMI-009", question: "Votre entreprise compare-t-elle ses performances à des références externes (labels, référentiels, benchmarks) ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui pour orienter sa stratégie."] },
    { id: "GOV-AMI-010", question: "Les réussites et les échecs des actions RSE sont-ils analysés afin d'en tirer des enseignements ?", levels: ["Jamais.", "Parfois.", "Oui.", "Oui avec formalisation des retours d'expérience."] },
    { id: "GOV-AMI-011", question: "Les collaborateurs sont-ils impliqués dans l'amélioration continue de la démarche RSE ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Ils participent activement aux décisions et aux actions."] },
    { id: "GOV-AMI-012", question: "Votre démarche d'innovation et d'amélioration continue est-elle pilotée dans le temps ?", levels: ["Non.", "Quelques améliorations.", "Une amélioration régulière est observée.", "La démarche est mesurée, pilotée et continuellement améliorée."] },
  ],
};

const GOV_CHA: DiagnosticSubcategory = {
  id: "GOV-CHA",
  label: "Gouvernance de la chaîne de valeur",
  categoryId: "GOV",
  questions: [
    { id: "GOV-CHA-001", question: "Votre entreprise a-t-elle identifié les principaux acteurs de sa chaîne de valeur ?", levels: ["Aucune identification.", "Identification partielle.", "Les principaux acteurs sont identifiés.", "La chaîne de valeur est cartographiée et tenue à jour."] },
    { id: "GOV-CHA-002", question: "Les risques liés à votre chaîne de valeur sont-ils évalués ?", levels: ["Jamais.", "Ponctuellement.", "Oui pour les principaux partenaires.", "Ils sont suivis et réévalués régulièrement."] },
    { id: "GOV-CHA-003", question: "Des critères RSE sont-ils pris en compte dans le choix de vos fournisseurs et partenaires ?", levels: ["Jamais.", "Occasionnellement.", "Oui pour les principaux achats.", "Oui de manière systématique."] },
    { id: "GOV-CHA-004", question: "Vos fournisseurs sont-ils informés de vos engagements RSE ?", levels: ["Jamais.", "Ponctuellement.", "Oui régulièrement.", "Ces exigences sont intégrées aux relations contractuelles."] },
    { id: "GOV-CHA-005", question: "Les performances RSE de vos fournisseurs sont-elles évaluées ?", levels: ["Jamais.", "Pour certains fournisseurs.", "Oui régulièrement.", "Les résultats influencent les décisions d'achat."] },
    { id: "GOV-CHA-006", question: "Travaillez-vous avec vos partenaires pour améliorer leurs pratiques RSE ?", levels: ["Jamais.", "Occasionnellement.", "Oui sur certains sujets.", "Oui dans une logique de progrès partagé."] },
    { id: "GOV-CHA-007", question: "Les risques de rupture d'approvisionnement sont-ils anticipés ?", levels: ["Jamais.", "Quelques réflexions.", "Oui.", "Oui avec un plan de prévention."] },
    { id: "GOV-CHA-008", question: "Les achats locaux sont-ils privilégiés lorsque cela est pertinent ?", levels: ["Jamais.", "Parfois.", "Oui régulièrement.", "Ils font partie intégrante de votre stratégie d'achats."] },
    { id: "GOV-CHA-009", question: "Les impacts environnementaux et sociaux de votre chaîne de valeur sont-ils pris en compte ?", levels: ["Jamais.", "Partiellement.", "Oui.", "Ils sont intégrés au pilotage de l'entreprise."] },
    { id: "GOV-CHA-010", question: "Votre entreprise partage-t-elle ses attentes RSE avec ses sous-traitants et partenaires ?", levels: ["Jamais.", "Ponctuellement.", "Oui.", "Oui avec un suivi des engagements."] },
    { id: "GOV-CHA-011", question: "La direction suit-elle les enjeux liés à la chaîne de valeur ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui lors de revues régulières."] },
    { id: "GOV-CHA-012", question: "Votre gouvernance de la chaîne de valeur s'inscrit-elle dans une logique d'amélioration continue ?", levels: ["Non.", "Quelques améliorations.", "Une amélioration régulière est observée.", "La démarche est pilotée, évaluée et continuellement améliorée."] },
  ],
};

const GOV_RES: DiagnosticSubcategory = {
  id: "GOV-RES",
  label: "Résilience, Innovation durable & Création de valeur",
  categoryId: "GOV",
  questions: [
    { id: "GOV-RES-001", question: "Votre entreprise anticipe-t-elle les grandes évolutions susceptibles d'impacter son activité ?", levels: ["Jamais.", "Quelques réflexions existent.", "Les principales évolutions sont identifiées.", "Une veille stratégique est organisée et exploitée."] },
    { id: "GOV-RES-002", question: "Les enjeux de durabilité sont-ils pris en compte lors du développement de nouveaux produits ou services ?", levels: ["Jamais.", "Occasionnellement.", "Oui pour la majorité des projets.", "Ils sont intégrés dès la conception."] },
    { id: "GOV-RES-003", question: "Votre entreprise évalue-t-elle régulièrement les opportunités liées à la transition écologique et sociale ?", levels: ["Jamais.", "Ponctuellement.", "Oui.", "Oui avec un suivi annuel."] },
    { id: "GOV-RES-004", question: "L'innovation est-elle encouragée auprès des collaborateurs ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Un dispositif structuré permet de proposer et suivre les idées."] },
    { id: "GOV-RES-005", question: "Les investissements tiennent-ils compte des enjeux ESG ?", levels: ["Jamais.", "Parfois.", "Oui pour les principaux investissements.", "Oui selon une méthode d'analyse définie."] },
    { id: "GOV-RES-006", question: "Votre entreprise mesure-t-elle les bénéfices économiques, sociaux et environnementaux de ses projets ?", levels: ["Jamais.", "Partiellement.", "Oui.", "Oui avec des indicateurs de suivi."] },
    { id: "GOV-RES-007", question: "Les retours d'expérience servent-ils à améliorer les futurs projets ?", levels: ["Jamais.", "Parfois.", "Oui.", "Ils sont systématiquement capitalisés."] },
    { id: "GOV-RES-008", question: "Votre entreprise développe-t-elle de nouveaux produits, services ou processus plus responsables ?", levels: ["Jamais.", "Quelques initiatives.", "Oui régulièrement.", "L'innovation responsable est un axe stratégique."] },
    { id: "GOV-RES-009", question: "Les parties prenantes sont-elles associées aux projets d'innovation ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui de manière structurée."] },
    { id: "GOV-RES-010", question: "Votre entreprise évalue-t-elle sa capacité à faire face aux crises et aux changements ?", levels: ["Jamais.", "Ponctuellement.", "Oui.", "Oui avec des exercices et plans d'adaptation."] },
    { id: "GOV-RES-011", question: "La direction pilote-t-elle les projets d'innovation durable ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui avec des objectifs et un suivi régulier."] },
    { id: "GOV-RES-012", question: "Votre entreprise améliore-t-elle continuellement sa capacité d'innovation et de résilience ?", levels: ["Non.", "Quelques améliorations.", "Une amélioration régulière est observée.", "La démarche est intégrée à la stratégie et évaluée chaque année."] },
  ],
};

const GOV_PER: DiagnosticSubcategory = {
  id: "GOV-PER",
  label: "Performance durable & Création de valeur",
  categoryId: "GOV",
  questions: [
    { id: "GOV-PER-001", question: "Votre entreprise évalue-t-elle la valeur créée par sa démarche RSE ?", levels: ["Jamais.", "Ponctuellement.", "Oui avec quelques indicateurs.", "Oui avec une méthode de suivi structurée."] },
    { id: "GOV-PER-002", question: "Les bénéfices économiques de votre démarche RSE sont-ils mesurés ?", levels: ["Jamais.", "Partiellement.", "Oui.", "Oui avec un suivi régulier."] },
    { id: "GOV-PER-003", question: "Les bénéfices sociaux de votre démarche RSE sont-ils évalués ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui à l'aide d'indicateurs suivis dans le temps."] },
    { id: "GOV-PER-004", question: "Les bénéfices environnementaux de votre démarche sont-ils quantifiés lorsque cela est possible ?", levels: ["Jamais.", "Partiellement.", "Oui.", "Oui avec des objectifs de progression."] },
    { id: "GOV-PER-005", question: "Les résultats de la démarche RSE influencent-ils les décisions d'investissement ?", levels: ["Jamais.", "Parfois.", "Oui.", "Ils constituent un critère de décision majeur."] },
    { id: "GOV-PER-006", question: "Votre entreprise identifie-t-elle de nouvelles opportunités grâce à sa démarche RSE ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Cette analyse est réalisée régulièrement."] },
    { id: "GOV-PER-007", question: "La satisfaction des principales parties prenantes est-elle utilisée pour améliorer la performance ?", levels: ["Jamais.", "Parfois.", "Oui.", "Oui avec des plans d'amélioration."] },
    { id: "GOV-PER-008", question: "Votre entreprise suit-elle l'évolution de sa maturité RSE d'une année sur l'autre ?", levels: ["Jamais.", "Ponctuellement.", "Oui.", "Oui avec comparaison annuelle et objectifs."] },
    { id: "GOV-PER-009", question: "Les réussites RSE sont-elles valorisées en interne ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui avec partage des bonnes pratiques."] },
    { id: "GOV-PER-010", question: "Les réussites RSE sont-elles valorisées auprès des clients et partenaires ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui de manière transparente et mesurée."] },
    { id: "GOV-PER-011", question: "La direction suit-elle régulièrement la performance globale de la démarche RSE ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui lors de revues de performance périodiques."] },
    { id: "GOV-PER-012", question: "Votre démarche de création de valeur durable s'inscrit-elle dans une logique d'amélioration continue ?", levels: ["Non.", "Quelques améliorations.", "Une amélioration régulière est observée.", "La performance est pilotée et optimisée en continu."] },
  ],
};

const GOV_CUL: DiagnosticSubcategory = {
  id: "GOV-CUL",
  label: "Culture RSE & Engagement des collaborateurs",
  categoryId: "GOV",
  questions: [
    { id: "GOV-CUL-001", question: "Les collaborateurs connaissent-ils les engagements RSE de l'entreprise ?", levels: ["Pas du tout.", "Partiellement.", "Oui pour la majorité.", "Ils les connaissent et savent comment y contribuer."] },
    { id: "GOV-CUL-002", question: "La RSE est-elle présentée aux nouveaux collaborateurs dès leur arrivée ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui dans le parcours d'intégration."] },
    { id: "GOV-CUL-003", question: "Les collaborateurs sont-ils régulièrement sensibilisés aux enjeux RSE ?", levels: ["Jamais.", "Ponctuellement.", "Oui régulièrement.", "Selon un programme annuel structuré."] },
    { id: "GOV-CUL-004", question: "Les équipes sont-elles encouragées à proposer des idées d'amélioration ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Les idées sont suivies et valorisées."] },
    { id: "GOV-CUL-005", question: "Les managers intègrent-ils la RSE dans leur management quotidien ?", levels: ["Jamais.", "Partiellement.", "Oui.", "Oui avec des objectifs et un suivi."] },
    { id: "GOV-CUL-006", question: "Les réussites RSE sont-elles partagées avec l'ensemble des collaborateurs ?", levels: ["Jamais.", "Rarement.", "Oui.", "Oui de manière régulière et pédagogique."] },
    { id: "GOV-CUL-007", question: "Les collaborateurs participent-ils à des actions ou projets RSE ?", levels: ["Jamais.", "Quelques collaborateurs.", "Oui régulièrement.", "La participation est encouragée et suivie."] },
    { id: "GOV-CUL-008", question: "La démarche RSE favorise-t-elle la coopération entre les différents services ?", levels: ["Jamais.", "Parfois.", "Oui.", "Elle fait partie des méthodes de travail."] },
    { id: "GOV-CUL-009", question: "Les objectifs RSE sont-ils compris par les collaborateurs ?", levels: ["Pas du tout.", "Partiellement.", "Oui.", "Oui avec un suivi de leur appropriation."] },
    { id: "GOV-CUL-010", question: "L'entreprise valorise-t-elle les initiatives individuelles ou collectives en matière de RSE ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui via une reconnaissance formalisée."] },
    { id: "GOV-CUL-011", question: "La direction montre-t-elle l'exemple dans la mise en œuvre de la démarche RSE ?", levels: ["Jamais.", "Parfois.", "Oui.", "Oui de manière visible et constante."] },
    { id: "GOV-CUL-012", question: "La culture RSE de l'entreprise progresse-t-elle dans une logique d'amélioration continue ?", levels: ["Non.", "Quelques progrès.", "Une progression régulière est observée.", "La culture RSE est mesurée, pilotée et renforcée chaque année."] },
  ],
};

const GOV_FIN: DiagnosticSubcategory = {
  id: "GOV-FIN",
  label: "Achats, Finance & Investissements responsables",
  categoryId: "GOV",
  questions: [
    { id: "GOV-FIN-001", question: "Les décisions d'investissement prennent-elles en compte des critères ESG ?", levels: ["Jamais.", "Occasionnellement.", "Oui pour les principaux investissements.", "Oui selon une méthodologie définie."] },
    { id: "GOV-FIN-002", question: "Le budget consacré à la RSE est-il identifié ?", levels: ["Aucun budget.", "Budget ponctuel.", "Budget annuel identifié.", "Budget piloté selon des objectifs."] },
    { id: "GOV-FIN-003", question: "Les projets RSE sont-ils priorisés selon leur impact ?", levels: ["Jamais.", "Au cas par cas.", "Oui.", "Oui à l'aide de critères objectifs."] },
    { id: "GOV-FIN-004", question: "Le coût global (cycle de vie) est-il pris en compte dans les décisions d'achat ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui de manière systématique."] },
    { id: "GOV-FIN-005", question: "Les économies générées par les actions RSE sont-elles mesurées ?", levels: ["Jamais.", "Partiellement.", "Oui.", "Oui avec des indicateurs financiers."] },
    { id: "GOV-FIN-006", question: "Les risques financiers liés aux enjeux climatiques ou ESG sont-ils analysés ?", levels: ["Jamais.", "Quelques réflexions.", "Oui.", "Oui avec une revue régulière."] },
    { id: "GOV-FIN-007", question: "Les investissements favorisant la transition écologique sont-ils encouragés ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Ils sont intégrés à la stratégie d'investissement."] },
    { id: "GOV-FIN-008", question: "Les fournisseurs stratégiques font-ils l'objet d'une évaluation financière et RSE ?", levels: ["Jamais.", "Partiellement.", "Oui.", "Oui avec un suivi périodique."] },
    { id: "GOV-FIN-009", question: "Les décisions d'investissement sont-elles documentées et justifiées ?", levels: ["Rarement.", "Parfois.", "Oui.", "Oui avec une traçabilité complète."] },
    { id: "GOV-FIN-010", question: "La direction suit-elle le retour sur investissement des actions RSE ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui lors de revues régulières."] },
    { id: "GOV-FIN-011", question: "Les ressources financières sont-elles adaptées aux ambitions RSE de l'entreprise ?", levels: ["Non.", "Partiellement.", "Oui.", "Elles sont revues chaque année selon les objectifs."] },
    { id: "GOV-FIN-012", question: "Votre gouvernance financière responsable s'inscrit-elle dans une logique d'amélioration continue ?", levels: ["Non.", "Quelques améliorations.", "Une amélioration régulière est observée.", "La démarche est pilotée et optimisée en continu."] },
  ],
};

const GOV_DAT: DiagnosticSubcategory = {
  id: "GOV-DAT",
  label: "Données, IA & Cybersécurité responsable",
  categoryId: "GOV",
  questions: [
    { id: "GOV-DAT-001", question: "Votre entreprise a-t-elle identifié ses données sensibles ?", levels: ["Non.", "Partiellement.", "Oui.", "Une cartographie est tenue à jour."] },
    { id: "GOV-DAT-002", question: "Les accès aux données sont-ils limités selon les besoins ?", levels: ["Aucune gestion.", "Gestion partielle.", "Oui.", "Ils sont régulièrement revus."] },
    { id: "GOV-DAT-003", question: "Des sauvegardes régulières sont-elles réalisées et testées ?", levels: ["Jamais.", "Sauvegardes sans test.", "Oui.", "Oui avec tests de restauration."] },
    { id: "GOV-DAT-004", question: "Les collaborateurs sont-ils sensibilisés aux risques de cybersécurité ?", levels: ["Jamais.", "Ponctuellement.", "Régulièrement.", "Selon un programme annuel."] },
    { id: "GOV-DAT-005", question: "Votre entreprise dispose-t-elle d'une procédure en cas de cyberattaque ?", levels: ["Aucune.", "En réflexion.", "Une procédure existe.", "Elle est testée et mise à jour."] },
    { id: "GOV-DAT-006", question: "L'utilisation de l'intelligence artificielle est-elle encadrée ?", levels: ["Pas du tout.", "Quelques règles.", "Une charte existe.", "Elle est suivie et actualisée."] },
    { id: "GOV-DAT-007", question: "Les outils numériques utilisés sont-ils évalués avant leur déploiement ?", levels: ["Jamais.", "Parfois.", "Oui.", "Oui selon des critères définis."] },
    { id: "GOV-DAT-008", question: "Les risques liés à l'IA (biais, confidentialité, propriété intellectuelle) sont-ils pris en compte ?", levels: ["Jamais.", "Partiellement.", "Oui.", "Oui avec un suivi régulier."] },
    { id: "GOV-DAT-009", question: "Les incidents de sécurité sont-ils enregistrés et analysés ?", levels: ["Jamais.", "Au cas par cas.", "Oui.", "Oui avec actions correctives."] },
    { id: "GOV-DAT-010", question: "Les fournisseurs numériques sont-ils évalués sur leurs pratiques de sécurité ?", levels: ["Jamais.", "Parfois.", "Oui.", "Oui de manière systématique."] },
    { id: "GOV-DAT-011", question: "La direction suit-elle les enjeux liés aux données et à la cybersécurité ?", levels: ["Jamais.", "Occasionnellement.", "Oui.", "Oui avec des revues régulières."] },
    { id: "GOV-DAT-012", question: "Votre gouvernance des données, de l'IA et de la cybersécurité s'inscrit-elle dans une logique d'amélioration continue ?", levels: ["Non.", "Quelques améliorations.", "Une amélioration régulière est observée.", "La démarche est pilotée et continuellement améliorée."] },
  ],
};

export const DIAGNOSTIC_CATEGORIES: DiagnosticCategory[] = [
  {
    id: "ENV",
    label: "Environnement",
    subcategories: [ENV_CLI, ENV_ENE, ENV_EAU, ENV_DEC, ENV_BIO, ENV_MOB, ENV_ACH],
  },
  {
    id: "SOC",
    label: "Social",
    subcategories: [SOC_CH, SOC_REC, SOC_FOR, SOC_SST, SOC_QVCT, SOC_DIV, SOC_DIA, SOC_DEV, SOC_ENG],
  },
  {
    id: "GOV",
    label: "Gouvernance",
    subcategories: [GOV_VIS, GOV_PIL, GOV_ETH, GOV_RIS, GOV_PP, GOV_REP, GOV_AMI, GOV_CHA, GOV_RES, GOV_PER, GOV_CUL, GOV_FIN, GOV_DAT],
  },
];

export const ALL_SUBCATEGORIES: DiagnosticSubcategory[] = DIAGNOSTIC_CATEGORIES.flatMap(
  (c) => c.subcategories,
);

export const ALL_QUESTIONS: DiagnosticQuestion[] = ALL_SUBCATEGORIES.flatMap(
  (s) => s.questions,
);

export function getSubcategoryById(id: string): DiagnosticSubcategory | undefined {
  return ALL_SUBCATEGORIES.find((s) => s.id === id);
}

export function getCategoryById(id: string): DiagnosticCategory | undefined {
  return DIAGNOSTIC_CATEGORIES.find((c) => c.id === id);
}

export function getQuestionById(id: string): DiagnosticQuestion | undefined {
  return ALL_QUESTIONS.find((q) => q.id === id);
}

export const MATURITY_THRESHOLDS = {
  excellent: 80,
  confirmed: 60,
  intermediate: 40,
} as const;

export type MaturityLabel = "Excellent" | "Confirmé" | "Intermédiaire" | "Débutant" | "Non évalué";

export function getMaturityLabel(scorePercent: number | null): MaturityLabel {
  if (scorePercent === null) return "Non évalué";
  if (scorePercent >= MATURITY_THRESHOLDS.excellent) return "Excellent";
  if (scorePercent >= MATURITY_THRESHOLDS.confirmed) return "Confirmé";
  if (scorePercent >= MATURITY_THRESHOLDS.intermediate) return "Intermédiaire";
  return "Débutant";
}

export function getMaturityColor(label: MaturityLabel): string {
  switch (label) {
    case "Excellent": return "#16a34a";
    case "Confirmé": return "#ca8a04";
    case "Intermédiaire": return "#ea580c";
    case "Débutant": return "#dc2626";
    case "Non évalué": return "#94a3b8";
  }
}

export const COMPLETENESS_THRESHOLD = 0.7;
