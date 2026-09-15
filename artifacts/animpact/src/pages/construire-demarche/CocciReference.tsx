import { AppLayout } from "@/components/layout";
import { useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  CircleHelp,
  FileText,
  Handshake,
  Leaf,
  Link2,
  MapPin,
  MoreHorizontal,
  Play,
  Sprout,
  Target,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";

const dimensions = [
  {
    title: "Environnement",
    icon: Leaf,
    tone: "bg-[#edf6f0] text-[#2f8064]",
    copy: "Climat · Ressources · Biodiversité · Énergie",
  },
  {
    title: "Social",
    icon: UsersRound,
    tone: "bg-[#fbf1df] text-[#ad762e]",
    copy: "Conditions de travail · Égalité · Inclusion · Compétences",
  },
  {
    title: "Économie & gouvernance",
    icon: Building2,
    tone: "bg-[#eaf1f6] text-[#347294]",
    copy: "Éthique · Achats responsables · Relations partenaires · Pérennité",
  },
];

const benefits = [
  { title: "Réduire ses coûts", copy: "Énergie, ressources, déchets, achats...", icon: CoinsIcon, tone: "bg-[#e8f3ea] text-[#23745f]" },
  { title: "Attirer et fidéliser vos talents", copy: "Engagement, qualité de vie au travail.", icon: UserRoundPlus, tone: "bg-[#f9e7e8] text-[#d26c76]" },
  { title: "Répondre aux attentes", copy: "Clients, partenaires, financeurs...", icon: Handshake, tone: "bg-[#faf0dc] text-[#b07830]" },
  { title: "Se différencier", copy: "Valoriser vos engagements.", icon: BarChart3, tone: "bg-[#e8eff7] text-[#2e7395]" },
  { title: "Anticiper l'avenir", copy: "Évolutions réglementaires.", icon: FileText, tone: "bg-[#e9f2ee] text-[#28735f]" },
];

const ecosystem = [
  { label: "Votre entreprise", icon: Building2 },
  { label: "Vos collaborateurs", icon: UsersRound },
  { label: "Vos clients et partenaires", icon: UserRoundPlus },
  { label: "Votre territoire", icon: MapPin },
  { label: "L'environnement", icon: Leaf },
];

const topics = ["Carbone", "Biodiversité", "Social", "Achats", "Numérique", "Labels", "Réglementation", "Parties prenantes"];

function CoinsIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <ellipse cx="12" cy="6" rx="7" ry="3" fill="currentColor" />
      <path d="M5 6v4c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 10v4c0 1.7 3.1 3 7 3s7-1.3 7-3v-4M5 14v4c0 1.7 3.1 3 7 3s7-1.3 7-3v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function LeafHero() {
  return (
    <div className="relative min-h-[245px] overflow-hidden rounded-[6px] bg-[#d7e8d1]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_28%,rgba(255,255,255,.75),transparent_22%),linear-gradient(145deg,#e7efcf_0%,#b7d4a9_45%,#6e9d77_100%)]" />
      <div className="absolute -right-8 top-6 h-64 w-52 rotate-[18deg] rounded-[45%] bg-[#4f855f]/70 blur-[1px]" />
      <div className="absolute right-24 top-[-35px] h-72 w-10 rotate-[28deg] rounded-full bg-[#e6f0c9]/80" />
      <div className="absolute right-36 top-16 h-64 w-8 rotate-[42deg] rounded-full bg-[#80a96d]/80" />
      <div className="absolute left-7 top-7 h-48 w-9 -rotate-[20deg] rounded-full bg-[#f4f1cc]/75" />
      <div className="absolute bottom-[-32px] left-10 h-32 w-40 rotate-[-10deg] rounded-[50%] bg-[#477e5e]/75" />
      <div className="absolute bottom-[-24px] left-36 h-36 w-20 rotate-[25deg] rounded-[50%] bg-[#6c9f72]/80" />
      <div className="absolute right-[-30px] bottom-[-12px] h-40 w-28 rotate-[-28deg] rounded-[50%] bg-[#2e6958]/70" />
      <div className="absolute right-0 top-0 h-full w-1/2 bg-[linear-gradient(90deg,transparent,rgba(39,82,60,.18))]" />
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#3c755c]/45 to-transparent" />
      <div className="absolute bottom-4 left-4 right-4 rounded-[4px] bg-[#105149]/95 px-4 py-3 text-xs font-semibold leading-4 text-white">
        Des entreprises<br />plus responsables,<br />aujourd'hui et demain.
      </div>
    </div>
  );
}

function PlantPersonIllustration() {
  return (
    <div className="relative hidden h-32 w-36 shrink-0 overflow-hidden md:block" aria-hidden="true">
      <div className="absolute bottom-[-28px] left-2 h-24 w-24 rounded-[55%_45%_0_0] bg-[#287964]" />
      <div className="absolute bottom-12 left-12 h-14 w-14 rounded-full bg-[#f1b08c]" />
      <div className="absolute bottom-[92px] left-10 h-7 w-20 -rotate-[9deg] rounded-full bg-[#173e3d]" />
      <div className="absolute bottom-[80px] left-5 h-9 w-14 rotate-[24deg] rounded-full bg-[#173e3d]" />
      <div className="absolute bottom-16 left-[76px] h-1 w-2 rounded-full bg-[#173e3d]" />
      <div className="absolute bottom-[65px] left-[99px] h-1 w-2 rounded-full bg-[#173e3d]" />
      <div className="absolute bottom-3 left-[108px] h-24 w-px rotate-[16deg] bg-[#39845f]" />
      <div className="absolute bottom-12 left-[99px] h-8 w-16 -rotate-[28deg] rounded-[100%_0] bg-[#8dc58e]" />
      <div className="absolute left-1 top-1 text-3xl font-serif text-[#287964]">?</div>
    </div>
  );
}

function VideoThumbnail({ videoOpen, onOpen }: { videoOpen: boolean; onOpen: () => void }) {
  return (
    <div className="relative aspect-[1.75] overflow-hidden rounded-[5px] border border-[#bfd8c9] bg-[#b7d7bc] shadow-[0_5px_12px_rgba(35,80,58,.12)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(251,255,240,.9),transparent_27%),linear-gradient(180deg,#cce6c9 0%,#a7cfaa 47%,#6f9f73 48%,#396f55 100%)]" />
      <div className="absolute bottom-0 left-[-4%] h-[55%] w-[110%] bg-[#5d956b] [clip-path:polygon(0_55%,12%_22%,24%_48%,36%_5%,50%_45%,66%_10%,79%_50%,91%_18%,100%_43%,100%_100%,0_100%)]" />
      <div className="absolute bottom-0 left-0 h-[45%] w-[115%] bg-[#3e765a] [clip-path:polygon(0_46%,18%_15%,34%_50%,49%_25%,67%_57%,84%_17%,100%_45%,100%_100%,0_100%)]" />
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        <button type="button" onClick={onOpen} aria-label={videoOpen ? "Fermer le message vidéo" : "Regarder la vidéo"} className="flex h-14 w-14 items-center justify-center rounded-full bg-[#104e47] text-white shadow-lg transition-transform hover:scale-105">
          {videoOpen ? <Check className="h-6 w-6" /> : <Play className="ml-1 h-6 w-6 fill-current" />}
        </button>
        <span className="mt-2 text-[10px] font-semibold text-[#104e47]">{videoOpen ? "À très vite !" : "Cocci"}</span>
      </div>
      <span className="absolute bottom-2 left-3 text-[9px] font-semibold text-white/90">▶ 0:00 / 2:30</span>
      <span className="absolute bottom-2 right-3 text-[9px] text-white/90">◧ ⛶</span>
    </div>
  );
}

export function ConstruireDemarche() {
  const [videoOpen, setVideoOpen] = useState(false);

  return (
    <AppLayout>
      <main className="min-h-screen bg-[#fffefa] font-['DM_Sans'] text-[#173e3d]">
        <div className="mx-auto max-w-[940px] px-4 pb-12 pt-6 sm:px-7 md:px-10">
          <header className="mb-7 flex items-center justify-between gap-4">
            <h1 className="font-['Fraunces'] text-[26px] font-semibold tracking-[-0.045em] text-[#166039] sm:text-[31px]">Passer l'introduction</h1>
            <a href="#methode" className="hidden items-center gap-2 rounded-full bg-[#176052] px-4 py-2.5 text-[11px] font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5 sm:inline-flex">
              Passer l'introduction <ArrowDown className="h-3.5 w-3.5" />
            </a>
          </header>

          <section id="top" className="grid items-center gap-7 md:grid-cols-[1.02fr_0.98fr]">
            <div>
              <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.08em] text-[#28735d]">Comprendre avant d'agir</p>
              <h2 className="max-w-[440px] font-['Fraunces'] text-[36px] font-semibold leading-[0.96] tracking-[-0.045em] sm:text-[42px]">
                Mais avant d’aller<br />plus loin, qu’est-ce<br />que la RSE ?
              </h2>
              <p className="mt-4 max-w-[380px] text-[11px] leading-[1.55] text-[#4d6661]">
                La RSE, c’est intégrer les enjeux environnementaux, sociaux et économiques dans les activités et les décisions de l’entreprise.
              </p>
            </div>
            <LeafHero />
          </section>

          <section id="dimensions" className="pt-7">
            <h2 className="font-['Fraunces'] text-[21px] font-semibold tracking-[-0.03em]">3 dimensions, un même objectif</h2>
            <p className="mt-1 text-[10px] text-[#5c716b]">La RSE couvre l’ensemble du fonctionnement de l’entreprise.</p>
            <div className="mt-4 grid gap-2 md:grid-cols-[repeat(3,minmax(0,1fr))_1.1fr]">
              {dimensions.map((dimension) => {
                const Icon = dimension.icon;
                return (
                  <div key={dimension.title} className={`min-h-[128px] rounded-[4px] p-4 ${dimension.tone}`}>
                    <Icon className="h-7 w-7" />
                    <h3 className="mt-3 text-[12px] font-bold leading-4">{dimension.title}</h3>
                    <p className="mt-1 text-[9px] leading-3.5 opacity-85">{dimension.copy}</p>
                  </div>
                );
              })}
              <div className="border-l border-[#e1e5de] px-5 py-4">
                <Target className="h-10 w-10 text-[#13705d]" />
                <h3 className="mt-2 text-[12px] font-bold">L’objectif ?</h3>
                <p className="mt-1 text-[9px] leading-3.5 text-[#5c716b]">Mieux comprendre ses impacts, réduire ses impacts négatifs et renforcer ses contributions positives.</p>
              </div>
            </div>
          </section>

          <section className="mt-7 rounded-[5px] bg-[#edf7f0] px-4 py-5 sm:px-5">
            <h2 className="font-['Fraunces'] text-[21px] font-semibold tracking-[-0.03em]">La RSE, une contrainte ? Pas seulement.</h2>
            <p className="mt-1 text-[10px] text-[#5c716b]">Bien construite, elle peut devenir un véritable atout pour votre entreprise.</p>
            <div className="mt-4 grid gap-2 md:grid-cols-5">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <div key={benefit.title} className="min-h-[125px] rounded-[4px] bg-white/75 p-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full ${benefit.tone}`}><Icon className="h-4 w-4" /></span>
                    <h3 className="mt-3 text-[11px] font-bold leading-3.5">{benefit.title}</h3>
                    <p className="mt-1 text-[9px] leading-3.5 text-[#61736d]">{benefit.copy}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section id="valeur" className="pt-7">
            <h2 className="font-['Fraunces'] text-[21px] font-semibold tracking-[-0.03em]">Une valeur pour tous</h2>
            <p className="mt-1 text-[10px] text-[#5c716b]">La RSE crée de la valeur pour l’ensemble de votre écosystème.</p>
            <div className="mt-3 grid gap-2 md:grid-cols-5">
              {ecosystem.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex min-h-[62px] items-center gap-2 rounded-[4px] bg-[#f2f7f2] px-3 py-2.5 md:flex-col md:justify-center md:text-center">
                    <Icon className="h-5 w-5 shrink-0 text-[#126f5b]" />
                    <span className="text-[9px] font-semibold">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mt-7 rounded-[5px] bg-[#eff7f1] px-4 py-5 sm:px-5">
            <h2 className="font-['Fraunces'] text-[21px] font-semibold tracking-[-0.03em]">La RSE est-elle obligatoire ?</h2>
            <p className="mt-1 text-[10px] text-[#5c716b]">Cela dépend de votre taille, de votre activité et de votre situation.</p>
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              <LegalCard icon={FileText} title="Obligation directe" copy="Certaines entreprises sont soumises à des exigences réglementaires." tone="text-[#3677a0] bg-[#e6f0f7]" />
              <LegalCard icon={Link2} title="Obligation indirecte" copy="D'autres sont sollicitées par leurs clients, donneurs d'ordre ou partenaires." tone="text-[#4380a4] bg-[#e6f0f7]" />
              <LegalCard icon={Leaf} title="Démarche volontaire" copy="Toute entreprise peut choisir de structurer sa démarche et en tirer les bénéfices." tone="text-[#32755d] bg-[#e6f3e9]" />
            </div>
          </section>

          <section className="mt-7 grid items-end gap-4 md:grid-cols-[1fr_1.15fr]">
            <div className="flex items-center gap-3">
              <PlantPersonIllustration />
              <div>
                <h2 className="font-['Fraunces'] text-[22px] font-semibold leading-[1.02] tracking-[-0.03em]">Vous ne savez pas par où commencer ?</h2>
                <p className="mt-2 max-w-[300px] text-[10px] leading-4 text-[#5c716b]">Carbone, biodiversité, social, achats, labels... Les sujets sont nombreux, et il peut être difficile de savoir quoi faire, dans quel ordre et pourquoi.</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-start gap-2 md:justify-end">
              {topics.map((topic) => <span key={topic} className="rounded-full bg-[#f0f6f0] px-3 py-1.5 text-[9px] font-semibold text-[#4d6e61]">{topic}</span>)}
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f0f6f0] text-[#4d6e61]"><MoreHorizontal className="h-4 w-4" /></span>
            </div>
          </section>

          <section id="methode" className="mt-7 grid items-center gap-6 rounded-[5px] bg-[#e5f3e6] px-4 py-5 sm:px-5 md:grid-cols-[0.92fr_1.08fr]">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#28735d]">Place à la pratique</p>
              <h2 className="mt-2 max-w-[350px] font-['Fraunces'] text-[23px] font-semibold leading-[1.02] tracking-[-0.035em]">Découvrez comment construire votre démarche RSE avec Cocci</h2>
              <p className="mt-3 max-w-[350px] text-[10px] leading-4 text-[#5c716b]">Cocci vous guide étape par étape pour passer de l’envie d’agir à une démarche structurée, cohérente et mesurable.</p>
              <button type="button" onClick={() => setVideoOpen((open) => !open)} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#176052] px-4 py-2.5 text-[10px] font-bold text-white transition-transform hover:-translate-y-0.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20"><Play className="ml-0.5 h-3 w-3 fill-current" /></span>
                {videoOpen ? "Fermer la vidéo" : "Regarder la vidéo"}
              </button>
            </div>
            <VideoThumbnail videoOpen={videoOpen} onOpen={() => setVideoOpen((open) => !open)} />
          </section>

          <footer className="flex items-center justify-between gap-3 pt-5 text-[9px] text-[#6e8079]">
            <span className="flex items-center gap-1 font-semibold text-[#176052]"><Sprout className="h-3.5 w-3.5" /> Cocci</span>
            <span>Une démarche RSE accessible à tous.</span>
          </footer>
        </div>
      </main>
    </AppLayout>
  );
}

function LegalCard({ icon: Icon, title, copy, tone }: { icon: typeof FileText; title: string; copy: string; tone: string }) {
  return (
    <div className="flex min-h-[88px] items-start gap-3 rounded-[4px] bg-white/80 p-3">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone}`}><Icon className="h-4 w-4" /></span>
      <div>
        <h3 className="text-[10px] font-bold">{title}</h3>
        <p className="mt-1 text-[9px] leading-3.5 text-[#657670]">{copy}</p>
      </div>
    </div>
  );
}