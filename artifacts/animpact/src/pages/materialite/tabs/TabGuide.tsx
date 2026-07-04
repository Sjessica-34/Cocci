import { BookOpen, BarChart2, Sparkles, FileText } from "lucide-react";

const STEPS = [
  {
    icon: <BookOpen className="h-5 w-5" />,
    step: "1",
    title: "Parcourez la bibliothèque d'enjeux",
    desc: "Explorez les 70+ enjeux RSE organisés par thématique. Vous pouvez aussi ajouter vos propres enjeux spécifiques à votre activité.",
  },
  {
    icon: <BarChart2 className="h-5 w-5" />,
    step: "2",
    title: "Notez chaque enjeu",
    desc: "Pour chaque enjeu, attribuez deux notes de 1 à 5 : l'importance estimée pour vos parties prenantes, et l'importance pour votre entreprise.",
  },
  {
    icon: <BarChart2 className="h-5 w-5" />,
    step: "3",
    title: "Visualisez la matrice",
    desc: "La matrice positionne automatiquement chaque enjeu selon ses deux scores. Les 12 enjeux les plus matériels sont mis en évidence.",
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    step: "4",
    title: "Générez la synthèse IA",
    desc: "L'IA analyse vos 12 enjeux prioritaires, détecte les thématiques communes et les regroupe en 4 super-enjeux stratégiques avec une synthèse rédigée.",
  },
  {
    icon: <FileText className="h-5 w-5" />,
    step: "5",
    title: "Réutilisez dans votre rapport",
    desc: "La synthèse générée sera directement réutilisable dans votre rapport RSE, votre plan d'actions et vos recommandations.",
  },
];

const FAQ = [
  {
    q: "Qu'est-ce que la matrice de matérialité ?",
    a: "C'est un outil stratégique qui permet d'identifier et de prioriser les enjeux RSE les plus importants pour votre entreprise et vos parties prenantes. Elle est au cœur de nombreux référentiels (GRI, CSRD).",
  },
  {
    q: "Comment noter l'importance pour les parties prenantes ?",
    a: "Cette note représente l'importance que vous estimez que vos parties prenantes accordent à cet enjeu. Elle est basée sur votre connaissance de leurs attentes (enquêtes, dialogues, analyses sectorielles).",
  },
  {
    q: "Que sont les super-enjeux ?",
    a: "Ce sont 4 thématiques stratégiques générées automatiquement par l'IA à partir de vos 12 enjeux les plus matériels. Chaque super-enjeu regroupe des enjeux qui partagent une logique commune et est accompagné d'une synthèse rédigée.",
  },
  {
    q: "Puis-je ajouter mes propres enjeux ?",
    a: "Oui. Chaque entreprise est différente. Dans l'onglet Bibliothèque, vous pouvez ajouter des enjeux spécifiques à votre secteur ou activité qui ne figurent pas dans la bibliothèque standard.",
  },
];

export function TabGuide() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Comment utiliser la matrice de matérialité ?</h2>
        <p className="text-sm text-muted-foreground">
          La matrice de matérialité vous permet d'identifier vos enjeux RSE prioritaires et de les analyser grâce à l'intelligence artificielle.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {STEPS.map((s) => (
          <div key={s.step} className="flex gap-4 p-4 rounded-xl border border-border bg-muted/20">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
              {s.step}
            </div>
            <div>
              <p className="font-medium text-foreground text-sm">{s.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Questions fréquentes</h3>
        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <div key={i} className="p-4 rounded-xl border border-border">
              <p className="text-sm font-medium text-foreground mb-1">{item.q}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
