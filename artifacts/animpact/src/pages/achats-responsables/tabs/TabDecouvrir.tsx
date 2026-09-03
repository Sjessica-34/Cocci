import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SectionProps {
  number: string;
  title: string;
  children: React.ReactNode;
}

function Section({ number, title, children }: SectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-base">
          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-bold">
            {number}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground space-y-2">{children}</CardContent>
    </Card>
  );
}

function ExampleBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 mt-2">
      <p className="text-xs font-semibold text-emerald-700 mb-1">Exemple concret</p>
      <p className="text-sm text-emerald-900">{children}</p>
    </div>
  );
}

function DefinitionGrid({ items }: { items: { term: string; def: string }[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
      {items.map((item) => (
        <div key={item.term} className="bg-slate-50 border rounded-md p-3">
          <p className="font-semibold text-slate-800 text-xs mb-1">{item.term}</p>
          <p className="text-slate-600 text-xs">{item.def}</p>
        </div>
      ))}
    </div>
  );
}

export function TabDecouvrir() {
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-1">Guide du module Achats &amp; Fournisseurs</h2>
        <p className="text-muted-foreground text-sm">
          Tout ce que vous devez savoir pour piloter votre chaîne d'approvisionnement dans une logique RSE.
        </p>
      </div>

      <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
        <span className="text-amber-500 text-lg leading-none mt-0.5">⚠️</span>
        <div className="text-amber-900">
          <p className="font-semibold mb-0.5">Cocci est un outil d'aide à la décision</p>
          <p className="text-amber-800">
            Il vous aide à structurer et centraliser votre démarche, mais ne remplace pas l'analyse
            et le jugement humain. Les évaluations (criticité, risque, dépendance) reposent sur votre
            connaissance terrain de votre activité et de vos fournisseurs.
          </p>
        </div>
      </div>

      <Section number="1" title="Qu'est-ce qu'un achat responsable ?">
        <p>
          Un achat responsable prend en compte, au-delà du prix, des critères environnementaux, sociaux et éthiques
          dans le choix des fournisseurs. Il s'inscrit dans une démarche globale de RSE (Responsabilité Sociétale
          des Entreprises).
        </p>
        <p>
          Concrètement, cela signifie choisir des fournisseurs qui respectent les droits des travailleurs, réduisent
          leur impact environnemental, agissent avec éthique et qui partagent vos valeurs.
        </p>
        <ExampleBox>
          Une PME de BTP privilégie un fournisseur de matériaux certifié "Responsable" même s'il est légèrement
          plus cher, car il garantit des pratiques d'extraction respectueuses de l'environnement.
        </ExampleBox>
      </Section>

      <Section number="2" title="Comment compléter l'onglet Achats responsables ?">
        <p>
          Cet onglet vous aide à estimer la place des achats responsables dans vos dépenses, sans vous demander
          de calculs complexes. Il mesure le montant annuel de vos achats et la part que vous estimez locale,
          responsable ou circulaire.
        </p>
        <p>Pour chaque grande catégorie d'achat, il suffit de :</p>
        <ol className="list-decimal list-inside space-y-1 mt-1">
          <li>indiquer un nom simple, par exemple « informatique » ou « matières premières » ;</li>
          <li>saisir le montant annuel estimé, même approximatif ;</li>
          <li>déplacer les trois curseurs selon votre meilleure estimation ;</li>
          <li>enregistrer : les indicateurs et graphiques sont calculés automatiquement.</li>
        </ol>
        <p>
          Ces estimations permettent d'identifier rapidement les catégories où privilégier davantage de
          fournisseurs locaux, de critères sociaux et environnementaux, ou de solutions recyclées et reconditionnées.
        </p>
        <ExampleBox>
          Pour 20 000 € d'achats informatiques annuels, vous pouvez estimer 40 % d'achats locaux, 50 % d'achats
          responsables et 20 % de matériel reconditionné. Cocci calcule automatiquement les indicateurs associés.
        </ExampleBox>
      </Section>

      <Section number="3" title="Pourquoi évaluer ses fournisseurs ?">
        <p>
          Évaluer ses fournisseurs permet d'identifier les risques cachés dans votre chaîne d'approvisionnement :
          défaillance d'un fournisseur clé, risque réputationnel, dépendance excessive, non-conformité
          réglementaire.
        </p>
        <p>
          C'est également une obligation croissante : la loi Devoir de Vigilance (entreprises &gt; 5 000 salariés)
          et la CSRD (reporting RSE obligatoire) exigent de connaître et maîtriser ses risques fournisseurs.
        </p>
        <ExampleBox>
          Une entreprise qui dépend à 80 % d'un seul fournisseur pour une matière première critique s'expose à une
          paralysie de sa production en cas de défaillance de ce fournisseur.
        </ExampleBox>
      </Section>

      <Section number="4" title="Qu'est-ce que la criticité ?">
        <p>
          La <strong>criticité</strong> mesure l'importance stratégique d'un fournisseur pour votre activité.
          Un fournisseur <em>critique</em> est celui dont la défaillance aurait un impact majeur sur votre
          capacité à opérer normalement.
        </p>
        <DefinitionGrid items={[
          { term: "Criticité 1–2 (faible)", def: "Le fournisseur est facilement remplaçable, son impact sur votre activité est limité." },
          { term: "Criticité 3 (modérée)", def: "Une défaillance causerait des perturbations significatives mais gérables." },
          { term: "Criticité 4–5 (élevée)", def: "Le fournisseur est indispensable. Sa défaillance menacerait directement votre activité." },
        ]} />
      </Section>

      <Section number="5" title="Qu'est-ce que le niveau de risque ?">
        <p>
          Le <strong>niveau de risque</strong> évalue la probabilité qu'un problème survienne avec ce fournisseur :
          difficultés financières, incidents qualité, problèmes éthiques, risques géopolitiques ou climatiques.
        </p>
        <DefinitionGrid items={[
          { term: "Risque 1–2 (faible)", def: "Fournisseur stable, historique de relation fiable, aucun signal d'alerte." },
          { term: "Risque 3 (modéré)", def: "Quelques incertitudes ou signaux à surveiller." },
          { term: "Risque 4–5 (élevé)", def: "Signaux d'alerte identifiés : fragilité financière, incidents passés, zone géographique instable." },
        ]} />
      </Section>

      <Section number="6" title="Quelle est la différence entre criticité, risque et dépendance ?">
        <DefinitionGrid items={[
          { term: "Criticité", def: "IMPACT si le fournisseur fait défaut. Dépend de votre organisation, pas du fournisseur." },
          { term: "Niveau de risque", def: "PROBABILITÉ que le fournisseur fasse défaut. Dépend du fournisseur lui-même." },
          { term: "Dépendance", def: "CAPACITÉ à vous passer de ce fournisseur. Mesure vos alternatives disponibles." },
        ]} />
        <ExampleBox>
          Un fournisseur peut être très critique (vous ne pouvez pas produire sans lui) mais peu risqué (il est
          financièrement solide). À l'inverse, un fournisseur peu critique peut être très risqué (fragilité
          financière) sans que cela ne soit une priorité d'action.
        </ExampleBox>
      </Section>

      <Section number="7" title="Comment interpréter la matrice de criticité ?">
        <p>
          En croisant la <strong>criticité</strong> et le <strong>niveau de risque</strong>, vous obtenez une
          matrice de priorisation :
        </p>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {[
            { label: "Criticité haute × Risque élevé", color: "bg-red-100 border-red-300 text-red-800", action: "Urgence — plan de continuité immédiat, identification d'alternatives" },
            { label: "Criticité haute × Risque faible", color: "bg-orange-100 border-orange-300 text-orange-800", action: "Surveiller — relation à renforcer, alternatives à développer" },
            { label: "Criticité faible × Risque élevé", color: "bg-yellow-100 border-yellow-300 text-yellow-800", action: "À simplifier — réduire la relation ou trouver un remplaçant" },
            { label: "Criticité faible × Risque faible", color: "bg-green-100 border-green-300 text-green-800", action: "Stable — pilotage standard, veille annuelle" },
          ].map((item) => (
            <div key={item.label} className={`border rounded-md p-3 ${item.color}`}>
              <p className="font-semibold text-xs mb-1">{item.label}</p>
              <p className="text-xs">{item.action}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section number="8" title="Comment Cocci calcule les indicateurs ?">
        <p>
          Cocci ne calcule pas automatiquement la criticité, le risque ou la dépendance : c'est votre expertise
          métier qui prime. Vous saisissez une note de 1 à 5 pour chaque dimension.
        </p>
        <p>
          Le tableau de bord identifie automatiquement les fournisseurs <Badge variant="destructive" className="text-xs">critiques</Badge> (criticité ≥ 4)
          et les fournisseurs <Badge className="bg-orange-500 text-xs">à risque élevé</Badge> (risque ≥ 4).
        </p>
        <p>
          La répartition géographique est calculée à partir du code postal et du pays de chaque fournisseur,
          en identifiant automatiquement le département et la région.
        </p>
      </Section>

      <Section number="9" title="Comment utiliser ce module dans une démarche RSE ?">
        <p>Suivez ces étapes progressivement :</p>
        <ol className="list-decimal list-inside space-y-1 mt-1">
          <li>Listez tous vos fournisseurs actifs (même sans toutes les informations)</li>
          <li>Complétez les fiches au fur et à mesure que vous collectez l'information</li>
          <li>Évaluez en priorité les fournisseurs les plus importants (criticité élevée)</li>
          <li>Identifiez les risques concentrés (dépendance, géographie, secteur)</li>
          <li>Définissez un plan d'action : diversification, audit fournisseurs, partenariats RSE</li>
          <li>Réévaluez annuellement l'ensemble de votre portefeuille fournisseurs</li>
        </ol>
        <ExampleBox>
          Une ETI industrielle commence par lister ses 20 fournisseurs principaux, les évalue en criticité/risque,
          découvre une forte dépendance géographique sur l'Asie, et décide de sourcer davantage en Europe.
        </ExampleBox>
      </Section>
    </div>
  );
}
