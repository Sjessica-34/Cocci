import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ChevronRight, Check, User, CalendarClock, Sparkles } from "lucide-react";
import {
  useListPlanSlots,
  useGetCarbonBilan,
  useListBioDependencies,
  useListStakeholders,
  useListSuppliers,
  useGetNrData,
  useGetEmploymentResults,
  useListLabels,
  useListActionPlan,
  useGetDiagnosticScores,
  useGetDashboardSummary,
  useGetImpactScoreResult,
  ApiError,
  type DiagnosticSubcategoryScore,
  type DashboardSummary,
  type DashboardIndicator,
} from "@workspace/api-client-react";
import { calculateCarbonDetailTotals } from "@workspace/rse-referentials";
import type { CarbonTravelItem, CarbonUsageItem } from "@workspace/rse-referentials";

// ─── Diagnostic axis score helper ────────────────────────────────────────────

function axisScore(scores: DiagnosticSubcategoryScore[], catId: string): number | null {
  const cat = scores.filter(s => s.categoryId === catId && s.scorePercent != null);
  if (cat.length === 0) return null;
  return Math.round(cat.reduce((sum, s) => sum + (s.scorePercent ?? 0), 0) / cat.length);
}

function axisProgress(scores: DiagnosticSubcategoryScore[], catId: string): number {
  const cat = scores.filter(s => s.categoryId === catId);
  const total = cat.reduce((s, x) => s + x.totalQuestions, 0);
  const answered = cat.reduce((s, x) => s + x.answered, 0);
  return total > 0 ? Math.round((answered / total) * 100) : 0;
}

function axisCounts(scores: DiagnosticSubcategoryScore[], catId: string): { answered: number; total: number } {
  const cat = scores.filter(s => s.categoryId === catId);
  return {
    answered: cat.reduce((s, x) => s + x.answered, 0),
    total: cat.reduce((s, x) => s + x.totalQuestions, 0),
  };
}

// ─── Carbon total helper ──────────────────────────────────────────────────────

function computeCarbonTotal(b: Record<string, unknown>): number {
  return calculateCarbonDetailTotals(
    b,
    (b.travelItems as CarbonTravelItem[] | undefined) ?? [],
    (b.usageItems as CarbonUsageItem[] | undefined) ?? [],
  ).globalTotal;
}

// ─── N/N-1 helpers ───────────────────────────────────────────────────────────

function findInd(
  modules: DashboardSummary["modules"],
  moduleKey: string,
  indicatorKey: string,
): DashboardIndicator | null {
  return (
    modules
      .find((m) => m.key === moduleKey)
      ?.indicators.find((i) => i.key === indicatorKey) ?? null
  );
}

interface TrendDef {
  module: string;
  key: string;
  icon: string;
  label: string;
  inverse?: boolean;
}

const TREND_INDICATORS: TrendDef[] = [
  { module: "carbon",     key: "totalEmissions", icon: "🌍", label: "Émissions carbone",        inverse: true  },
  { module: "diagnostic", key: "envScore",        icon: "🌿", label: "Score ENV",                inverse: false },
  { module: "diagnostic", key: "socScore",        icon: "👥", label: "Score SOC",                inverse: false },
  { module: "diagnostic", key: "govScore",        icon: "🏛",  label: "Score GOV",                inverse: false },
  { module: "suppliers",  key: "certifiedPct",    icon: "🤝", label: "Fournisseurs certifiés",   inverse: false },
  { module: "actions",    key: "completionRate",  icon: "📋", label: "Taux d'actions",           inverse: false },
  { module: "employment", key: "headcount",       icon: "👤", label: "Effectif",                 inverse: false },
  { module: "nr",         key: "score",           icon: "💻", label: "Score NR",                 inverse: false },
  { module: "labels",     key: "obtained",        icon: "🏅", label: "Labels obtenus",           inverse: false },
];

function formatVal(v: number | null, unit: string | null): string {
  if (v == null) return "—";
  if (unit === "%") return `${Math.round(v)} %`;
  if (unit === "tCO₂e")
    return `${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} tCO₂e`;
  return `${Math.round(v)}`;
}

function TrendCard({ def, ind }: { def: TrendDef; ind: DashboardIndicator }) {
  const { current, previous, unit } = ind;
  const delta = current != null && previous != null ? current - previous : null;
  const hasDelta = delta != null;
  const isPositive = hasDelta ? (def.inverse ? delta < 0 : delta > 0) : null;

  const deltaLabel = (() => {
    if (!hasDelta || delta === 0) return null;
    const abs = Math.abs(delta);
    const sign = delta > 0 ? "▲" : "▼";
    if (unit === "%") return `${sign} ${Math.round(abs)} pt`;
    if (unit === "tCO₂e")
      return `${sign} ${abs.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ${unit}`;
    return `${sign} ${Math.round(abs)}`;
  })();

  return (
    <Card className="p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-base leading-none">{def.icon}</span>
        <span className="text-xs text-muted-foreground font-medium truncate">{def.label}</span>
      </div>
      <p className="text-xl font-bold tabular-nums leading-tight">
        {formatVal(current, unit)}
      </p>
      {hasDelta && deltaLabel ? (
        <p
          className={`text-xs mt-1 font-medium ${isPositive ? "text-emerald-600" : "text-red-500"}`}
        >
          {deltaLabel}{" "}
          <span className="text-muted-foreground font-normal">vs N-1</span>
        </p>
      ) : hasDelta ? (
        <p className="text-xs mt-1 text-muted-foreground">= N-1</p>
      ) : (
        <p className="text-xs mt-1 text-muted-foreground">Pas de N-1</p>
      )}
    </Card>
  );
}

// ─── Progress ring (SVG, 72×72) ───────────────────────────────────────────────

function ProgressRing({ pct, color }: { pct: number; color: string }) {
  const size = 72;
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Completion bar ───────────────────────────────────────────────────────────

function CompletionBar({ pct, color = "bg-emerald-500" }: { pct: number; color?: string }) {
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
      <div
        className={`${color} h-1.5 rounded-full transition-all`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

// ─── Next Step Banner ─────────────────────────────────────────────────────────

interface NextStep {
  href: string;
  icon: string;
  title: string;
  hint: string;
  completionPct: number;
}

function NextStepBanner({ step }: { step: NextStep }) {
  return (
    <Link href={step.href}>
      <div className="flex items-center gap-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl px-5 py-4 hover:shadow-md transition-all cursor-pointer group">
        <div className="shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-xl">
          {step.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">
              Prochaine étape recommandée
            </span>
          </div>
          <p className="text-sm font-semibold text-foreground truncate">{step.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{step.hint}</p>
          {step.completionPct > 0 && step.completionPct < 100 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 bg-amber-100 rounded-full h-1.5">
                <div
                  className="bg-amber-400 h-1.5 rounded-full transition-all"
                  style={{ width: `${step.completionPct}%` }}
                />
              </div>
              <span className="text-[11px] text-amber-600 font-medium shrink-0">{step.completionPct}%</span>
            </div>
          )}
        </div>
        <ArrowUpRight className="h-4 w-4 text-amber-400 group-hover:text-amber-600 transition-colors shrink-0" />
      </div>
    </Link>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ModuleCard({
  icon, title, href, children,
}: {
  icon: string;
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href}>
      <Card className="h-full hover:shadow-md transition-all cursor-pointer group">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <span>{icon}</span>
            <span>{title}</span>
          </CardTitle>
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
        </CardHeader>
        <CardContent className="space-y-1.5">{children}</CardContent>
      </Card>
    </Link>
  );
}

function KpiRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DashboardBody({ orgId }: { orgId: number }) {

  // ── Ligne 1 ────────────────────────────────────────────────────────────────
  const { data: labels,  isLoading: labelsLoading  } = useListLabels(orgId);
  const { data: actions, isLoading: actionsLoading } = useListActionPlan(orgId);
  const { data: planSlots, isLoading: slotsLoading } = useListPlanSlots(orgId);

  // ── Ligne 2 : scores diagnostic ───────────────────────────────────────────
  const { data: diagScores, isLoading: diagLoading } = useGetDiagnosticScores(orgId);

  const envScore  = diagScores ? axisScore(diagScores, "ENV")  : null;
  const socScore  = diagScores ? axisScore(diagScores, "SOC")  : null;
  const govScore  = diagScores ? axisScore(diagScores, "GOV")  : null;
  const envProg   = diagScores ? axisProgress(diagScores, "ENV")  : 0;
  const socProg   = diagScores ? axisProgress(diagScores, "SOC")  : 0;
  const govProg   = diagScores ? axisProgress(diagScores, "GOV")  : 0;

  // Answered / total counts per axis for completion labels
  const envCounts = diagScores ? axisCounts(diagScores, "ENV") : { answered: 0, total: 0 };
  const socCounts = diagScores ? axisCounts(diagScores, "SOC") : { answered: 0, total: 0 };
  const govCounts = diagScores ? axisCounts(diagScores, "GOV") : { answered: 0, total: 0 };
  const overallCounts = diagScores
    ? {
        answered: diagScores.reduce((s, x) => s + x.answered, 0),
        total: diagScores.reduce((s, x) => s + x.totalQuestions, 0),
      }
    : { answered: 0, total: 0 };

  const overallDiagScore = (() => {
    const nonNull = [envScore, socScore, govScore].filter((v): v is number => v !== null);
    return nonNull.length > 0 ? Math.round(nonNull.reduce((a, b) => a + b, 0) / nonNull.length) : null;
  })();
  const overallDiagProg = diagScores
    ? Math.round((diagScores.reduce((s, x) => s + x.answered, 0) / diagScores.reduce((s, x) => s + x.totalQuestions, 0)) * 100)
    : 0;

  // ── Impact Score ───────────────────────────────────────────────────────────
  const { data: impactData, isLoading: impactLoading } = useGetImpactScoreResult(orgId);

  // ── Ligne 3 ────────────────────────────────────────────────────────────────
  const { data: carbon,       isLoading: carbonLoading } = useGetCarbonBilan(orgId, {
    query: {
      queryKey: [`/api/organizations/${orgId}/carbon`],
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status === 404) return false;
        return failureCount < 1;
      },
    },
  });
  const { data: bioDeps,      isLoading: bioLoading    } = useListBioDependencies(orgId);
  const { data: stakeholders, isLoading: stakeLoading  } = useListStakeholders(orgId);
  const { data: suppliers,    isLoading: suppLoading   } = useListSuppliers(orgId);
  const { data: nrData,       isLoading: nrLoading     } = useGetNrData(orgId);
  const { data: employment,   isLoading: empLoading    } = useGetEmploymentResults(orgId);

  // ── Ligne 4 : N/N-1 ────────────────────────────────────────────────────────
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary(orgId);
  const hasPreviousYear = summary != null && summary.previousYear != null;
  const mods = summary?.modules ?? [];

  // ── Actions ────────────────────────────────────────────────────────────────
  const totalActions = actions?.length ?? 0;
  const doneActions  = actions?.filter(a => a.isChecked).length ?? 0;
  const actionRate   = totalActions > 0 ? Math.round((doneActions / totalActions) * 100) : 0;

  // ── Labels ─────────────────────────────────────────────────────────────────
  const obtainedLabels   = labels?.items.filter(l => l.year != null).length ?? 0;
  const inProgressLabels = labels?.items.filter(l => l.year == null).length ?? 0;

  // ── Carbon ─────────────────────────────────────────────────────────────────
  const carbonTotal = carbon
    ? computeCarbonTotal(carbon as unknown as Record<string, unknown>)
    : null;

  // ── Bio ────────────────────────────────────────────────────────────────────
  const bioItems = bioDeps?.items ?? [];
  const bioByCategory = {
    Ressource: bioItems.filter(b => b.category === "Ressource").length,
    Activité:  bioItems.filter(b => b.category === "Activité").length,
    Acteur:    bioItems.filter(b => b.category === "Acteur").length,
    Lieu:      bioItems.filter(b => b.category === "Lieu").length,
  };

  // ── Numérique responsable ──────────────────────────────────────────────────
  const nrTotal   = nrData?.responses.length ?? 0;
  const nrChecked = nrData?.responses.filter(r => r.checked).length ?? 0;
  const nrScore   = nrTotal > 0 ? Math.round((nrChecked / nrTotal) * 100) : 0;
  const nrLevel   = nrData?.meta.certificationLabel ?? null;

  // ── Capital humain ─────────────────────────────────────────────────────────
  const headcount     = employment?.workforce?.totalHeadcount ?? null;
  const trainedCount  = employment?.training?.nbCollaborateursFormes ?? null;
  const trainingHours = employment?.training?.nbHeuresFormation ?? null;
  const trainingRate  = headcount && trainedCount
    ? Math.round((trainedCount / headcount) * 100)
    : null;

  // ── Achats ─────────────────────────────────────────────────────────────────
  const allSuppliers  = suppliers?.items ?? [];
  const evalSuppliers = allSuppliers.filter(
    s => s.rsePolicy || s.evalComments || s.certifications,
  ).length;
  const respSuppliers = allSuppliers.filter(s => !!s.certifications).length;
  const certPct       = allSuppliers.length > 0
    ? Math.round((respSuppliers / allSuppliers.length) * 100)
    : 0;

  // ── Visibilité modules ────────────────────────────────────────────────────
  const showCarbon       = !carbonLoading && !!carbon;
  const showBio          = !bioLoading    && bioItems.length > 0;
  const showStakeholders = !stakeLoading  && (stakeholders?.length ?? 0) > 0;
  const showSuppliers    = !suppLoading   && allSuppliers.length > 0;
  const showNr           = !nrLoading     && !!nrData;
  const showEmployment   = !empLoading    && (!!employment?.workforce || !!employment?.training);

  const modulesLoading  = carbonLoading || bioLoading || stakeLoading || suppLoading || nrLoading || empLoading;
  const anyModuleVisible = showCarbon || showBio || showStakeholders || showSuppliers || showNr || showEmployment;

  // ── Indicateurs N/N-1 visibles ────────────────────────────────────────────
  const visibleTrends = TREND_INDICATORS.filter((t) => {
    const ind = findInd(mods, t.module, t.key);
    return ind?.current != null;
  });

  // ── Prochaine étape recommandée ───────────────────────────────────────────
  const isDataLoaded = !diagLoading && !actionsLoading && !carbonLoading && !nrLoading && !bioLoading && !stakeLoading && !suppLoading && !empLoading;

  const nextStep: NextStep | null = (() => {
    if (!isDataLoaded) return null;

    const candidates: NextStep[] = [];

    // Diagnostic RSE : basé sur le % de complétion global
    if (overallCounts.total > 0) {
      const pct = overallCounts.total > 0
        ? Math.round((overallCounts.answered / overallCounts.total) * 100)
        : 0;
      if (pct < 100) {
        candidates.push({
          href: "/diagnostic",
          icon: "🌱",
          title: "Compléter le Diagnostic RSE",
          hint: `${overallCounts.answered} / ${overallCounts.total} questions renseignées`,
          completionPct: pct,
        });
      }
    } else {
      // Diagnostic pas commencé
      candidates.push({
        href: "/diagnostic",
        icon: "🌱",
        title: "Démarrer le Diagnostic RSE",
        hint: "Évaluez votre maturité sur les axes ENV, SOC et GOV",
        completionPct: 0,
      });
    }

    // Numérique responsable
    if (nrData && nrTotal > 0 && nrChecked < nrTotal) {
      candidates.push({
        href: "/numerique-responsable",
        icon: "💻",
        title: "Compléter le Numérique Responsable",
        hint: `${nrChecked} / ${nrTotal} critères cochés`,
        completionPct: nrScore,
      });
    } else if (!nrData) {
      candidates.push({
        href: "/numerique-responsable",
        icon: "💻",
        title: "Renseigner le Numérique Responsable",
        hint: "Évaluez l'impact numérique de votre organisation",
        completionPct: 0,
      });
    }

    // Bilan carbone
    if (!carbon) {
      candidates.push({
        href: "/bilan-carbone",
        icon: "🌍",
        title: "Saisir le Bilan Carbone",
        hint: "Calculez vos émissions sur les 3 scopes",
        completionPct: 0,
      });
    }

    // Achats responsables
    if (allSuppliers.length === 0) {
      candidates.push({
        href: "/achats-responsables",
        icon: "🤝",
        title: "Référencer vos fournisseurs",
        hint: "Évaluez la démarche RSE de vos partenaires",
        completionPct: 0,
      });
    }

    // Biodiversité
    if (bioItems.length === 0) {
      candidates.push({
        href: "/biodiversite",
        icon: "🌿",
        title: "Cartographier vos dépendances biodiversité",
        hint: "Identifiez vos ressources, activités et lieux impactés",
        completionPct: 0,
      });
    }

    // Capital humain
    if (!employment?.workforce && !employment?.training) {
      candidates.push({
        href: "/capital-humain",
        icon: "👤",
        title: "Renseigner les données Capital Humain",
        hint: "Effectif, formation, parité et indicateurs sociaux",
        completionPct: 0,
      });
    }

    // Sélectionner le candidat le moins avancé (pct le plus bas), en priorité ceux à 0%
    if (candidates.length === 0) return null;
    return candidates.sort((a, b) => a.completionPct - b.completionPct)[0];
  })();

  return (
    <div className="space-y-8">

      {/* ══ Prochaine étape ══════════════════════════════════════════════════ */}
      {isDataLoaded && nextStep && (
        <NextStepBanner step={nextStep} />
      )}

      {/* ══ LIGNE 1 : 4 cartes de synthèse ══════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* 🌍 Impact Score */}
        <Link href="/impact-score">
          <Card className="h-full hover:shadow-md transition-all cursor-pointer group border-orange-100 hover:border-orange-200 bg-gradient-to-br from-orange-50/50 to-transparent">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">🌍 Impact Score</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-orange-400 group-hover:text-orange-600 transition-colors shrink-0" />
            </CardHeader>
            <CardContent>
              {impactLoading ? (
                <Skeleton className="h-9 w-24 mb-1" />
              ) : impactData?.result ? (
                <>
                  <p className="text-3xl font-bold text-orange-500">{impactData.result.score}<span className="text-base font-normal text-muted-foreground">/100</span></p>
                  <p className="text-xs text-muted-foreground mt-1">Score renseigné</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-orange-300">—</p>
                  <p className="text-xs text-muted-foreground mt-1">Non renseigné</p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* 🌱 Maturité RSE */}
        <Link href="/diagnostic">
          <Card className="h-full hover:shadow-md transition-all cursor-pointer group border-emerald-100 hover:border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-transparent">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">🌱 Maturité RSE</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-emerald-400 group-hover:text-emerald-600 transition-colors shrink-0" />
            </CardHeader>
            <CardContent>
              {diagLoading ? (
                <Skeleton className="h-9 w-24 mb-1" />
              ) : overallDiagScore != null ? (
                <>
                  <p className="text-3xl font-bold text-emerald-700">{overallDiagScore}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Score global ENV · SOC · GOV</p>
                  {overallCounts.total > 0 && (
                    <p className="text-xs text-emerald-600/70 mt-0.5">
                      {overallCounts.answered}/{overallCounts.total} questions renseignées
                    </p>
                  )}
                </>
              ) : overallDiagProg > 0 ? (
                <>
                  <p className="text-3xl font-bold text-emerald-400">{overallDiagProg}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Avancement diagnostic</p>
                  {overallCounts.total > 0 && (
                    <p className="text-xs text-emerald-600/70 mt-0.5">
                      {overallCounts.answered}/{overallCounts.total} questions
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-emerald-200">—</p>
                  <p className="text-xs text-muted-foreground mt-1">Commencer le diagnostic</p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* 📋 Plan d'action */}
        <Link href="/mes-actions">
          <Card className="h-full hover:shadow-md transition-all cursor-pointer group border-blue-100 hover:border-blue-200 bg-gradient-to-br from-blue-50/50 to-transparent">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">📋 Plan d'action</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-blue-400 group-hover:text-blue-600 transition-colors shrink-0" />
            </CardHeader>
            <CardContent>
              {actionsLoading ? (
                <Skeleton className="h-9 w-24 mb-1" />
              ) : totalActions === 0 ? (
                <>
                  <p className="text-3xl font-bold">—</p>
                  <p className="text-xs text-muted-foreground mt-1">Aucune action planifiée</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-blue-700">{actionRate}%</p>
                  <div className="w-full bg-blue-100 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${actionRate}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {doneActions} / {totalActions} action{totalActions > 1 ? "s" : ""}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* 🏅 Labels & Certifications */}
        <Link href="/mes-labels">
          <Card className="h-full hover:shadow-md transition-all cursor-pointer group border-violet-100 hover:border-violet-200 bg-gradient-to-br from-violet-50/50 to-transparent">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">🏅 Labels & Certifications</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-violet-400 group-hover:text-violet-600 transition-colors shrink-0" />
            </CardHeader>
            <CardContent>
              {labelsLoading ? (
                <Skeleton className="h-9 w-20 mb-1" />
              ) : (
                <>
                  <p className="text-3xl font-bold text-violet-700">{obtainedLabels}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {obtainedLabels === 0 && inProgressLabels === 0
                      ? "Aucun label renseigné"
                      : inProgressLabels > 0
                        ? `${inProgressLabels} en cours d'obtention`
                        : `label${obtainedLabels > 1 ? "s" : ""} obtenu${obtainedLabels > 1 ? "s" : ""}`}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ══ Prochaines actions ═══════════════════════════════════════════════ */}
      {!slotsLoading && (planSlots?.length ?? 0) > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Prochaines actions à réaliser
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(planSlots ?? [])
              .filter(s => !s.isDone)
              .slice(0, 6)
              .map(slot => {
                const catColors: Record<string, string> = {
                  Environnement: "bg-emerald-100 text-emerald-800 border-emerald-200",
                  "Numérique responsable": "bg-sky-100 text-sky-800 border-sky-200",
                  Biodiversité: "bg-lime-100 text-lime-800 border-lime-200",
                  Social: "bg-blue-100 text-blue-800 border-blue-200",
                  "Achats responsables": "bg-orange-100 text-orange-800 border-orange-200",
                  Gouvernance: "bg-purple-100 text-purple-800 border-purple-200",
                };
                const catEmoji: Record<string, string> = {
                  Environnement: "🌍", "Numérique responsable": "💻",
                  Biodiversité: "🌿", Social: "👥",
                  "Achats responsables": "🤝", Gouvernance: "⚖️",
                };
                const statusLabel: Record<string, string> = {
                  in_progress: "En cours", blocked: "Bloquée",
                };
                const statusColor: Record<string, string> = {
                  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
                  blocked: "bg-red-100 text-red-800 border-red-200",
                };
                const cat = slot.actionCategory ?? null;
                const overdue = slot.dueDate != null && new Date(slot.dueDate) < new Date();
                return (
                  <Link key={slot.id} href="/mes-actions">
                    <Card className="hover:shadow-md transition-all cursor-pointer group border-blue-50 hover:border-blue-200 h-full">
                      <CardContent className="p-4">
                        <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors">
                          {slot.actionName ?? "Action personnalisée"}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {cat && (
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${catColors[cat] ?? ""}`}>
                              {catEmoji[cat]} {slot.actionSubcategory ?? cat}
                            </Badge>
                          )}
                          {slot.status && statusLabel[slot.status] && (
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusColor[slot.status] ?? ""}`}>
                              {statusLabel[slot.status]}
                            </Badge>
                          )}
                        </div>
                        {(slot.assignedToName || slot.dueDate) && (
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                            {slot.assignedToName && (
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {slot.assignedToName}
                              </span>
                            )}
                            {slot.dueDate && (
                              <span className={`text-[11px] flex items-center gap-1 ${overdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                                <CalendarClock className="h-3 w-3" />
                                {new Date(slot.dueDate).toLocaleDateString("fr-FR")}
                              </span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            {(planSlots ?? []).filter(s => !s.isDone).length === 0 && (
              <div className="col-span-full flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-4 py-3 border border-emerald-100">
                <Check className="h-4 w-4 shrink-0" />
                Toutes les actions du plan sont réalisées ! 🎉
              </div>
            )}
          </div>
          <div className="mt-2 flex justify-end">
            <Link href="/mes-actions">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1">
                Voir tout le plan <ArrowUpRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ══ LIGNE 2 : Diagnostic RSE ═══════════════════════════════════════════ */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Diagnostic RSE
          {!diagLoading && overallCounts.total > 0 && (
            <span className="ml-2 normal-case font-normal text-muted-foreground/70">
              — {overallCounts.answered}/{overallCounts.total} questions renseignées
            </span>
          )}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Environnement */}
          <Link href="/diagnostic">
            <Card className="hover:shadow-md transition-all cursor-pointer group">
              <CardHeader className="pb-1 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">🌿 Environnement</CardTitle>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </CardHeader>
              <CardContent className="flex flex-col items-center pt-2 pb-4">
                {diagLoading ? (
                  <Skeleton className="h-[72px] w-[72px] rounded-full" />
                ) : (
                  <div className="relative">
                    <ProgressRing pct={envScore ?? envProg} color="#10B981" />
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-emerald-700">
                      {envScore != null ? `${envScore}%` : envProg > 0 ? `${envProg}%` : "—"}
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {envScore != null
                    ? "Score maturité"
                    : envProg > 0
                      ? `${envProg}% de progression`
                      : "Diagnostic non commencé"}
                </p>
                {!diagLoading && envCounts.total > 0 && (
                  <div className="w-full mt-2 px-2">
                    <p className="text-[11px] text-center text-muted-foreground/70 mb-1">
                      {envCounts.answered}/{envCounts.total} questions
                    </p>
                    <CompletionBar
                      pct={envCounts.total > 0 ? Math.round((envCounts.answered / envCounts.total) * 100) : 0}
                      color="bg-emerald-400"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Social */}
          <Link href="/diagnostic">
            <Card className="hover:shadow-md transition-all cursor-pointer group">
              <CardHeader className="pb-1 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">👥 Social</CardTitle>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </CardHeader>
              <CardContent className="flex flex-col items-center pt-2 pb-4">
                {diagLoading ? (
                  <Skeleton className="h-[72px] w-[72px] rounded-full" />
                ) : (
                  <div className="relative">
                    <ProgressRing pct={socScore ?? socProg} color="#3B82F6" />
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-blue-700">
                      {socScore != null ? `${socScore}%` : socProg > 0 ? `${socProg}%` : "—"}
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {socScore != null
                    ? "Score maturité"
                    : socProg > 0
                      ? `${socProg}% de progression`
                      : "Diagnostic non commencé"}
                </p>
                {!diagLoading && socCounts.total > 0 && (
                  <div className="w-full mt-2 px-2">
                    <p className="text-[11px] text-center text-muted-foreground/70 mb-1">
                      {socCounts.answered}/{socCounts.total} questions
                    </p>
                    <CompletionBar
                      pct={socCounts.total > 0 ? Math.round((socCounts.answered / socCounts.total) * 100) : 0}
                      color="bg-blue-400"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Gouvernance */}
          <Link href="/diagnostic">
            <Card className="hover:shadow-md transition-all cursor-pointer group">
              <CardHeader className="pb-1 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">🏛 Gouvernance</CardTitle>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </CardHeader>
              <CardContent className="flex flex-col items-center pt-2 pb-4">
                {diagLoading ? (
                  <Skeleton className="h-[72px] w-[72px] rounded-full" />
                ) : (
                  <div className="relative">
                    <ProgressRing pct={govScore ?? govProg} color="#8B5CF6" />
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-violet-700">
                      {govScore != null ? `${govScore}%` : govProg > 0 ? `${govProg}%` : "—"}
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {govScore != null
                    ? "Score maturité"
                    : govProg > 0
                      ? `${govProg}% de progression`
                      : "Diagnostic non commencé"}
                </p>
                {!diagLoading && govCounts.total > 0 && (
                  <div className="w-full mt-2 px-2">
                    <p className="text-[11px] text-center text-muted-foreground/70 mb-1">
                      {govCounts.answered}/{govCounts.total} questions
                    </p>
                    <CompletionBar
                      pct={govCounts.total > 0 ? Math.round((govCounts.answered / govCounts.total) * 100) : 0}
                      color="bg-violet-400"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* ══ LIGNE 3 : Modules RSE ══════════════════════════════════════════════ */}
      {(modulesLoading || anyModuleVisible) && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Modules RSE
          </h2>
          {modulesLoading && !anyModuleVisible ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

              {/* 🌍 Bilan carbone */}
              {showCarbon && (
                <ModuleCard icon="🌍" title="Bilan carbone" href="/bilan-carbone">
                  <KpiRow
                    label="Émissions totales"
                    value={
                      carbonTotal != null
                        ? `${carbonTotal.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} tCO₂e`
                        : "—"
                    }
                  />
                  {carbon?.year && <KpiRow label="Exercice" value={carbon.year} />}
                </ModuleCard>
              )}

              {/* 🌿 Biodiversité */}
              {showBio && (
                <ModuleCard icon="🌿" title="Dépendances biodiversité" href="/biodiversite">
                  <KpiRow label="Éléments cartographiés" value={bioItems.length} />
                  {bioByCategory.Ressource > 0 && (
                    <KpiRow label="Ressources" value={bioByCategory.Ressource} />
                  )}
                  {bioByCategory.Activité > 0 && (
                    <KpiRow label="Activités" value={bioByCategory.Activité} />
                  )}
                  {bioByCategory.Acteur > 0 && (
                    <KpiRow label="Acteurs" value={bioByCategory.Acteur} />
                  )}
                  {bioByCategory.Lieu > 0 && (
                    <KpiRow label="Lieux" value={bioByCategory.Lieu} />
                  )}
                </ModuleCard>
              )}

              {/* 👥 Parties prenantes */}
              {showStakeholders && (
                <ModuleCard icon="👥" title="Parties prenantes" href="/parties-prenantes">
                  <KpiRow
                    label="Parties prenantes identifiées"
                    value={stakeholders?.length ?? 0}
                  />
                </ModuleCard>
              )}

              {/* 🤝 Achats responsables */}
              {showSuppliers && (
                <ModuleCard icon="🤝" title="Achats responsables" href="/achats-responsables">
                  <KpiRow label="Fournisseurs" value={allSuppliers.length} />
                  {evalSuppliers > 0 && (
                    <KpiRow label="Évalués RSE" value={evalSuppliers} />
                  )}
                  <KpiRow
                    label="Avec certification"
                    value={
                      respSuppliers > 0
                        ? `${certPct}% (${respSuppliers})`
                        : "Aucun"
                    }
                  />
                </ModuleCard>
              )}

              {/* 💻 Numérique responsable */}
              {showNr && (
                <ModuleCard icon="💻" title="Numérique responsable" href="/numerique-responsable">
                  <KpiRow label="Score" value={`${nrScore}%`} />
                  {nrLevel && <KpiRow label="Niveau" value={nrLevel} />}
                  {nrTotal > 0 && (
                    <div className="pt-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{nrChecked}/{nrTotal} critères</span>
                        <span className="text-xs font-medium text-sky-600">{nrScore}%</span>
                      </div>
                      <CompletionBar pct={nrScore} color="bg-sky-400" />
                    </div>
                  )}
                </ModuleCard>
              )}

              {/* 👤 Capital humain */}
              {showEmployment && (
                <ModuleCard icon="👤" title="Capital humain" href="/capital-humain">
                  {headcount != null && (
                    <KpiRow label="Effectif" value={`${headcount} pers.`} />
                  )}
                  {trainingRate != null && (
                    <KpiRow label="Taux de formation" value={`${trainingRate}%`} />
                  )}
                  {trainingHours != null && (
                    <KpiRow label="Heures de formation" value={`${trainingHours} h`} />
                  )}
                </ModuleCard>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ LIGNE 4 : Évolution N/N-1 ══════════════════════════════════════════ */}
      {(summaryLoading || hasPreviousYear) && (
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Évolution N/N-1
            {summary && summary.previousYear != null && (
              <span className="ml-2 normal-case font-normal text-muted-foreground/70">
                {summary.previousYear} → {summary.currentYear}
              </span>
            )}
          </h2>

          {summaryLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : visibleTrends.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune donnée disponible pour la comparaison N/N-1.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {visibleTrends.map((t) => {
                const ind = findInd(mods, t.module, t.key)!;
                return <TrendCard key={`${t.module}-${t.key}`} def={t} ind={ind} />;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
