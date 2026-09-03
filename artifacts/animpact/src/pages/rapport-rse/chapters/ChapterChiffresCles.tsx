/**
 * Chapitre "Les 12 chiffres clés"
 * Sélection automatique des indicateurs les plus représentatifs,
 * en priorisant ceux ayant une évolution N/N-1 disponible.
 */
import { ChapterWrapper, ExplainerText, R } from "./_shared";
import type { ReportData } from "../useReportData";

// ─── Types ──────────────────────────────────────────────────────────────────

interface KpiCard {
  label: string;
  value: string;
  unit: string;
  prev?: string | null;
  delta?: string | null;
  trend?: "up" | "down" | "stable" | null;
  trendPositive?: boolean; // true = up is good (e.g. employees), false = up is bad (e.g. emissions)
  color: string;
  icon: string;
  category: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function fmt(n: number | null, decimals = 0): string | null {
  if (n == null) return null;
  return n.toLocaleString("fr-FR", { maximumFractionDigits: decimals });
}

function trend(current: number | null, previous: number | null): { trend: "up" | "down" | "stable" | null; delta: string | null } {
  if (current == null || previous == null || previous === 0) return { trend: null, delta: null };
  const diff = current - previous;
  const pct  = Math.round((diff / previous) * 100);
  if (Math.abs(pct) < 1) return { trend: "stable", delta: "stable" };
  return {
    trend: diff > 0 ? "up" : "down",
    delta: `${diff > 0 ? "+" : ""}${pct}%`,
  };
}

// ─── Extracteur de KPIs ──────────────────────────────────────────────────────

function extractKpis(data: ReportData): KpiCard[] {
  const cards: KpiCard[] = [];

  // ── Impact Score ──
  const is_ = data.impactScore as Record<string, unknown> | null;
  const score = num(is_?.score);
  if (score != null) {
    const prevScore = num(is_?.previousScore);
    const t = trend(score, prevScore);
    cards.push({
      label: "Impact Score RSE",
      value: String(score),
      unit: "/ 100",
      prev: prevScore != null ? `${prevScore}/100` : null,
      delta: t.delta,
      trend: t.trend,
      trendPositive: true,
      color: score >= 80 ? "#10b981" : score >= 60 ? "#eab308" : score >= 40 ? "#f97316" : "#ef4444",
      icon: "🏆",
      category: "Gouvernance",
    });
  }

  // ── Bilan carbone ──
  const carbon = data.carbon as Record<string, unknown> | null;
  const carbonFields = ["energie1","energie2","horsEnergie1","horsEnergie2",
    "intrantsBiens","intrantsServices","futursEmballages","fret",
    "deplacements","dechetsDirects","immobilisations","utilisation","finDeVie"];
  const prevCarbonFields = carbonFields.map((f) => f + "Prev");
  if (carbon) {
    const total = carbonFields.reduce((a, k) => a + (carbon[k] != null ? Number(carbon[k]) : 0), 0);
    const prevTotal = prevCarbonFields.reduce((a, k) => a + (carbon[k] != null ? Number(carbon[k]) : 0), 0);
    if (total > 0) {
      const t = trend(total, prevTotal > 0 ? prevTotal : null);
      cards.push({
        label: "Émissions carbone totales",
        value: fmt(Math.round(total)) ?? "—",
        unit: "tCO₂e",
        prev: prevTotal > 0 ? `${fmt(Math.round(prevTotal))} tCO₂e` : null,
        delta: t.delta,
        trend: t.trend,
        trendPositive: false,
        color: "#f97316",
        icon: "🌍",
        category: "Planète",
      });
    }
  }

  // ── Captation carbone ──
  const cap = data.captation as Record<string, unknown> | null;
  const capKg = num(cap?.captationKgPerYear);
  if (capKg != null && capKg > 0) {
    cards.push({
      label: "Captation carbone",
      value: fmt(Math.round(capKg / 1000)) ?? "—",
      unit: "tCO₂e/an",
      prev: null,
      delta: null,
      trend: null,
      trendPositive: true,
      color: "#22c55e",
      icon: "🌿",
      category: "Planète",
    });
  }

  // ── Effectif total ──
  const wf = data.workforce as Record<string, unknown> | null;
  const headcount = num(wf?.totalHeadcount);
  const prevHeadcount = num(wf?.previousTotalHeadcount);
  if (headcount != null) {
    const t = trend(headcount, prevHeadcount);
    cards.push({
      label: "Effectif total",
      value: fmt(headcount) ?? "—",
      unit: "collaborateurs",
      prev: prevHeadcount != null ? `${fmt(prevHeadcount)} collaborateurs` : null,
      delta: t.delta,
      trend: t.trend,
      trendPositive: true,
      color: "#3b82f6",
      icon: "👥",
      category: "Humain",
    });
  }

  // ── Heures de formation ──
  const tr = data.training as Record<string, unknown> | null;
  const trainHours = num(tr?.nbHeuresFormation);
  const prevTrainHours = num(tr?.previousNbHeuresFormation);
  if (trainHours != null) {
    const t = trend(trainHours, prevTrainHours);
    cards.push({
      label: "Heures de formation",
      value: fmt(trainHours) ?? "—",
      unit: "heures",
      prev: prevTrainHours != null ? `${fmt(prevTrainHours)} h` : null,
      delta: t.delta,
      trend: t.trend,
      trendPositive: true,
      color: "#8b5cf6",
      icon: "📚",
      category: "Humain",
    });
  }

  // ── Taux de féminisation ──
  const div = data.diversity as Record<string, unknown> | null;
  const nbFemmes = num(div?.nbFemmes);
  const hc = num(wf?.totalHeadcount);
  if (nbFemmes != null && hc != null && hc > 0) {
    const rate = Math.round((nbFemmes / hc) * 100);
    const prevNbFemmes = num(div?.previousNbFemmes);
    const prevHc = num(wf?.previousTotalHeadcount) ?? hc;
    const prevRate = prevNbFemmes != null ? Math.round((prevNbFemmes / prevHc) * 100) : null;
    const t = trend(rate, prevRate);
    cards.push({
      label: "Taux de féminisation",
      value: `${rate}`,
      unit: "%",
      prev: prevRate != null ? `${prevRate}%` : null,
      delta: t.delta,
      trend: t.trend,
      trendPositive: true,
      color: "#ec4899",
      icon: "♀",
      category: "Humain",
    });
  }

  // ── Baromètre social — score global ──
  const baro = data.baroSynthese as Record<string, unknown> | null;
  const themeScores = (baro?.themeScores as Array<Record<string, unknown>>) ?? [];
  if (themeScores.length > 0) {
    const avgs = themeScores.map((t) => num(t.average)).filter((v) => v != null) as number[];
    const prevAvgs = themeScores.map((t) => num(t.previousAverage)).filter((v) => v != null) as number[];
    if (avgs.length > 0) {
      const avg = avgs.reduce((a, b) => a + b, 0) / avgs.length;
      const prevAvg = prevAvgs.length === avgs.length
        ? prevAvgs.reduce((a, b) => a + b, 0) / prevAvgs.length
        : null;
      const t = trend(avg, prevAvg);
      cards.push({
        label: "Baromètre social",
        value: avg.toFixed(1),
        unit: "/ 5",
        prev: prevAvg != null ? `${prevAvg.toFixed(1)}/5` : null,
        delta: t.delta,
        trend: t.trend,
        trendPositive: true,
        color: "#06b6d4",
        icon: "💬",
        category: "Humain",
      });
    }
  }

  // ── Plan d'actions — taux de completion ──
  type AnyAction = Record<string, unknown>;
  const actions = data.actions as unknown as AnyAction[];
  if (actions.length > 0) {
    const done = actions.filter((a) => a.isChecked).length;
    const rate = Math.round((done / actions.length) * 100);
    cards.push({
      label: "Plan d'actions complété",
      value: `${rate}`,
      unit: `% (${done}/${actions.length})`,
      prev: null,
      delta: null,
      trend: null,
      trendPositive: true,
      color: "#1F6B3A",
      icon: "✅",
      category: "Gouvernance",
    });
  }

  // ── Labels & certifications ──
  const labels = data.labels as unknown[];
  if (labels.length > 0) {
    cards.push({
      label: "Labels & certifications",
      value: `${labels.length}`,
      unit: "obtenus",
      prev: null,
      delta: null,
      trend: null,
      trendPositive: true,
      color: "#f59e0b",
      icon: "🏅",
      category: "Gouvernance",
    });
  }

  // ── Fournisseurs évalués ──
  const suppliers = data.suppliers as unknown[];
  if (suppliers.length > 0) {
    cards.push({
      label: "Fournisseurs évalués",
      value: `${suppliers.length}`,
      unit: "fournisseurs",
      prev: null,
      delta: null,
      trend: null,
      trendPositive: true,
      color: "#0ea5e9",
      icon: "🤝",
      category: "Achats",
    });
  }

  // ── Achats responsables ──
  const purchases = data.responsiblePurchases as Array<Record<string, unknown>>;
  if (purchases.length > 0) {
    let total = 0;
    let responsible = 0;
    let local = 0;
    let circular = 0;
    for (const purchase of purchases) {
      const amount = num(purchase.amount) ?? 0;
      total += amount;
      responsible += amount * (num(purchase.responsiblePercent) ?? 0) / 100;
      local += amount * (num(purchase.localPercent) ?? 0) / 100;
      circular += amount * (num(purchase.circularPercent) ?? 0) / 100;
    }
    const addPurchaseKpi = (label: string, value: number, color: string, icon: string) => {
      cards.push({
        label,
        value: String(total > 0 ? Math.round(value / total * 100) : 0),
        unit: "%",
        prev: null,
        delta: null,
        trend: null,
        trendPositive: true,
        color,
        icon,
        category: "Achats",
      });
    };
    addPurchaseKpi("Part d'achats responsables", responsible, "#10b981", "🌱");
    addPurchaseKpi("Part d'achats locaux", local, "#f59e0b", "📍");
    addPurchaseKpi("Part d'achats circulaires", circular, "#14b8a6", "♻️");
  }

  // ─── Tri : N/N-1 disponibles en premier, puis par couleur catégorie ────────
  const withTrend    = cards.filter((c) => c.delta != null);
  const withoutTrend = cards.filter((c) => c.delta == null);

  return [...withTrend, ...withoutTrend].slice(0, 12);
}

// ─── Composant flèche de tendance ─────────────────────────────────────────────

function TrendArrow({ card }: { card: KpiCard }) {
  if (!card.trend || !card.delta) return null;
  const isGood =
    card.trend === "stable" ||
    (card.trendPositive ? card.trend === "up" : card.trend === "down");
  const isBad = card.trendPositive ? card.trend === "down" : card.trend === "up";

  const color = card.trend === "stable" ? "#94a3b8" : isGood ? "#16a34a" : "#dc2626";
  const arrow = card.trend === "stable" ? "→" : card.trend === "up" ? "↑" : "↓";

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      fontSize: 12, color,
      backgroundColor: color + "15",
      border: `1px solid ${color}40`,
      borderRadius: 6, padding: "2px 7px",
      fontWeight: 700, fontFamily: "sans-serif",
    }}>
      {arrow} {card.delta}
    </span>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function ChapterChiffresCles({ data, chapterNum }: { data: ReportData; chapterNum: number }) {
  const kpis = extractKpis(data);

  return (
    <ChapterWrapper num={chapterNum} title="Les 12 chiffres clés">
      <ExplainerText>
        Synthèse des principaux indicateurs de la démarche RSE. Les indicateurs disposant d'une comparaison N-1 sont présentés en priorité afin de mettre en évidence les évolutions les plus significatives de l'exercice.
      </ExplainerText>

      {kpis.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "40px 20px",
          border: "1px dashed #CBD5E1", borderRadius: 12,
          color: "#94a3b8", fontFamily: "sans-serif", fontSize: 14,
        }}>
          Aucun indicateur disponible — renseignez les modules Cocci pour alimenter cette synthèse.
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 14,
        }}>
          {kpis.map((card, i) => (
            <div
              key={i}
              style={{
                border: `1px solid ${card.color}30`,
                borderRadius: 12,
                backgroundColor: card.color + "06",
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Bande couleur en haut */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0,
                height: 3, backgroundColor: card.color, borderRadius: "12px 12px 0 0",
              }} />

              {/* Catégorie + icône */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, color: card.color,
                  textTransform: "uppercase", letterSpacing: "0.05em",
                  fontFamily: "sans-serif",
                }}>
                  {card.category}
                </span>
                <span style={{ fontSize: 18 }}>{card.icon}</span>
              </div>

              {/* Label */}
              <p style={{
                fontSize: 12, color: "#374151", fontFamily: "sans-serif",
                margin: 0, lineHeight: 1.3,
              }}>
                {card.label}
              </p>

              {/* Valeur principale */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{
                  fontSize: 28, fontWeight: 800, color: card.color,
                  fontFamily: "sans-serif", lineHeight: 1,
                }}>
                  {card.value}
                </span>
                <span style={{
                  fontSize: 12, color: "#6B7280", fontFamily: "sans-serif",
                }}>
                  {card.unit}
                </span>
              </div>

              {/* Évolution N/N-1 */}
              {(card.prev || card.delta) && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {card.prev && (
                    <span style={{
                      fontSize: 11, color: "#9CA3AF", fontFamily: "sans-serif",
                    }}>
                      N-1 : {card.prev}
                    </span>
                  )}
                  <TrendArrow card={card} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Note de bas de page */}
      <p style={{
        fontSize: 11, color: "#94a3b8", textAlign: "center",
        fontFamily: "sans-serif", margin: "8px 0 0", fontStyle: "italic",
      }}>
        Les indicateurs sont sélectionnés automatiquement selon les données disponibles dans Cocci.
      </p>
    </ChapterWrapper>
  );
}
