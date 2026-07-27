/**
 * Composants primitifs partagés par tous les chapitres du rapport illustré.
 * Optimisés pour l'affichage écran ET l'impression/PDF (print CSS).
 */
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

// ─── Palette ─────────────────────────────────────────────────────────────────
export const R = {
  green:      "#1F6B3A",
  greenLight: "#2D9E5C",
  greenBg:    "#F0FDF4",
  greenBorder:"#86EFAC",
  dark:       "#1C2340",
  gray:       "#5B6878",
  muted:      "#94A3B8",
  aiBg:       "#EEF6F1",
  aiBorder:   "#2D9E5C",
};

export const SCORE_COLOR = (score: number | null) => {
  if (score === null) return "#cbd5e1";
  if (score >= 80)   return "#10b981";
  if (score >= 60)   return "#eab308";
  if (score >= 40)   return "#f97316";
  return               "#ef4444";
};

export const SCORE_BG = (score: number | null) => {
  if (score === null) return "#f8fafc";
  if (score >= 80)   return "#ecfdf5";
  if (score >= 60)   return "#fefce8";
  if (score >= 40)   return "#fff7ed";
  return               "#fef2f2";
};

export const MATURITY_LABEL = (score: number | null): string => {
  if (score === null) return "Non évalué";
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Confirmé";
  if (score >= 40) return "Intermédiaire";
  return "Débutant";
};

export const MATURITY_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  Excellent:     { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" },
  Confirmé:      { bg: "#fefce8", text: "#854d0e", border: "#fef08a" },
  Intermédiaire: { bg: "#fff7ed", text: "#9a3412", border: "#fdba74" },
  Débutant:      { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
  "Non évalué":  { bg: "#f8fafc", text: "#64748b", border: "#e2e8f0" },
};

export const AXIS_CONFIG: Record<string, { color: string; label: string }> = {
  ENV: { color: "#10b981", label: "Environnement" },
  SOC: { color: "#3b82f6", label: "Social"        },
  GOV: { color: "#8b5cf6", label: "Gouvernance"   },
};

// ─── Wrapper de chapitre ──────────────────────────────────────────────────────

export function ChapterWrapper({
  num, title, children,
}: {
  num: number; title: string; children: React.ReactNode;
}) {
  return (
    <section
      className="chapter-section"
      style={{
        breakBefore: "page",
        pageBreakBefore: "always",
        paddingTop: 0,
        paddingBottom: 48,
      }}
    >
      {/* Chapter header */}
      <div style={{
        display: "flex", alignItems: "baseline", gap: 12, marginBottom: 24,
        borderBottom: `3px solid ${R.green}`, paddingBottom: 12,
      }}>
        <span style={{
          fontSize: 36, fontWeight: 800, color: R.greenLight,
          fontFamily: "sans-serif", lineHeight: 1, minWidth: 44,
        }}>
          {num}.
        </span>
        <h2 style={{
          fontSize: 26, fontWeight: 700, color: R.dark,
          fontFamily: "sans-serif", margin: 0, lineHeight: 1.2,
        }}>
          {title}
        </h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {children}
      </div>
    </section>
  );
}

// ─── Titre de section ─────────────────────────────────────────────────────────

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontSize: 16, fontWeight: 700, color: R.green,
      margin: "20px 0 8px", fontFamily: "sans-serif",
      borderLeft: `4px solid ${R.greenBorder}`, paddingLeft: 10,
    }}>
      {children}
    </h3>
  );
}

// ─── Sous-titre ───────────────────────────────────────────────────────────────

export function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 style={{
      fontSize: 14, fontWeight: 600, color: R.dark,
      margin: "14px 0 6px", fontFamily: "sans-serif",
    }}>
      {children}
    </h4>
  );
}

// ─── Texte fixe pédagogique ───────────────────────────────────────────────────

export function ExplainerText({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 13, color: "#374151", lineHeight: 1.7,
      textAlign: "justify", margin: "4px 0 8px",
      fontFamily: "sans-serif",
    }}>
      {children}
    </p>
  );
}

// ─── Bloc IA ──────────────────────────────────────────────────────────────────

export function AiBlock({ text, label = "Analyse" }: { text: string | null; label?: string }) {
  if (!text) return null;
  return (
    <div style={{
      borderLeft: `4px solid ${R.aiBorder}`,
      backgroundColor: R.aiBg,
      borderRadius: "0 8px 8px 0",
      padding: "12px 16px",
      margin: "12px 0",
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: R.green,
        textTransform: "uppercase", letterSpacing: "0.05em",
        marginBottom: 6, fontFamily: "sans-serif",
      }}>
        ✦ {label}
      </div>
      <p style={{
        fontSize: 13, color: "#1E3A2F", lineHeight: 1.65,
        margin: 0, fontStyle: "italic", fontFamily: "sans-serif",
      }}>
        {text}
      </p>
    </div>
  );
}

// ─── KPI cards ────────────────────────────────────────────────────────────────

export function KpiGrid({ items }: {
  items: Array<{ label: string; value: string; unit?: string; color?: string }>;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      {items.map((item, i) => (
        <div key={i} style={{
          flex: "1 1 140px", minWidth: 120,
          border: `1px solid ${item.color ? item.color + "40" : "#E2E8F0"}`,
          backgroundColor: item.color ? item.color + "08" : "#FAFAFA",
          borderRadius: 10, padding: "12px 14px",
        }}>
          <div style={{
            fontSize: 11, color: R.gray, fontFamily: "sans-serif",
            textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4,
          }}>
            {item.label}
          </div>
          <div style={{
            fontSize: 22, fontWeight: 800,
            color: item.color ?? R.green, fontFamily: "sans-serif",
          }}>
            {item.value}
            {item.unit && <span style={{ fontSize: 13, fontWeight: 400, marginLeft: 4, color: R.gray }}>{item.unit}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Tableau HTML ─────────────────────────────────────────────────────────────

export function ReportTable({
  headers, rows, widths,
}: {
  headers: string[];
  rows: (string | React.ReactNode)[][];
  widths?: string[];
}) {
  return (
    <table style={{
      width: "100%", borderCollapse: "collapse",
      fontSize: 12, fontFamily: "sans-serif",
    }}>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i} style={{
              backgroundColor: R.green, color: "white",
              padding: "8px 10px", textAlign: "left", fontWeight: 600,
              width: widths?.[i],
            }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? "#F9FAFB" : "white" }}>
            {row.map((cell, ci) => (
              <td key={ci} style={{
                padding: "7px 10px", color: R.dark,
                borderBottom: "1px solid #F1F5F9",
                verticalAlign: "top",
              }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Donut de score ───────────────────────────────────────────────────────────

export function ScoreDonut({
  score, label, sublabel, size = 120, innerRadius = 36, outerRadius = 52,
}: {
  score: number | null;
  label: string;
  sublabel?: string;
  size?: number;
  innerRadius?: number;
  outerRadius?: number;
}) {
  const color = SCORE_COLOR(score);
  const bg    = SCORE_BG(score);
  const mat   = MATURITY_LABEL(score);
  const style = MATURITY_STYLE[mat];
  const data  = [{ value: score ?? 0 }, { value: Math.max(0, 100 - (score ?? 0)) }];

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      border: `1px solid ${color}50`, borderRadius: 12, padding: 14,
      backgroundColor: bg, minWidth: 120,
    }}>
      {/* Donut */}
      <div style={{ position: "relative", width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%" cy="50%"
              innerRadius={innerRadius} outerRadius={outerRadius}
              startAngle={90} endAngle={-270}
              dataKey="value" strokeWidth={0}
            >
              <Cell fill={color} />
              <Cell fill="#e2e8f0" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          {score !== null ? (
            <span style={{ fontSize: size > 100 ? 22 : 16, fontWeight: 800, color: R.dark }}>
              {score}%
            </span>
          ) : (
            <span style={{ fontSize: 12, color: R.muted }}>—</span>
          )}
        </div>
      </div>

      {/* Label */}
      <p style={{
        fontSize: 11, fontWeight: 600, color: R.dark,
        textAlign: "center", margin: 0, fontFamily: "sans-serif",
        lineHeight: 1.3, maxWidth: size + 20,
      }}>
        {label}
      </p>

      {sublabel && (
        <p style={{ fontSize: 10, color: R.gray, margin: 0, fontFamily: "sans-serif" }}>
          {sublabel}
        </p>
      )}

      {/* Maturity badge */}
      <span style={{
        fontSize: 10, fontWeight: 600,
        padding: "2px 8px", borderRadius: 999,
        backgroundColor: style.bg, color: style.text,
        border: `1px solid ${style.border}`,
        fontFamily: "sans-serif",
      }}>
        {mat}
      </span>
    </div>
  );
}

// ─── Donut groupé par axe ─────────────────────────────────────────────────────

export function AxisDonutReport({
  categoryId, scores,
}: {
  categoryId: string;
  scores: Array<{ categoryId: string; scorePercent: number | null }>;
}) {
  const cfg = AXIS_CONFIG[categoryId];
  const cat = scores.filter((s) => s.categoryId === categoryId);
  const evaluated = cat.filter((s) => s.scorePercent !== null);
  const avg = evaluated.length > 0
    ? Math.round(evaluated.reduce((a, s) => a + (s.scorePercent ?? 0), 0) / evaluated.length)
    : null;
  const mat = MATURITY_LABEL(avg);
  const style = MATURITY_STYLE[mat];
  const color = avg !== null ? SCORE_COLOR(avg) : "#cbd5e1";
  const data = [{ value: avg ?? 0 }, { value: Math.max(0, 100 - (avg ?? 0)) }];

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
      border: `2px solid ${color}50`, borderRadius: 16, padding: 18,
      backgroundColor: SCORE_BG(avg), flex: "1 1 160px",
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        backgroundColor: cfg.color, color: "white",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, fontFamily: "sans-serif",
      }}>
        {categoryId}
      </div>
      <div style={{ position: "relative", width: 120, height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data} cx="50%" cy="50%"
              innerRadius={38} outerRadius={54}
              startAngle={90} endAngle={-270}
              dataKey="value" strokeWidth={0}
            >
              <Cell fill={color} />
              <Cell fill="#e2e8f0" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: R.dark }}>
            {avg !== null ? `${avg}%` : "—"}
          </span>
        </div>
      </div>
      <p style={{ fontSize: 14, fontWeight: 700, color: R.dark, margin: 0, fontFamily: "sans-serif" }}>
        {cfg.label}
      </p>
      <span style={{
        fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
        backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}`,
        fontFamily: "sans-serif",
      }}>
        {mat}
      </span>
      <p style={{ fontSize: 11, color: R.gray, margin: 0, fontFamily: "sans-serif" }}>
        {evaluated.length}/{cat.length} évaluées
      </p>
    </div>
  );
}

// ─── Note méthodologique ──────────────────────────────────────────────────────

export function NoteBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      border: "1px solid #FDE68A", backgroundColor: "#FFFBEB",
      borderRadius: 8, padding: "10px 14px",
    }}>
      <p style={{ fontSize: 12, color: "#92400E", margin: 0, lineHeight: 1.6, fontFamily: "sans-serif" }}>
        {children}
      </p>
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

export function Divider() {
  return <hr style={{ border: "none", borderTop: `1px solid #E2E8F0`, margin: "16px 0" }} />;
}
