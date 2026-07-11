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
  AlertTriangle, CheckCircle2, Info, ArrowRight, Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  orgId: number;
}

// ─── Carbon posts ─────────────────────────────────────────────────────────────

const CARBON_POSTS: { key: string; label: string; scope: string }[] = [
  { key: "energie1",         label: "Énergie — combustion stationnaire", scope: "Scope 1" },
  { key: "energie2",         label: "Énergie — combustion mobile",        scope: "Scope 2" },
  { key: "horsEnergie1",     label: "Procédés hors énergie",              scope: "Scope 1" },
  { key: "horsEnergie2",     label: "Fugitives",                          scope: "Scope 1" },
  { key: "intrantsBiens",    label: "Intrants — biens et matières",       scope: "Scope 3" },
  { key: "intrantsServices", label: "Intrants — services",                scope: "Scope 3" },
  { key: "futursEmballages", label: "Emballages / déchets futurs",        scope: "Scope 3" },
  { key: "fret",             label: "Fret",                               scope: "Scope 3" },
  { key: "deplacements",     label: "Déplacements professionnels",        scope: "Scope 3" },
  { key: "dechetsDirects",   label: "Déchets directs",                   scope: "Scope 3" },
  { key: "immobilisations",  label: "Immobilisations",                   scope: "Scope 3" },
  { key: "utilisation",      label: "Utilisation des produits",          scope: "Scope 3" },
  { key: "finDeVie",         label: "Fin de vie des produits",           scope: "Scope 3" },
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
  noDataLabel = "Module non encore renseigné — complétez-le pour obtenir des recommandations.",
}: SectionProps) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
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

      <div className="px-4 py-3">
        {status === "loading" && (
          <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Chargement…
          </div>
        )}

        {status === "no-data" && (
          <div className="flex items-start gap-2 py-2">
            <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">{noDataLabel}</p>
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
              <li key={i} className="flex items-start gap-3 py-2.5">
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
      noDataLabel="Aucune campagne clôturée — lancez un baromètre pour identifier les points d'alerte."
    />
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function TabMonPlan({ orgId }: Props) {
  const { data: issuesData,       isLoading: loadingIssues }    = useGetIssues(orgId, {
    query: { enabled: orgId > 0, queryKey: [`/api/organizations/${orgId}/issues`] },
  });
  const { data: stakeholders,     isLoading: loadingStake }     = useListStakeholders(orgId, {
    query: { enabled: orgId > 0, queryKey: [`/api/organizations/${orgId}/stakeholders`] },
  });
  const { data: bioDepsData,      isLoading: loadingBioDeps }   = useListBioDependencies(orgId, {
    query: { enabled: orgId > 0, queryKey: [`/api/organizations/${orgId}/bio-dependencies`] },
  });
  const { data: bioIssuesData,    isLoading: loadingBioIssues } = useListBioIssues(orgId, {
    query: { enabled: orgId > 0, queryKey: [`/api/organizations/${orgId}/bio-issues`] },
  });
  const { data: carbonData,       isLoading: loadingCarbon }    = useGetCarbonBilan(orgId, {
    query: { enabled: orgId > 0, queryKey: [`/api/organizations/${orgId}/carbon`] },
  });
  const { data: nrDataRaw,        isLoading: loadingNr }        = useGetNrData(orgId, {
    query: { enabled: orgId > 0, queryKey: [`/api/organizations/${orgId}/numerique-responsable`] },
  });
  const { data: employmentData,   isLoading: loadingEmploy }    = useGetEmploymentResults(orgId, {
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
        });
      }
    }
  }

  // ── 3. Biodiversité ──────────────────────────────────────────────────────
  let bioStatus: SectionStatus =
    loadingBioDeps || loadingBioIssues ? "loading" : "no-data";
  const bioItems: AlertItem[] = [];
  if (!loadingBioDeps && !loadingBioIssues) {
    const deps    = (bioDepsData?.items   ?? []) as any[];
    const risks   = (bioIssuesData?.items ?? []) as any[];
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
        });
      }
      for (const r of critRisks) {
        bioItems.push({
          title: (r.name ?? "Risque biodiversité") as string,
          subtitle: (r.description as string | null | undefined) ?? undefined,
          badge: `Importance ${r.importance}/5`,
          badgeVariant: (r.importance as number) >= 5 ? "destructive" : "warning",
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
          });
        }
      }
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3 py-2">
      <p className="text-xs text-muted-foreground pb-1">
        Points critiques identifiés dans vos modules RSE — à traiter en priorité dans votre démarche.
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
        noDataLabel="Aucun enjeu noté — évaluez vos enjeux RSE pour faire ressortir les priorités."
      />

      <ModuleSection
        icon={Users}
        iconColor="text-blue-600"
        headerBg="bg-blue-50 border-b border-blue-100"
        label="Parties prenantes"
        link="/parties-prenantes"
        status={stakeStatus}
        items={stakeItems}
        emptyLabel="Aucune partie prenante avec influence et intérêt simultanément élevés."
        noDataLabel="Aucune partie prenante renseignée — cartographiez vos parties prenantes."
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
        noDataLabel="Module non renseigné — cartographiez vos dépendances et risques biodiversité."
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
        noDataLabel="Aucun bilan carbone enregistré — renseignez vos émissions pour identifier les postes prioritaires."
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
        noDataLabel="Module non renseigné — complétez le questionnaire NR."
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
        noDataLabel="Données RH non renseignées — complétez les onglets Effectifs, Diversité et Formation."
      />
    </div>
  );
}
