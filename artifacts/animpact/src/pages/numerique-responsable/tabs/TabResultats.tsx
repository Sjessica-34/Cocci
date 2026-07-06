import { useMemo } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  Tooltip,
} from "recharts";
import { PILLARS, maturityLabel } from "../data";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, AlertTriangle } from "lucide-react";

interface Props {
  scores: {
    globalScore: number;
    pillarPcts: Record<string, number>;
    totalChecked: number;
    totalPossible: number;
  };
  responsesMap: Record<string, boolean>;
}

export function TabResultats({ scores, responsesMap }: Props) {
  const { globalScore, pillarPcts, totalChecked, totalPossible } = scores;
  const globalPct = totalPossible > 0 ? Math.round((totalChecked / totalPossible) * 100) : 0;
  const maturity = maturityLabel(globalPct);

  const radarData = PILLARS.map((p) => ({
    pillar: p.shortTitle,
    value:  pillarPcts[p.id] ?? 0,
    full:   100,
  }));

  // Compute top 3 strengths and bottom 3 weaknesses per pillar
  const sorted = useMemo(
    () =>
      PILLARS.map((p) => ({ pillar: p, pct: pillarPcts[p.id] ?? 0 }))
        .sort((a, b) => b.pct - a.pct),
    [pillarPcts],
  );
  const strengths = sorted.filter((s) => s.pct > 0).slice(0, 3);
  const weaknesses = sorted.filter((s) => s.pct < 100).slice(-3).reverse();

  return (
    <div className="space-y-6">
      {/* Top KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-white dark:bg-muted/10 p-5 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Score global</p>
          <div className="flex items-end justify-center gap-1">
            <span className="text-4xl font-bold text-foreground">{globalScore}</span>
            <span className="text-lg text-muted-foreground mb-1">/500</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{globalPct}% des critères validés</p>
        </div>

        <div className="rounded-xl border border-border bg-white dark:bg-muted/10 p-5 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Niveau de maturité</p>
          <p className={`text-2xl font-bold mt-1 ${maturity.color}`}>{maturity.label}</p>
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${globalPct}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white dark:bg-muted/10 p-5 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Critères validés</p>
          <div className="flex items-end justify-center gap-1">
            <span className="text-4xl font-bold text-foreground">{totalChecked}</span>
            <span className="text-lg text-muted-foreground mb-1">/{totalPossible}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">sur {totalPossible} critères positifs</p>
        </div>
      </div>

      {/* Radar + Scores by pillar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar chart */}
        <div className="rounded-xl border border-border bg-white dark:bg-muted/10 p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Radar par pilier</h3>
          {totalChecked === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <p className="text-sm">Commencez l'évaluation pour voir le radar.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis
                  dataKey="pillar"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, "Score"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Score per pillar */}
        <div className="rounded-xl border border-border bg-white dark:bg-muted/10 p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Score par pilier</h3>
          <div className="space-y-3">
            {PILLARS.map((p) => {
              const pct = pillarPcts[p.id] ?? 0;
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-foreground">{p.shortTitle}</span>
                    <span className="text-xs font-semibold" style={{ color: p.color }}>{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: p.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Strengths + Weaknesses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-foreground">Vos forces</h3>
          </div>
          {strengths.length === 0 ? (
            <p className="text-xs text-muted-foreground">Commencez l'évaluation pour identifier vos forces.</p>
          ) : (
            <div className="space-y-2">
              {strengths.map(({ pillar, pct }) => (
                <div key={pillar.id} className="flex items-center justify-between">
                  <span className="text-xs text-foreground">{pillar.title}</span>
                  <span className="text-xs font-semibold text-emerald-700">{pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-foreground">Axes d'amélioration</h3>
          </div>
          {weaknesses.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucun axe d'amélioration identifié.</p>
          ) : (
            <div className="space-y-2">
              {weaknesses.map(({ pillar, pct }) => (
                <div key={pillar.id} className="flex items-center justify-between">
                  <span className="text-xs text-foreground">{pillar.title}</span>
                  <span className="text-xs font-semibold text-amber-700">{pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Export button */}
      <div className="flex justify-end">
        <Button variant="outline" className="gap-2 text-sm" disabled title="Export PDF — disponible prochainement">
          <Download className="h-4 w-4" />
          Exporter les résultats
        </Button>
      </div>
    </div>
  );
}
