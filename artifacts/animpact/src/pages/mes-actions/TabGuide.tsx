import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Wrench, Anchor } from "lucide-react";

const LEVELS = [
  {
    id: "quick",
    icon: Zap,
    label: "Action rapide",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    iconColor: "text-emerald-600",
    description: "Réalisable en moins d'une heure. Aucun investissement particulier requis. Idéal pour démarrer.",
    examples: ["Passer aux ampoules LED", "Nommer un référent RSE", "Acheter des mugs réutilisables", "Paramétrer la mise en veille des PC"],
  },
  {
    id: "project",
    icon: Wrench,
    label: "Projet",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    iconColor: "text-amber-600",
    description: "Nécessite quelques jours à quelques semaines de préparation. Implique plusieurs personnes.",
    examples: ["Réaliser un bilan carbone", "Mettre en place le tri sélectif", "Déployer une charte achats responsables", "Organiser un baromètre social"],
  },
  {
    id: "engagement",
    icon: Anchor,
    label: "Engagement structurel",
    color: "bg-violet-100 text-violet-800 border-violet-200",
    iconColor: "text-violet-600",
    description: "Action structurante à long terme. Implique la direction et des ressources dédiées.",
    examples: ["Définir une politique RSE", "Créer un comité RSE", "Passer à 100 % de véhicules électriques", "Labellisation"],
  },
];

const PILLARS = [
  { label: "E — Environnement", color: "bg-green-100 text-green-800 border-green-200", desc: "Energie, eau, déchets, carbone, biodiversité, numérique responsable" },
  { label: "S — Social", color: "bg-blue-100 text-blue-800 border-blue-200", desc: "Bien-être, formation, inclusion, santé/sécurité, mobilité, solidarité" },
  { label: "G — Gouvernance", color: "bg-purple-100 text-purple-800 border-purple-200", desc: "Stratégie RSE, pilotage, achats responsables, communication, parties prenantes" },
];

const CATEGORIES = [
  { label: "🌍 Environnement", desc: "Énergie, eau, déchets, plastiques, mobilier, papier, carbone et mobilité" },
  { label: "💻 Numérique responsable", desc: "Matériel, données, communication, site web, impression, sensibilisation" },
  { label: "🌿 Biodiversité", desc: "Faune, végétation, aménagement, diagnostic, sensibilisation" },
  { label: "👥 Social", desc: "QVT, formation, santé/sécurité, inclusion, intégration, mobilité, solidarité" },
  { label: "🤝 Achats responsables", desc: "Fournisseurs, achats durables" },
  { label: "⚖️ Gouvernance", desc: "Stratégie RSE, pilotage, communication, parties prenantes" },
];

export function TabGuide() {
  return (
    <div className="space-y-8 py-2">
      {/* Intro */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Comment utiliser le plan d'actions ?</h2>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
          Le plan d'actions vous permet de suivre vos engagements RSE tout au long de l'exercice.
          Parcourez la bibliothèque, ajoutez les actions pertinentes à votre plan et cochez-les
          au fil de leur réalisation. Chaque action peut être documentée avec une date de réalisation,
          un commentaire et un justificatif.
        </p>
      </div>

      {/* Niveaux */}
      <section>
        <h3 className="text-base font-semibold mb-3">Les 3 niveaux d'action</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {LEVELS.map((l) => (
            <Card key={l.id} className="border">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center gap-2">
                  <l.icon className={`h-4 w-4 ${l.iconColor}`} />
                  <Badge variant="outline" className={`text-xs font-medium ${l.color}`}>
                    {l.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                <p className="text-sm text-muted-foreground">{l.description}</p>
                <div className="space-y-1 pt-1">
                  <p className="text-xs font-medium text-foreground">Exemples :</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {l.examples.map((ex) => (
                      <li key={ex} className="flex items-start gap-1">
                        <span className="shrink-0 mt-0.5">•</span>
                        <span>{ex}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Piliers ESG */}
      <section>
        <h3 className="text-base font-semibold mb-3">Les piliers ESG</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PILLARS.map((p) => (
            <Card key={p.label} className="border">
              <CardContent className="px-4 py-4 space-y-1">
                <Badge variant="outline" className={`text-xs font-semibold ${p.color}`}>
                  {p.label}
                </Badge>
                <p className="text-sm text-muted-foreground pt-1">{p.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Catégories */}
      <section>
        <h3 className="text-base font-semibold mb-3">Les 6 catégories du référentiel Cocci</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CATEGORIES.map((c) => (
            <Card key={c.label} className="border">
              <CardContent className="px-4 py-3 space-y-0.5">
                <p className="text-sm font-medium">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ODD */}
      <section>
        <h3 className="text-base font-semibold mb-3">Les Objectifs de Développement Durable (ODD)</h3>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Chaque action du référentiel est associée aux ODD de l'ONU qu'elle contribue à atteindre.
          Les 17 ODD sont les objectifs mondiaux adoptés par les Nations Unies en 2015 pour mettre fin à la pauvreté,
          protéger la planète et garantir la paix et la prospérité d'ici 2030.
          En filtrant par ODD dans la bibliothèque, vous pouvez aligner votre plan d'actions sur ces objectifs.
        </p>
      </section>

      {/* Bonnes pratiques */}
      <section>
        <h3 className="text-base font-semibold mb-3">Bonnes pratiques</h3>
        <Card className="border">
          <CardContent className="px-4 py-4">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-foreground shrink-0">1.</span>
                <span><strong className="text-foreground">Commencez par les actions rapides</strong> — elles génèrent des résultats immédiats et mobilisent les équipes.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-foreground shrink-0">2.</span>
                <span><strong className="text-foreground">Planifiez 2-3 projets</strong> par exercice — des actions plus profondes avec un impact durable.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-foreground shrink-0">3.</span>
                <span><strong className="text-foreground">Visez 1 engagement structurel</strong> tous les 2 exercices pour ancrer la RSE dans la stratégie.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-foreground shrink-0">4.</span>
                <span><strong className="text-foreground">Documentez vos réalisations</strong> — les justificatifs et commentaires enrichissent votre rapport RSE.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-foreground shrink-0">5.</span>
                <span><strong className="text-foreground">Équilibrez les piliers E, S et G</strong> pour une démarche RSE globale et crédible.</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
