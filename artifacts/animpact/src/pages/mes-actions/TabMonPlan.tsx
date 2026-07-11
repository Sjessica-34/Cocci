import { Link } from "wouter";
import {
  useGetIssues,
  useListStakeholders,
  useListBioDependencies,
  useListBioIssues,
  useGetCarbonBilan,
  useGetNrData,
  useGetEmploymentResults,
  useListBarometreCampaigns,
  useGetBarometreResults,
} from "@workspace/api-client-react";
import { PILLARS } from "@/pages/numerique-responsable/data";
import {
  Target, Users, Leaf, Factory, BarChart2, Monitor, HeartPulse,
  AlertTriangle, CheckCircle2, Info, ArrowRight, Loader2, Lightbulb,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  orgId: number;
}

// ─── Carbon posts ─────────────────────────────────────────────────────────────

const CARBON_POSTS: { key: string; label: string; scope: string; action: string }[] = [
  { key: "energie1",         label: "Énergie — combustion stationnaire", scope: "Scope 1", action: "Réaliser un audit énergétique et déployer un plan d'efficacité énergétique (isolation, équipements performants, capteurs)." },
  { key: "energie2",         label: "Énergie — combustion mobile",        scope: "Scope 2", action: "Auditer la flotte et engager son électrification progressive ou le passage à des carburants alternatifs." },
  { key: "horsEnergie1",     label: "Procédés hors énergie",              scope: "Scope 1", action: "Identifier les procédés émetteurs et évaluer les substituts technologiques disponibles." },
  { key: "horsEnergie2",     label: "Fugitives",                          scope: "Scope 1", action: "Mettre en place un programme de détection et de réparation des fuites, avec suivi annuel." },
  { key: "intrantsBiens",    label: "Intrants — biens et matières",       scope: "Scope 3", action: "Intégrer des critères d'éco-conception et de contenu recyclé dans les spécifications achats." },
  { key: "intrantsServices", label: "Intrants — services",                scope: "Scope 3", action: "Ajouter des clauses RSE dans les appels d'offres et évaluer l'empreinte carbone des prestataires." },
  { key: "futursEmballages", label: "Emballages / déchets futurs",        scope: "Scope 3", action: "Repenser la conception des emballages pour réduire les matériaux et favoriser le recyclable." },
  { key: "fret",             label: "Fret",                               scope: "Scope 3", action: "Optimiser le taux de chargement, mutualiser les flux et privilégier le ferroviaire ou le fluvial." },
  { key: "deplacements",     label: "Déplacements professionnels",        scope: "Scope 3", action: "Déployer une politique de mobilité durable : télétravail, covoiturage, train prioritaire sur l'avion." },
  { key: "dechetsDirects",   label: "Déchets directs",                   scope: "Scope 3", action: "Mettre en place un plan de réduction à la source et de valorisation des déchets (tri, filières REP)." },
  { key: "immobilisations",  label: "Immobilisations",                   scope: "Scope 3", action: "Privilégier le matériel reconditionné et allonger la durée de vie des équipements avant remplacement." },
  { key: "utilisation",      label: "Utilisation des produits",          scope: "Scope 3", action: "Accompagner les clients vers un usage plus sobre et communiquer sur les bonnes pratiques d'utilisation." },
  { key: "finDeVie",         label: "Fin de vie des produits",           scope: "Scope 3", action: "Développer une offre de reprise, de reconditionnement ou de recyclage en fin de vie produit." },
];

function fmt(v: number) {
  return v.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AlertItem {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: "destructive" | "warning" | "default";
  action: string;
}

type SectionStatus = "loading" | "no-data" | "ok" | "alerts";

// ─── Section card ─────────────────────────────────────────────────────────────

interface SectionProps {
  icon: React.ElementType;
  iconColor: string;
  headerBg: string;
  label: string;
  link: string;
  status: SectionStatus;
  items: AlertItem[];
  emptyLabel?: string;
  noDataLabel?: string;
  noDataAction?: string;
}

function ModuleSection({
  icon: Icon,
  iconColor,
  headerBg,
  label,
  link,
  status,
  items,
  emptyLabel = "Aucun point critique détecté.",
  noDataLabel = "Module non encore renseigné.",
  noDataAction,
}: SectionProps) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 ${headerBg}`}>
        <div className="flex items-center gap-2.5">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <span className="text-sm font-semibold">{label}</span>
        </div>
        <Link href={link}>
          <a className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            Accéder <ArrowRight className="h-3 w-3" />
          </a>
        </Link>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        {status === "loading" && (
          <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Chargement…
          </div>
        )}

        {status === "no-data" && (
          <div className="space-y-2 py-1">
            <div className="flex items-start gap-2">
              <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">{noDataLabel}</p>
            </div>
            {noDataAction && (
              <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-foreground">{noDataAction}</p>
              </div>
            )}
          </div>
        )}

        {status === "ok" && (
          <div className="flex items-center gap-2 py-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <p className="text-xs text-emerald-700 font-medium">{emptyLabel}</p>
          </div>
        )}

        {status === "alerts" && (
          <ul className="divide-y">
            {items.map((item, i) => (
              <li key={i} className="py-3 space-y-2">
                {/* Alert row */}
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium leading-snug">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{item.subtitle}</p>
                    )}
                  </div>
                  {item.badge && (
                    <Badge
                      variant={item.badgeVariant === "destructive" ? "destructive" : "outline"}
                      className={
                        item.badgeVariant === "warning"
                          ? "text-[10px] px-1.5 py-0 bg-amber-50 text-amber-800 border-amber-200 shrink-0"
                          : "text-[10px] px-1.5 py-0 shrink-0"
                      }
                    >
                      {item.badge}
                    </Badge>
                  )}
                </div>
                {/* Action recommandée */}
                <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 ml-6">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground">{item.action}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Baromètre (2-step fetch) ─────────────────────────────────────────────────

function BarometreSection({ orgId }: { orgId: number }) {
  const { data: campaignsData, isLoading: loadingCampaigns } = useListBarometreCampaigns(orgId, {
    query: {
      enabled: orgId > 0,
      queryKey: [`/api/organizations/${orgId}/barometre-campaigns`],
    },
  });

  const closed = (campaignsData?.items ?? []).filter((c: any) => c.status === "closed");
  const latest: any = closed[0];

  const { data: resultsData, isLoading: loadingResults } = useGetBarometreResults(
    orgId,
    latest?.id ?? 0,
    {
      query: {
        enabled: orgId > 0 && !!latest,
        queryKey: [`/api/organizations/${orgId}/barometre-campaigns/${latest?.id}/results`],
      },
    },
  );

  const isLoading = loadingCampaigns || (!!latest && loadingResults);

  let status: SectionStatus = isLoading ? "loading" : "no-data";
  const items: AlertItem[] = [];

  if (!isLoading) {
    if (!latest) {
      status = "no-data";
    } else if (resultsData) {
      const lowScores = (resultsData.questions as any[]).filter(
        (q: any) => q.type === "scale" && q.average !== null && (q.average as number) <= 2.5,
      );
      if (lowScores.length === 0) {
        status = "ok";
      } else {
        status = "alerts";
        for (const q of lowScores) {
          const avg = q.average as number;
          items.push({
            title: q.text as string,
            subtitle: `Thème : ${q.theme} — Campagne : ${latest.name}`,
            badge: `${avg.toFixed(1)} / 5`,
            badgeVariant: avg <= 2 ? "destructive" : "warning",
            action:
              avg <= 2
                ? "Organiser en urgence un atelier participatif dédié à ce thème et mettre en place des mesures correctives concrètes avec un responsable désigné."
                : "Lancer un groupe de travail pour identifier les causes et proposer des améliorations ; communiquer sur les actions engagées lors du prochain baromètre.",
          });
        }
      }
    }
  }

  return (
    <ModuleSection
      icon={BarChart2}
      iconColor="text-violet-600"
      headerBg="bg-violet-50 border-b border-violet-100"
      label="Baromètre Social"
      link="/barometre-social"
      status={status}
      items={items}
      emptyLabel="Aucun score d'alerte (toutes les questions ≥ 2,5 / 5)."
      noDataLabel="Aucune campagne clôturée — les alertes apparaîtront une fois votre premier baromètre terminé."
      noDataAction="Lancez votre premier baromètre social pour mesurer le climat interne et détecter les axes de progrès prioritaires."
    />
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function TabMonPlan({ orgId }: Props) {
  const { data: issuesData,     isLoading: loadingIssues }  = useGetIssues(orgId, {
    query: { enabled: orgId > 0, queryKey: [`/api/organizations/${orgId}/issues`] },
  });
  const { data: stakeholders,   isLoading: loadingStake }   = useListStakeholders(orgId, {
    query: { enabled: orgId > 0, queryKey: [`/api/organizations/${orgId}/stakeholders`] },
  });
  const { data: bioDepsData,    isLoading: loadingBioDeps } = useListBioDependencies(orgId, {
    query: { enabled: orgId > 0, queryKey: [`/api/organizations/${orgId}/bio-dependencies`] },
  });
  const { data: bioIssuesData,  isLoading: loadingBioIssues } = useListBioIssues(orgId, {
    query: { enabled: orgId > 0, queryKey: [`/api/organizations/${orgId}/bio-issues`] },
  });
  const { data: carbonData,     isLoading: loadingCarbon }  = useGetCarbonBilan(orgId, {
    query: { enabled: orgId > 0, queryKey: [`/api/organizations/${orgId}/carbon`] },
  });
  const { data: nrDataRaw,      isLoading: loadingNr }      = useGetNrData(orgId, {
    query: { enabled: orgId > 0, queryKey: [`/api/organizations/${orgId}/numerique-responsable`] },
  });
  const { data: employmentData, isLoading: loadingEmploy }  = useGetEmploymentResults(orgId, {
    query: { enabled: orgId > 0, queryKey: [`/api/organizations/${orgId}/employment/results`] },
  });

  // ── 1. Matrice de matérialité ─────────────────────────────────────────────
  let issueStatus: SectionStatus = loadingIssues ? "loading" : "no-data";
  const issueItems: AlertItem[] = [];
  if (!loadingIssues && issuesData) {
    const rated = (issuesData.items as any[]).filter(
      (i: any) => i.impactScore != null || i.stakeholderScore != null || i.companyScore != null,
    );
    if (rated.length === 0) {
      issueStatus = "no-data";
    } else {
      const critical = rated.filter(
        (i: any) =>
          (i.impactScore ?? 0) >= 4 ||
          (i.stakeholderScore ?? 0) >= 4 ||
          (i.companyScore ?? 0) >= 4,
      );
      issueStatus = critical.length > 0 ? "alerts" : "ok";
      for (const i of critical) {
        const maxScore = Math.max(
          i.impactScore ?? 0,
          i.stakeholderScore ?? 0,
          i.companyScore ?? 0,
        ) as number;
        issueItems.push({
          title: i.label as string,
          subtitle: `Catégorie : ${i.category}`,
          badge:
            i.impactScore != null
              ? `Impact ${i.impactScore}/5`
              : i.stakeholderScore != null
              ? `Parties prenantes ${i.stakeholderScore}/5`
              : `Entreprise ${i.companyScore}/5`,
          badgeVariant: maxScore >= 5 ? "destructive" : "warning",
          action:
            maxScore >= 5
              ? "Intégrer cet enjeu comme axe stratégique prioritaire dans la feuille de route RSE, avec un objectif chiffré, un responsable et un calendrier de revue trimestrielle."
              : "Définir un objectif SMART pour cet enjeu, désigner un pilote et planifier les premières actions d'ici la fin de l'exercice.",
        });
      }
    }
  }

  // ── 2. Parties prenantes ─────────────────────────────────────────────────
  let stakeStatus: SectionStatus = loadingStake ? "loading" : "no-data";
  const stakeItems: AlertItem[] = [];
  if (!loadingStake) {
    const list = (stakeholders ?? []) as any[];
    if (list.length === 0) {
      stakeStatus = "no-data";
    } else {
      const key = list.filter((s: any) => (s.influence ?? 0) >= 4 && (s.interest ?? 0) >= 4);
      stakeStatus = key.length > 0 ? "alerts" : "ok";
      for (const s of key) {
        stakeItems.push({
          title: (s.name ?? s.category ?? "Partie prenante") as string,
          subtitle: `${s.category}${s.subcategory ? ` — ${s.subcategory}` : ""}`,
          badge: `Influence ${s.influence}/5 · Intérêt ${s.interest}/5`,
          badgeVariant:
            (s.influence as number) >= 5 && (s.interest as number) >= 5
              ? "destructive"
              : "warning",
          action:
            (s.influence as number) >= 5
              ? "Organiser une concertation formelle et régulière (comité, réunion biannuelle, rapport dédié) et nommer un interlocuteur référent."
              : "Planifier un échange structuré dans les 3 prochains mois et établir un canal de communication régulier.",
        });
      }
    }
  }

  // ── 3. Biodiversité ──────────────────────────────────────────────────────
  let bioStatus: SectionStatus =
    loadingBioDeps || loadingBioIssues ? "loading" : "no-data";
  const bioItems: AlertItem[] = [];
  if (!loadingBioDeps && !loadingBioIssues) {
    const deps  = (bioDepsData?.items   ?? []) as any[];
    const risks = (bioIssuesData?.items ?? []) as any[];
    if (deps.length === 0 && risks.length === 0) {
      bioStatus = "no-data";
    } else {
      const critDeps  = deps.filter((d: any) => (d.dependencyLevel ?? 0) >= 4);
      const critRisks = risks.filter((r: any) => (r.importance ?? 0) >= 4);
      bioStatus = critDeps.length + critRisks.length > 0 ? "alerts" : "ok";
      for (const d of critDeps) {
        bioItems.push({
          title: (d.name ?? "Dépendance") as string,
          subtitle: `${d.category ?? ""}${d.subCategory ? ` — ${d.subCategory}` : ""}${d.chainPosition ? ` · Position : ${d.chainPosition}` : ""}`,
          badge: `Dépendance ${d.dependencyLevel}/5`,
          badgeVariant: (d.dependencyLevel as number) >= 5 ? "destructive" : "warning",
          action:
            (d.dependencyLevel as number) >= 5
              ? "Engager une démarche de sécurisation : identifier des alternatives, diversifier les sources et intégrer cette dépendance dans la cartographie des risques opérationnels."
              : "Renforcer la maîtrise de ce flux et évaluer les solutions de substitution ou de diversification à moyen terme.",
        });
      }
      for (const r of critRisks) {
        bioItems.push({
          title: (r.name ?? "Risque biodiversité") as string,
          subtitle: (r.description as string | null | undefined) ?? undefined,
          badge: `Importance ${r.importance}/5`,
          badgeVariant: (r.importance as number) >= 5 ? "destructive" : "warning",
          action:
            "Élaborer un plan de gestion du risque biodiversité : définir des indicateurs de suivi, des seuils d'alerte et des mesures préventives associées.",
        });
      }
    }
  }

  // ── 4. Bilan Carbone ──────────────────────────────────────────────────────
  let carbonStatus: SectionStatus = loadingCarbon ? "loading" : "no-data";
  const carbonItems: AlertItem[] = [];
  if (!loadingCarbon) {
    if (!carbonData) {
      carbonStatus = "no-data";
    } else {
      const bilan = carbonData as any;
      const posts = CARBON_POSTS.map((p) => ({
        ...p,
        value: typeof bilan[p.key] === "number" ? (bilan[p.key] as number) : 0,
      }))
        .filter((p) => p.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      if (posts.length === 0) {
        carbonStatus = "no-data";
      } else {
        carbonStatus = "alerts";
        posts.forEach((p, idx) => {
          carbonItems.push({
            title: p.label,
            subtitle: p.scope,
            badge: `${fmt(p.value)} t CO₂e`,
            badgeVariant: idx === 0 ? "destructive" : "warning",
            action: p.action,
          });
        });
      }
    }
  }

  // ── 5. Numérique Responsable ─────────────────────────────────────────────
  let nrStatus: SectionStatus = loadingNr ? "loading" : "no-data";
  const nrItems: AlertItem[] = [];
  if (!loadingNr) {
    if (!nrDataRaw) {
      nrStatus = "no-data";
    } else {
      const responses = (nrDataRaw.responses ?? []) as any[];
      if (responses.length === 0) {
        nrStatus = "no-data";
      } else {
        const checkedIds = new Set(
          responses.filter((r: any) => r.checked).map((r: any) => r.criterionId as string),
        );
        const pillarStats = PILLARS.map((p) => {
          const allCriteria = p.sections.flatMap((s) => s.criteria.filter((c) => !c.isSpecial));
          const done = allCriteria.filter((c) => checkedIds.has(c.id)).length;
          return { title: p.shortTitle, total: allCriteria.length, done };
        });
        const weak = pillarStats.filter((p) => p.total > 0 && p.done / p.total < 0.5);
        nrStatus = weak.length > 0 ? "alerts" : "ok";
        for (const p of weak) {
          nrItems.push({
            title: `Pilier "${p.title}"`,
            subtitle: `${p.done} critère${p.done !== 1 ? "s" : ""} validé${p.done !== 1 ? "s" : ""} sur ${p.total}`,
            badge: `${Math.round((p.done / p.total) * 100)} %`,
            badgeVariant: p.done === 0 ? "destructive" : "warning",
            action:
              p.done === 0
                ? "Désigner un référent Numérique Responsable, organiser une session de sensibilisation et planifier les premières actions concrètes sur ce pilier."
                : "Planifier une revue mensuelle pour progresser sur ce pilier, en priorisant les critères les plus accessibles pour atteindre 50 % de couverture.",
          });
        }
      }
    }
  }

  // ── 6. Capital Humain ────────────────────────────────────────────────────
  let employStatus: SectionStatus = loadingEmploy ? "loading" : "no-data";
  const employItems: AlertItem[] = [];
  if (!loadingEmploy) {
    if (!employmentData) {
      employStatus = "no-data";
    } else if (
      !employmentData.workforce &&
      !employmentData.diversity &&
      !employmentData.training
    ) {
      employStatus = "no-data";
    } else {
      const watchpoints = (employmentData.watchpoints ?? []) as any[];
      if (watchpoints.length === 0) {
        employStatus = "ok";
      } else {
        employStatus = "alerts";
        for (const w of watchpoints) {
          const val = w.value as number | null;
          const prev = w.previousValue as number | null;
          employItems.push({
            title: w.label as string,
            subtitle:
              val != null
                ? `Valeur : ${val}${w.unit ? ` ${w.unit as string}` : ""}${prev != null ? ` (précédent : ${prev}${w.unit ? ` ${w.unit as string}` : ""})` : ""}`
                : undefined,
            badge: "En baisse",
            badgeVariant: "warning",
            action:
              "Analyser les causes de cette dégradation avec les managers concernés, définir un plan d'action RH ciblé et instaurer un suivi mensuel de cet indicateur.",
          });
        }
      }
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3 py-2">
      <p className="text-xs text-muted-foreground pb-1">
        Points critiques identifiés dans vos modules RSE — chaque alerte est accompagnée d'une action recommandée.
      </p>

      <ModuleSection
        icon={Target}
        iconColor="text-emerald-600"
        headerBg="bg-emerald-50 border-b border-emerald-100"
        label="Matrice de matérialité"
        link="/materialite"
        status={issueStatus}
        items={issueItems}
        emptyLabel="Aucun enjeu critique (tous les scores < 4 / 5)."
        noDataLabel="Aucun enjeu évalué pour l'exercice en cours."
        noDataAction="Évaluez vos enjeux RSE dans la matrice de matérialité pour faire ressortir les priorités stratégiques de votre démarche."
      />

      <ModuleSection
        icon={Users}
        iconColor="text-blue-600"
        headerBg="bg-blue-50 border-b border-blue-100"
        label="Parties prenantes"
        link="/parties-prenantes"
        status={stakeStatus}
        items={stakeItems}
        emptyLabel="Aucune partie prenante à forte influence et fort intérêt simultanés."
        noDataLabel="Aucune partie prenante renseignée pour l'exercice en cours."
        noDataAction="Cartographiez vos parties prenantes clés (clients, fournisseurs, élus, ONG…) pour identifier celles à impliquer en priorité dans votre démarche RSE."
      />

      <ModuleSection
        icon={Leaf}
        iconColor="text-lime-600"
        headerBg="bg-lime-50 border-b border-lime-100"
        label="Biodiversité"
        link="/biodiversite"
        status={bioStatus}
        items={bioItems}
        emptyLabel="Aucune dépendance critique ni risque à haute importance."
        noDataLabel="Module non renseigné pour l'exercice en cours."
        noDataAction="Cartographiez vos dépendances aux services écosystémiques pour identifier vos risques biodiversité et anticiper les impacts sur votre activité."
      />

      <ModuleSection
        icon={Factory}
        iconColor="text-orange-600"
        headerBg="bg-orange-50 border-b border-orange-100"
        label="Bilan Carbone"
        link="/bilan-carbone"
        status={carbonStatus}
        items={carbonItems}
        emptyLabel="Aucun poste d'émissions renseigné avec une valeur positive."
        noDataLabel="Aucun bilan carbone enregistré pour l'exercice en cours."
        noDataAction="Renseignez vos émissions de GES (consommations d'énergie, déplacements, achats…) pour identifier vos postes prioritaires et fixer un objectif de réduction."
      />

      <BarometreSection orgId={orgId} />

      <ModuleSection
        icon={Monitor}
        iconColor="text-sky-600"
        headerBg="bg-sky-50 border-b border-sky-100"
        label="Numérique Responsable"
        link="/numerique-responsable"
        status={nrStatus}
        items={nrItems}
        emptyLabel="Tous les piliers sont engagés à plus de 50 %."
        noDataLabel="Questionnaire NR non complété pour l'exercice en cours."
        noDataAction="Complétez le questionnaire Numérique Responsable pour évaluer la maturité de vos pratiques numériques et identifier les piliers à renforcer."
      />

      <ModuleSection
        icon={HeartPulse}
        iconColor="text-rose-600"
        headerBg="bg-rose-50 border-b border-rose-100"
        label="Capital Humain"
        link="/employment"
        status={employStatus}
        items={employItems}
        emptyLabel="Aucun indicateur RH en baisse détecté."
        noDataLabel="Données RH non renseignées pour l'exercice en cours."
        noDataAction="Renseignez vos effectifs, indicateurs de diversité et données de formation pour suivre l'évolution de votre capital humain et détecter les signaux faibles."
      />
    </div>
  );
}
