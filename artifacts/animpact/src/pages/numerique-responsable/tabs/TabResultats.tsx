import { useMemo } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip,
} from "recharts";
import { PILLARS, MACRO_PILLARS, maturityLabel, computeMacroPillarData } from "../data";
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
  const maturity  = maturityLabel(globalPct);

  // Global radar uses the 7 existing pillars
  const globalRadarData = PILLARS.map((p) => ({
    pillar: p.shortTitle,
    value:  pillarPcts[p.id] ?? 0,
  }));

  // Macro-pillar data (computed once)
  const macroData = useMemo(
    () => MACRO_PILLARS.map((mp) => ({
      mp,
      ...computeMacroPillarData(mp, pillarPcts, responsesMap),
    })),
    [pillarPcts, responsesMap],
  );

  return (
    <div className="space-y-6">
      {/* ── Global KPIs ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Score global"
          value={<><span className="text-4xl font-bold">{globalScore}</span><span className="text-lg text-muted-foreground">/500</span></>}
          sub={`${globalPct}% des critères validés`}
        />
        <KpiCard
          label="Niveau de maturité"
          value={<span className={`text-2xl font-bold ${maturity.color}`}>{maturity.label}</span>}
          sub={
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden w-full">
              <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${globalPct}%` }} />
            </div>
          }
        />
        <KpiCard
          label="Critères validés"
          value={<><span className="text-4xl font-bold">{totalChecked}</span><span className="text-lg text-muted-foreground">/{totalPossible}</span></>}
          sub="sur l'ensemble du référentiel"
        />
      </div>

      {/* ── Global radar ────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-white dark:bg-muted/10 p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Vue d'ensemble — radar global (7 piliers)</h3>
        {totalChecked === 0 ? (
          <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
            Commencez l'évaluation pour voir le radar.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={globalRadarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Score"]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
              <Radar name="Score" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── 5 macro-pillar cards ─────────────────────────────────────────────── */}
      <div className="space-y-5">
        <h3 className="text-sm font-semibold text-foreground">Résultats par pilier</h3>
        {macroData.map(({ mp, pct, radarData }) => (
          <MacroPillarCard
            key={mp.id}
            mp={mp}
            pct={pct}
            radarData={radarData}
            hasData={totalChecked > 0}
          />
        ))}
      </div>

      {/* Export */}
      <div className="flex justify-end">
        <Button variant="outline" className="gap-2 text-sm" disabled title="Export PDF — disponible prochainement">
          <Download className="h-4 w-4" />
          Exporter les résultats
        </Button>
      </div>
    </div>
  );
}

// ── Macro-pillar card ──────────────────────────────────────────────────────────

function MacroPillarCard({
  mp, pct, radarData, hasData,
}: {
  mp: import("../data").MacroPillar;
  pct: number;
  radarData: { name: string; value: number }[];
  hasData: boolean;
}) {
  const maturity = maturityLabel(pct);
  const sorted   = [...radarData].sort((a, b) => b.value - a.value);
  const strengths    = sorted.filter((d) => d.value > 0).slice(0, 2);
  const weaknesses   = sorted.filter((d) => d.value < 100).slice(-2).reverse();

  return (
    <div className="rounded-xl border border-border bg-white dark:bg-muted/10 overflow-hidden shadow-sm">
      {/* Card header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border" style={{ borderLeftColor: mp.color, borderLeftWidth: 3 }}>
        <span className="text-xl shrink-0">{mp.emoji}</span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-foreground">{mp.title}</h4>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden max-w-48">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: mp.color }}
              />
            </div>
            <span className="text-sm font-semibold" style={{ color: mp.color }}>{pct}%</span>
            <span className={`text-xs font-medium ${maturity.color}`}>{maturity.label}</span>
          </div>
        </div>
      </div>

      {/* Body: radar + strengths/weaknesses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border">
        {/* Radar */}
        <div className="p-4">
          {!hasData ? (
            <div className="flex items-center justify-center h-40 text-xs text-muted-foreground">
              Commencez l'évaluation pour voir le radar.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                />
                <Tooltip
                  formatter={(v: number) => [`${v}%`, "Score"]}
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke={mp.color}
                  fill={mp.color}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Strengths + Weaknesses */}
        <div className="p-4 space-y-4">
          {/* Bar chart per axis */}
          <div className="space-y-2">
            {radarData.map((d) => (
              <div key={d.name}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] text-foreground/80 truncate max-w-48">{d.name}</span>
                  <span className="text-[11px] font-semibold shrink-0 ml-2" style={{ color: mp.color }}>{d.value}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${d.value}%`, backgroundColor: mp.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* Strengths */}
          {hasData && strengths.length > 0 && (
            <div className="rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-xs font-semibold text-foreground">Points forts</span>
              </div>
              {strengths.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <span className="text-foreground/80 truncate max-w-40">{s.name}</span>
                  <span className="font-semibold text-emerald-700 shrink-0 ml-1">{s.value}%</span>
                </div>
              ))}
            </div>
          )}

          {/* Weaknesses */}
          {hasData && weaknesses.length > 0 && (
            <div className="rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-semibold text-foreground">À améliorer</span>
              </div>
              {weaknesses.map((w) => (
                <div key={w.name} className="flex items-center justify-between text-xs">
                  <span className="text-foreground/80 truncate max-w-40">{w.name}</span>
                  <span className="font-semibold text-amber-700 shrink-0 ml-1">{w.value}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── KPI card ───────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: React.ReactNode; sub: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-white dark:bg-muted/10 p-5 text-center">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      <div className="flex items-end justify-center gap-1 mt-1">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
    </div>
  );
}
