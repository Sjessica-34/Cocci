import type { IssueRatedItem } from "@workspace/api-client-react";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, BarChart3, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

function computeAvg(item: IssueRatedItem): number {
  const scores = [item.stakeholderScore, item.companyScore, item.impactScore].filter(
    (s): s is number => s != null,
  );
  if (!scores.length) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function getPriorite(avg: number): "Critique" | "Majeur" | "Modéré" | null {
  if (avg === 0) return null;
  if (avg >= 4) return "Critique";
  if (avg >= 3) return "Majeur";
  return "Modéré";
}

const PRIORITY_CONFIG = {
  Critique: { color: "text-red-600", bg: "bg-red-50 border-red-200", icon: <AlertTriangle className="h-4 w-4 text-red-500" /> },
  Majeur:   { color: "text-amber-600", bg: "bg-amber-50 border-amber-200", icon: <BarChart3 className="h-4 w-4 text-amber-500" /> },
  Modéré:   { color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" /> },
};

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

type Props = { items: IssueRatedItem[] };

export function TabSynthese({ items }: Props) {
  const rated = items.filter((i) => computeAvg(i) > 0);
  const top12 = [...rated].sort((a, b) => computeAvg(b) - computeAvg(a)).slice(0, 12);

  if (rated.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
        <BarChart3 className="h-10 w-10 mb-3 opacity-30" />
        <p className="font-medium">Aucun enjeu noté</p>
        <p className="text-sm mt-1">Évaluez des enjeux dans la Bibliothèque pour générer la synthèse.</p>
      </div>
    );
  }

  // Stats globales
  const critique = top12.filter((i) => getPriorite(computeAvg(i)) === "Critique");
  const majeur   = top12.filter((i) => getPriorite(computeAvg(i)) === "Majeur");
  const modere   = top12.filter((i) => getPriorite(computeAvg(i)) === "Modéré");

  const globalAvg = rated.length
    ? rated.reduce((sum, i) => sum + computeAvg(i), 0) / rated.length
    : 0;

  // Tendances
  const enAmelioration = rated.filter((i) => i.tendance === "+").length;
  const stables        = rated.filter((i) => i.tendance === "=").length;
  const enDegradation  = rated.filter((i) => i.tendance === "-").length;

  // Top enjeu par thématique dans les 12 prioritaires
  const catMap = new Map<string, IssueRatedItem>();
  for (const item of top12) {
    if (!catMap.has(item.category)) catMap.set(item.category, item);
  }
  const topByCategory = [...catMap.entries()];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Synthèse de la matrice</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Basée sur {rated.length} enjeu{rated.length > 1 ? "x" : ""} évalué{rated.length > 1 ? "s" : ""} — Top {top12.length} prioritaires analysés
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-white dark:bg-muted/10 p-4 text-center">
          <p className="text-3xl font-bold text-foreground">{rated.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Enjeux évalués</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 p-4 text-center">
          <p className="text-3xl font-bold text-red-600">{critique.length}</p>
          <p className="text-xs text-red-600/80 mt-1">Enjeux critiques</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-4 text-center">
          <p className="text-3xl font-bold text-amber-600">{majeur.length}</p>
          <p className="text-xs text-amber-600/80 mt-1">Enjeux majeurs</p>
        </div>
        <div className="rounded-xl border border-border bg-white dark:bg-muted/10 p-4 text-center">
          <p className="text-3xl font-bold text-foreground">{globalAvg.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground mt-1">Score moyen /5</p>
        </div>
      </div>

      {/* Tendances */}
      {(enAmelioration + stables + enDegradation) > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Tendances</h3>
          <div className="flex flex-wrap gap-3">
            {enAmelioration > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-emerald-200 bg-emerald-50">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">{enAmelioration} en amélioration</span>
              </div>
            )}
            {stables > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-blue-200 bg-blue-50">
                <Minus className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">{stables} stable{stables > 1 ? "s" : ""}</span>
              </div>
            )}
            {enDegradation > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 bg-red-50">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-700">{enDegradation} en dégradation</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Classement Top 12 */}
      {top12.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Top {top12.length} — Enjeux prioritaires</h3>
          <div className="rounded-xl border border-border bg-white dark:bg-muted/10 overflow-hidden divide-y divide-border">
            {top12.map((item, i) => {
              const avg = computeAvg(item);
              const prio = getPriorite(avg);
              const cfg = prio ? PRIORITY_CONFIG[prio] : null;
              const color = CATEGORY_COLORS[item.category] ?? "#94a3b8";
              return (
                <div key={item.key} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/10 transition-colors">
                  <span className="text-xs font-bold text-muted-foreground/40 w-5 shrink-0 text-right">{i + 1}</span>
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-sm text-foreground flex-1 min-w-0 truncate">{item.label}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:block">{item.category}</span>
                  {cfg && (
                    <span className={cn("shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border", cfg.bg, cfg.color)}>
                      {prio}
                    </span>
                  )}
                  <span className="text-xs font-bold text-foreground shrink-0 w-8 text-right">{avg.toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Répartition par niveau */}
      {(critique.length > 0 || majeur.length > 0 || modere.length > 0) && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Répartition par niveau</h3>
          <div className="flex gap-2">
            {critique.length > 0 && (
              <div className="flex-1 rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                <p className="text-xl font-bold text-red-600">{critique.length}</p>
                <p className="text-[10px] text-red-500 mt-0.5">Critique{critique.length > 1 ? "s" : ""}</p>
              </div>
            )}
            {majeur.length > 0 && (
              <div className="flex-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                <p className="text-xl font-bold text-amber-600">{majeur.length}</p>
                <p className="text-[10px] text-amber-500 mt-0.5">Majeur{majeur.length > 1 ? "s" : ""}</p>
              </div>
            )}
            {modere.length > 0 && (
              <div className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
                <p className="text-xl font-bold text-emerald-600">{modere.length}</p>
                <p className="text-[10px] text-emerald-500 mt-0.5">Modéré{modere.length > 1 ? "s" : ""}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Répartition thématique */}
      {topByCategory.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Thématiques représentées dans le top {top12.length}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {topByCategory.map(([cat, best]) => {
              const color = CATEGORY_COLORS[cat] ?? "#94a3b8";
              const count = top12.filter((i) => i.category === cat).length;
              return (
                <div key={cat} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-white dark:bg-muted/10">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{cat}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{best.label}</p>
                  </div>
                  <span className="text-xs font-bold text-foreground shrink-0">×{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
