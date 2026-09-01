import { useRef, useState } from "react";
import type { IssueRatedItem } from "@workspace/api-client-react";
import {
  useGetIssueAnalysis,
  useAnalyzeIssues,
} from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Loader2, Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileZoomable } from "@/components/MobileZoomable";

const CATEGORY_COLORS: Record<string, string> = {
  "Changements climatiques": "#14b8a6",
  "Biodiversité": "#22c55e",
  "Communication / Marketing": "#f97316",
  "Pratiques responsables des affaires": "#6366f1",
  "Diversité, égalité et inclusion": "#ec4899",
  "Santé et sécurité": "#ef4444",
  "Économie circulaire": "#84cc16",
  "Bien-être et vie quotidienne": "#8b5cf6",
  "Excellence opérationnelle": "#3b82f6",
  "Création de valeur locale": "#f59e0b",
  "Patrimoine et ancrage territorial": "#10b981",
};

const SUPER_ISSUE_ACCENTS = [
  { bg: "bg-teal-50 border-teal-200", dot: "#14b8a6", label: "text-teal-700", badge: "bg-teal-100 text-teal-700" },
  { bg: "bg-violet-50 border-violet-200", dot: "#8b5cf6", label: "text-violet-700", badge: "bg-violet-100 text-violet-700" },
  { bg: "bg-amber-50 border-amber-200", dot: "#f59e0b", label: "text-amber-700", badge: "bg-amber-100 text-amber-700" },
  { bg: "bg-rose-50 border-rose-200", dot: "#f43f5e", label: "text-rose-700", badge: "bg-rose-100 text-rose-700" },
];

const SVG_W = 560;
const SVG_H = 480;
const PAD = { top: 30, right: 30, bottom: 50, left: 50 };
const PLOT_W = SVG_W - PAD.left - PAD.right;
const PLOT_H = SVG_H - PAD.top - PAD.bottom;

function plotX(v: number) { return PAD.left + ((v - 1) / 4) * PLOT_W; }
function plotY(v: number) { return PAD.top + PLOT_H - ((v - 1) / 4) * PLOT_H; }

type Props = { items: IssueRatedItem[]; top12Keys: Set<string>; orgId: number };

export function TabMatriceViz({ items, top12Keys, orgId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; item: IssueRatedItem } | null>(null);

  const rated = items.filter((i) => i.stakeholderScore != null && i.companyScore != null);
  const categories = [...new Set(rated.map((i) => i.category))];

  const { data: analysis, isLoading: loadingAnalysis, error: analysisError, refetch } = useGetIssueAnalysis(orgId, {
    query: {
      enabled: !!orgId,
      retry: false,
      queryKey: [`/api/organizations/${orgId}/issues/analysis`],
    },
  });

  const { mutate: analyze, isPending: analyzing } = useAnalyzeIssues({
    mutation: {
      onSuccess: () => { void refetch(); },
    },
  });

  const noAnalysis = !loadingAnalysis && (analysisError || !analysis);
  const ratedCount = rated.length;

  if (rated.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
        <p className="font-medium">Aucun enjeu noté</p>
        <p className="text-sm mt-1">Notez des enjeux dans l'onglet Bibliothèque pour voir la matrice.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Matrix chart */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Matrice de matérialité</h2>
          <p className="text-sm text-muted-foreground">
            {top12Keys.size} enjeux prioritaires identifiés · survolez un point pour voir le détail
          </p>
        </div>

        <MobileZoomable
          viewportRef={containerRef}
          className="rounded-xl border border-border bg-white dark:bg-muted/10"
        >
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            width="100%"
            style={{ maxHeight: 480 }}
            className="select-none"
          >
            {/* Quadrant backgrounds */}
            <rect x={PAD.left} y={PAD.top} width={PLOT_W / 2} height={PLOT_H / 2} fill="#f8fafc" />
            <rect x={PAD.left + PLOT_W / 2} y={PAD.top} width={PLOT_W / 2} height={PLOT_H / 2} fill="#f0fdf4" />
            <rect x={PAD.left} y={PAD.top + PLOT_H / 2} width={PLOT_W / 2} height={PLOT_H / 2} fill="#fef9f0" />
            <rect x={PAD.left + PLOT_W / 2} y={PAD.top + PLOT_H / 2} width={PLOT_W / 2} height={PLOT_H / 2} fill="#fef2f2" />

            {/* Quadrant labels */}
            <text x={PAD.left + 6} y={PAD.top + 14} fontSize={9} fill="#94a3b8">Enjeux secondaires</text>
            <text x={PAD.left + PLOT_W / 2 + 6} y={PAD.top + 14} fontSize={9} fill="#16a34a">Enjeux stratégiques</text>
            <text x={PAD.left + 6} y={PAD.top + PLOT_H - 6} fontSize={9} fill="#94a3b8">Faible importance</text>
            <text x={PAD.left + PLOT_W / 2 + 6} y={PAD.top + PLOT_H - 6} fontSize={9} fill="#d97706">Enjeux à surveiller</text>

            {/* Grid lines */}
            {[1, 2, 3, 4, 5].map((v) => (
              <g key={v}>
                <line x1={plotX(v)} y1={PAD.top} x2={plotX(v)} y2={PAD.top + PLOT_H} stroke="#e2e8f0" strokeWidth={0.5} />
                <line x1={PAD.left} y1={plotY(v)} x2={PAD.left + PLOT_W} y2={plotY(v)} stroke="#e2e8f0" strokeWidth={0.5} />
                <text x={plotX(v)} y={PAD.top + PLOT_H + 15} textAnchor="middle" fontSize={10} fill="#94a3b8">{v}</text>
                <text x={PAD.left - 12} y={plotY(v)} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="#94a3b8">{v}</text>
              </g>
            ))}

            {/* Center dividers */}
            <line x1={plotX(3)} y1={PAD.top} x2={plotX(3)} y2={PAD.top + PLOT_H} stroke="#cbd5e1" strokeWidth={1.5} />
            <line x1={PAD.left} y1={plotY(3)} x2={PAD.left + PLOT_W} y2={plotY(3)} stroke="#cbd5e1" strokeWidth={1.5} />

            {/* Axis labels */}
            <text x={PAD.left + PLOT_W / 2} y={SVG_H - 8} textAnchor="middle" fontSize={11} fill="#475569" fontWeight={600}>
              Importance pour les parties prenantes →
            </text>
            <text x={14} y={PAD.top + PLOT_H / 2} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="#475569" fontWeight={600} transform={`rotate(-90, 14, ${PAD.top + PLOT_H / 2})`}>
              Importance pour l'entreprise →
            </text>

            {/* Points */}
            {rated.map((item) => {
              const cx = plotX(item.stakeholderScore!);
              const cy = plotY(item.companyScore!);
              const color = CATEGORY_COLORS[item.category] ?? "#94a3b8";
              const isPriority = top12Keys.has(item.key);
              return (
                <g
                  key={item.key}
                  className="cursor-pointer"
                  onMouseEnter={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    const svgEl = e.currentTarget.closest("svg")!;
                    const svgRect = svgEl.getBoundingClientRect();
                    setTooltip({
                      x: cx * (svgRect.width / SVG_W) + svgRect.left - rect.left,
                      y: cy * (svgRect.height / SVG_H) + svgRect.top - rect.top,
                      item,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  {isPriority && (
                    <circle cx={cx} cy={cy} r={16} fill="none" stroke={color} strokeWidth={1.5} opacity={0.6} />
                  )}
                  <circle cx={cx} cy={cy} r={isPriority ? 9 : 6} fill={color} opacity={isPriority ? 0.9 : 0.5} />
                </g>
              );
            })}
          </svg>

          {/* Tooltip */}
          {tooltip && (
            <div
              className="absolute pointer-events-none z-10 bg-popover border border-border rounded-lg shadow-lg p-3 text-xs w-56"
              style={{
                left: Math.min(tooltip.x + 12, (containerRef.current?.offsetWidth ?? 400) - 240),
                top: Math.max(tooltip.y - 60, 4),
              }}
            >
              <p className="font-semibold text-foreground text-sm mb-0.5 leading-snug">{tooltip.item.label}</p>
              <p className="text-muted-foreground mb-2">{tooltip.item.category}</p>
              <div className="space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parties prenantes</span>
                  <span className="font-medium">{tooltip.item.stakeholderScore}/5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entreprise</span>
                  <span className="font-medium">{tooltip.item.companyScore}/5</span>
                </div>
                {tooltip.item.impactScore != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Impact</span>
                    <span className="font-medium">{tooltip.item.impactScore}/5</span>
                  </div>
                )}
              </div>
              {top12Keys.has(tooltip.item.key) && (
                <p className="mt-2 text-[10px] text-emerald-600 font-medium">✓ Enjeu prioritaire (top 12)</p>
              )}
            </div>
          )}
        </MobileZoomable>

        {/* Category legend */}
        <div className="flex flex-wrap gap-3">
          {categories.map((cat) => (
            <div key={cat} className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] ?? "#94a3b8" }} />
              <span className="text-xs text-muted-foreground">{cat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Super-enjeux IA */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-border" />
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" />
              Super-enjeux stratégiques
            </h3>
          </div>
          {analysis && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground gap-1.5"
              onClick={() => analyze({ orgId })}
              disabled={analyzing || ratedCount < 4}
            >
              {analyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Recalculer
            </Button>
          )}
        </div>

        {/* Loading */}
        {loadingAnalysis && (
          <div className="flex items-center justify-center py-10 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Chargement de l'analyse…</span>
          </div>
        )}

        {/* Generating */}
        {analyzing && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground rounded-xl border border-dashed border-violet-200 bg-violet-50/50">
            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
            <div className="text-center">
              <p className="text-sm font-medium text-violet-700">Analyse en cours…</p>
              <p className="text-xs text-violet-600/70 mt-0.5">Claude identifie vos 4 super-enjeux stratégiques</p>
            </div>
          </div>
        )}

        {/* No analysis yet */}
        {!analyzing && noAnalysis && (
          <div className="flex flex-col items-center justify-center py-12 gap-4 rounded-xl border border-dashed border-border bg-muted/10">
            <Sparkles className="h-8 w-8 text-violet-400 opacity-60" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">Analyse IA non générée</p>
              <p className="text-xs text-muted-foreground">
                {ratedCount < 4
                  ? `Notez au moins 4 enjeux pour lancer l'analyse (${ratedCount}/4 notés)`
                  : "Lancez l'analyse pour regrouper vos enjeux en 4 axes stratégiques"}
              </p>
            </div>
            <Button
              onClick={() => analyze({ orgId })}
              disabled={ratedCount < 4}
              className="gap-2"
              size="sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Générer les super-enjeux
            </Button>
          </div>
        )}

        {/* Super-enjeux cards */}
        {!analyzing && analysis && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {analysis.superIssues.map((si, i) => {
              const accent = SUPER_ISSUE_ACCENTS[i % SUPER_ISSUE_ACCENTS.length];
              return (
                <div
                  key={i}
                  className={cn("rounded-xl border p-5 space-y-3", accent.bg)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                      style={{ backgroundColor: accent.dot }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={cn("text-sm font-bold leading-snug", accent.label)}>{si.title}</h4>
                      <span className={cn("inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1", accent.badge)}>
                        Score {si.avgScore.toFixed(1)}/5 · {si.issues.length} enjeu{si.issues.length > 1 ? "x" : ""}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-foreground/80 leading-relaxed pl-11">{si.summary}</p>

                  <div className="pl-11 flex flex-wrap gap-1.5">
                    {si.issues.map((label) => (
                      <span
                        key={label}
                        className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border border-current/20 bg-white/60 text-foreground/70"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {analysis && (
          <p className="text-[11px] text-muted-foreground/60 text-right">
            Générée le {new Date(analysis.generatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
      </div>
    </div>
  );
}
