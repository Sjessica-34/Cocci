import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  ArrowRight,
  Leaf,
  FolderOpen,
  FileText,
  Star,
  Building2,
  Layers,
} from "lucide-react";

// ─── App Mockup ───────────────────────────────────────────────────────────────

function RingGauge({ pct, color }: { pct: number; color: string }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r={r} fill="none" stroke="#e5e7eb" strokeWidth="5" />
      <circle
        cx="24" cy="24" r={r} fill="none"
        stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
      />
      <text x="24" y="28" textAnchor="middle" fontSize="9" fontWeight="700" fill={color}>{pct}%</text>
    </svg>
  );
}

function AppMockup() {
  const sidebarItems = [
    "Tableau de bord",
    "Mes parties prenantes",
    "Matrice de matérialité",
    "Mes dépendances à…",
    "Achats & Fournisseur…",
    "Mon bilan carbone",
    "Ma démarche Numéri…",
    "Baromètre Social",
    "Capital Humain",
    "Mes actions RSE",
    "Mon Impact Score",
    "Mes labels",
    "Ma captation carbone",
    "Mon diagnostic RSE",
    "Mon rapport RSE",
    "Mes ressources",
    "Mes documents",
    "Échanges avec Cocci",
    "Administration",
  ];

  return (
    <div className="relative w-full max-w-[560px] mx-auto select-none pointer-events-none">
      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-2xl bg-white flex text-[9px] leading-tight font-sans">

        {/* ── Sidebar ── */}
        <aside className="w-[130px] shrink-0 bg-[#163028] text-white flex flex-col overflow-hidden">
          {/* Logo */}
          <div className="px-3 py-2.5 flex items-center gap-1.5 border-b border-white/10">
            <Leaf className="h-3 w-3 text-green-400" />
            <span className="font-bold text-[11px] tracking-tight">Cocci</span>
          </div>

          {/* Org header */}
          <div className="px-3 py-2 border-b border-white/10">
            <p className="text-[7px] uppercase tracking-widest text-green-400/70 mb-0.5">Martin GRP</p>
            <p className="text-white/90 font-semibold text-[9px]">Vue Groupe</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-white/40 text-[7.5px]">Exercic…</span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[6.5px] px-1 py-0.5 rounded font-semibold">En cours</span>
            </div>
          </div>

          {/* Nav */}
          <div className="flex-1 overflow-hidden py-1">
            {sidebarItems.map((item) => (
              <div
                key={item}
                className={`px-3 py-[3.5px] text-[8.5px] truncate flex items-center gap-1.5 ${
                  item === "Tableau de bord"
                    ? "bg-emerald-600/30 text-white font-semibold border-l-2 border-emerald-400"
                    : "text-white/55 hover:text-white/80"
                }`}
              >
                {item}
              </div>
            ))}
          </div>

          {/* User footer */}
          <div className="border-t border-white/10 px-3 py-2">
            <p className="text-white/90 font-semibold text-[8.5px]">Martin MATIN</p>
            <p className="text-white/40 text-[7px] truncate">martin@a-nim-pact.fr</p>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="flex-1 min-w-0 bg-gray-50 flex flex-col">

          {/* Top bar */}
          <div className="bg-white border-b border-gray-100 px-4 py-2.5">
            <p className="font-bold text-[13px] text-gray-900">Bonjour, Martin 🌿</p>
            <p className="text-gray-400 text-[8px] mt-0.5">martin grp · Agriculture &amp; Agro-alimentaire</p>
          </div>

          <div className="p-3 space-y-3 overflow-hidden">

            {/* KPI row */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                {
                  label: "Impact Score",
                  icon: "🌿",
                  value: "80",
                  suffix: "/100",
                  sub: "Score renseigné",
                  color: "text-emerald-600",
                  accent: "bg-emerald-50",
                },
                {
                  label: "Maturité RSE",
                  icon: "🌱",
                  value: "64%",
                  suffix: "",
                  sub: "Score global ENV · SOC · GOV",
                  color: "text-emerald-700",
                  accent: "bg-emerald-50",
                },
                {
                  label: "Plan d'action",
                  icon: "📋",
                  value: "100%",
                  suffix: "",
                  sub: "11 / 11 actions",
                  color: "text-blue-600",
                  accent: "bg-blue-50",
                  bar: true,
                },
                {
                  label: "Labels & Certifications",
                  icon: "🏅",
                  value: "1",
                  suffix: "",
                  sub: "label obtenu",
                  color: "text-amber-600",
                  accent: "bg-amber-50",
                },
              ].map((kpi) => (
                <div key={kpi.label} className={`${kpi.accent} rounded-lg border border-gray-100 p-2`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[7.5px] text-gray-500 leading-snug">{kpi.label}</span>
                    <span className="text-[9px]">{kpi.icon}</span>
                  </div>
                  <p className={`font-extrabold leading-none ${kpi.color}`} style={{ fontSize: 15 }}>
                    {kpi.value}<span className="text-[8px] font-normal text-gray-400">{kpi.suffix}</span>
                  </p>
                  {kpi.bar && (
                    <div className="h-1 bg-blue-200 rounded-full mt-1 mb-0.5">
                      <div className="h-full w-full bg-blue-500 rounded-full" />
                    </div>
                  )}
                  <p className="text-gray-400 text-[7px] mt-0.5 leading-snug">{kpi.sub}</p>
                </div>
              ))}
            </div>

            {/* DIAGNOSTIC RSE */}
            <div>
              <p className="text-[7.5px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">Diagnostic RSE</p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: "Environnement", emoji: "🌿", pct: 79, color: "#10b981" },
                  { label: "Social",        emoji: "👥", pct: 58, color: "#3b82f6" },
                  { label: "Gouvernance",   emoji: "🏛️", pct: 58, color: "#8b5cf6" },
                ].map((d) => (
                  <div key={d.label} className="bg-white rounded-lg border border-gray-100 p-2 flex flex-col items-center gap-1">
                    <div className="w-full flex items-center justify-between">
                      <span className="text-[8px] font-semibold text-gray-700">{d.emoji} {d.label}</span>
                      <span className="text-gray-300 text-[8px]">›</span>
                    </div>
                    <RingGauge pct={d.pct} color={d.color} />
                    <p className="text-[7px] text-gray-400">Score maturité</p>
                  </div>
                ))}
              </div>
            </div>

            {/* MODULES RSE */}
            <div>
              <p className="text-[7.5px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">Modules RSE</p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  {
                    label: "Bilan carbone", emoji: "🌍",
                    rows: [["Émissions totales", "43 tCO₂e"], ["Exercice", "2026"]],
                  },
                  {
                    label: "Dépendances biodiversité", emoji: "🌿",
                    rows: [["Éléments cartographiés", "14"], ["Ressources", "8"], ["Activités", "2"]],
                  },
                  {
                    label: "Parties prenantes", emoji: "👥",
                    rows: [["Parties prenantes identifiées", "1"]],
                  },
                  {
                    label: "Achats responsables", emoji: "🛒",
                    rows: [["Fournisseurs", "3"], ["Évalués RSE", "1"], ["Avec certification", "33% (1)"]],
                  },
                  {
                    label: "Numérique responsable", emoji: "💻",
                    rows: [["Score", "100%"], ["Niveau", "inr"]],
                  },
                  {
                    label: "Capital humain", emoji: "👤",
                    rows: [["Effectif", "9 pers."], ["Parité F/H", "56 / 44 %"], ["Âge moyen", "38 ans"], ["Turnover", "11 %"], ["Ancienneté moy.", "4,2 ans"]],
                  },
                ].map((m) => (
                  <div key={m.label} className="bg-white rounded-lg border border-gray-100 p-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[8px] font-semibold text-gray-700">{m.emoji} {m.label}</span>
                      <span className="text-gray-300 text-[7px]">↗</span>
                    </div>
                    {m.rows.map(([k, v]) => (
                      <div key={k} className="flex justify-between items-baseline gap-1">
                        <span className="text-[7px] text-gray-400 truncate">{k}</span>
                        <span className="text-[8px] font-bold text-gray-800 shrink-0">{v}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Contact footer */}
            <div className="text-center pt-1 pb-0.5">
              <p className="text-[7.5px] text-gray-400">Besoin d'un accompagnement ?</p>
              <p className="text-[8px] font-semibold text-emerald-700">bonjour@a-nim-pact.fr</p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

const features = [
  {
    n: 1,
    title: "Construisez votre démarche",
    body: "Identifiez vos enjeux, cartographiez vos parties prenantes, évaluez vos dépendances à la biodiversité, définissez vos priorités grâce à une matrice de matérialité et construisez une démarche RSE cohérente, étape par étape.",
  },
  {
    n: 2,
    title: "Mesurez vos impacts",
    body: "Saisissez vos données bilan carbone ou lancez une simulation rapide, évaluez votre maturité numérique responsable et suivez vos principaux indicateurs environnementaux pour mesurer vos progrès et orienter vos décisions.",
  },
  {
    n: 3,
    title: "Pilotez votre capital humain",
    body: "Diffusez automatiquement un questionnaire de baromètre social à vos collaborateurs, recueillez leurs réponses et visualisez les résultats en temps réel pour savoir ce que pense votre équipe et prendre le pouls de votre organisation. Suivez également vos indicateurs RH clés : parité femmes/hommes, moyenne d'âge, taux de turnover et ancienneté moyenne.",
  },
  {
    n: 4,
    title: "Planifiez et pilotez vos actions",
    body: "Générez automatiquement un plan d'action à partir de vos résultats, choisissez parmi des centaines d'actions proposées, suivez leur avancement, documentez vos réalisations et pilotez toutes vos actions dans un seul espace.",
  },
  {
    n: 5,
    title: "Valorisez vos engagements",
    body: "Suivez votre Impact Score, gérez vos labels et certifications, identifiez vos actions de captation carbone et valorisez concrètement les engagements de votre organisation auprès de vos parties prenantes.",
  },
  {
    n: 6,
    title: "Mesurez votre démarche globale et générez votre rapport",
    body: "Suivez l'évolution globale de votre maturité RSE grâce à des indicateurs consolidés et générez automatiquement un rapport RSE clair, structuré et prêt à être partagé.",
    note: "(Rapport volontaire, non conforme CSRD.)",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col text-gray-900">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}logo-dark.png`} alt="Cocci" className="h-7 w-auto" />
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in">
              <Button variant="ghost" size="sm" className="text-gray-600 font-medium">
                Se connecter
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="bg-[#163028] hover:bg-[#1e4438] text-white font-medium">
                Commencer
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero ── */}
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" />
              La plateforme RSE des TPE, PME et ETI françaises
            </div>

            <h1 className="text-[2.6rem] leading-[1.15] font-extrabold text-gray-900">
              Construisez votre démarche RSE en toute{" "}
              <span className="text-[#16a34a]">autonomie</span>, suivez vos engagements et mesurez <span className="text-[#16a34a]">votre impact</span>.
            </h1>

            <p className="text-base text-gray-500 leading-relaxed max-w-md">
              Cocci vous donne tous les outils pour structurer, piloter et valoriser votre stratégie RSE simplement.
            </p>

            <div className="flex items-center gap-6 text-sm font-medium text-gray-700">
              {["Simple", "Complet", "Pensé pour les PME"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#163028]" />
                  {t}
                </span>
              ))}
            </div>

            <div className="space-y-2">
              <Link href="/sign-up">
                <Button size="lg" className="h-12 px-7 text-sm font-semibold bg-[#163028] hover:bg-[#1e4438] text-white rounded-lg">
                  Demander une démo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Sans engagement
              </p>
            </div>
          </div>

          {/* Right — Mockup */}
          <div className="hidden lg:block">
            <AppMockup />
          </div>
        </section>

        {/* ── Features 1-6 ── */}
        <section className="border-t border-gray-100 bg-white py-20">
          <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-x-10 gap-y-14">
            {features.map((f) => (
              <div key={f.n}>
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl font-extrabold text-[#16a34a] leading-none">{f.n}.</span>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 leading-snug">{f.title}</h3>
                    <div className="w-8 h-0.5 bg-[#163028] mt-1.5" />
                  </div>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{f.body}</p>
                {f.note && <p className="text-xs text-gray-400 mt-2 italic">{f.note}</p>}
              </div>
            ))}
          </div>
        </section>

        {/* ── Centralisez vos ressources ── */}
        <section className="bg-gray-50 border-t border-gray-100 py-16">
          <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-xl font-bold text-[#16a34a] mb-3">Centralisez vos ressources</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Déposez vos documents, preuves et justificatifs au même endroit. Retrouvez-les facilement,
                utilisez-les pour alimenter automatiquement votre rapport RSE et accédez à des guides,
                modèles et ressources pratiques pour vous accompagner tout au long de votre démarche.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: FolderOpen, label: "Upload\nde documents" },
                { icon: CheckCircle2, label: "Preuves &\njustificatifs" },
                { icon: FileText, label: "Guides &\nmodèles" },
                { icon: Star, label: "Ressources\npratiques" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center gap-2 text-center">
                  <Icon className="h-5 w-5 text-[#163028]" />
                  <span className="text-xs font-medium text-gray-700 whitespace-pre-line leading-snug">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PME / Groupes ── */}
        <section className="bg-white border-t border-gray-100 py-16">
          <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-xl font-bold text-[#16a34a] mb-3">Conçu pour les PME comme pour les groupes</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Gérez plusieurs entités, filiales ou sites depuis une interface unique. Suivez chaque entité
                individuellement ou consolidez l'ensemble pour avoir une vision globale de votre démarche.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
                <Building2 className="h-5 w-5 text-[#163028] mb-2" />
                <h3 className="font-bold text-sm text-gray-900 mb-1">Multi-entités</h3>
                <p className="text-xs text-gray-500">Pilotez plusieurs entités, filiales ou sites dans un seul espace.</p>
              </div>
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
                <Layers className="h-5 w-5 text-[#163028] mb-2" />
                <h3 className="font-bold text-sm text-gray-900 mb-1">Consolidation</h3>
                <p className="text-xs text-gray-500">Visualisez vos indicateurs et résultats consolidés.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Page publique partageable ── */}
        <section className="bg-green-50 border-t border-green-100 py-16">
          <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center gap-10">
            {/* Illustration */}
            <div className="shrink-0 bg-white rounded-2xl border border-green-200 shadow-sm p-6 flex flex-col items-center gap-3 min-w-[180px]">
              <div className="h-12 w-12 rounded-full bg-[#163028] flex items-center justify-center">
                <Leaf className="h-6 w-6 text-green-300" />
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 font-mono truncate max-w-[140px]">cocci.app/p/abc123</p>
                <p className="text-xs font-semibold text-gray-700 mt-1">Votre page RSE publique</p>
              </div>
              <div className="flex items-center gap-1.5 bg-green-100 text-green-800 text-[11px] font-medium px-3 py-1 rounded-full">
                <CheckCircle2 className="h-3 w-3" /> Accessible sans compte
              </div>
            </div>
            {/* Texte */}
            <div>
              <h2 className="text-xl font-bold text-[#16a34a] mb-2">Partagez votre engagement RSE en un lien</h2>
              <p className="text-sm text-gray-500 leading-relaxed max-w-lg">
                Générez une page publique personnalisée présentant vos scores, vos engagements et votre plan d'actions. 
                Partagez-la avec vos clients, partenaires ou investisseurs sans qu'ils aient besoin d'un compte.
              </p>
              <ul className="mt-4 space-y-1.5 text-sm text-gray-600">
                {[
                  "Un lien unique, révocable à tout moment",
                  "Données mises à jour automatiquement",
                  "Texte d'introduction personnalisable",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#163028] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Bottom CTA ── */}
        <section className="bg-gray-50 border-t border-gray-200 py-14">
          <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Prêt à structurer et piloter votre démarche RSE ?
              </h2>
              <p className="text-sm text-gray-500">
                Échangez avec nos experts et découvrez comment Cocci peut répondre à vos besoins.
              </p>
            </div>
            <Link href="/sign-up" className="shrink-0">
              <Button size="lg" className="h-12 px-7 text-sm font-semibold bg-[#163028] hover:bg-[#1e4438] text-white rounded-lg">
                Demander une démo <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 bg-white py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}logo-dark.png`} alt="Cocci" className="h-5 w-auto" />
          </div>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} A-NIM-PACT SAS. Tous droits réservés.</p>
          <Link href="/legal">
            <span className="text-xs text-gray-400 hover:text-gray-600 underline cursor-pointer">Mentions légales</span>
          </Link>
        </div>
      </footer>

    </div>
  );
}
