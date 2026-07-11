import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Wrench, Anchor, BookOpen, ExternalLink } from "lucide-react";

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

const ODD_LIST = [
  { num: 1,  color: "bg-[#e5243b]", label: "Pas de pauvreté", desc: "Éliminer la pauvreté sous toutes ses formes, partout dans le monde." },
  { num: 2,  color: "bg-[#dda63a]", label: "Faim zéro", desc: "Éliminer la faim, assurer la sécurité alimentaire, améliorer la nutrition et promouvoir l'agriculture durable." },
  { num: 3,  color: "bg-[#4c9f38]", label: "Bonne santé et bien-être", desc: "Permettre à tous de vivre en bonne santé et promouvoir le bien-être de tous à tout âge." },
  { num: 4,  color: "bg-[#c5192d]", label: "Éducation de qualité", desc: "Assurer l'accès de tous à une éducation de qualité, sur un pied d'égalité, et promouvoir les possibilités d'apprentissage tout au long de la vie." },
  { num: 5,  color: "bg-[#ff3a21]", label: "Égalité entre les sexes", desc: "Parvenir à l'égalité des sexes et autonomiser toutes les femmes et les filles." },
  { num: 6,  color: "bg-[#26bde2]", label: "Eau propre et assainissement", desc: "Garantir l'accès de tous à des services d'alimentation en eau et d'assainissement gérés de façon durable." },
  { num: 7,  color: "bg-[#fcc30b]", label: "Énergie propre et d'un coût abordable", desc: "Garantir l'accès de tous à des services énergétiques fiables, durables et modernes, à un coût abordable." },
  { num: 8,  color: "bg-[#a21942]", label: "Travail décent et croissance économique", desc: "Promouvoir une croissance économique soutenue, partagée et durable, le plein emploi productif et un travail décent pour tous." },
  { num: 9,  color: "bg-[#fd6925]", label: "Industrie, innovation et infrastructure", desc: "Bâtir une infrastructure résiliente, promouvoir une industrialisation durable qui profite à tous et encourager l'innovation." },
  { num: 10, color: "bg-[#dd1367]", label: "Inégalités réduites", desc: "Réduire les inégalités dans les pays et d'un pays à l'autre." },
  { num: 11, color: "bg-[#fd9d24]", label: "Villes et communautés durables", desc: "Faire en sorte que les villes et les établissements humains soient ouverts à tous, sûrs, résilients et durables." },
  { num: 12, color: "bg-[#bf8b2e]", label: "Consommation et production responsables", desc: "Établir des modes de consommation et de production durables." },
  { num: 13, color: "bg-[#3f7e44]", label: "Mesures relatives à la lutte contre les changements climatiques", desc: "Prendre d'urgence des mesures pour lutter contre les changements climatiques et leurs répercussions." },
  { num: 14, color: "bg-[#0a97d9]", label: "Vie aquatique", desc: "Conserver et exploiter de manière durable les océans, les mers et les ressources marines aux fins du développement durable." },
  { num: 15, color: "bg-[#56c02b]", label: "Vie terrestre", desc: "Préserver et restaurer les écosystèmes terrestres, gérer durablement les forêts, lutter contre la désertification, stopper et inverser le processus de dégradation des terres, et mettre fin à l'appauvrissement de la biodiversité." },
  { num: 16, color: "bg-[#00689d]", label: "Paix, justice et institutions efficaces", desc: "Promouvoir l'avènement de sociétés pacifiques et ouvertes, assurer l'accès de tous à la justice et mettre en place des institutions efficaces, responsables et ouvertes à tous." },
  { num: 17, color: "bg-[#19486a]", label: "Partenariats pour la réalisation des objectifs", desc: "Revitaliser le partenariat mondial au service du développement durable et renforcer les moyens de ce partenariat." },
];

export function GuideRSE() {
  return (
    <AppLayout>
      <div className="space-y-10 pb-16 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Guide RSE
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Comprenez les concepts clés pour mener votre démarche RSE avec méthode.
          </p>
        </div>

        {/* Comment utiliser */}
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Comment utiliser le référentiel Cocci ?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Parcourez les 232 actions du référentiel dans <strong className="text-foreground">Mes actions RSE</strong>.
            Cochez chaque action réalisée, ajoutez la date, un commentaire et, si besoin, un justificatif (photo, facture, attestation, PDF…).
            Vos justificatifs sont automatiquement classés dans <strong className="text-foreground">Mes documents → Mes actions RSE</strong>.
          </p>
          <Card className="border mt-4">
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

        {/* Niveaux */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Les 3 niveaux d'action</h2>
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
          <h2 className="text-lg font-semibold mb-3">Les piliers ESG</h2>
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
          <h2 className="text-lg font-semibold mb-3">Les 6 catégories du référentiel Cocci</h2>
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
          <h2 className="text-lg font-semibold mb-1">Les 17 Objectifs de Développement Durable (ODD)</h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-2xl leading-relaxed">
            Les ODD sont les 17 objectifs mondiaux adoptés par les 193 pays membres de l'ONU en septembre 2015
            dans le cadre du <em>Programme de développement durable à l'horizon 2030</em>. Ils forment un
            appel universel à agir pour éliminer la pauvreté, protéger la planète et améliorer les conditions
            de vie de tous. Chaque action du référentiel Cocci est alignée sur un ou plusieurs ODD.
            <a
              href="https://sdgs.un.org/goals"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 ml-2 text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Site ONU <ExternalLink className="h-3 w-3" />
            </a>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ODD_LIST.map((odd) => (
              <div key={odd.num} className="flex items-start gap-3">
                <div className={`${odd.color} text-white rounded-md w-9 h-9 flex items-center justify-center text-sm font-bold shrink-0`}>
                  {odd.num}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{odd.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{odd.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
