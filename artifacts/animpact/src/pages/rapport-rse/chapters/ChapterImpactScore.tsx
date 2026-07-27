import {
  ChapterWrapper, SectionTitle, ExplainerText, AiBlock, KpiGrid, R,
  SCORE_COLOR, SCORE_BG, MATURITY_LABEL,
} from "./_shared";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { ReportData } from "../useReportData";
import type { AiAnalyses } from "../useReportAI";

export function ChapterImpactScore({ data, ai }: { data: ReportData; ai: AiAnalyses }) {
  const is_ = data.impactScore as Record<string, unknown> | null;

  if (!is_) {
    return (
      <ChapterWrapper num={8} title="Mon Impact Score">
        <ExplainerText>
          L'Impact Score est un indicateur synthétique qui mesure l'alignement de l'organisation avec une performance globale durable. Il évalue trois piliers fondamentaux : la limitation des impacts négatifs, le partage équitable de la valeur créée, et la mise en œuvre d'une stratégie orientée vers un impact positif.
        </ExplainerText>
        <p style={{ fontSize: 13, color: "#94A3B8", fontStyle: "italic", fontFamily: "sans-serif" }}>
          L'Impact Score n'a pas encore été renseigné.
        </p>
      </ChapterWrapper>
    );
  }

  const score = is_.score as number;
  const scoreColor = SCORE_COLOR(score);
  const scoreBg    = SCORE_BG(score);
  const mat        = MATURITY_LABEL(score);

  const piliers = [
    { label: "Limitation des impacts négatifs", value: is_.limitationImpactsNegatifs as number | null, color: "#10b981" },
    { label: "Partage de la valeur et du pouvoir", value: is_.partageValeurPouvoir as number | null, color: "#3b82f6" },
    { label: "Stratégie à impact positif", value: is_.strategieImpactPositif as number | null, color: "#8b5cf6" },
  ].filter((p) => p.value != null) as Array<{ label: string; value: number; color: string }>;

  return (
    <ChapterWrapper num={8} title="Mon Impact Score">
      <ExplainerText>
        L'Impact Score est un indicateur synthétique qui mesure l'alignement de l'organisation avec une performance globale durable. Il évalue trois piliers fondamentaux : la limitation des impacts négatifs sur la société et l'environnement, le partage équitable de la valeur créée, et la mise en œuvre d'une stratégie orientée vers un impact positif.
      </ExplainerText>

      {/* Grand score centré */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "32px 24px", backgroundColor: scoreBg,
        border: `2px solid ${scoreColor}50`, borderRadius: 16, margin: "8px 0",
      }}>
        {/* Donut géant */}
        <div style={{ position: "relative", width: 180, height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[{ value: score }, { value: 100 - score }]}
                cx="50%" cy="50%"
                innerRadius={60} outerRadius={80}
                startAngle={90} endAngle={-270}
                dataKey="value" strokeWidth={0}
              >
                <Cell fill={scoreColor} />
                <Cell fill="#e2e8f0" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 48, fontWeight: 900, color: scoreColor, fontFamily: "sans-serif", lineHeight: 1 }}>
              {score}
            </span>
            <span style={{ fontSize: 18, color: "#94A3B8", fontFamily: "sans-serif" }}>/100</span>
          </div>
        </div>

        <span style={{
          marginTop: 12, fontSize: 18, fontWeight: 700, color: scoreColor,
          fontFamily: "sans-serif",
        }}>
          {mat}
        </span>

        {/* Jauge horizontale */}
        <div style={{ width: "100%", maxWidth: 320, marginTop: 8 }}>
          <div style={{ height: 12, borderRadius: 6, backgroundColor: "#E2E8F0", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 6,
              width: `${score}%`,
              backgroundColor: scoreColor,
              transition: "width 0.5s",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
            <span style={{ fontSize: 9, color: "#CBD5E1", fontFamily: "sans-serif" }}>0</span>
            <span style={{ fontSize: 9, color: "#CBD5E1", fontFamily: "sans-serif" }}>25</span>
            <span style={{ fontSize: 9, color: "#CBD5E1", fontFamily: "sans-serif" }}>50</span>
            <span style={{ fontSize: 9, color: "#CBD5E1", fontFamily: "sans-serif" }}>75</span>
            <span style={{ fontSize: 9, color: "#CBD5E1", fontFamily: "sans-serif" }}>100</span>
          </div>
        </div>

        {is_.dateRealisation != null && (
          <p style={{ fontSize: 12, color: "#94A3B8", margin: "6px 0 0", fontFamily: "sans-serif" }}>
            Date de réalisation : {String(is_.dateRealisation)}
          </p>
        )}
      </div>

      {/* Piliers */}
      {piliers.length > 0 && (
        <>
          <SectionTitle>Répartition par pilier</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {piliers.map((p) => (
              <div key={p.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: R.dark, fontFamily: "sans-serif" }}>{p.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: p.color, fontFamily: "sans-serif" }}>
                    {p.value}/100
                  </span>
                </div>
                <div style={{ height: 10, borderRadius: 5, backgroundColor: "#E2E8F0", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 5,
                    width: `${p.value}%`,
                    backgroundColor: p.color,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {is_.commentaire != null && (
        <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, fontFamily: "sans-serif" }}>
          {String(is_.commentaire)}
        </p>
      )}

      <AiBlock text={ai.impact ?? null} label="Analyse de l'Impact Score" />
    </ChapterWrapper>
  );
}
