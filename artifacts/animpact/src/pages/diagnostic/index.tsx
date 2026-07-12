import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import {
  useGetDiagnosticScores,
  getGetDiagnosticScoresQueryKey,
} from "@workspace/api-client-react";
import type { DiagnosticSubcategoryScore } from "@workspace/api-client-react";
import { DIAGNOSTIC_CATEGORIES } from "@workspace/rse-referentials";
import { BarChart3, ChevronRight, Loader2, AlertCircle, TrendingUp, CheckCircle2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

// ── Palette par axe ────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { primary: string; light: string; label: string; text: string }> = {
  ENV: { primary: "#10b981", light: "#d1fae5", label: "Environnement", text: "text-emerald-700" },
  SOC: { primary: "#3b82f6", light: "#dbeafe", label: "Social",          text: "text-blue-700"    },
  GOV: { primary: "#8b5cf6", light: "#ede9fe", label: "Gouvernance",     text: "text-violet-700"  },
};

const MATURITY: Record<string, { bg: string; text: string; border: string }> = {
  Excellent:     { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Confirmé:      { bg: "bg-teal-50",    text: "text-teal-700",    border: "border-teal-200"    },
  Intermédiaire: { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200"   },
  Débutant:      { bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200"    },
  "Non évalué":  { bg: "bg-slate-50",   text: "text-slate-500",   border: "border-slate-200"   },
};

// ── Petit donut pour une sous-catégorie ────────────────────────────────────
function SubcategoryDonut({
  score,
  color,
  onClick,
}: {
  score: DiagnosticSubcategoryScore;
  color: string;
  onClick: () => void;
}) {
  const filled = score.scorePercent ?? 0;
  const data = [{ value: filled }, { value: Math.max(0, 100 - filled) }];
  const mat = MATURITY[score.maturityLabel] ?? MATURITY["Non évalué"];
  const hasScore = score.scorePercent !== null;

  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all text-center"
    >
      {/* Donut */}
      <div className="relative h-20 w-20">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={26}
              outerRadius={36}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              strokeWidth={0}
            >
              <Cell fill={hasScore ? color : "#e2e8f0"} />
              <Cell fill="#f1f5f9" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          {hasScore ? (
            <span className="text-sm font-bold text-foreground">{score.scorePercent}%</span>
          ) : (
            <span className="text-[10px] text-muted-foreground leading-tight">—</span>
          )}
        </div>
      </div>

      {/* Label */}
      <p className="text-xs font-semibold text-foreground leading-snug">{score.label}</p>

      {/* Badge maturité */}
      <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border", mat.bg, mat.text, mat.border)}>
        {score.maturityLabel}
      </span>

      {/* Progression */}
      <div className="w-full space-y-0.5">
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${score.completeness}%`, backgroundColor: color, opacity: 0.6 }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground">{score.answered}/{score.totalQuestions}</p>
      </div>

      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
    </button>
  );
}

// ── Carte résumé d'un axe ─────────────────────────────────────────────────
function AxisSummary({ categoryId, scores }: { categoryId: string; scores: DiagnosticSubcategoryScore[] }) {
  const cfg = CATEGORY_CONFIG[categoryId];
  const catScores = scores.filter((s) => s.categoryId === categoryId);
  const evaluated = catScores.filter((s) => s.scorePercent !== null);
  const avg = evaluated.length > 0
    ? Math.round(evaluated.reduce((a, s) => a + (s.scorePercent ?? 0), 0) / evaluated.length)
    : null;

  return (
    <div
      className="rounded-xl border px-4 py-3 flex items-center gap-3"
      style={{ borderColor: cfg.primary + "40", backgroundColor: cfg.light + "60" }}
    >
      <div
        className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
        style={{ backgroundColor: cfg.primary }}
      >
        {categoryId}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{cfg.label}</p>
        <p className="text-xs text-muted-foreground">{evaluated.length}/{catScores.length} évaluées</p>
      </div>
      {avg !== null ? (
        <span className="text-xl font-bold text-foreground">{avg}%</span>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      )}
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────
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
  const totalSubs = DIAGNOSTIC_CATEGORIES.flatMap((c) => c.subcategories).length;
  const totalQuestionsRef = DIAGNOSTIC_CATEGORIES.flatMap((c) => c.subcategories).flatMap((s) => s.questions).length;

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
            {totalSubs} sous-catégories · {totalQuestionsRef} questions — référentiel RCMR
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
            {/* Barre de progression globale */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  {globalProgress === 100 ? (
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <TrendingUp className="h-8 w-8 text-primary flex-shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold text-foreground">Avancement global</p>
                    <p className="text-sm text-muted-foreground">
                      {totalAnswered}/{totalQuestions} réponses · {evaluatedCount} sous-catégories évaluées
                    </p>
                  </div>
                </div>
                <span className="text-3xl font-bold text-foreground">{globalProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${globalProgress}%` }} />
              </div>
            </div>

            {/* Résumé des 3 axes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DIAGNOSTIC_CATEGORIES.map((cat) => (
                <AxisSummary key={cat.id} categoryId={cat.id} scores={scores ?? []} />
              ))}
            </div>

            {/* Donuts par sous-catégorie, groupés par axe */}
            {DIAGNOSTIC_CATEGORIES.map((cat) => {
              const cfg = CATEGORY_CONFIG[cat.id];
              const catScores = (scores ?? []).filter((s) => s.categoryId === cat.id);
              return (
                <section key={cat.id}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cfg.primary }} />
                    <h2 className="text-base font-semibold text-foreground">{cfg.label}</h2>
                    <span className="text-xs text-muted-foreground">({catScores.length} sous-catégories)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {catScores.map((s) => (
                      <SubcategoryDonut
                        key={s.subcategoryId}
                        score={s}
                        color={cfg.primary}
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
