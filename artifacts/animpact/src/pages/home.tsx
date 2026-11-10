import { Link } from "wouter";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  FileBarChart2,
  FileText,
  FolderOpen,
  HeartPulse,
  Laptop,
  Layers,
  Leaf,
  Network,
  QrCode,
  Sprout,
  Star,
} from "lucide-react";

const keyFeatures = [
  {
    icon: Network,
    title: "Parties prenantes et matrice de matérialité",
    body: "Cartographiez vos parties prenantes, identifiez vos enjeux et définissez vos priorités RSE grâce à une matrice de matérialité.",
  },
  {
    icon: Sprout,
    title: "Dépendances à la biodiversité",
    body: "Analysez les dépendances de votre activité aux ressources naturelles et aux services écosystémiques pour mieux comprendre vos enjeux de biodiversité.",
  },
  {
    icon: HeartPulse,
    title: "Baromètre social automatisé",
    body: "Créez votre questionnaire, générez un QR code, collectez anonymement les réponses de vos collaborateurs et analysez automatiquement les résultats.",
  },
  {
    icon: Laptop,
    title: "Numérique Responsable",
    body: "Évaluez vos pratiques numériques à travers un diagnostic détaillé selon les cinq axes du référentiel de l'Institut du Numérique Responsable (INR) et identifiez vos axes de progrès.",
  },
  {
    icon: FileBarChart2,
    title: "Rapport RSE automatique",
    body: "Générez automatiquement un rapport RSE structuré à partir des données renseignées dans les différents modules de la plateforme.",
  },
  {
    icon: QrCode,
    title: "Page publique RSE et QR code",
    body: "Valorisez vos résultats et vos engagements sur une page publique personnalisée, accessible par un lien ou un QR code à partager avec vos parties prenantes.",
  },
];

const complementaryFeatures =
  "Diagnostic RSE et maturité • Impact Score • Collecte et suivi des données carbone • Estimation simplifiée des émissions • Captation carbone • Achats responsables • Analyse des fournisseurs • Capital humain et indicateurs RH • Plan d'action RSE • Suivi des engagements • Indicateurs ESG • Tableaux de bord • Labels et certifications • Documents et justificatifs • Ressources pratiques • Comparaison annuelle • Gestion multi-entités et consolidation • Et bien plus encore…";

const journeyFeatures = [
  {
    n: 1,
    title: "Construisez votre démarche",
    body: "Identifiez vos enjeux, cartographiez vos parties prenantes, évaluez vos dépendances à la biodiversité, déterminez vos priorités grâce à une matrice de matérialité et construisez une démarche RSE cohérente, étape par étape.",
  },
  {
    n: 2,
    title: "Mesurez vos impacts",
    body: "Centralisez vos données carbone, utilisez les outils d'estimation disponibles, évaluez votre maturité numérique responsable et suivez vos principaux indicateurs environnementaux pour mesurer vos progrès et orienter vos décisions.",
  },
  {
    n: 3,
    title: "Pilotez votre capital humain",
    body: "Diffusez automatiquement un questionnaire de baromètre social à vos collaborateurs, recueillez leurs réponses anonymement et visualisez les résultats pour mieux comprendre le ressenti de vos équipes.",
  },
  {
    n: 4,
    title: "Planifiez et pilotez vos actions",
    body: "Construisez votre plan d'action à partir de vos résultats, définissez vos objectifs, suivez vos engagements et documentez vos réalisations dans un seul espace.",
  },
  {
    n: 5,
    title: "Valorisez vos engagements",
    body: "Suivez votre Impact Score, gérez vos labels et certifications, identifiez vos actions de captation carbone et valorisez les engagements de votre organisation auprès de vos parties prenantes.",
  },
  {
    n: 6,
    title: "Mesurez votre démarche globale et générez votre rapport",
    body: "Suivez l'évolution de votre maturité RSE grâce à des indicateurs consolidés et générez automatiquement un rapport RSE clair, structuré et prêt à être partagé.",
  },
];

const resourceCards = [
  { icon: FolderOpen, label: "Dépôt de documents" },
  { icon: CheckCircle2, label: "Preuves et justificatifs" },
  { icon: FileText, label: "Guides et modèles" },
  { icon: Star, label: "Ressources pratiques" },
];

const questions = [
  {
    q: "Comment commencer une démarche RSE dans une petite entreprise ?",
    a: "Commencez par identifier les enjeux qui comptent pour votre activité et vos parties prenantes. Cocci vous accompagne pour structurer cette démarche, étape par étape.",
  },
  {
    q: "Peut-on utiliser Cocci sans connaissances en RSE ?",
    a: "Oui. La plateforme guide les entreprises dans leurs diagnostics, leurs priorités et leurs actions, sans nécessiter d'expertise préalable.",
  },
  {
    q: "Peut-on générer automatiquement un rapport RSE ?",
    a: "Oui. Un rapport structuré peut être généré à partir des informations renseignées dans les modules. Il n'est pas conforme CSRD pour l'instant, mais cette évolution est en cours de développement. Il s'agit actuellement d'un rapport volontaire, sans garantie de conformité réglementaire.",
  },
  {
    q: "Cocci permet-il de réaliser un Bilan Carbone® ?",
    a: "Non. Cocci ne réalise pas de Bilan Carbone® complet ou certifié. La plateforme aide à collecter et centraliser des données carbone et propose des outils d'estimation simplifiée.",
  },
  {
    q: "Cocci convient-il aux entreprises possédant plusieurs établissements ?",
    a: "Oui. Les organisations peuvent gérer plusieurs entités, filiales ou sites et consolider leur démarche dans un espace unique.",
  },
];

function AppMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[500px] select-none">
      <div className="absolute -inset-6 rounded-[2.5rem] bg-[#e8f3eb]/70 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-[#dce7df] bg-white shadow-[0_28px_80px_-36px_rgba(22,48,40,0.48)]">
        <img
          src={`${import.meta.env.BASE_URL}hero-dashboard.png`}
          alt="Visuel de référence du tableau de bord Cocci"
          className="block h-auto w-full"
        />
      </div>
    </div>
  );
}

function PublicPagePreview() {
  return (
    <div className="flex min-h-[170px] w-full max-w-[206px] flex-col items-center justify-center rounded-2xl border border-[#d5e6d8] bg-white px-4 py-5 shadow-[0_14px_36px_-24px_rgba(22,48,40,0.5)]">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#163028]">
        <Leaf className="h-6 w-6 text-emerald-300" />
      </span>
      <p className="mt-3 max-w-full truncate font-mono text-[10px] text-[#86938a]">cocci-rse.fr/p/abc123</p>
      <p className="mt-1 text-xs font-semibold text-[#34443a]">Votre page RSE publique</p>
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#e5f7eb] px-3 py-1 text-[10px] font-medium text-[#277344]">
        <CheckCircle2 className="h-3 w-3" />
        Accessible sans compte
      </span>
    </div>
  );
}

export function Home() {
  const [openQuestion, setOpenQuestion] = useState<number | null>(0);

  useEffect(() => {
    const title = "Cocci | Construisez votre démarche RSE de A à Z";
    const description = "Vous ne savez pas par où commencer votre démarche RSE ? Cocci vous guide de A à Z : enjeux, matérialité, diagnostic, actions, suivi et rapport RSE.";
    document.title = title;
    const setMeta = (selector: string, attribute: string, value: string, create: () => HTMLMetaElement) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector);
      if (!element) {
        element = create();
        document.head.appendChild(element);
      }
      element.setAttribute(attribute, value);
    };
    setMeta('meta[name="description"]', "content", description, () => {
      const meta = document.createElement("meta");
      meta.name = "description";
      return meta;
    });
    setMeta('meta[property="og:title"]', "content", title, () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:title");
      return meta;
    });
    setMeta('meta[property="og:description"]', "content", description, () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:description");
      return meta;
    });
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = "https://cocci-rse.fr/";

    const schemaId = "cocci-public-home-schema";
    let schema = document.getElementById(schemaId) as HTMLScriptElement | null;
    if (!schema) {
      schema = document.createElement("script");
      schema.id = schemaId;
      schema.type = "application/ld+json";
      document.head.appendChild(schema);
    }
    schema.textContent = JSON.stringify([
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Cocci",
        applicationCategory: "BusinessApplication",
        description,
        offers: { "@type": "Offer", price: "19.99", priceCurrency: "EUR", description: "À partir de 19,99 € TTC par mois" },
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "A-NIM-PACT SAS",
        url: window.location.origin,
      },
    ]);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#26332b]">
      <header className="sticky top-0 z-50 border-b border-[#e9eee9] bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" aria-label="Cocci, accueil" className="shrink-0">
            <img src={`${import.meta.env.BASE_URL}logo-dark.png`} alt="Cocci" className="h-7 w-auto" />
          </Link>
          <nav aria-label="Navigation principale" className="hidden items-center gap-7 lg:flex">
            <a href="#fonctionnalites" className="text-sm font-medium text-[#516057] transition-colors hover:text-[#163028]">Fonctionnalités</a>
            <a href="#tarifs" className="text-sm font-medium text-[#516057] transition-colors hover:text-[#163028]">Tarifs</a>
            <a href="#ressources" className="text-sm font-medium text-[#516057] transition-colors hover:text-[#163028]">Ressources</a>
            <a href="#a-propos" className="text-sm font-medium text-[#516057] transition-colors hover:text-[#163028]">À propos</a>
            <Link href="/blog" className="text-sm font-medium text-[#516057] transition-colors hover:text-[#163028]" data-testid="link-blog">Le journal</Link>
          </nav>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link href="/sign-in" className="rounded-lg px-3 py-2 text-sm font-medium text-[#536159] transition-colors hover:bg-[#f4f7f4] hover:text-[#163028]">Se connecter</Link>
            <Link href="/onboarding/effectif" className="rounded-lg bg-[#163028] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1e4438]">Commencer</Link>
          </div>
        </div>
        <nav aria-label="Navigation mobile" className="flex gap-5 overflow-x-auto border-t border-[#f0f3f0] px-5 py-2.5 lg:hidden">
          <a href="#fonctionnalites" className="shrink-0 text-xs font-medium text-[#516057]">Fonctionnalités</a>
          <a href="#tarifs" className="shrink-0 text-xs font-medium text-[#516057]">Tarifs</a>
          <a href="#ressources" className="shrink-0 text-xs font-medium text-[#516057]">Ressources</a>
          <a href="#a-propos" className="shrink-0 text-xs font-medium text-[#516057]">À propos</a>
          <Link href="/blog" className="shrink-0 text-xs font-medium text-[#516057]" data-testid="link-blog-mobile">Le journal</Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-24 pt-16 sm:px-8 lg:grid-cols-[1fr_1.02fr] lg:gap-12 lg:pb-24 lg:pt-20">
          <div className="max-w-[550px]">
            <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-[#d8e9dc] bg-[#f1f8f2] px-4 py-2 text-xs font-semibold text-[#286444] sm:text-sm">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#4b9a64]" />
              La plateforme RSE des TPE, PME et ETI françaises
            </div>
            <h1 className="text-[2.1rem] font-extrabold leading-[1.14] tracking-[-0.035em] text-[#26332b] sm:text-4xl xl:text-[2.9rem]">
              Construisez votre démarche RSE <span className="text-[#218047]">de A à Z</span>, même en <span className="text-[#218047]">partant de zéro</span>. Suivez vos engagements et mesurez <span className="text-[#218047]">votre impact</span>.
            </h1>
            <p className="mt-5 max-w-[520px] text-[15px] leading-7 text-[#657269]">
              La RSE, même si vous n'y connaissez rien !
            </p>
            <p className="mt-2 max-w-[520px] text-[15px] leading-7 text-[#657269]">
              Vous souhaitez engager votre entreprise dans une démarche RSE, mais vous ne savez pas par où commencer ? Cocci vous accompagne pas à pas pour identifier vos enjeux, construire votre démarche, mesurer vos impacts et valoriser vos engagements. Aucune connaissance préalable nécessaire : Cocci vous guide à chaque étape, en toute autonomie et à votre rythme.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-[13px] font-medium text-[#435249]">
              {["Simple", "Complet", "Pensé pour les PME comme pour les groupes"].map((item) => (
                <span key={item} className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#286444]" />{item}</span>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/onboarding/effectif" className="inline-flex h-11 items-center justify-center rounded-lg bg-[#163028] px-6 text-[13px] font-semibold text-white transition-colors hover:bg-[#1e4438]">
                Commencer <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link href="/demo" className="inline-flex h-11 items-center justify-center rounded-lg border border-[#163028] px-6 text-[13px] font-semibold text-[#163028] transition-colors hover:bg-[#163028]/5">Demander une démo</Link>
            </div>
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#859087]"><CheckCircle2 className="h-3.5 w-3.5" />Sans engagement</p>
          </div>
          <div className="flex justify-center px-2 py-4 sm:px-8 lg:px-0"><AppMockup /></div>
        </section>

        <section id="fonctionnalites" className="scroll-mt-28 px-5 pb-14 sm:px-8 sm:pb-16">
          <div className="mx-auto max-w-7xl rounded-[1.5rem] bg-[#f4f8f4] px-5 py-8 sm:px-7 sm:py-9 lg:px-9 lg:py-10">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-[#218047]">Les fonctionnalités qui font la différence</h2>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#657269]">Des fonctionnalités complémentaires que l'on ne retrouve pas toujours réunies, pour une démarche RSE plus complète.</p>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {keyFeatures.map(({ icon: Icon, title, body }) => (
                <article key={title} className="rounded-xl border border-[#e9eee9] bg-white p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#edf6ef] text-[#286444]"><Icon className="h-4 w-4" /></span>
                    <h3 className="text-base font-bold leading-snug text-[#26332b]">{title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#69766d]">{body}</p>
                </article>
              ))}
            </div>
            <div className="mt-5 border-t border-[#e0e9e1] pt-4 sm:flex sm:items-start sm:gap-3">
              <h3 className="shrink-0 text-sm font-bold text-[#26332b]">Et ce n'est pas tout !</h3>
              <p className="mt-1 text-xs leading-5 text-[#657269] sm:mt-0 sm:text-sm">{complementaryFeatures}</p>
            </div>
          </div>
        </section>

        <section className="border-t border-[#edf1ed] bg-white py-24 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-x-12 gap-y-16 px-5 sm:grid-cols-2 sm:px-8 xl:grid-cols-3">
            {journeyFeatures.map((feature) => (
              <article key={feature.n} className="max-w-[430px]">
                <div className="mb-4 flex items-start gap-3">
                  <span className="text-3xl font-extrabold leading-none text-[#218047]">{feature.n}.</span>
                  <div>
                    <h3 className="text-lg font-bold leading-snug text-[#26332b]">{feature.title}</h3>
                    <div className="mt-2 h-0.5 w-9 bg-[#163028]" />
                  </div>
                </div>
                <p className="text-sm leading-7 text-[#69766d]">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="ressources" className="scroll-mt-24 border-t border-[#edf1ed] bg-[#f8faf8] py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 md:grid-cols-[0.9fr_1.1fr]">
            <div className="max-w-xl">
              <h2 className="text-2xl font-bold text-[#218047]">Centralisez vos ressources</h2>
              <p className="mt-4 text-sm leading-7 text-[#69766d]">Déposez vos documents, preuves et justificatifs au même endroit. Retrouvez-les facilement, utilisez-les pour alimenter votre rapport RSE et accédez à des guides, modèles et ressources pratiques pour vous accompagner tout au long de votre démarche.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {resourceCards.map(({ icon: Icon, label }) => (
                <div key={label} className="flex min-h-[132px] flex-col items-center justify-center gap-3 rounded-2xl border border-[#e3eae4] bg-white p-4 text-center">
                  <Icon className="h-6 w-6 text-[#163028]" />
                  <span className="text-xs font-semibold leading-snug text-[#435249]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="a-propos" className="scroll-mt-24 border-t border-[#edf1ed] bg-white py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 md:grid-cols-[0.9fr_1.1fr]">
            <div className="max-w-xl">
              <h2 className="text-2xl font-bold text-[#218047]">Conçu pour les PME comme pour les groupes</h2>
              <p className="mt-4 text-sm leading-7 text-[#69766d]">Gérez plusieurs entités, filiales ou sites depuis une interface unique. Suivez chaque entité individuellement ou consolidez l'ensemble pour avoir une vision globale de votre démarche.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <article className="rounded-2xl border border-[#e3eae4] bg-[#f8faf8] p-6">
                <Building2 className="mb-4 h-6 w-6 text-[#163028]" />
                <h3 className="text-base font-bold text-[#26332b]">Multi-entités</h3>
                <p className="mt-2 text-sm leading-6 text-[#69766d]">Pilotez plusieurs entités, filiales ou sites dans un seul espace.</p>
              </article>
              <article className="rounded-2xl border border-[#e3eae4] bg-[#f8faf8] p-6">
                <Layers className="mb-4 h-6 w-6 text-[#163028]" />
                <h3 className="text-base font-bold text-[#26332b]">Consolidation</h3>
                <p className="mt-2 text-sm leading-6 text-[#69766d]">Visualisez vos indicateurs et résultats consolidés.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="border-t border-[#dce9df] bg-[#effbf3] py-16 sm:py-20">
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 sm:px-8 md:grid-cols-[220px_1fr] md:gap-6 lg:gap-8">
            <div className="flex justify-center md:justify-start"><PublicPagePreview /></div>
            <div className="max-w-2xl">
              <h2 className="text-xl font-bold leading-tight text-[#16834b] sm:text-[21px]">Partagez votre engagement RSE en un lien</h2>
              <p className="mt-2 text-sm leading-6 text-[#657269]">Générez une page publique personnalisée présentant vos scores, vos engagements et votre plan d'actions. Partagez-la avec vos clients, partenaires ou investisseurs sans qu'ils aient besoin d'un compte.</p>
              <ul className="mt-4 space-y-1.5 text-sm text-[#435249]">
                {["Un lien unique, révocable à tout moment", "Données mises à jour automatiquement", "Texte d'introduction personnalisable"].map((item) => (
                  <li key={item} className="flex items-start gap-2.5"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#286444]" />{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="border-t border-[#edf1ed] bg-white py-24 sm:py-28">
          <div className="mx-auto grid max-w-7xl items-start gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64816d]">Vos questions</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#26332b]">Questions fréquentes</h2>
              <div className="mt-8 divide-y divide-[#e8ede9] border-y border-[#e8ede9]">
                {questions.map(({ q, a }, index) => {
                  const isOpen = openQuestion === index;
                  return (
                    <div key={q}>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`faq-answer-${index}`}
                        onClick={() => setOpenQuestion(isOpen ? null : index)}
                        className="flex w-full items-center justify-between gap-4 py-5 text-left text-sm font-semibold leading-6 text-[#34443a] hover:text-[#218047]"
                      >
                        {q}
                        <ChevronDown className={`h-4 w-4 shrink-0 text-[#6e8173] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      <div id={`faq-answer-${index}`} hidden={!isOpen}>
                        <p className="max-w-2xl pb-5 pr-8 text-sm leading-6 text-[#69766d]">{a}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <aside id="tarifs" className="scroll-mt-24 rounded-[1.75rem] border border-[#dce9df] bg-[#f1f7f2] p-7 sm:p-9">
              <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
                <div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e0efe3] text-[#286444]"><Leaf className="h-5 w-5" /></span>
                  <h2 className="mt-5 text-xl font-bold leading-snug text-[#26332b]">Cocci évolue avec vous et pour vous.</h2>
                  <p className="mt-3 text-sm leading-7 text-[#657269]">Cocci est une plateforme en constante évolution. Vos besoins, vos retours d'expérience et les évolutions réglementaires et sectorielles contribuent à enrichir ses fonctionnalités pour vous accompagner durablement dans votre démarche RSE.</p>
                </div>
                <div className="rounded-2xl border border-[#e0e9e2] bg-white p-5 sm:min-w-[210px]">
                  <p className="text-sm font-bold leading-snug text-[#26332b]">À partir de</p>
                  <p className="mt-1 text-lg font-extrabold text-[#163028]">19,99 € TTC<span className="text-xs font-medium text-[#718078]">/mois</span></p>
                  <Link href="/onboarding/effectif" className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#163028] px-4 py-3 text-center text-xs font-semibold leading-snug text-white transition-colors hover:bg-[#1e4438]">
                    Commencer ma démarche RSE <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                  <p className="mt-3 text-[10px] leading-4 text-[#7b887e]">Les fonctionnalités sont les mêmes pour tous ; le tarif dépend du nombre d'employés.</p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="border-t border-[#e7ece8] bg-[#f8faf8] py-7">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-5 px-5 sm:px-8 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-bold text-[#26332b]">Prêt à structurer et piloter votre démarche RSE ?</h2>
              <p className="mt-1 text-sm text-[#657269]">Échangez avec nos experts et découvrez comment Cocci peut répondre à vos besoins.</p>
            </div>
            <Link href="/demo" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-3 rounded-lg bg-[#163028] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1e4438]">
              Demander une démo <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e9eee9] bg-[#fbfcfb] py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 sm:flex-row sm:px-8">
          <Link href="/" aria-label="Cocci, accueil"><img src={`${import.meta.env.BASE_URL}logo-dark.png`} alt="Cocci" className="h-5 w-auto" /></Link>
          <p className="text-xs text-[#859087]">© {new Date().getFullYear()} A-NIM-PACT SAS. Tous droits réservés.</p>
          <Link href="/legal" className="text-xs text-[#859087] underline transition-colors hover:text-[#435249]">Mentions légales</Link>
          <Link href="/blog" className="text-xs text-[#859087] underline transition-colors hover:text-[#435249]" data-testid="link-blog-footer">Le journal</Link>
        </div>
      </footer>
    </div>
  );
}
