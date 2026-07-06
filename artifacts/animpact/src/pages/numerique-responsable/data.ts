// ── NR Questionnaire — full referential ────────────────────────────────────

export interface Criterion {
  id: string;
  label: string;
  isSpecial?: boolean; // "Rien n'est fait" or "Non applicable" — not counted in score
}

export interface Section {
  id: string;
  title: string;
  criteria: Criterion[];
}

export interface Pillar {
  id: string;
  title: string;
  shortTitle: string;
  color: string;
  sections: Section[];
}

function c(id: string, label: string, isSpecial = false): Criterion {
  return { id, label, ...(isSpecial ? { isSpecial: true } : {}) };
}

export const PILLARS: Pillar[] = [
  {
    id: "p1",
    title: "Intégrer le Numérique Responsable dans la stratégie",
    shortTitle: "Stratégie",
    color: "#10b981",
    sections: [
      {
        id: "p1-s1",
        title: "Formaliser l'engagement de la direction",
        criteria: [
          c("p1-s1-0", "La direction soutient officiellement la démarche Numérique Responsable."),
          c("p1-s1-1", "Le Numérique Responsable est intégré à la vision ou à la stratégie de l'entreprise."),
          c("p1-s1-2", "Un pilote ou un référent est désigné."),
          c("p1-s1-3", "Les rôles et responsabilités sont définis."),
          c("p1-s1-4", "Les collaborateurs sont informés de cet engagement."),
          c("p1-s1-5", "Des moyens humains et/ou financiers sont prévus."),
        ],
      },
      {
        id: "p1-s2",
        title: "Définir la stratégie NR et les moyens associés",
        criteria: [
          c("p1-s2-0", "Les principaux enjeux Numérique Responsable ont été identifiés."),
          c("p1-s2-1", "Des objectifs mesurables ont été définis."),
          c("p1-s2-2", "Un plan d'action est établi."),
          c("p1-s2-3", "Des indicateurs de suivi sont définis."),
          c("p1-s2-4", "Un calendrier de mise en œuvre est prévu."),
          c("p1-s2-5", "Une revue régulière de la stratégie est réalisée."),
        ],
      },
    ],
  },
  {
    id: "p2",
    title: "Formaliser sa politique Numérique Responsable",
    shortTitle: "Politique NR",
    color: "#3b82f6",
    sections: [
      {
        id: "p2-s1",
        title: "Identifier les principaux enjeux sociaux et environnementaux du numérique",
        criteria: [
          c("p2-s1-0",  "Rien n'est fait à ce jour.", true),
          // Environnementaux
          c("p2-s1-1",  "Consommation énergétique des équipements numériques."),
          c("p2-s1-2",  "Consommation énergétique des infrastructures (serveurs, réseaux, cloud...)."),
          c("p2-s1-3",  "Émissions de gaz à effet de serre liées au numérique."),
          c("p2-s1-4",  "Durée de vie des équipements."),
          c("p2-s1-5",  "Réparation des équipements."),
          c("p2-s1-6",  "Réemploi ou reconditionnement."),
          c("p2-s1-7",  "Gestion des DEEE."),
          c("p2-s1-8",  "Consommation de papier."),
          c("p2-s1-9",  "Consommation de consommables."),
          c("p2-s1-10", "Volume de données stockées."),
          c("p2-s1-11", "Impact environnemental des logiciels."),
          c("p2-s1-12", "Impact environnemental des services cloud."),
          c("p2-s1-13", "Achats responsables."),
          // Sociaux
          c("p2-s1-14", "Sensibilisation des collaborateurs."),
          c("p2-s1-15", "Formation au Numérique Responsable."),
          c("p2-s1-16", "Accessibilité numérique."),
          c("p2-s1-17", "Inclusion numérique."),
          c("p2-s1-18", "Protection des données personnelles."),
          c("p2-s1-19", "Cybersécurité."),
          c("p2-s1-20", "Éthique du numérique."),
          c("p2-s1-21", "Santé et qualité de vie au travail liées aux usages numériques."),
          c("p2-s1-22", "Relations avec les fournisseurs."),
          c("p2-s1-23", "Sensibilisation des clients."),
        ],
      },
      {
        id: "p2-s2",
        title: "Définir des indicateurs de NR pour le pilotage de la politique NR",
        criteria: [
          c("p2-s2-0",  "Rien n'est fait à ce jour.", true),
          c("p2-s2-1",  "Un tableau de bord est en place."),
          c("p2-s2-2",  "Les indicateurs sont mesurés régulièrement."),
          c("p2-s2-3",  "Les résultats sont analysés."),
          c("p2-s2-4",  "Les résultats sont présentés à la direction."),
          c("p2-s2-5",  "Les indicateurs servent à piloter les actions."),
          // Gouvernance
          c("p2-s2-6",  "Indicateur suivi : nombre d'actions du plan NR."),
          c("p2-s2-7",  "Indicateur suivi : taux d'avancement du plan d'action."),
          c("p2-s2-8",  "Indicateur suivi : nombre de réunions de pilotage."),
          c("p2-s2-9",  "Indicateur suivi : budget consacré au NR."),
          // Environnement
          c("p2-s2-10", "Indicateur suivi : consommation électrique."),
          c("p2-s2-11", "Indicateur suivi : émissions de GES."),
          c("p2-s2-12", "Indicateur suivi : durée de vie moyenne des équipements."),
          c("p2-s2-13", "Indicateur suivi : nombre d'équipements achetés."),
          c("p2-s2-14", "Indicateur suivi : taux de matériel reconditionné."),
          c("p2-s2-15", "Indicateur suivi : nombre d'équipements réparés."),
          c("p2-s2-16", "Indicateur suivi : taux de recyclage des DEEE."),
          c("p2-s2-17", "Indicateur suivi : consommation de papier."),
          c("p2-s2-18", "Indicateur suivi : nombre d'impressions."),
          c("p2-s2-19", "Indicateur suivi : volume de données stockées."),
          c("p2-s2-20", "Indicateur suivi : volume de données supprimées."),
          c("p2-s2-21", "Indicateur suivi : utilisation des serveurs."),
          c("p2-s2-22", "Indicateur suivi : utilisation du cloud."),
          // Social
          c("p2-s2-23", "Indicateur suivi : nombre de collaborateurs formés."),
          c("p2-s2-24", "Indicateur suivi : nombre d'heures de formation."),
          c("p2-s2-25", "Indicateur suivi : taux de participation aux sensibilisations."),
          c("p2-s2-26", "Indicateur suivi : nombre de référents NR."),
          c("p2-s2-27", "Indicateur suivi : satisfaction des collaborateurs."),
          // Clients
          c("p2-s2-28", "Indicateur suivi : nombre de clients sensibilisés."),
          c("p2-s2-29", "Indicateur suivi : nombre de prestations NR."),
          c("p2-s2-30", "Indicateur suivi : satisfaction client."),
        ],
      },
      {
        id: "p2-s3",
        title: "Définir et planifier un plan d'action Numérique Responsable",
        criteria: [
          c("p2-s3-0",  "Rien n'est fait à ce jour.", true),
          c("p2-s3-1",  "Les enjeux prioritaires sont identifiés."),
          c("p2-s3-2",  "Les objectifs sont définis."),
          c("p2-s3-3",  "Les actions sont planifiées."),
          c("p2-s3-4",  "Un responsable est désigné pour chaque action."),
          c("p2-s3-5",  "Un calendrier est défini."),
          c("p2-s3-6",  "Des moyens humains sont prévus."),
          c("p2-s3-7",  "Des moyens financiers sont prévus."),
          c("p2-s3-8",  "Les indicateurs de suivi sont définis."),
          c("p2-s3-9",  "L'avancement est suivi régulièrement."),
          c("p2-s3-10", "Le plan d'action est révisé régulièrement."),
          c("p2-s3-11", "Les actions sont mises à jour selon les résultats obtenus."),
        ],
      },
    ],
  },
  {
    id: "p3",
    title: "Déployer sa politique Numérique Responsable",
    shortTitle: "Déploiement",
    color: "#8b5cf6",
    sections: [
      {
        id: "p3-s1",
        title: "Identifier et accompagner les porteurs de projet de la démarche NR",
        criteria: [
          c("p3-s1-0", "Rien n'est fait à ce jour.", true),
          c("p3-s1-1", "Un pilote ou référent NR est identifié."),
          c("p3-s1-2", "Les rôles et responsabilités sont clairement définis."),
          c("p3-s1-3", "Les porteurs de projet disposent du temps nécessaire."),
          c("p3-s1-4", "Les porteurs de projet disposent des moyens nécessaires."),
          c("p3-s1-5", "Les porteurs de projet sont formés au Numérique Responsable."),
          c("p3-s1-6", "Les porteurs de projet sont accompagnés par la direction."),
          c("p3-s1-7", "Des réunions de suivi sont organisées."),
          c("p3-s1-8", "Les collaborateurs savent à qui s'adresser pour les sujets NR."),
          c("p3-s1-9", "Les missions des porteurs de projet sont réévaluées régulièrement."),
        ],
      },
      {
        id: "p3-s2",
        title: "Évaluer et analyser les indicateurs NR",
        criteria: [
          c("p3-s2-0", "Rien n'est fait à ce jour.", true),
          c("p3-s2-1", "Les indicateurs sont mesurés selon une fréquence définie."),
          c("p3-s2-2", "Les résultats sont analysés."),
          c("p3-s2-3", "Les écarts par rapport aux objectifs sont identifiés."),
          c("p3-s2-4", "Les causes des écarts sont recherchées."),
          c("p3-s2-5", "Des actions correctives sont mises en place."),
          c("p3-s2-6", "Les résultats sont présentés à la direction."),
          c("p3-s2-7", "Les résultats sont communiqués aux collaborateurs."),
          c("p3-s2-8", "Les indicateurs sont revus et adaptés si nécessaire."),
          c("p3-s2-9", "Les résultats alimentent le plan d'amélioration continue."),
        ],
      },
    ],
  },
  {
    id: "p4",
    title: "Soutien à la stratégie NR",
    shortTitle: "Soutien",
    color: "#f59e0b",
    sections: [
      {
        id: "p4-s1",
        title: "Faire émerger des bonnes pratiques NR émanant des collaborateurs",
        criteria: [
          c("p4-s1-0", "Rien n'est fait à ce jour.", true),
          c("p4-s1-1", "Les collaborateurs peuvent proposer des idées."),
          c("p4-s1-2", "Les bonnes pratiques sont recensées."),
          c("p4-s1-3", "Les bonnes pratiques sont diffusées en interne."),
          c("p4-s1-4", "Les bonnes pratiques sont partagées avec les clients."),
          c("p4-s1-5", "Les bonnes pratiques sont partagées avec les partenaires."),
          c("p4-s1-6", "Les initiatives des collaborateurs sont valorisées."),
          c("p4-s1-7", "Des retours d'expérience sont organisés."),
        ],
      },
      {
        id: "p4-s2",
        title: "Participer ou organiser des événements pour sensibiliser les parties prenantes au NR",
        criteria: [
          c("p4-s2-0", "Rien n'est fait à ce jour.", true),
          c("p4-s2-1", "Participation à des conférences."),
          c("p4-s2-2", "Participation à des webinaires."),
          c("p4-s2-3", "Participation à des salons."),
          c("p4-s2-4", "Organisation d'ateliers."),
          c("p4-s2-5", "Organisation de sensibilisations internes."),
          c("p4-s2-6", "Participation au Digital Cleanup Day."),
          c("p4-s2-7", "Participation à la Fresque du Numérique."),
          c("p4-s2-8", "Participation à des réseaux ou communautés NR/RSE."),
          c("p4-s2-9", "Organisation d'événements à destination des clients ou partenaires."),
        ],
      },
      {
        id: "p4-s3",
        title: "Communiquer en toute transparence sur les engagements et les indicateurs NR",
        criteria: [
          c("p4-s3-0", "Rien n'est fait à ce jour.", true),
          c("p4-s3-1", "Les engagements NR sont publiés."),
          c("p4-s3-2", "Les objectifs sont communiqués."),
          c("p4-s3-3", "Les actions menées sont présentées."),
          c("p4-s3-4", "Les résultats sont communiqués."),
          c("p4-s3-5", "Les limites ou difficultés sont également expliquées."),
          c("p4-s3-6", "Les informations sont régulièrement mises à jour."),
          c("p4-s3-7", "Les parties prenantes peuvent poser des questions."),
        ],
      },
      {
        id: "p4-s4",
        title: "Partager des informations générales sur le thème du NR",
        criteria: [
          c("p4-s4-0", "Rien n'est fait à ce jour.", true),
          c("p4-s4-1", "Diffusion d'actualités NR."),
          c("p4-s4-2", "Partage de chiffres clés."),
          c("p4-s4-3", "Publication d'articles."),
          c("p4-s4-4", "Partage de guides ou bonnes pratiques."),
          c("p4-s4-5", "Diffusion de vidéos ou webinaires."),
          c("p4-s4-6", "Partage de ressources externes."),
          c("p4-s4-7", "Communication régulière auprès des collaborateurs."),
          c("p4-s4-8", "Communication auprès des clients."),
        ],
      },
      {
        id: "p4-s5",
        title: "Identifier les parties prenantes avec qui interagir sur le NR",
        criteria: [
          c("p4-s5-0", "Rien n'est fait à ce jour.", true),
          c("p4-s5-1", "Les parties prenantes internes sont identifiées."),
          c("p4-s5-2", "Les parties prenantes externes sont identifiées."),
          c("p4-s5-3", "Une cartographie des parties prenantes existe."),
          c("p4-s5-4", "Les attentes des parties prenantes sont recueillies."),
          c("p4-s5-5", "Des échanges réguliers sont organisés."),
          c("p4-s5-6", "Les parties prenantes sont impliquées dans la démarche."),
          c("p4-s5-7", "Les retours sont pris en compte dans le plan d'action."),
        ],
      },
      {
        id: "p4-s6",
        title: "Permettre aux collaborateurs d'accéder et d'utiliser facilement les services informatiques",
        criteria: [
          c("p4-s6-0", "Rien n'est fait à ce jour.", true),
          c("p4-s6-1", "Les outils numériques sont accessibles à tous les collaborateurs."),
          c("p4-s6-2", "Les logiciels utilisés sont simples à prendre en main."),
          c("p4-s6-3", "Les nouveaux collaborateurs sont accompagnés dans la prise en main des outils."),
          c("p4-s6-4", "Une assistance informatique est disponible en cas de besoin."),
          c("p4-s6-5", "Les collaborateurs peuvent signaler des difficultés d'utilisation."),
          c("p4-s6-6", "Les besoins spécifiques (handicap, difficultés d'accès...) sont pris en compte."),
          c("p4-s6-7", "Les outils sont régulièrement évalués afin d'améliorer leur accessibilité."),
          c("p4-s6-8", "Une documentation ou des guides utilisateurs sont disponibles."),
        ],
      },
      {
        id: "p4-s7",
        title: "Favoriser l'inclusion numérique et l'employabilité de tous les collaborateurs",
        criteria: [
          c("p4-s7-0", "Rien n'est fait à ce jour.", true),
          c("p4-s7-1", "Les compétences numériques des collaborateurs sont évaluées."),
          c("p4-s7-2", "Des formations sont proposées pour développer les compétences numériques."),
          c("p4-s7-3", "Les nouveaux outils sont accompagnés d'une formation."),
          c("p4-s7-4", "Les collaborateurs peuvent bénéficier d'un accompagnement personnalisé."),
          c("p4-s7-5", "Les situations de fracture numérique sont identifiées."),
          c("p4-s7-6", "Les outils sont adaptés aux différents profils d'utilisateurs."),
          c("p4-s7-7", "L'évolution des compétences numériques est suivie."),
          c("p4-s7-8", "L'entreprise favorise l'employabilité grâce au développement des compétences numériques."),
        ],
      },
      {
        id: "p4-s8",
        title: "Intégrer le NR dans le plan de formation de l'organisation",
        criteria: [
          c("p4-s8-0", "Rien n'est fait à ce jour.", true),
          c("p4-s8-1", "Le Numérique Responsable est intégré au plan de formation."),
          c("p4-s8-2", "Les nouveaux collaborateurs sont sensibilisés au Numérique Responsable."),
          c("p4-s8-3", "Des formations NR sont proposées régulièrement."),
          c("p4-s8-4", "Les collaborateurs disposent de ressources pédagogiques."),
          c("p4-s8-5", "Les formations sont adaptées aux différents métiers."),
          c("p4-s8-6", "Les compétences acquises sont évaluées."),
          c("p4-s8-7", "Les besoins en formation sont réévalués régulièrement."),
        ],
      },
      {
        id: "p4-s9",
        title: "Professionnaliser le numérique responsable dans la gestion des compétences",
        criteria: [
          c("p4-s9-0", "Rien n'est fait à ce jour.", true),
          c("p4-s9-1", "Les compétences NR attendues sont définies."),
          c("p4-s9-2", "Les compétences NR sont intégrées dans les fiches de poste."),
          c("p4-s9-3", "Les besoins en compétences sont identifiés."),
          c("p4-s9-4", "Les compétences sont suivies dans le temps."),
          c("p4-s9-5", "Un parcours de montée en compétences est proposé."),
          c("p4-s9-6", "Les compétences NR sont prises en compte lors des entretiens professionnels."),
          c("p4-s9-7", "Les référents NR bénéficient d'un accompagnement spécifique."),
        ],
      },
      {
        id: "p4-s10",
        title: "Valoriser le partage de compétences autour du NR",
        criteria: [
          c("p4-s10-0", "Rien n'est fait à ce jour.", true),
          c("p4-s10-1", "Les collaborateurs partagent leurs bonnes pratiques."),
          c("p4-s10-2", "Des temps d'échange sont organisés."),
          c("p4-s10-3", "Une base documentaire est disponible."),
          c("p4-s10-4", "Les retours d'expérience sont valorisés."),
          c("p4-s10-5", "Les collaborateurs peuvent proposer des améliorations."),
          c("p4-s10-6", "Les connaissances sont diffusées à l'ensemble des équipes."),
          c("p4-s10-7", "Les initiatives sont reconnues et encouragées."),
        ],
      },
      {
        id: "p4-s11",
        title: "Procéder à une veille NR afin de maintenir à niveau les compétences",
        criteria: [
          c("p4-s11-0", "Rien n'est fait à ce jour.", true),
          c("p4-s11-1", "Une veille Numérique Responsable est organisée."),
          c("p4-s11-2", "Des sources d'information fiables sont identifiées."),
          c("p4-s11-3", "Des webinaires, conférences ou événements sont suivis."),
          c("p4-s11-4", "Les évolutions réglementaires sont surveillées."),
          c("p4-s11-5", "Les innovations du secteur sont identifiées."),
          c("p4-s11-6", "Les informations utiles sont partagées aux collaborateurs."),
          c("p4-s11-7", "La veille est utilisée pour faire évoluer les pratiques de l'organisation."),
        ],
      },
      {
        id: "p4-s12",
        title: "Intégrer le NR dans les campagnes et supports de communication généraux",
        criteria: [
          c("p4-s12-0", "Rien n'est fait à ce jour.", true),
          c("p4-s12-1", "Le Numérique Responsable est présenté sur le site internet."),
          c("p4-s12-2", "Le Numérique Responsable est intégré aux plaquettes commerciales."),
          c("p4-s12-3", "Les supports de communication mettent en avant les engagements de l'organisation."),
          c("p4-s12-4", "Les actions menées sont régulièrement communiquées."),
          c("p4-s12-5", "Les communications reposent sur des informations vérifiables."),
          c("p4-s12-6", "Les supports de communication sont conçus dans une logique de sobriété numérique."),
          c("p4-s12-7", "Les campagnes de communication sensibilisent aux enjeux du Numérique Responsable."),
          c("p4-s12-8", "Les collaborateurs sont informés des actions de communication réalisées."),
        ],
      },
      {
        id: "p4-s13",
        title: "Disposer de sites Internet sobres et accessibles",
        criteria: [
          c("p4-s13-0", "Rien n'est fait à ce jour.", true),
          c("p4-s13-1", "Les performances du site sont évaluées régulièrement."),
          c("p4-s13-2", "L'accessibilité numérique est prise en compte."),
          c("p4-s13-3", "Le poids des pages est optimisé."),
          c("p4-s13-4", "Les images sont optimisées."),
          c("p4-s13-5", "Les vidéos sont utilisées de manière raisonnée."),
          c("p4-s13-6", "Les contenus sont régulièrement mis à jour."),
          c("p4-s13-7", "Les pages inutiles sont supprimées."),
          c("p4-s13-8", "Les outils de mesure (EcoIndex, Lighthouse, Ecograder…) sont utilisés."),
          c("p4-s13-9", "Les axes d'amélioration sont intégrés au plan d'action."),
        ],
      },
    ],
  },
  {
    id: "p5",
    title: "Cycle de vie des services numériques",
    shortTitle: "Cycle de vie",
    color: "#ef4444",
    sections: [
      {
        id: "p5-s1",
        title: "Intégrer des clauses sociales et environnementales dans les appels d'offre et contrats",
        criteria: [
          c("p5-s1-0", "Rien n'est fait à ce jour.", true),
          c("p5-s1-1", "Des critères environnementaux sont intégrés aux achats."),
          c("p5-s1-2", "Des critères sociaux sont intégrés aux achats."),
          c("p5-s1-3", "Les fournisseurs sont évalués sur leurs engagements RSE."),
          c("p5-s1-4", "Les contrats prennent en compte la durée de vie des équipements."),
          c("p5-s1-5", "Les critères de réparabilité sont étudiés."),
          c("p5-s1-6", "Les critères de durabilité sont étudiés."),
          c("p5-s1-7", "Les appels d'offres intègrent des exigences NR."),
        ],
      },
      {
        id: "p5-s2",
        title: "Choisir du matériel labélisé, certifié ou disposant d'un critère de performance reconnu",
        criteria: [
          c("p5-s2-0", "Rien n'est fait à ce jour.", true),
          c("p5-s2-1", "Les labels environnementaux sont pris en compte."),
          c("p5-s2-2", "L'indice de réparabilité est consulté."),
          c("p5-s2-3", "L'indice de durabilité est consulté."),
          c("p5-s2-4", "Le matériel reconditionné est privilégié lorsque cela est possible."),
          c("p5-s2-5", "Les équipements sont sélectionnés pour leur faible consommation énergétique."),
          c("p5-s2-6", "Les équipements sont choisis pour leur facilité de réparation."),
          c("p5-s2-7", "Les pièces détachées sont disponibles."),
          c("p5-s2-8", "Les performances environnementales sont comparées avant achat."),
        ],
      },
      {
        id: "p5-s3",
        title: "Impliquer ses fournisseurs en communiquant avec eux sur la démarche",
        criteria: [
          c("p5-s3-0", "Rien n'est fait à ce jour.", true),
          c("p5-s3-1", "Les fournisseurs sont informés de la démarche NR."),
          c("p5-s3-2", "Les attentes NR sont communiquées."),
          c("p5-s3-3", "Les fournisseurs sont sensibilisés aux enjeux NR."),
          c("p5-s3-4", "Des échanges réguliers sont organisés."),
          c("p5-s3-5", "Les performances des fournisseurs sont suivies."),
          c("p5-s3-6", "Les fournisseurs sont encouragés à améliorer leurs pratiques."),
          c("p5-s3-7", "Les engagements des fournisseurs sont évalués."),
        ],
      },
      {
        id: "p5-s4",
        title: "Prolonger la durée de vie des équipements par un entretien régulier",
        criteria: [
          c("p5-s4-0", "Rien n'est fait à ce jour.", true),
          c("p5-s4-1", "Les équipements sont entretenus régulièrement."),
          c("p5-s4-2", "Les équipements sont réparés avant d'être remplacés."),
          c("p5-s4-3", "Les mises à niveau sont privilégiées."),
          c("p5-s4-4", "Les utilisateurs sont sensibilisés à l'entretien du matériel."),
          c("p5-s4-5", "Les durées de vie sont suivies."),
          c("p5-s4-6", "Les renouvellements sont justifiés."),
          c("p5-s4-7", "Une politique d'allongement de la durée de vie existe."),
        ],
      },
      {
        id: "p5-s5",
        title: "Récupérer les équipements inutilisés ou hors d'usage pour les orienter vers des filières de valorisation",
        criteria: [
          c("p5-s5-0", "Rien n'est fait à ce jour.", true),
          c("p5-s5-1", "Les équipements inutilisés sont récupérés."),
          c("p5-s5-2", "Les équipements sont orientés vers une filière DEEE."),
          c("p5-s5-3", "Le don est privilégié lorsque cela est possible."),
          c("p5-s5-4", "Le reconditionnement est privilégié."),
          c("p5-s5-5", "Une traçabilité des équipements sortants est assurée."),
          c("p5-s5-6", "Les partenaires de collecte sont identifiés."),
          c("p5-s5-7", "Les certificats de traitement sont conservés."),
        ],
      },
      {
        id: "p5-s6",
        title: "Inventorier les équipements numériques utilisés par l'organisation et les affecter en fonction des besoins",
        criteria: [
          c("p5-s6-0", "Rien n'est fait à ce jour.", true),
          c("p5-s6-1", "Un inventaire des équipements existe."),
          c("p5-s6-2", "L'inventaire est mis à jour régulièrement."),
          c("p5-s6-3", "Les caractéristiques des équipements sont suivies."),
          c("p5-s6-4", "Les affectations sont connues."),
          c("p5-s6-5", "Les besoins réels des utilisateurs sont pris en compte."),
          c("p5-s6-6", "Les équipements inutilisés sont identifiés."),
          c("p5-s6-7", "Les remplacements sont anticipés."),
        ],
      },
      {
        id: "p5-s7",
        title: "Établir des paramétrages permettant de limiter les impacts liés à l'utilisation des équipements",
        criteria: [
          c("p5-s7-0", "Rien n'est fait à ce jour.", true),
          c("p5-s7-1", "La mise en veille automatique est configurée."),
          c("p5-s7-2", "L'arrêt automatique est paramétré."),
          c("p5-s7-3", "Les paramètres d'économie d'énergie sont activés."),
          c("p5-s7-4", "Les impressions sont paramétrées en recto-verso par défaut."),
          c("p5-s7-5", "Les impressions couleur sont limitées."),
          c("p5-s7-6", "Les paramètres sont harmonisés sur l'ensemble du parc."),
          c("p5-s7-7", "Les paramétrages sont régulièrement vérifiés."),
        ],
      },
      {
        id: "p5-s8",
        title: "Responsabiliser les utilisateurs à la mise en œuvre des écogestes — équipements",
        criteria: [
          c("p5-s8-0", "Rien n'est fait à ce jour.", true),
          c("p5-s8-1", "Les collaborateurs sont sensibilisés aux écogestes."),
          c("p5-s8-2", "Des guides de bonnes pratiques sont diffusés."),
          c("p5-s8-3", "Des rappels réguliers sont réalisés."),
          c("p5-s8-4", "Les collaborateurs sont encouragés à réparer plutôt qu'à remplacer."),
          c("p5-s8-5", "Les bonnes pratiques sont suivies."),
          c("p5-s8-6", "Les initiatives des collaborateurs sont valorisées."),
          c("p5-s8-7", "Des actions de sensibilisation sont organisées régulièrement."),
        ],
      },
      {
        id: "p5-s9",
        title: "Inventorier les logiciels et applications utilisés par l'organisation",
        criteria: [
          c("p5-s9-0", "Rien n'est fait à ce jour.", true),
          c("p5-s9-1", "Un inventaire des logiciels est tenu à jour."),
          c("p5-s9-2", "Les propriétaires des logiciels sont identifiés."),
          c("p5-s9-3", "Les licences sont suivies."),
          c("p5-s9-4", "Les besoins métiers sont analysés avant toute nouvelle acquisition."),
          c("p5-s9-5", "Les logiciels existants sont étudiés avant d'en ajouter un nouveau."),
          c("p5-s9-6", "Les doublons sont identifiés."),
          c("p5-s9-7", "Les logiciels inutilisés sont recensés."),
          c("p5-s9-8", "Les utilisateurs sont consultés avant les choix importants."),
          c("p5-s9-9", "Les coûts, impacts et bénéfices sont évalués avant toute acquisition."),
        ],
      },
      {
        id: "p5-s10",
        title: "Intégrer les principes de la conception responsable dès l'expression de besoin",
        criteria: [
          c("p5-s10-0", "Rien n'est fait à ce jour.", true),
          c("p5-s10-1", "Les besoins sont simplifiés avant développement."),
          c("p5-s10-2", "Les fonctionnalités inutiles sont évitées."),
          c("p5-s10-3", "Les performances sont prises en compte."),
          c("p5-s10-4", "L'accessibilité est intégrée."),
          c("p5-s10-5", "Les impacts environnementaux sont étudiés."),
          c("p5-s10-6", "Les volumes de données sont limités."),
          c("p5-s10-7", "Les traitements inutiles sont supprimés."),
          c("p5-s10-8", "Les évolutions sont régulièrement revues."),
          c("p5-s10-9", "Les utilisateurs participent aux retours d'expérience."),
        ],
      },
      {
        id: "p5-s11",
        title: "Établir des paramétrages permettant de limiter les impacts liés aux logiciels et applications",
        criteria: [
          c("p5-s11-0", "Rien n'est fait à ce jour.", true),
          c("p5-s11-1", "Non applicable.", true),
          c("p5-s11-2", "Les paramètres par défaut sont optimisés."),
          c("p5-s11-3", "Les sauvegardes sont adaptées au besoin."),
          c("p5-s11-4", "Les synchronisations inutiles sont désactivées."),
          c("p5-s11-5", "Les notifications inutiles sont limitées."),
          c("p5-s11-6", "Les traitements automatiques sont optimisés."),
          c("p5-s11-7", "Les mises à jour sont maîtrisées."),
          c("p5-s11-8", "Les consommations sont suivies."),
        ],
      },
      {
        id: "p5-s12",
        title: "Responsabiliser les utilisateurs à la mise en œuvre des écogestes — logiciels",
        criteria: [
          c("p5-s12-0", "Rien n'est fait à ce jour.", true),
          c("p5-s12-1", "Les utilisateurs sont sensibilisés."),
          c("p5-s12-2", "Un guide de bonnes pratiques existe."),
          c("p5-s12-3", "Les bonnes pratiques sont régulièrement rappelées."),
          c("p5-s12-4", "Les utilisateurs connaissent les fonctionnalités sobres."),
          c("p5-s12-5", "Les collaborateurs signalent les anomalies."),
          c("p5-s12-6", "Les retours des utilisateurs sont pris en compte."),
          c("p5-s12-7", "Les écogestes sont intégrés aux formations."),
        ],
      },
      {
        id: "p5-s13",
        title: "Désinstaller les logiciels et applications non utilisés",
        criteria: [
          c("p5-s13-0", "Rien n'est fait à ce jour.", true),
          c("p5-s13-1", "Les logiciels inutilisés sont identifiés."),
          c("p5-s13-2", "Les licences inutilisées sont supprimées."),
          c("p5-s13-3", "Les comptes inactifs sont supprimés."),
          c("p5-s13-4", "Les applications obsolètes sont désinstallées."),
          c("p5-s13-5", "Les inventaires sont régulièrement mis à jour."),
          c("p5-s13-6", "Une revue périodique est réalisée."),
        ],
      },
      {
        id: "p5-s14",
        title: "Concevoir et faire vivre les infrastructures en fonction des besoins",
        criteria: [
          c("p5-s14-0", "Rien n'est fait à ce jour.", true),
          c("p5-s14-1", "Les infrastructures sont dimensionnées selon les besoins."),
          c("p5-s14-2", "Les ressources sont régulièrement surveillées."),
          c("p5-s14-3", "Les surcapacités sont recherchées."),
          c("p5-s14-4", "Les ressources inutilisées sont supprimées."),
          c("p5-s14-5", "Les performances sont suivies."),
          c("p5-s14-6", "Les infrastructures sont mutualisées lorsque cela est possible."),
          c("p5-s14-7", "Les consommations sont optimisées."),
          c("p5-s14-8", "Une revue régulière est réalisée."),
        ],
      },
      {
        id: "p5-s15",
        title: "Recourir à un centre de données engagé sur la mise en œuvre de bonnes pratiques",
        criteria: [
          c("p5-s15-0", "Rien n'est fait à ce jour.", true),
          c("p5-s15-1", "Non applicable.", true),
          c("p5-s15-2", "Les engagements environnementaux de l'hébergeur sont connus."),
          c("p5-s15-3", "Les certifications du datacenter sont vérifiées."),
          c("p5-s15-4", "Les performances environnementales sont suivies."),
          c("p5-s15-5", "Le fournisseur communique sur sa politique environnementale."),
          c("p5-s15-6", "Les performances sont revues régulièrement."),
          c("p5-s15-7", "Les critères NR sont intégrés au choix du prestataire."),
        ],
      },
      {
        id: "p5-s16",
        title: "Choisir une configuration permettant de limiter les impacts liés au fonctionnement du centre de données",
        criteria: [
          c("p5-s16-0", "Rien n'est fait à ce jour.", true),
          c("p5-s16-1", "Non applicable.", true),
          c("p5-s16-2", "Les ressources sont adaptées aux besoins."),
          c("p5-s16-3", "Les sauvegardes sont optimisées."),
          c("p5-s16-4", "Les logs sont maîtrisés."),
          c("p5-s16-5", "Les espaces de stockage sont nettoyés régulièrement."),
          c("p5-s16-6", "Les serveurs inutilisés sont arrêtés."),
          c("p5-s16-7", "Les consommations sont suivies."),
          c("p5-s16-8", "Les configurations sont régulièrement revues."),
        ],
      },
      {
        id: "p5-s17",
        title: "Collecter uniquement les données nécessaires lors de la création d'un nouveau service numérique",
        criteria: [
          c("p5-s17-0", "Rien n'est fait à ce jour.", true),
          c("p5-s17-1", "Les données collectées sont limitées au strict nécessaire."),
          c("p5-s17-2", "Chaque donnée collectée est justifiée."),
          c("p5-s17-3", "Les formulaires sont régulièrement revus."),
          c("p5-s17-4", "Les données facultatives sont limitées."),
          c("p5-s17-5", "Les traitements inutiles sont supprimés."),
          c("p5-s17-6", "Les principes du RGPD sont appliqués."),
          c("p5-s17-7", "Les utilisateurs peuvent exercer leurs droits."),
        ],
      },
      {
        id: "p5-s18",
        title: "Informer les utilisateurs de l'usage qu'il sera fait de leurs données",
        criteria: [
          c("p5-s18-0", "Rien n'est fait à ce jour.", true),
          c("p5-s18-1", "Une politique de confidentialité existe."),
          c("p5-s18-2", "Les finalités des traitements sont expliquées."),
          c("p5-s18-3", "Les durées de conservation sont précisées."),
          c("p5-s18-4", "Les droits des utilisateurs sont expliqués."),
          c("p5-s18-5", "Un contact est disponible pour les demandes."),
          c("p5-s18-6", "Les demandes sont traitées dans les délais."),
          c("p5-s18-7", "Les informations sont régulièrement mises à jour."),
        ],
      },
      {
        id: "p5-s19",
        title: "Sécuriser le stockage des données et assurer leur archivage ou leur suppression",
        criteria: [
          c("p5-s19-0", "Rien n'est fait à ce jour.", true),
          c("p5-s19-1", "Les accès sont sécurisés."),
          c("p5-s19-2", "Les habilitations sont gérées."),
          c("p5-s19-3", "Les sauvegardes sont réalisées."),
          c("p5-s19-4", "Les durées de conservation sont définies."),
          c("p5-s19-5", "Les données obsolètes sont supprimées."),
          c("p5-s19-6", "Les archives sont gérées."),
          c("p5-s19-7", "Les incidents sont suivis."),
          c("p5-s19-8", "Les procédures sont régulièrement revues."),
        ],
      },
    ],
  },
  {
    id: "p6",
    title: "Étendre sa démarche NR",
    shortTitle: "Extension",
    color: "#06b6d4",
    sections: [
      {
        id: "p6-s1",
        title: "Soutenir l'essor de services numériques transparents et pérennes (open source, open data)",
        criteria: [
          c("p6-s1-0", "Rien n'est fait à ce jour.", true),
          c("p6-s1-1", "Des logiciels Open Source sont utilisés."),
          c("p6-s1-2", "Les formats ouverts sont privilégiés."),
          c("p6-s1-3", "Les standards ouverts sont utilisés."),
          c("p6-s1-4", "Les solutions sont choisies pour leur pérennité."),
          c("p6-s1-5", "Les données ouvertes sont utilisées lorsque pertinent."),
          c("p6-s1-6", "L'organisation contribue à des projets Open Source ou Open Data."),
          c("p6-s1-7", "Les collaborateurs sont sensibilisés aux solutions ouvertes."),
        ],
      },
      {
        id: "p6-s2",
        title: "Encourager ses collaborateurs à contribuer à un projet d'intérêt général lié au NR",
        criteria: [
          c("p6-s2-0", "Rien n'est fait à ce jour.", true),
          c("p6-s2-1", "Les collaborateurs sont informés des projets existants."),
          c("p6-s2-2", "Les initiatives sont encouragées."),
          c("p6-s2-3", "Du temps peut être consacré à ces projets."),
          c("p6-s2-4", "Les contributions sont valorisées."),
          c("p6-s2-5", "Les retours d'expérience sont partagés."),
          c("p6-s2-6", "L'entreprise participe à des actions collectives liées au Numérique Responsable."),
        ],
      },
      {
        id: "p6-s3",
        title: "Recourir au numérique pour apporter des solutions à impact positif (IT for Green, IT for Good)",
        criteria: [
          c("p6-s3-0", "Rien n'est fait à ce jour.", true),
          c("p6-s3-1", "Les projets numériques répondent à un enjeu environnemental."),
          c("p6-s3-2", "Les projets numériques répondent à un enjeu social."),
          c("p6-s3-3", "Les impacts positifs sont identifiés."),
          c("p6-s3-4", "Les bénéfices sont mesurés."),
          c("p6-s3-5", "Les solutions proposées permettent de réduire des impacts environnementaux."),
          c("p6-s3-6", "Les solutions facilitent l'inclusion ou l'accessibilité."),
          c("p6-s3-7", "Les retours des utilisateurs sont pris en compte."),
          c("p6-s3-8", "Les impacts positifs sont communiqués."),
        ],
      },
    ],
  },
  {
    id: "p7",
    title: "Produits et services des ESN",
    shortTitle: "Offre ESN",
    color: "#ec4899",
    sections: [
      {
        id: "p7-s1",
        title: "Intégrer la conception responsable dans le diagnostic des besoins et d'analyse des usages",
        criteria: [
          c("p7-s1-0", "Rien n'est fait à ce jour.", true),
          c("p7-s1-1", "Non applicable.", true),
          c("p7-s1-2", "Les besoins du client sont analysés avant toute proposition."),
          c("p7-s1-3", "Les usages réels sont étudiés."),
          c("p7-s1-4", "Les fonctionnalités réellement nécessaires sont identifiées."),
          c("p7-s1-5", "Les impacts environnementaux sont pris en compte dans l'analyse."),
          c("p7-s1-6", "Les impacts sociaux sont pris en compte dans l'analyse."),
          c("p7-s1-7", "Les solutions les plus sobres sont privilégiées."),
          c("p7-s1-8", "Les besoins futurs sont anticipés."),
          c("p7-s1-9", "Les recommandations sont adaptées au contexte du client."),
        ],
      },
      {
        id: "p7-s2",
        title: "Présenter la démarche NR de l'organisation dans les propositions commerciales",
        criteria: [
          c("p7-s2-0", "Rien n'est fait à ce jour.", true),
          c("p7-s2-1", "Les engagements NR sont présentés."),
          c("p7-s2-2", "Les actions mises en œuvre sont expliquées."),
          c("p7-s2-3", "Les résultats obtenus sont présentés."),
          c("p7-s2-4", "Des chiffres clés sont communiqués."),
          c("p7-s2-5", "Les labels et certifications sont présentés."),
          c("p7-s2-6", "Les documents commerciaux sont régulièrement mis à jour."),
          c("p7-s2-7", "Les équipes commerciales connaissent la démarche NR."),
          c("p7-s2-8", "Les informations communiquées sont vérifiables."),
        ],
      },
      {
        id: "p7-s3",
        title: "Proposer des solutions adaptées et argumentées permettant au client d'intégrer le NR",
        criteria: [
          c("p7-s3-0", "Rien n'est fait à ce jour.", true),
          c("p7-s3-1", "Les impacts des différentes solutions sont comparés."),
          c("p7-s3-2", "Les bénéfices environnementaux sont expliqués."),
          c("p7-s3-3", "Les bénéfices économiques sont expliqués."),
          c("p7-s3-4", "Les bénéfices sociaux sont expliqués."),
          c("p7-s3-5", "Plusieurs alternatives sont proposées lorsque cela est pertinent."),
          c("p7-s3-6", "Les recommandations sont justifiées."),
          c("p7-s3-7", "Les critères NR sont intégrés dans les échanges commerciaux."),
          c("p7-s3-8", "Les retours clients sont pris en compte pour améliorer les propositions."),
        ],
      },
      {
        id: "p7-s4",
        title: "Recourir à la conception responsable durant la définition et la mise en œuvre des solutions",
        criteria: [
          c("p7-s4-0", "Rien n'est fait à ce jour.", true),
          c("p7-s4-1", "Non applicable.", true),
          c("p7-s4-2", "Les besoins sont revus avant le lancement du projet."),
          c("p7-s4-3", "Les fonctionnalités inutiles sont évitées."),
          c("p7-s4-4", "Les impacts environnementaux sont étudiés."),
          c("p7-s4-5", "Les impacts sociaux sont étudiés."),
          c("p7-s4-6", "Les principes de sobriété sont appliqués."),
          c("p7-s4-7", "Les performances sont prises en compte."),
          c("p7-s4-8", "Les évolutions sont documentées."),
          c("p7-s4-9", "Les retours utilisateurs sont intégrés."),
        ],
      },
      {
        id: "p7-s5",
        title: "Mettre en œuvre l'accessibilité numérique dans ses prestations",
        criteria: [
          c("p7-s5-0", "Rien n'est fait à ce jour.", true),
          c("p7-s5-1", "Non applicable.", true),
          c("p7-s5-2", "L'accessibilité est prise en compte dès le début du projet."),
          c("p7-s5-3", "Les bonnes pratiques d'accessibilité sont appliquées."),
          c("p7-s5-4", "Les contrastes, tailles de caractères et navigations sont vérifiés."),
          c("p7-s5-5", "Les contenus restent accessibles sur différents supports."),
          c("p7-s5-6", "Des tests d'accessibilité sont réalisés."),
          c("p7-s5-7", "Les anomalies sont corrigées."),
          c("p7-s5-8", "Les équipes sont sensibilisées à l'accessibilité numérique."),
        ],
      },
      {
        id: "p7-s6",
        title: "Faire appel à des méthodes ou des produits facilitant la transparence et la collaboration",
        criteria: [
          c("p7-s6-0", "Rien n'est fait à ce jour.", true),
          c("p7-s6-1", "Les méthodes de travail sont documentées."),
          c("p7-s6-2", "Les échanges avec le client sont réguliers."),
          c("p7-s6-3", "Les décisions importantes sont tracées."),
          c("p7-s6-4", "Les outils collaboratifs sont utilisés."),
          c("p7-s6-5", "Les informations sont facilement accessibles aux personnes concernées."),
          c("p7-s6-6", "Les responsabilités sont clairement définies."),
          c("p7-s6-7", "Les retours d'expérience sont partagés."),
          c("p7-s6-8", "Les parties prenantes sont associées lorsque nécessaire."),
        ],
      },
      {
        id: "p7-s7",
        title: "Prise en compte du cycle de vie des produits installés chez les clients",
        criteria: [
          c("p7-s7-0", "Rien n'est fait à ce jour.", true),
          c("p7-s7-1", "Non applicable.", true),
          c("p7-s7-2", "Les solutions proposées favorisent la durée de vie des équipements."),
          c("p7-s7-3", "Les possibilités de réparation sont étudiées."),
          c("p7-s7-4", "Le réemploi est privilégié lorsque cela est possible."),
          c("p7-s7-5", "Les solutions limitent les consommations de ressources."),
          c("p7-s7-6", "Les modalités de fin de vie sont prises en compte."),
          c("p7-s7-7", "Les conseils d'utilisation responsable sont transmis au client."),
          c("p7-s7-8", "Les impacts du cycle de vie sont expliqués."),
        ],
      },
      {
        id: "p7-s8",
        title: "Intégrer le NR aux retours d'expériences afin d'évaluer les performances du projet",
        criteria: [
          c("p7-s8-0", "Rien n'est fait à ce jour.", true),
          c("p7-s8-1", "Les retours d'expérience sont organisés."),
          c("p7-s8-2", "Les critères NR sont intégrés aux bilans de projet."),
          c("p7-s8-3", "Les résultats sont analysés."),
          c("p7-s8-4", "Les axes d'amélioration sont identifiés."),
          c("p7-s8-5", "Les actions d'amélioration sont mises en œuvre."),
          c("p7-s8-6", "Les enseignements sont partagés avec les équipes."),
          c("p7-s8-7", "Les projets futurs tiennent compte des retours d'expérience."),
        ],
      },
      {
        id: "p7-s9",
        title: "Sensibiliser le support client afin de proposer des réponses orientées NR",
        criteria: [
          c("p7-s9-0", "Rien n'est fait à ce jour.", true),
          c("p7-s9-1", "Les équipes support sont sensibilisées au Numérique Responsable."),
          c("p7-s9-2", "Des procédures ou guides sont disponibles."),
          c("p7-s9-3", "Les équipes proposent des solutions favorisant la sobriété."),
          c("p7-s9-4", "Les bonnes pratiques sont expliquées aux clients."),
          c("p7-s9-5", "Les demandes récurrentes sont analysées."),
          c("p7-s9-6", "Les connaissances sont mises à jour régulièrement."),
          c("p7-s9-7", "Les retours du support alimentent la démarche NR."),
        ],
      },
      {
        id: "p7-s10",
        title: "Favoriser l'émergence de retours clients sur l'approche NR mise en œuvre",
        criteria: [
          c("p7-s10-0", "Rien n'est fait à ce jour.", true),
          c("p7-s10-1", "Les clients sont invités à donner leur avis."),
          c("p7-s10-2", "Les questionnaires de satisfaction abordent le Numérique Responsable."),
          c("p7-s10-3", "Les remarques des clients sont analysées."),
          c("p7-s10-4", "Les suggestions d'amélioration sont prises en compte."),
          c("p7-s10-5", "Les actions mises en œuvre sont communiquées aux clients lorsque cela est pertinent."),
          c("p7-s10-6", "Les retours alimentent l'amélioration continue."),
          c("p7-s10-7", "Les indicateurs de satisfaction sont suivis."),
        ],
      },
    ],
  },
];

// ── Scoring helpers ─────────────────────────────────────────────────────────

export function scorableCriteria(criteria: Criterion[]): Criterion[] {
  return criteria.filter((c) => !c.isSpecial);
}

export function computeScores(
  responses: Record<string, boolean>,
): { globalScore: number; pillarPcts: Record<string, number>; totalChecked: number; totalPossible: number } {
  let totalChecked = 0;
  let totalPossible = 0;
  const pillarPcts: Record<string, number> = {};

  for (const pillar of PILLARS) {
    let pChecked = 0;
    let pPossible = 0;
    for (const section of pillar.sections) {
      for (const cr of section.criteria) {
        if (cr.isSpecial) continue;
        pPossible++;
        if (responses[cr.id]) pChecked++;
      }
    }
    totalChecked += pChecked;
    totalPossible += pPossible;
    pillarPcts[pillar.id] = pPossible > 0 ? Math.round((pChecked / pPossible) * 100) : 0;
  }

  const globalScore = totalPossible > 0 ? Math.round((totalChecked / totalPossible) * 500) : 0;
  return { globalScore, pillarPcts, totalChecked, totalPossible };
}

export function maturityLabel(pct: number): { label: string; color: string } {
  if (pct < 20) return { label: "Débutant",         color: "text-red-600" };
  if (pct < 40) return { label: "En progression",   color: "text-orange-600" };
  if (pct < 60) return { label: "Intermédiaire",    color: "text-yellow-600" };
  if (pct < 80) return { label: "Avancé",           color: "text-blue-600" };
  return             { label: "Leader",             color: "text-emerald-600" };
}
