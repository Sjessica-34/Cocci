import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  CircleHelp,
  ClipboardList,
  Coins,
  FileText,
  Globe2,
  Leaf,
  Link2,
  Lightbulb,
  Play,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
  Warehouse,
} from "lucide-react";

const dimensions = [
  {
    title: "Environnement",
    icon: Globe2,
    iconClass: "text-emerald-600",
    surfaceClass: "bg-emerald-50 border-emerald-100",
    items: ["Climat", "Énergie", "Ressources", "Biodiversité"],
  },
  {
    title: "Social",
    icon: UsersRound,
    iconClass: "text-sky-600",
    surfaceClass: "bg-sky-50 border-sky-100",
    items: ["Conditions de travail", "Égalité", "Inclusion", "Compétences"],
  },
  {
    title: "Gouvernance",
    icon: Scale,
    iconClass: "text-violet-600",
    surfaceClass: "bg-violet-50 border-violet-100",
    items: ["Éthique", "Achats responsables", "Relations partenaires", "Pérennité"],
  },
];

const obligationTypes = [
  {
    title: "Obligation directe",
    description:
      "Certaines entreprises sont soumises à des exigences réglementaires selon leur activité ou leur situation.",
    icon: FileText,
    surfaceClass: "bg-sky-50 border-sky-100",
    iconClass: "text-sky-700",
  },
  {
    title: "Obligation indirecte",
    description:
      "D'autres sont sollicitées par leurs clients, donneurs d'ordre ou partenaires pour partager leurs pratiques.",
    icon: Link2,
    surfaceClass: "bg-violet-50 border-violet-100",
    iconClass: "text-violet-700",
  },
  {
    title: "Démarche volontaire",
    description:
      "Toute entreprise peut choisir de structurer ses engagements et d'en tirer les bénéfices au quotidien.",
    icon: Leaf,
    surfaceClass: "bg-emerald-50 border-emerald-100",
    iconClass: "text-emerald-700",
  },
];

const benefits = [
  {
    title: "Maîtriser ses coûts",
    description: "Énergie, ressources, déchets, achats...",
    icon: Coins,
    className: "md:translate-y-5",
  },
  {
    title: "Mobiliser ses équipes",
    description: "Engagement, recrutement et fidélisation.",
    icon: UsersRound,
    className: "md:-translate-y-1",
  },
  {
    title: "Répondre aux attentes",
    description: "Clients, partenaires, financeurs et donneurs d'ordre.",
    icon: CircleHelp,
    className: "md:translate-y-8",
  },
  {
    title: "Se différencier",
    description: "Valoriser ses engagements, notamment dans les appels d'offres.",
    icon: Sparkles,
    className: "md:-translate-y-2",
  },
  {
    title: "Anticiper",
    description: "Se préparer aux évolutions réglementaires.",
    icon: ShieldCheck,
    className: "md:translate-y-4",
  },
];

const ecosystem = [
  { label: "Entreprise", icon: Building2 },
  { label: "Collaborateurs", icon: UsersRound },
  { label: "Clients & partenaires", icon: Warehouse },
  { label: "Territoire", icon: Globe2 },
  { label: "Environnement", icon: Leaf },
];

const topics = [
  "Carbone",
  "Biodiversité",
  "Social",
  "Achats",
  "Numérique responsable",
  "Parties prenantes",
  "Indicateurs",
  "Labels",
  "Réglementation",
];

export function ConstruireDemarche() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-16 pb-16">
        <header className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-primary/[0.08] via-background to-emerald-50/70 px-6 py-7 md:px-10 md:py-9">
          <div className="relative z-10">
            <img
              src={`${import.meta.env.BASE_URL}logo-dark.png`}
              alt="Cocci — A-NIM-PACT"
              className="mb-8 h-7 w-auto md:h-8"
            />
            <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
                  Comprendre avant d'agir
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">
                  Construire ma démarche RSE
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
                  La RSE concerne toute l'entreprise. Comprenez les enjeux,
                  identifiez vos priorités et avancez avec une méthode adaptée
                  à votre organisation.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                <Button asChild className="shadow-sm">
                  <Link href="/diagnostic">
                    Commencer le diagnostic
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="bg-background/80">
                  <Link href="/guide-rse">
                    Voir le guide
                  </Link>
                </Button>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-emerald-300/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-sky-300/20 blur-3xl" />
        </header>

        <section className="space-y-5" aria-labelledby="definition-title">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Pour commencer
            </p>
            <h2 id="definition-title" className="mt-2 text-2xl font-semibold tracking-tight text-primary md:text-3xl">
              Mais avant d'aller plus loin, qu'est-ce que la RSE ?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              La Responsabilité Sociétale des Entreprises consiste à intégrer
              les enjeux environnementaux, sociaux et économiques dans les
              activités et les décisions de l'entreprise.
            </p>
          </div>

          <div className="relative rounded-2xl border border-border/70 bg-card p-5 shadow-sm md:p-8">
            <div className="grid items-center gap-5 md:grid-cols-[1fr_auto_1fr]">
              <DimensionCard dimension={dimensions[0]} align="right" />
              <div className="relative flex flex-col items-center justify-center">
                <div className="flex h-28 w-28 items-center justify-center rounded-full border-8 border-emerald-100 bg-primary text-center text-sm font-bold text-primary-foreground shadow-lg shadow-primary/10 md:h-36 md:w-36 md:text-base">
                  Votre<br />entreprise
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <span>Comprendre ses impacts</span>
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                </div>
              </div>
              <DimensionCard dimension={dimensions[1]} />
            </div>
            <div className="mx-auto mt-5 max-w-sm md:mt-0 md:max-w-md">
              <DimensionCard dimension={dimensions[2]} />
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-center text-sm font-semibold">
              <span className="rounded-full bg-muted px-3 py-1.5 text-foreground">
                Réduire les impacts négatifs
              </span>
              <span className="text-primary" aria-hidden="true">+</span>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-800">
                Renforcer les contributions positives
              </span>
            </div>
          </div>
        </section>

        <section className="space-y-5" aria-labelledby="benefits-title">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Une opportunité pour l'entreprise
            </p>
            <h2 id="benefits-title" className="mt-2 text-2xl font-semibold tracking-tight text-primary md:text-3xl">
              La RSE, une contrainte ? Pas seulement.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Bien construite, elle peut devenir un véritable atout pour
              l'entreprise et guider des décisions plus solides.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5 md:items-start">
            {benefits.map((benefit) => (
              <Card
                key={benefit.title}
                className={`border-border/70 transition-transform duration-300 hover:-translate-y-1 ${benefit.className}`}
              >
                <CardContent className="space-y-3 p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <benefit.icon className="h-4.5 w-4.5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{benefit.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {benefit.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border/70 bg-muted/35 px-5 py-8 md:px-10" aria-labelledby="ecosystem-title">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Une démarche qui rayonne
            </p>
            <h2 id="ecosystem-title" className="mt-2 text-2xl font-semibold tracking-tight text-primary">
              Créer de la valeur pour tout l'écosystème
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Une démarche RSE peut créer de la valeur pour l'entreprise et
              pour toutes celles et ceux qui l'entourent.
            </p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-5">
            {ecosystem.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-background px-3 py-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.03] md:flex-col md:justify-center md:text-center"
              >
                <item.icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-3 rounded-full border border-primary/15 bg-background px-4 py-2.5 text-center text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
            Une démarche RSE structurée
          </div>
        </section>

        <section className="space-y-5" aria-labelledby="obligation-title">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Des situations différentes
            </p>
            <h2 id="obligation-title" className="mt-2 text-2xl font-semibold tracking-tight text-primary md:text-3xl">
              La RSE est-elle obligatoire ?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Cela dépend de votre taille, de votre activité et de votre
              situation. Dans tous les cas, une démarche structurée aide à
              comprendre ses responsabilités et à agir concrètement.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {obligationTypes.map((item) => (
              <Card key={item.title} className={`border ${item.surfaceClass}`}>
                <CardContent className="space-y-3 p-5">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-background/80 ${item.iconClass}`}>
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-2xl bg-primary px-6 py-9 text-primary-foreground md:px-10 md:py-12" aria-labelledby="starting-title">
          <div className="relative z-10 grid gap-8 md:grid-cols-[1fr_0.9fr] md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
                Le point de départ
              </p>
              <h2 id="starting-title" className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                Alors, par où commencer ?
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-primary-foreground/75">
                Carbone, biodiversité, social, achats, numérique responsable,
                parties prenantes, indicateurs, labels, réglementation...
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {topics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-primary-foreground/90"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
              <Target className="h-7 w-7 text-emerald-200" aria-hidden="true" />
              <p className="mt-4 text-lg font-semibold leading-relaxed">
                Face à tous ces sujets, comment savoir quoi faire, dans quel
                ordre et pourquoi ?
              </p>
              <p className="mt-3 text-sm leading-relaxed text-primary-foreground/70">
                Cocci vous guide pour construire votre propre démarche RSE,
                étape par étape.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild variant="secondary">
                  <Link href="/diagnostic">
                    Ouvrir le diagnostic
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-white/25 bg-white/10 text-white hover:bg-white/20">
                  <Link href="/mes-actions">
                    Voir les actions
                  </Link>
                </Button>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full border-[36px] border-emerald-300/10" />
          <div className="pointer-events-none absolute -right-20 top-8 h-44 w-44 rounded-full bg-emerald-300/10 blur-3xl" />
        </section>

        <section className="space-y-5" aria-labelledby="method-title">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              La méthode Cocci
            </p>
            <h2 id="method-title" className="mt-2 text-2xl font-semibold tracking-tight text-primary md:text-3xl">
              Construisez votre démarche RSE avec Cocci
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Découvrez une méthode claire pour passer de l'envie d'agir à une
              démarche structurée, concrète et mesurable.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-[0.8fr_1.2fr] md:items-stretch">
            <Card className="border-border/70 bg-emerald-50/60">
              <CardContent className="flex h-full flex-col justify-center p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <BookOpen className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-primary">
                  Avancez à votre rythme
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Commencez par comprendre vos enjeux, consultez le
                  référentiel puis choisissez les actions les plus utiles pour
                  votre organisation.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href="/guide-rse">
                      Consulter le référentiel
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="bg-background/70">
                    <Link href="/mes-actions">
                      Passer aux actions
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-border/70 shadow-sm">
              <div
                className="relative flex aspect-video flex-col items-center justify-center bg-gradient-to-br from-primary via-primary/95 to-emerald-800 px-6 text-center text-primary-foreground"
                role="img"
                aria-label="Emplacement réservé à la vidéo de présentation de la méthode Cocci"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(167,243,208,0.18),transparent_35%)]" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/25 bg-white/10 shadow-lg backdrop-blur-sm">
                  <Play className="ml-1 h-7 w-7 fill-current" aria-hidden="true" />
                </div>
                <p className="relative mt-5 text-base font-semibold md:text-lg">
                  La vidéo arrive bientôt
                </p>
                <p className="relative mt-1 max-w-sm text-sm text-primary-foreground/70">
                  Un aperçu de la méthode Cocci sera disponible ici dès que la
                  vidéo finale sera prête.
                </p>
              </div>
              <CardHeader className="flex-row items-center gap-3 space-y-0 border-t border-border/60 px-5 py-4">
                <ClipboardList className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <CardTitle className="text-sm font-medium">
                  Une méthode claire pour avancer sans vous disperser
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </section>

        <div className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
          Une démarche pédagogique, progressive et adaptée à votre organisation.
        </div>
      </div>
    </AppLayout>
  );
}

function DimensionCard({
  dimension,
  align = "left",
}: {
  dimension: (typeof dimensions)[number];
  align?: "left" | "right";
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${dimension.surfaceClass} ${
        align === "right" ? "md:text-right" : ""
      }`}
    >
      <div
        className={`flex items-center gap-2 ${
          align === "right" ? "md:justify-end" : ""
        }`}
      >
        <dimension.icon className={`h-5 w-5 ${dimension.iconClass}`} />
        <h3 className="text-sm font-semibold">{dimension.title}</h3>
      </div>
      <div
        className={`mt-3 flex flex-wrap gap-1.5 ${
          align === "right" ? "md:justify-end" : ""
        }`}
      >
        {dimension.items.map((item) => (
          <span
            key={item}
            className="rounded-md bg-background/70 px-2 py-1 text-[11px] text-muted-foreground"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}