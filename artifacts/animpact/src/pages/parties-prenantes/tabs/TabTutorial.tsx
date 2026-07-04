import { BookOpen, Users2, BarChart3, Map, FileText, HelpCircle, Lightbulb, Target, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type FAQItem = { q: string; a: string };

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "Qu'est-ce qu'une partie prenante ?",
    a: "Une partie prenante est toute personne, groupe ou organisation qui peut affecter ou être affectée par vos activités, décisions ou performances. En RSE, identifier vos parties prenantes est une étape clé pour comprendre vos impacts et construire un dialogue ouvert.",
  },
  {
    q: "Comment noter l'influence et l'intérêt ?",
    a: "L'influence (ou pouvoir) mesure la capacité d'une partie prenante à impacter vos décisions ou opérations. L'intérêt mesure son niveau d'implication ou de préoccupation vis-à-vis de vos activités. Notez de 1 (faible) à 5 (très fort).",
  },
  {
    q: "Quelle est la différence entre la cartographie et la matrice ?",
    a: "La cartographie vous offre une vue visuelle de l'ensemble de vos parties prenantes regroupées par catégorie. La matrice d'influence-intérêt classe vos parties prenantes selon leurs scores pour identifier les priorités de dialogue.",
  },
  {
    q: "À quelle fréquence mettre à jour cet inventaire ?",
    a: "Il est recommandé de revoir votre cartographie des parties prenantes au moins une fois par an, ou lors de changements stratégiques importants (fusion, nouveau marché, crise, etc.).",
  },
  {
    q: "Comment utiliser la synthèse pour le rapport RSE ?",
    a: "La synthèse consolide automatiquement toutes vos données et sera utilisée pour alimenter votre rapport RSE. Elle présente vos parties prenantes, leurs scores, et les indicateurs clés nécessaires à votre reporting.",
  },
];

function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="border border-border rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="text-sm font-medium text-foreground">{item.q}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground shrink-0 ml-4 transition-transform",
                open === i && "rotate-180",
              )}
            />
          </button>
          {open === i && (
            <div className="px-4 pb-4 pt-0">
              <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

type StepProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
};

function Step({ icon, title, description, color }: StepProps) {
  return (
    <div className="flex gap-4">
      <div
        className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
          color,
        )}
      >
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export function TabTutorial() {
  return (
    <div className="max-w-3xl mx-auto space-y-10 py-2">
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
          <Users2 className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Cartographier vos parties prenantes</h2>
        <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Le module Parties Prenantes vous permet d'identifier, d'évaluer et de visualiser l'ensemble des
          acteurs qui interagissent avec votre entreprise — une étape fondamentale de votre démarche RSE.
        </p>
      </div>

      {/* What & Why */}
      <div className="bg-muted/30 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground">Pourquoi cartographier ses parties prenantes ?</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          La cartographie des parties prenantes est une exigence des principaux référentiels RSE (GRI, CSRD, ISO 26000).
          Elle vous permet de structurer votre dialogue, prioriser vos actions et démontrer votre engagement
          auprès de l'ensemble de votre écosystème.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {[
            { icon: <Target className="h-4 w-4" />, label: "Prioriser vos actions", color: "text-primary bg-primary/10" },
            { icon: <Users2 className="h-4 w-4" />, label: "Structurer le dialogue", color: "text-blue-600 bg-blue-50" },
            { icon: <FileText className="h-4 w-4" />, label: "Répondre aux référentiels", color: "text-emerald-600 bg-emerald-50" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2.5 p-3 bg-background rounded-lg border border-border"
            >
              <div className={cn("h-7 w-7 rounded-md flex items-center justify-center shrink-0", item.color)}>
                {item.icon}
              </div>
              <span className="text-sm font-medium text-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* How to use — 5 steps */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          Comment utiliser ce module ?
        </h3>
        <div className="space-y-5 pl-1">
          <Step
            icon={<span className="text-white text-sm font-bold">1</span>}
            color="bg-primary"
            title="Saisie — Ajoutez vos parties prenantes"
            description="Identifiez chaque acteur clé de votre écosystème. Choisissez sa catégorie dans le menu déroulant, donnez-lui un nom et notez son niveau d'influence et d'intérêt de 1 à 5."
          />
          <Step
            icon={<Map className="h-4 w-4 text-white" />}
            color="bg-blue-500"
            title="Cartographie — Visualisez votre écosystème"
            description="La cartographie se génère automatiquement à partir de vos données. Elle représente vos parties prenantes de façon visuelle, regroupées par catégorie."
          />
          <Step
            icon={<BarChart3 className="h-4 w-4 text-white" />}
            color="bg-violet-500"
            title="Matrice d'influence — Analysez les priorités"
            description="La matrice Influence × Intérêt classe automatiquement vos parties prenantes en 4 quadrants pour vous aider à définir vos stratégies de dialogue."
          />
          <Step
            icon={<FileText className="h-4 w-4 text-white" />}
            color="bg-emerald-500"
            title="Synthèse — Explorez les indicateurs"
            description="La synthèse consolide toutes vos données avec des indicateurs clés, des statistiques et des graphiques prêts à intégrer dans votre rapport RSE."
          />
        </div>
      </div>

      {/* Tips */}
      <div className="border border-amber-200 bg-amber-50 rounded-xl p-5 space-y-2">
        <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
          <Lightbulb className="h-4 w-4" /> Conseils pour bien noter
        </h4>
        <ul className="space-y-1.5 text-sm text-amber-700">
          <li>• <strong>Influence 1</strong> : aucun impact sur vos décisions ou opérations.</li>
          <li>• <strong>Influence 5</strong> : peut bloquer ou transformer vos activités (régulateur, investisseur clé…).</li>
          <li>• <strong>Intérêt 1</strong> : peu ou pas concerné par votre activité.</li>
          <li>• <strong>Intérêt 5</strong> : très impliqué, suit de près vos performances RSE.</li>
          <li>• En cas de doute, notez 3 et ajustez selon l'évolution de la relation.</li>
        </ul>
      </div>

      {/* FAQ */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary" />
          Questions fréquentes
        </h3>
        <FAQAccordion items={FAQ_ITEMS} />
      </div>
    </div>
  );
}
