import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  ArrowRight,
  Leaf,
  BarChart3,
  Users,
  ClipboardList,
  Star,
  FileText,
  FolderOpen,
  Building2,
  Layers,
} from "lucide-react";

// ─── App Mockup ───────────────────────────────────────────────────────────────

function AppMockup() {
  return (
    <div className="relative w-full max-w-[540px] mx-auto select-none pointer-events-none">
      {/* Drop shadow card */}
      <div className="rounded-2xl overflow-hidden border border-border/60 shadow-2xl bg-white text-[10px] leading-tight font-sans">
        {/* Top bar */}
        <div className="flex items-stretch border-b border-gray-100">
          {/* Sidebar */}
          <aside className="w-[130px] shrink-0 bg-[#163028] text-white flex flex-col">
            {/* Logo */}
            <div className="px-3 py-2.5 flex items-center gap-1.5 border-b border-white/10">
              <Leaf className="h-3 w-3 text-green-400" />
              <span className="font-bold text-[11px]">Cocci</span>
            </div>
            {/* Nav sections */}
            <div className="px-2 pt-2 pb-1">
              <p className="text-[8px] uppercase tracking-widest text-green-400/70 mb-1 px-1">Démarche RSE</p>
              {["Tableau de bord", "Parties prenantes", "Matrice de matérialité", "Dépendances & impacts", "Achats Responsables"].map((item) => (
                <div key={item} className={`px-2 py-1 rounded text-white/70 text-[9px] ${item === "Tableau de bord" ? "bg-white/10 text-white" : ""}`}>{item}</div>
              ))}
            </div>
            <div className="px-2 pt-1 pb-1">
              <p className="text-[8px] uppercase tracking-widest text-green-400/70 mb-1 px-1">Pilotage & suivi</p>
              {["Bilan carbone", "Numérique responsable", "Baromètre social", "Capital humain", "Actions RSE", "Impact Score"].map((item) => (
                <div key={item} className="px-2 py-1 rounded text-white/70 text-[9px]">{item}</div>
              ))}
            </div>
            <div className="px-2 pt-1 pb-1">
              <p className="text-[8px] uppercase tracking-widest text-green-400/70 mb-1 px-1">Reporting</p>
              {["Diagnostic RSE", "Rapport RSE"].map((item) => (
                <div key={item} className="px-2 py-1 rounded text-white/70 text-[9px]">{item}</div>
              ))}
            </div>
            <div className="px-2 pt-1 pb-1">
              <p className="text-[8px] uppercase tracking-widest text-green-400/70 mb-1 px-1">Ressources</p>
              {["Documents & ressources"].map((item) => (
                <div key={item} className="px-2 py-1 rounded text-white/70 text-[9px]">{item}</div>
              ))}
            </div>
            <div className="mt-auto px-2 py-2 border-t border-white/10">
              <div className="px-2 py-1 text-white/50 text-[9px]">Paramètres</div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 bg-gray-50 overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900 text-[10px]">Bonjour, Jessica 🌿</p>
                <p className="text-gray-400 text-[8px]">martin.gro · Agriculture &amp; Agro-alimentaire</p>
              </div>
            </div>

            <div className="p-3 space-y-2.5">
              {/* KPI row */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: "Impact Score", value: "80", sub: "Score écologique", color: "text-emerald-600" },
                  { label: "Maturité RSE", value: "64%", sub: "Score global ENV · SOC · GOV", color: "text-blue-600" },
                  { label: "Plan d'action", value: "100%", sub: "11 / 11 actions", color: "text-violet-600" },
                  { label: "Labels & Certifications", value: "1", sub: "label obtenu", color: "text-amber-600" },
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-white rounded-lg border border-gray-100 p-2">
                    <p className="text-gray-400 text-[7.5px] mb-0.5">{kpi.label}</p>
                    <p className={`font-bold text-[14px] leading-none ${kpi.color}`}>{kpi.value}</p>
                    <p className="text-gray-400 text-[7px] mt-0.5">{kpi.sub}</p>
                  </div>
                ))}
              </div>

              {/* Diagnostic RSE */}
              <div className="bg-white rounded-lg border border-gray-100 p-2.5">
                <p className="font-semibold text-[9px] text-gray-700 mb-2">DIAGNOSTIC RSE</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Environnement", icon: "🌿", score: "79%", color: "text-emerald-600" },
                    { label: "Social", icon: "👥", score: "58%", color: "text-blue-600" },
                    { label: "Gouvernance", icon: "🏛️", score: "58%", color: "text-violet-600" },
                  ].map((item) => (
                    <div key={item.label} className="text-center">
                      <div className="text-[8px] text-gray-500 mb-1">{item.icon} {item.label}</div>
                      {/* Ring chart placeholder */}
                      <div className="w-10 h-10 mx-auto rounded-full border-4 border-gray-100 flex items-center justify-center relative">
                        <div className="absolute inset-0 rounded-full" style={{
                          background: `conic-gradient(${item.color === "text-emerald-600" ? "#10b981" : item.color === "text-blue-600" ? "#3b82f6" : "#8b5cf6"} ${parseInt(item.score) * 3.6}deg, #f3f4f6 0deg)`
                        }} />
                        <span className={`relative z-10 font-bold text-[8px] ${item.color}`}>{item.score}</span>
                      </div>
                      <p className="text-[7px] text-gray-400 mt-0.5">Score maturité</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suivi & indicateurs */}
              <div className="bg-white rounded-lg border border-gray-100 p-2.5">
                <p className="font-semibold text-[9px] text-gray-700 mb-2">SUIVI &amp; INDICATEURS</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: "Bilan carbone", value: "43 tCO₂e", sub: "Émissions totales\nExercice 2025" },
                    { label: "Actions RSE", value: "11", sub: "Actions en cours" },
                    { label: "Baromètre social", value: "76%", sub: "Satisfaction globale" },
                    { label: "Capital humain", value: "9 pers.", sub: "Effectif total" },
                  ].map((item) => (
                    <div key={item.label} className="border border-gray-100 rounded p-1.5">
                      <p className="text-[7px] text-gray-400">{item.label}</p>
                      <p className="font-bold text-[11px] text-gray-800 mt-0.5">{item.value}</p>
                      <p className="text-[6.5px] text-gray-400 mt-0.5 whitespace-pre-line">{item.sub}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer banner */}
              <div className="bg-[#163028] rounded-lg px-3 py-2 flex items-center justify-between">
                <div>
                  <span className="text-green-300 text-[8px] font-semibold">📄 Rapport RSE</span>
                  <span className="text-white/50 text-[7px] ml-2">Généré automatiquement · Dernière mise à jour : aujourd'hui</span>
                </div>
                <div className="bg-white text-[#163028] text-[8px] font-semibold px-2 py-1 rounded">
                  Voir le rapport
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Home page ────────────────────────────────────────────────────────────────

const features = [
  {
    n: 1,
    title: "Construisez votre démarche",
    body: "Identifiez vos enjeux, cartographiez vos parties prenantes, évaluez vos dépendances à la biodiversité, définissez vos priorités grâce à une matrice de matérialité et construisez une démarche RSE cohérente, étape par étape.",
  },
  {
    n: 2,
    title: "Mesurez vos impacts",
    body: "Réalisez votre bilan carbone, évaluez votre maturité numérique responsable et suivez vos principaux indicateurs environnementaux pour mesurer vos progrès et orienter vos décisions.",
  },
  {
    n: 3,
    title: "Pilotez votre capital humain",
    body: "Diffusez automatiquement un questionnaire de baromètre social à vos collaborateurs, recueillez leurs réponses et visualisez les résultats en temps réel pour savoir ce que pense votre équipe et prendre le pouls de votre organisation.",
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

export function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col text-gray-900">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-[#163028]" />
            <span className="font-bold text-lg text-[#163028] tracking-tight">Cocci</span>
          </div>
          <Link href="/sign-in">
            <Button variant="ghost" size="sm" className="text-gray-600 font-medium">
              Se connecter
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero ───────────────────────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div className="space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" />
              La plateforme RSE des TPE, PME et ETI françaises
            </div>

            {/* Headline */}
            <h1 className="text-[2.6rem] leading-[1.15] font-extrabold text-gray-900">
              Construisez votre démarche RSE en toute{" "}
              <span className="text-[#163028]">autonomie</span>, suivez vos engagements et mesurez votre impact.
            </h1>

            {/* Sub */}
            <p className="text-base text-gray-500 leading-relaxed max-w-md">
              Cocci vous donne tous les outils pour structurer, piloter et valoriser votre stratégie RSE simplement.
            </p>

            {/* Trust badges */}
            <div className="flex items-center gap-6 text-sm font-medium text-gray-700">
              {["Simple", "Complet", "Pensé pour les PME"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#163028]" />
                  {t}
                </span>
              ))}
            </div>

            {/* CTA */}
            <div className="space-y-2">
              <Link href="/sign-up">
                <Button
                  size="lg"
                  className="h-12 px-7 text-sm font-semibold bg-[#163028] hover:bg-[#1e4438] text-white rounded-lg"
                >
                  Demander une démo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Sans engagement
              </p>
            </div>
          </div>

          {/* Right — App mockup */}
          <div className="hidden lg:block">
            <AppMockup />
          </div>
        </section>

        {/* ── Features 1-6 ───────────────────────────────────────────────────── */}
        <section className="border-t border-gray-100 bg-white py-20">
          <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-x-10 gap-y-14">
            {features.map((f) => (
              <div key={f.n}>
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl font-extrabold text-gray-900 leading-none">{f.n}.</span>
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

        {/* ── Centralisez vos ressources ─────────────────────────────────────── */}
        <section className="bg-gray-50 border-t border-gray-100 py-16">
          <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Centralisez vos ressources</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Déposez vos documents, preuves et justificatifs au même endroit. Retrouvez-les facilement, utilisez-les pour alimenter automatiquement votre rapport RSE et accédez à des guides, modèles et ressources pratiques pour vous accompagner tout au long de votre démarche.
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

        {/* ── Conçu pour les PME comme pour les groupes ──────────────────────── */}
        <section className="bg-white border-t border-gray-100 py-16">
          <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Conçu pour les PME comme pour les groupes</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Gérez plusieurs entités, filiales ou sites depuis une interface unique. Suivez chaque entité individuellement ou consolidez l'ensemble pour avoir une vision globale de votre démarche.
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

        {/* ── Bottom CTA ─────────────────────────────────────────────────────── */}
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
              <Button
                size="lg"
                className="h-12 px-7 text-sm font-semibold bg-[#163028] hover:bg-[#1e4438] text-white rounded-lg"
              >
                Demander une démo <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 bg-white py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-[#163028]" />
            <span className="font-bold text-[#163028] text-sm">Cocci</span>
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
