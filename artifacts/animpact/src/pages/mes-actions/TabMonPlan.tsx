import { CheckCircle2 } from "lucide-react";

// ─── 15 actions RSE concrètes ──────────────────────────────────────────────────

const PLAN_ACTIONS: { title: string; description: string }[] = [
  {
    title: "Mobilité et déplacements responsables",
    description:
      "Mettre en place le déplacement doux — vélo de service, stationnements sécurisés et forfait mobilité durable pour tous les collaborateurs.",
  },
  {
    title: "Efficacité énergétique des locaux",
    description:
      "Réaliser un audit énergétique des locaux et mettre en œuvre les 3 premiers chantiers identifiés : remplacement en LED, programmation du chauffage/climatisation, isolation des points froids.",
  },
  {
    title: "Zéro déchet non valorisé",
    description:
      "Installer un tri sélectif complet dans tous les espaces de travail, contractualiser avec des filières de valorisation et viser la suppression des poubelles individuelles.",
  },
  {
    title: "Achats responsables",
    description:
      "Intégrer des clauses RSE dans 100 % des appels d'offres fournisseurs : critères sociaux, empreinte carbone, labels environnementaux et conditions de travail.",
  },
  {
    title: "Allongement de la durée de vie des équipements numériques",
    description:
      "Prolonger la durée de vie des équipements informatiques d'au moins un an, privilégier le matériel reconditionné lors des renouvellements et mettre en place un don ou une filière DEEE.",
  },
  {
    title: "Adopter un moteur de recherche écologique ou éthique",
    description:
      "Migrer l'ensemble des collaborateurs vers un moteur de recherche à impact réduit ou positif — Ecosia (plantation d'arbres), Lilo, Ecogine, YouCare, OceanHero, Ekoru, Gexsi, MetaGer, GOOD Search, Rapusia, Swisscows, Qwant, DuckDuckGo, Startpage, Mojeek, Seekr, Presearch, Yep ou Brave Search — et formaliser cette recommandation dans la charte numérique responsable.",
  },
  {
    title: "Égalité salariale femmes-hommes",
    description:
      "Conduire une analyse de l'égalité salariale par poste et niveau, publier les écarts identifiés et mettre en œuvre un plan de correction chiffré et daté.",
  },
  {
    title: "Bien-être et qualité de vie au travail",
    description:
      "Lancer un baromètre social annuel et formaliser un plan d'action sur les 3 thèmes les moins bien notés, avec un responsable désigné et un suivi à 6 mois.",
  },
  {
    title: "Formation de tous les collaborateurs aux enjeux RSE",
    description:
      "Organiser une session de sensibilisation RSE d'au moins 2 heures pour l'ensemble des collaborateurs d'ici la fin de l'exercice, incluant les enjeux propres au secteur.",
  },
  {
    title: "Gouvernance RSE formalisée",
    description:
      "Nommer un référent RSE, constituer un comité de pilotage pluridisciplinaire et fixer un calendrier de revue trimestrielle avec compte-rendu partagé.",
  },
  {
    title: "Objectif de réduction carbone publié",
    description:
      "Définir un objectif de réduction des émissions de GES à 3 ans, le valider en comité de direction et le communiquer aux collaborateurs et aux parties prenantes clés.",
  },
  {
    title: "Cartographie des dépendances à la biodiversité",
    description:
      "Identifier les dépendances de l'activité aux services écosystémiques, évaluer les risques associés et engager une première mesure concrète de réduction d'impact.",
  },
  {
    title: "Éco-conception du produit ou service le plus impactant",
    description:
      "Sélectionner le produit ou service à plus fort impact environnemental, constituer un groupe de travail et définir 3 leviers d'éco-conception à mettre en œuvre dans l'exercice.",
  },
  {
    title: "Évaluation RSE des fournisseurs stratégiques",
    description:
      "Évaluer les 10 principaux fournisseurs sur leurs pratiques RSE (questionnaire, label, visite) et définir un plan d'accompagnement pour ceux identifiés à risque.",
  },
  {
    title: "Accord de télétravail équitable",
    description:
      "Formaliser un accord de télétravail équitable (critères d'éligibilité, jours, équipement), mesurer son impact sur la satisfaction collaborateur et l'empreinte carbone des déplacements.",
  },
  {
    title: "Publication d'un rapport RSE annuel",
    description:
      "Rédiger et diffuser un rapport de progrès RSE annuel — synthèse des indicateurs clés, actions réalisées et objectifs pour l'exercice suivant — auprès de toutes les parties prenantes.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function TabMonPlan() {
  return (
    <div className="space-y-2.5 py-2">
      <p className="text-xs text-muted-foreground pb-1">
        16 actions RSE prioritaires, concrètes et actionnables pour votre démarche.
      </p>
      {PLAN_ACTIONS.map((action, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3.5 hover:bg-muted/30 transition-colors"
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold mt-0.5">
            {i + 1}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-snug">{action.title}</p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {action.description}
            </p>
          </div>
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-1 text-muted-foreground/30" />
        </div>
      ))}
    </div>
  );
}
