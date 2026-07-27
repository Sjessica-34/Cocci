import {
  ChapterWrapper, SectionTitle, ExplainerText, EditableAiBlock, ScoreDonut, AxisDonutReport,
} from "./_shared";
import type { ReportData } from "../useReportData";
import type { AiAnalyses } from "../useReportAI";

export function ChapterGouvernance({ data, ai }: { data: ReportData; ai: AiAnalyses }) {
  type AnyItem = Record<string, unknown>;
  const diagScores = data.diagScores as unknown as AnyItem[];
  const govScores  = diagScores.filter((s) => s.categoryId === "GOV");

  return (
    <ChapterWrapper num={6} title="Piloter une entreprise responsable">
      <ExplainerText>
        La gouvernance responsable repose sur des structures décisionnelles transparentes, une éthique des affaires irréprochable et une intégration des enjeux RSE au cœur de la stratégie de l'organisation. Elle garantit la cohérence entre les engagements affichés et les pratiques opérationnelles.
      </ExplainerText>

      {govScores.length > 0 && (
        <>
          {/* Grand donut GOV */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <AxisDonutReport categoryId="GOV" scores={diagScores as any} />
          </div>

          <SectionTitle>Diagnostic de gouvernance — Résultats détaillés</SectionTitle>
          <ExplainerText>
            Le diagnostic de gouvernance évalue la maturité de l'organisation sur les thématiques liées à l'éthique, à la transparence, aux pratiques d'achat responsable, aux relations avec les parties prenantes et à la gestion des risques RSE. Chaque sous-thème est noté de 0 à 100 % selon le niveau de pratiques observées.
          </ExplainerText>

          {/* Grille de donuts GOV */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 12,
          }}>
            {govScores.map((s) => (
              <ScoreDonut
                key={s.subcategoryId as string}
                score={s.scorePercent as number | null}
                label={s.label as string}
                sublabel={`${s.answered}/${s.totalQuestions} réponses`}
                size={110}
                innerRadius={30}
                outerRadius={44}
              />
            ))}
          </div>

          <EditableAiBlock id="diag_gov" text={ai.diag_gov ?? null} label="Analyse du diagnostic de gouvernance" />
        </>
      )}

      {govScores.length === 0 && (
        <p style={{ fontSize: 13, color: "#94A3B8", fontStyle: "italic", fontFamily: "sans-serif" }}>
          Le diagnostic de gouvernance n'a pas encore été renseigné.
        </p>
      )}
    </ChapterWrapper>
  );
}
