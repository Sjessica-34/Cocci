import type { Stakeholder } from "@workspace/api-client-react";
import { STAKEHOLDER_CATEGORIES, CATEGORY_COLORS, getCategoryByKey, getQuadrant, getQuadrantColor } from "../constants";
import { RatingBar } from "../components/RatingBar";
import { Users2, TrendingUp, Star, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = { stakeholders: Stakeholder[] };

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
}

export function TabSynthese({ stakeholders }: Props) {
  if (stakeholders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <BarChart3 className="h-7 w-7 text-muted-foreground/50" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">Aucune donnée à synthétiser</h3>
        <p className="text-sm text-muted-foreground">
          Ajoutez des parties prenantes dans l'onglet Saisie.
        </p>
      </div>
    );
  }

  const avgInfluence = avg(stakeholders.map((s) => s.influence));
  const avgInterest = avg(stakeholders.map((s) => s.interest));

  const byQuadrant = {
    "Partenaires clés": stakeholders.filter((s) => s.influence >= 3 && s.interest >= 3),
    "À gérer avec attention": stakeholders.filter((s) => s.influence >= 3 && s.interest < 3),
    "À impliquer": stakeholders.filter((s) => s.influence < 3 && s.interest >= 3),
    "À surveiller": stakeholders.filter((s) => s.influence < 3 && s.interest < 3),
  };

  const topByInfluence = [...stakeholders].sort((a, b) => b.influence - a.influence).slice(0, 5);
  const topByInterest = [...stakeholders].sort((a, b) => b.interest - a.interest).slice(0, 5);

  const byCategory = STAKEHOLDER_CATEGORIES.map((cat) => ({
    cat,
    count: stakeholders.filter((s) => s.category === cat.key).length,
  })).filter((x) => x.count > 0);

  const maxCount = Math.max(...byCategory.map((x) => x.count), 1);

  const kpis = [
    {
      label: "Parties prenantes",
      value: stakeholders.length,
      icon: <Users2 className="h-5 w-5" />,
      color: "text-primary bg-primary/10",
    },
    {
      label: "Influence moyenne",
      value: `${avgInfluence}/5`,
      icon: <TrendingUp className="h-5 w-5" />,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "Intérêt moyen",
      value: `${avgInterest}/5`,
      icon: <Star className="h-5 w-5" />,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Catégories actives",
      value: byCategory.length,
      icon: <BarChart3 className="h-5 w-5" />,
      color: "text-emerald-600 bg-emerald-50",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Synthèse</h2>
        <p className="text-sm text-muted-foreground">
          Vue consolidée de l'ensemble de vos parties prenantes.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-4">
            <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center mb-3", kpi.color)}>
              {kpi.icon}
            </div>
            <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Quadrant distribution */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Répartition par quadrant</h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(byQuadrant).map(([label, items]) => {
            const colorMap: Record<string, string> = {
              "Partenaires clés": "border-emerald-200 bg-emerald-50",
              "À gérer avec attention": "border-amber-200 bg-amber-50",
              "À impliquer": "border-blue-200 bg-blue-50",
              "À surveiller": "border-slate-200 bg-slate-50",
            };
            const textMap: Record<string, string> = {
              "Partenaires clés": "text-emerald-700",
              "À gérer avec attention": "text-amber-700",
              "À impliquer": "text-blue-700",
              "À surveiller": "text-slate-600",
            };
            return (
              <div
                key={label}
                className={cn("border rounded-xl p-4", colorMap[label])}
              >
                <p className={cn("text-2xl font-bold mb-0.5", textMap[label])}>{items.length}</p>
                <p className="text-xs font-medium text-foreground/70">{label}</p>
                {items.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1.5 truncate">
                    {items
                      .slice(0, 3)
                      .map((s) => s.name ?? "Sans nom")
                      .join(", ")}
                    {items.length > 3 ? ` +${items.length - 3}` : ""}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Category breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Répartition par catégorie</h3>
        <div className="space-y-2.5">
          {byCategory.map(({ cat, count }) => (
            <div key={cat.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {cat.icon} {cat.label}
                </span>
                <span className="text-xs font-medium text-foreground">{count}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(count / maxCount) * 100}%`,
                    backgroundColor: CATEGORY_COLORS[cat.key],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top stakeholders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Top 5 — Influence</h3>
          <div className="space-y-2">
            {topByInfluence.map((s, i) => {
              const cat = getCategoryByKey(s.category);
              const color = CATEGORY_COLORS[s.category] ?? "#94a3b8";
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border"
                >
                  <span className="text-xs font-bold text-muted-foreground w-4 text-center">
                    {i + 1}
                  </span>
                  <div
                    className="h-6 w-6 rounded flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {(s.name ?? "?")[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{s.name ?? "Sans nom"}</p>
                    {cat && (
                      <p className="text-[10px] text-muted-foreground">{cat.icon} {cat.label}</p>
                    )}
                  </div>
                  <RatingBar value={s.influence} size="sm" />
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Top 5 — Intérêt</h3>
          <div className="space-y-2">
            {topByInterest.map((s, i) => {
              const cat = getCategoryByKey(s.category);
              const color = CATEGORY_COLORS[s.category] ?? "#94a3b8";
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border"
                >
                  <span className="text-xs font-bold text-muted-foreground w-4 text-center">
                    {i + 1}
                  </span>
                  <div
                    className="h-6 w-6 rounded flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {(s.name ?? "?")[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{s.name ?? "Sans nom"}</p>
                    {cat && (
                      <p className="text-[10px] text-muted-foreground">{cat.icon} {cat.label}</p>
                    )}
                  </div>
                  <RatingBar value={s.interest} size="sm" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Full list */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Liste complète ({stakeholders.length})
        </h3>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Nom</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Catégorie</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Influence</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Intérêt</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Positionnement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stakeholders.map((s) => {
                const cat = getCategoryByKey(s.category);
                const color = CATEGORY_COLORS[s.category] ?? "#94a3b8";
                const quadrant = getQuadrant(s.influence, s.interest);
                const qColor = getQuadrantColor(s.influence, s.interest);
                return (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-5 w-5 rounded text-white flex items-center justify-center font-bold text-[9px] shrink-0"
                          style={{ backgroundColor: color }}
                        >
                          {(s.name ?? "?")[0]?.toUpperCase() ?? "?"}
                        </div>
                        <span className="font-medium text-foreground">{s.name ?? "Sans nom"}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 hidden sm:table-cell">
                      {cat && (
                        <span className="text-muted-foreground">
                          {cat.icon} {cat.label}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <RatingBar value={s.influence} size="sm" showLabel={false} />
                    </td>
                    <td className="px-3 py-2.5">
                      <RatingBar value={s.interest} size="sm" showLabel={false} />
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      <span
                        className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded-full border text-[10px] font-medium",
                          qColor,
                        )}
                      >
                        {quadrant}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
