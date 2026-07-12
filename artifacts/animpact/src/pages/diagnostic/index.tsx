import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import {
  useGetDiagnosticScores,
  getGetDiagnosticScoresQueryKey,
} from "@workspace/api-client-react";
import type { DiagnosticSubcategoryScore } from "@workspace/api-client-react";
import { DIAGNOSTIC_CATEGORIES } from "@workspace/rse-referentials";
import { BarChart3, ChevronRight, Loader2, AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

// ── Maturity colors ────────────────────────────────────────────────────────
const MATURITY_COLORS: Record<string, { bg: string; text: string; border: string; ring: string }> = {
  Excellent:      { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", ring: "#10b981" },
  Confirmé:       { bg: "bg-teal-50",    text: "text-teal-700",    border: "border-teal-200",    ring: "#14b8a6" },
  Intermédiaire:  { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   ring: "#f59e0b" },
  Débutant:       { bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200",    ring: "#f43f5e" },
  "Non évalué":   { bg: "bg-slate-50",   text: "text-slate-500",   border: "border-slate-200",   ring: "#cbd5e1" },
};

const CATEGORY_COLORS: Record<string, { primary: string; light: string; label: string }> = {
  ENV: { primary: "#10b981", light: "#d1fae5", label: "Environnement" },
  SOC: { primary: "#3b82f6", light: "#dbeafe", label: "Social" },
  GOV: { primary: "#8b5cf6", light: "#ede9fe", label: "Gouvernance" },
};

// ── Donut chart for a single axis ─────────────────────────────────────────
function AxisDonut({
  categoryId,
  scores,
}: {
  categoryId: string;
  scores: DiagnosticSubcategoryScore[];
}) {
  const colors = CATEGORY_COLORS[categoryId];
  const catScores = scores.filter((s) => s.categoryId === categoryId);

  const evaluated = catScores.filter((s) => s.scorePercent !== null);
  const avgScore =
    evaluated.length > 0
      ? Math.round(evaluated.reduce((a, s) => a + (s.scorePercent ?? 0), 0) / evaluated.length)
      : null;

  const filled = avgScore ?? 0;
  const data = [
    { value: filled },
    { value: Math.max(0, 100 - filled) },
  ];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-28 w-28">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={52}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              strokeWidth={0}
            >
              <Cell fill={avgScore !== null ? colors.primary : "#e2e8f0"} />
              <Cell fill="#f1f5f9" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {avgScore !== null ? (
            <span className="text-xl font-bold text-foreground">{avgScore}%</span>
          ) : (
            <span className="text-xs text-muted-foreground text-center leading-tight">Non<br />évalué</span>
          )}
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">{colors.label}</p>
        <p className="text-xs text-muted-foreground">
          {evaluated.length}/{catScores.length} sous-catégories
        </p>
      </div>
    </div>
  );
}

// ── Subcategory card ───────────────────────────────────────────────────────
function SubcategoryCard({
  score,
  onClick,
}: {
  score: DiagnosticSubcategoryScore;
  onClick: () => void;
}) {
  const maturity = MATURITY_COLORS[score.maturityLabel] ?? MATURITY_COLORS["Non évalué"];
  const catColors = CATEGORY_COLORS[score.categoryId];
  const progress = score.completeness;

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="inline-block h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: catColors?.primary ?? "#94a3b8" }}
            />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {score.categoryId}
            </span>
          </div>
          <p className="text-sm font-semibold text-foreground leading-snug mb-3">{score.label}</p>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{score.answered}/{score.totalQuestions} questions</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${progress}%`,
                  backgroundColor: catColors?.primary ?? "#94a3b8",
                  opacity: 0.7,
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {score.scorePercent !== null ? (
            <div className="text-right">
              <div className="text-lg font-bold text-foreground">{score.scorePercent}%</div>
            </div>
          ) : (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">—</div>
            </div>
          )}
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
              maturity.bg,
              maturity.text,
              maturity.border,
            )}
          >
            {score.maturityLabel}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export function DiagnosticRse() {
  const [, navigate] = useLocation();
  const { currentOrgId } = useCurrentOrganization();

  const orgId = currentOrgId ?? 0;
  const { data: scores, isLoading, error } = useGetDiagnosticScores(orgId, {
    query: { enabled: !!currentOrgId, queryKey: getGetDiagnosticScoresQueryKey(orgId) },
  });

  const totalQuestions = scores ? scores.reduce((a, s) => a + s.totalQuestions, 0) : 0;
  const totalAnswered  = scores ? scores.reduce((a, s) => a + s.answered, 0) : 0;
  const globalProgress = totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0;
  const evaluatedCount = scores ? scores.filter((s) => s.scorePercent !== null).length : 0;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Diagnostic RSE</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Évaluez la maturité RSE de votre entreprise selon le référentiel RCMR — {DIAGNOSTIC_CATEGORIES.flatMap((c) => c.subcategories).length} sous-catégories, {DIAGNOSTIC_CATEGORIES.flatMap((c) => c.subcategories).flatMap((s) => s.questions).length} questions.
          </p>
        </div>

        {!currentOrgId ? (
          <div className="rounded-xl border border-border bg-muted/20 p-10 text-center text-sm text-muted-foreground">
            Sélectionnez une organisation pour accéder au diagnostic.
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            Impossible de charger les scores. Veuillez réessayer.
          </div>
        ) : (
          <>
            {/* Global progress banner */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {globalProgress === 100 ? (
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <TrendingUp className="h-8 w-8 text-primary flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold text-foreground">Avancement global</p>
                    <p className="text-sm text-muted-foreground">
                      {totalAnswered} / {totalQuestions} réponses · {evaluatedCount} sous-catégories évaluées
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-foreground">{globalProgress}%</span>
                </div>
              </div>
              <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${globalProgress}%` }}
                />
              </div>
            </div>

            {/* Axis donuts */}
            <div className="grid grid-cols-3 gap-4">
              {DIAGNOSTIC_CATEGORIES.map((cat) => (
                <div key={cat.id} className="rounded-xl border border-border bg-card p-5 flex justify-center">
                  <AxisDonut categoryId={cat.id} scores={scores ?? []} />
                </div>
              ))}
            </div>

            {/* Subcategory grid by axis */}
            {DIAGNOSTIC_CATEGORIES.map((cat) => {
              const catScores = (scores ?? []).filter((s) => s.categoryId === cat.id);
              const colors = CATEGORY_COLORS[cat.id];
              return (
                <section key={cat.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: colors?.primary }}
                    />
                    <h2 className="text-base font-semibold text-foreground">{colors?.label}</h2>
                    <span className="text-xs text-muted-foreground">({catScores.length} sous-catégories)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {catScores.map((s) => (
                      <SubcategoryCard
                        key={s.subcategoryId}
                        score={s}
                        onClick={() => navigate(`/diagnostic/${s.categoryId}/${s.subcategoryId}`)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </div>
    </AppLayout>
  );
}
