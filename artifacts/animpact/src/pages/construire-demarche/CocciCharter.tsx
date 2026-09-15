import { AppLayout } from "@/components/layout";
import { useState, type ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  CircleHelp,
  Compass,
  Handshake,
  Leaf,
  Play,
  Scale,
  Sparkles,
  Sprout,
  Target,
  UsersRound,
} from "lucide-react";

const dimensions = [
  {
    number: "01",
    title: "Environnement",
    color: "#dcefe2",
    ink: "#1b6b53",
    icon: Leaf,
    line: "Climat · Énergie · Ressources · Biodiversité",
  },
  {
    number: "02",
    title: "Social",
    color: "#dfeef0",
    ink: "#236d75",
    icon: UsersRound,
    line: "Conditions de travail · Égalité · Inclusion",
  },
  {
    number: "03",
    title: "Économie & gouvernance",
    color: "#f6e8d3",
    ink: "#a05d31",
    icon: Scale,
    line: "Éthique · Achats responsables · Pérennité",
  },
];

const benefits = [
  { title: "Réduire ses coûts", copy: "Énergie, ressources, déchets...", icon: BarChart3, tone: "green" },
  { title: "Attirer et fidéliser", copy: "Engagement, recrutement et talents.", icon: UsersRound, tone: "blue" },
  { title: "Répondre aux attentes", copy: "Clients, partenaires, financeurs.", icon: Handshake, tone: "yellow" },
  { title: "Se différencier", copy: "Valoriser ses engagements.", icon: Sparkles, tone: "coral" },
  { title: "Anticiper l'avenir", copy: "Évolutions réglementaires.", icon: Compass, tone: "teal" },
];

const topics = ["Carbone", "Biodiversité", "Social", "Achats", "Numérique", "Labels", "Indicateurs", "Réglementation"];

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#28705d]">
      <span className="h-2 w-2 rounded-full bg-[#ef8c67]" />
      {children}
    </p>
  );
}

function BotanicalMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 150 120" fill="none" aria-hidden="true">
      <path d="M27 117C32 79 53 48 87 25" stroke="#559a78" strokeWidth="3" strokeLinecap="round" />
      <path d="M48 76C23 71 11 57 10 37c22 1 39 12 44 31" fill="#9bcbae" />
      <path d="M68 52C69 29 84 13 109 8c2 22-12 42-36 51" fill="#6dab88" />
      <path d="M42 96c-17-1-29-10-36-26 19-4 37 5 45 21" fill="#c6dfc5" />
      <circle cx="119" cy="23" r="5" fill="#ed9a72" />
      <path d="M128 41l6 6m0-6-6 6" stroke="#ed9a72" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function GuideIllustration() {
  return (
    <div className="relative mx-auto aspect-[1.05] w-full max-w-[510px] overflow-hidden rounded-[2.25rem] border border-[#d5e6dc] bg-[#f4eadb] shadow-[0_18px_55px_rgba(31,82,69,0.10)]">
      <div className="absolute left-7 top-7 rounded-full bg-[#fffaf1]/80 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#28705d]">
        Un impact aujourd'hui...
      </div>
      <div className="absolute right-7 top-6 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#1a5650] bg-[#fffaf1] text-center text-xs font-bold leading-tight text-[#1a5650]">
        RSE ?
      </div>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 500 470" fill="none" aria-hidden="true">
        <path d="M315 113c25 11 39 25 49 50" stroke="#1a5650" strokeWidth="2" strokeDasharray="5 6" />
        <path d="M358 158l7 10 5-12" stroke="#1a5650" strokeWidth="2" />
        <path d="M368 190c15 18 25 31 41 44" stroke="#1a5650" strokeWidth="2" strokeDasharray="5 6" />
        <path d="M406 226l8 8-12 1" stroke="#1a5650" strokeWidth="2" />
        <circle cx="402" cy="294" r="46" fill="#83b88b" />
        <path d="M366 287c22-13 52-11 72 0-19 11-49 14-72 0Z" fill="#5a9b78" />
        <path d="M401 251c-12 16-12 28 0 40 13-12 13-25 0-40Z" fill="#dcefd7" />
        <path d="M404 284c13-16 24-20 36-15-5 15-18 23-36 15Z" fill="#e9f2d6" />
        <path d="M373 302c-11 11-21 12-31 7 3-12 14-17 31-7Z" fill="#f0d98a" />
        <path d="M390 332c-7 21-8 38-5 56m25-56c7 21 9 38 6 56" stroke="#27705d" strokeWidth="3" strokeLinecap="round" />
        <path d="M370 365c11 7 30 7 42 0" stroke="#27705d" strokeWidth="3" strokeLinecap="round" />
        <path d="M174 350c-3-35 11-71 42-92 23-15 53-11 68 11 17 26 8 56-12 75-20 20-50 28-98 6Z" fill="#e68d68" />
        <path d="M194 265c4-31 26-55 56-57 21-2 42 11 49 32-28 1-57 5-79 25l-26 0Z" fill="#1b4f4b" />
        <path d="M218 286c15-16 29-21 47-21 5 21-1 43-18 57-15 12-34 15-50 8-2-17 5-31 21-44Z" fill="#f5bf9b" />
        <circle cx="235" cy="290" r="3" fill="#224d4a" />
        <path d="M249 313c9 3 16 1 21-4" stroke="#8d4e42" strokeWidth="2" strokeLinecap="round" />
        <path d="M180 350c-21 11-31 31-33 52m118-40c20 14 27 29 28 44" stroke="#27705d" strokeWidth="12" strokeLinecap="round" />
        <path d="M169 403h130" stroke="#d18a68" strokeWidth="4" strokeLinecap="round" />
        <path d="M94 397c22-34 25-64 20-93" stroke="#5a9b78" strokeWidth="3" strokeLinecap="round" />
        <path d="M112 340c-26-2-40-14-45-34 25-3 43 7 51 25m0 9c16-20 32-26 51-24-5 21-23 32-48 31" fill="#77ae7a" />
        <path d="M81 402c-6-22-15-33-31-43m28 14c-12-2-20-8-26-19 14-3 25 2 31 13" stroke="#99c99c" strokeWidth="8" strokeLinecap="round" />
      </svg>
      <div className="absolute bottom-6 left-7 max-w-[190px] text-sm font-semibold leading-snug text-[#1a5650]">
        ...une entreprise plus durable demain.
      </div>
      <div className="absolute bottom-6 right-7 flex h-11 w-11 items-center justify-center rounded-full bg-[#ef9a73] text-[#fffaf1]">
        <ArrowUpRight className="h-5 w-5" />
      </div>
    </div>
  );
}

function HubIllustration() {
  return (
    <div className="relative mx-auto flex min-h-[330px] max-w-[720px] items-center justify-center">
      <div className="absolute inset-x-8 top-1/2 h-px bg-[#bdd7c7] md:inset-x-16" />
      <div className="absolute left-1/2 top-4 h-[calc(100%-32px)] w-px bg-[#bdd7c7]" />
      <div className="relative z-10 flex h-32 w-32 flex-col items-center justify-center rounded-full border-[10px] border-[#d9eedb] bg-[#20685a] text-center text-[#fffaf1] shadow-[0_12px_30px_rgba(32,104,90,0.20)]">
        <Sprout className="mb-1 h-6 w-6" />
        <span className="text-sm font-bold">Votre<br />entreprise</span>
      </div>
      <div className="absolute left-0 top-5 w-32 rounded-2xl bg-[#e9f3df] p-3 text-center text-xs font-semibold text-[#28664e] md:left-8 md:w-40">
        <UsersRound className="mx-auto mb-2 h-5 w-5" />
        Vos collaborateurs
      </div>
      <div className="absolute right-0 top-5 w-32 rounded-2xl bg-[#f5ead7] p-3 text-center text-xs font-semibold text-[#965c39] md:right-8 md:w-40">
        <Handshake className="mx-auto mb-2 h-5 w-5" />
        Clients & partenaires
      </div>
      <div className="absolute bottom-5 left-0 w-32 rounded-2xl bg-[#e0eef0] p-3 text-center text-xs font-semibold text-[#286b72] md:left-8 md:w-40">
        <Leaf className="mx-auto mb-2 h-5 w-5" />
        L'environnement
      </div>
      <div className="absolute bottom-5 right-0 w-32 rounded-2xl bg-[#f7e7df] p-3 text-center text-xs font-semibold text-[#a55f48] md:right-8 md:w-40">
        <Target className="mx-auto mb-2 h-5 w-5" />
        Votre territoire
      </div>
    </div>
  );
}

export function ConstruireDemarche() {
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <AppLayout>
      <main className="min-h-screen overflow-hidden bg-[#fffaf1] font-['DM_Sans'] text-[#173f3b] selection:bg-[#f1c078]/40">
        <div className="mx-auto max-w-[1180px] px-5 pb-16 sm:px-8 lg:px-12">
          <nav className="flex items-center justify-between border-b border-[#dbe7da] py-5">
            <a href="#top" className="flex items-center gap-2.5">
              <span className="relative flex h-9 w-9 items-center justify-center rounded-[13px] bg-[#1c5d52] text-[#fffaf1]" aria-hidden="true">
                <span className="absolute left-[11px] top-[8px] h-4 w-4 rounded-full border-2 border-[#fffaf1]" />
                <span className="absolute left-[14px] top-[11px] h-1 w-1 rounded-full bg-[#fffaf1]" />
                <span className="absolute left-[14px] top-[17px] h-1 w-1 rounded-full bg-[#fffaf1]" />
                <span className="absolute left-[21px] top-[11px] h-1 w-1 rounded-full bg-[#fffaf1]" />
                <span className="absolute left-[21px] top-[17px] h-1 w-1 rounded-full bg-[#fffaf1]" />
              </span>
              <span className="font-['Fraunces'] text-[25px] font-semibold tracking-[-0.05em] text-[#1c5d52]">Cocci</span>
            </a>
            <div className="hidden items-center gap-7 text-xs font-semibold text-[#56736c] md:flex">
              <a className="transition-colors hover:text-[#1c5d52]" href="#dimensions">La RSE en clair</a>
              <a className="transition-colors hover:text-[#1c5d52]" href="#valeur">La valeur créée</a>
              <a className="transition-colors hover:text-[#1c5d52]" href="#methode">La méthode Cocci</a>
            </div>
            <a href="#methode" className="rounded-full bg-[#1c5d52] px-4 py-2.5 text-xs font-bold text-[#fffaf1] transition-transform hover:-translate-y-0.5">
              Découvrir Cocci <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
            </a>
          </nav>

          <section id="top" className="grid items-center gap-10 pb-20 pt-14 md:grid-cols-[0.92fr_1.08fr] md:gap-16 md:pb-28 md:pt-20">
            <div className="relative">
              <span className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#bfd8ca] bg-[#eef5e9] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#28705d]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ef8c67]" /> Comprendre avant d'agir
              </span>
              <h1 className="max-w-[560px] font-['Fraunces'] text-[clamp(3rem,6.4vw,5.75rem)] font-semibold leading-[0.94] tracking-[-0.055em] text-[#173f3b]">
                Mais avant d'aller plus loin,<br /><em className="font-normal text-[#2f795f]">qu'est-ce que</em> la RSE ?
              </h1>
              <p className="mt-7 max-w-[460px] text-[15px] leading-7 text-[#5f7770]">
                La responsabilité sociétale des entreprises, c'est intégrer les enjeux environnementaux, sociaux et économiques dans les décisions du quotidien.
              </p>
              <div className="mt-8 flex items-center gap-3 text-xs font-bold text-[#28705d]">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f2c776] text-[#1c5d52]"><ArrowDownRight className="h-4 w-4" /></span>
                Une démarche qui donne du sens
              </div>
              <BotanicalMark className="absolute -bottom-24 -left-16 hidden h-28 w-32 opacity-60 lg:block" />
            </div>
            <GuideIllustration />
          </section>

          <section id="dimensions" className="scroll-mt-6 border-t border-[#dbe7da] py-20 md:py-24">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <SectionLabel>Trois dimensions, un même objectif</SectionLabel>
                <h2 className="max-w-[650px] font-['Fraunces'] text-4xl font-semibold leading-tight tracking-[-0.04em] md:text-5xl">
                  Voir l'entreprise dans <span className="text-[#d47a5c]">toute sa réalité.</span>
                </h2>
              </div>
              <p className="max-w-[260px] text-sm leading-6 text-[#6d817a]">Comprendre ses impacts pour réduire le négatif et renforcer le positif.</p>
            </div>
            <div className="relative mt-12 grid gap-4 md:grid-cols-3">
              {dimensions.map((dimension, index) => {
                const Icon = dimension.icon;
                return (
                  <div key={dimension.title} className="group relative min-h-[210px] rounded-[26px] p-6 transition-transform duration-300 hover:-translate-y-1" style={{ backgroundColor: dimension.color }}>
                    <div className="flex items-start justify-between">
                      <span className="font-mono text-xs font-bold" style={{ color: dimension.ink }}>{dimension.number}</span>
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fffaf1]/70" style={{ color: dimension.ink }}><Icon className="h-5 w-5" /></span>
                    </div>
                    <h3 className="mt-12 text-xl font-bold" style={{ color: dimension.ink }}>{dimension.title}</h3>
                    <p className="mt-3 max-w-[240px] text-xs leading-5 text-[#527068]">{dimension.line}</p>
                    {index < dimensions.length - 1 && <ArrowRight className="absolute -right-7 top-1/2 z-10 hidden h-6 w-6 text-[#8ab89a] md:block" />}
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs font-bold text-[#28705d]">
              <span className="rounded-full bg-[#f1eee4] px-4 py-2">Réduire les impacts négatifs</span>
              <span className="text-[#ef8c67]">+</span>
              <span className="rounded-full bg-[#e3f1df] px-4 py-2">Renforcer les contributions positives</span>
            </div>
          </section>

          <section className="rounded-[30px] bg-[#eef6ee] px-5 py-12 sm:px-10 md:px-14 md:py-16">
            <SectionLabel>Une opportunité pour l'entreprise</SectionLabel>
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <h2 className="max-w-[590px] font-['Fraunces'] text-4xl font-semibold leading-[1.03] tracking-[-0.04em] md:text-5xl">
                La RSE, une contrainte ? <em className="font-normal text-[#2f795f]">Pas seulement.</em>
              </h2>
              <p className="max-w-[240px] text-sm leading-6 text-[#668078]">Bien construite, elle devient un véritable atout.</p>
            </div>
            <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                const colors: Record<string, string> = { green: "#cfe7ce", blue: "#d5e9eb", yellow: "#f5e2bb", coral: "#f4d2c4", teal: "#c7e1d6" };
                return (
                  <div key={benefit.title} className="rounded-2xl bg-[#fffaf1] p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_22px_rgba(47,91,72,0.10)]">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: colors[benefit.tone] }}>
                      <Icon className="h-5 w-5 text-[#28705d]" />
                    </span>
                    <h3 className="mt-5 text-sm font-bold leading-5 text-[#1c5d52]">{benefit.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-[#71837b]">{benefit.copy}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section id="valeur" className="scroll-mt-6 py-20 md:py-24">
            <div className="text-center">
              <SectionLabel>Une valeur pour tous</SectionLabel>
              <h2 className="font-['Fraunces'] text-4xl font-semibold tracking-[-0.04em] md:text-5xl">Une démarche qui rayonne.</h2>
              <p className="mx-auto mt-4 max-w-[520px] text-sm leading-6 text-[#6d817a]">La RSE crée de la valeur pour l'entreprise et pour l'ensemble de son écosystème.</p>
            </div>
            <HubIllustration />
            <div className="mx-auto flex max-w-[320px] items-center justify-center gap-2 rounded-full border border-[#c8ddce] bg-[#eef6ee] px-4 py-3 text-center text-xs font-bold text-[#28705d]">
              <Sparkles className="h-4 w-4" /> Une démarche RSE structurée
            </div>
          </section>

          <section className="grid items-center gap-10 rounded-[30px] bg-[#1c5d52] px-6 py-12 text-[#fffaf1] sm:px-10 md:grid-cols-[1fr_0.8fr] md:px-14 md:py-16">
            <div>
              <SectionLabel>Le point de départ</SectionLabel>
              <h2 className="font-['Fraunces'] text-4xl font-semibold leading-[1.04] tracking-[-0.04em] md:text-5xl">Alors, par où commencer ?</h2>
              <p className="mt-5 max-w-[500px] text-sm leading-6 text-[#c7ddd0]">Carbone, biodiversité, social, achats, numérique responsable, parties prenantes, indicateurs, labels...</p>
              <div className="mt-7 flex flex-wrap gap-2">
                {topics.map((topic, index) => <span key={topic} className={`rounded-full border px-3 py-1.5 text-[11px] ${index % 3 === 0 ? "border-[#f0bd75]/60 bg-[#f0bd75]/15 text-[#f6d49d]" : "border-[#b4d6c1]/25 bg-[#fffaf1]/10 text-[#d8e8db]"}`}>{topic}</span>)}
              </div>
            </div>
            <div className="relative rounded-3xl border border-[#a8ccba]/30 bg-[#fffaf1]/10 p-6">
              <CircleHelp className="h-8 w-8 text-[#f0bd75]" />
              <p className="mt-5 font-['Fraunces'] text-2xl leading-tight">Comment savoir quoi faire, dans quel ordre et pourquoi ?</p>
              <div className="mt-6 border-l border-[#f0bd75] pl-4 text-sm leading-6 text-[#c7ddd0]">
                C'est précisément pour cela que Cocci a été conçu.
                <strong className="mt-2 block text-[#f5d79e]">Étape par étape, à votre rythme.</strong>
              </div>
            </div>
          </section>

          <section className="grid items-center gap-10 py-20 md:grid-cols-[0.85fr_1.15fr] md:py-28">
            <div>
              <SectionLabel>La méthode Cocci</SectionLabel>
              <h2 className="font-['Fraunces'] text-4xl font-semibold leading-[1.05] tracking-[-0.04em] md:text-5xl">Rendre la RSE <span className="text-[#d47a5c]">accessible</span> à tous.</h2>
              <p className="mt-5 max-w-[430px] text-sm leading-6 text-[#637b73]">Cocci vous aide à passer de l'envie d'agir à une démarche structurée, concrète et mesurable.</p>
              <a href="#methode" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#28705d] transition-colors hover:text-[#d47a5c]">Découvrir la démarche <ArrowRight className="h-4 w-4" /></a>
            </div>
            <div id="methode" className="scroll-mt-6 overflow-hidden rounded-[28px] border border-[#cddfd1] bg-[#e1f0e4] shadow-[0_16px_35px_rgba(38,93,74,0.10)]">
              <div className="relative aspect-video overflow-hidden bg-[#b8d7bd]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_20%,rgba(255,250,241,0.8),transparent_30%),linear-gradient(150deg,#cce4c8,#7eaf88)]" />
                <div className="absolute bottom-0 left-0 h-3/5 w-full bg-[#6e9e7b] [clip-path:polygon(0_55%,16%_15%,31%_48%,47%_5%,65%_43%,82%_0,100%_38%,100%_100%,0_100%)]" />
                <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
                  <button type="button" aria-label="Afficher le message vidéo" onClick={() => setVideoOpen((open) => !open)} className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1c5d52] text-[#fffaf1] shadow-[0_8px_20px_rgba(28,93,82,0.25)] transition-transform hover:scale-105">
                    {videoOpen ? <Check className="h-6 w-6" /> : <Play className="ml-1 h-6 w-6 fill-current" />}
                  </button>
                  <span className="mt-4 rounded-full bg-[#fffaf1]/85 px-3 py-1 text-[11px] font-bold text-[#1c5d52]">{videoOpen ? "Merci, à très vite." : "Voir la méthode Cocci"}</span>
                </div>
                <span className="absolute bottom-4 right-5 text-[10px] font-mono text-[#fffaf1]/80">Cocci / 02:30</span>
              </div>
              <div className="flex items-center gap-3 bg-[#fffaf1] px-5 py-4 text-sm font-bold text-[#1c5d52]"><Sprout className="h-5 w-5 text-[#d47a5c]" /> Une méthode claire pour avancer sans vous disperser</div>
            </div>
          </section>

          <footer className="flex flex-col items-center justify-between gap-4 border-t border-[#dbe7da] pt-8 text-xs text-[#71837b] sm:flex-row">
            <div className="flex items-center gap-2 font-bold text-[#1c5d52]"><span className="h-2 w-2 rounded-full bg-[#ef8c67]" /> Cocci, le compagnon RSE des organisations.</div>
            <div className="flex items-center gap-2"><Check className="h-4 w-4 text-[#28705d]" /> Une démarche pédagogique, progressive et adaptée.</div>
          </footer>
        </div>
      </main>
    </AppLayout>
  );
}