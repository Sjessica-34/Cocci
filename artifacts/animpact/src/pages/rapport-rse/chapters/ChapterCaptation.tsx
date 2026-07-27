import {
  ChapterWrapper, SectionTitle, ExplainerText, AiBlock, KpiGrid, NoteBox, R,
} from "./_shared";
import type { ReportData } from "../useReportData";
import type { AiAnalyses } from "../useReportAI";

export function ChapterCaptation({ data, ai }: { data: ReportData; ai: AiAnalyses }) {
  const cap = data.captation as Record<string, unknown> | null;
  const carbon = data.carbon as Record<string, unknown> | null;

  const carbonFields = ["energie1","energie2","horsEnergie1","horsEnergie2",
    "intrantsBiens","intrantsServices","futursEmballages","fret","deplacements",
    "dechetsDirects","immobilisations","utilisation","finDeVie"];
  const carbonTotal = carbon
    ? carbonFields.reduce((a, k) => a + (carbon[k] != null ? Number(carbon[k]) : 0), 0)
    : 0;

  const captationKg = cap?.captationKgPerYear != null ? Number(cap.captationKgPerYear) : 0;
  const captationT  = captationKg / 1000;
  const coverRatio  = carbonTotal > 0 && captationT > 0
    ? Math.min(100, Math.round((captationT / carbonTotal) * 100))
    : null;

  return (
    <ChapterWrapper num={10} title="Captation carbone &amp; Séquestration">
      <ExplainerText>
        La captation carbone désigne la capacité d'un écosystème (forêts, haies, prairies, etc.) à absorber et stocker le dioxyde de carbone atmosphérique. Son estimation permet à l'organisation de compléter son bilan carbone par une dimension de séquestration naturelle, et de progresser vers une trajectoire bas-carbone.
      </ExplainerText>

      <NoteBox>
        ⚠ Les estimations de captation présentées ici sont indicatives et ne constituent pas un bilan carbone certifié. Elles sont basées sur des coefficients moyens de séquestration par type d'espace végétal et ne sauraient se substituer à une évaluation réalisée par un organisme accrédité.
      </NoteBox>

      {!cap && (
        <p style={{ fontSize: 13, color: "#94A3B8", fontStyle: "italic", fontFamily: "sans-serif" }}>
          Aucune donnée de captation renseignée.
        </p>
      )}

      {cap && (
        <>
          <KpiGrid items={[
            ...(captationKg > 0 ? [{ label: "Captation estimée", value: captationKg.toLocaleString("fr-FR"), unit: "kg CO₂/an", color: R.green }] : []),
            ...(captationT > 0 ? [{ label: "Soit", value: captationT.toLocaleString("fr-FR", { maximumFractionDigits: 1 }), unit: "tCO₂/an", color: R.greenLight }] : []),
            ...(cap.treeCount != null ? [{ label: "Arbres recensés", value: String(cap.treeCount), color: "#22c55e" }] : []),
            ...(cap.hedgeLength != null ? [{ label: "Haies (m)", value: String(cap.hedgeLength), color: "#16a34a" }] : []),
            ...(cap.meadowHa != null ? [{ label: "Prairies (ha)", value: String(cap.meadowHa), color: "#15803d" }] : []),
          ]} />

          {/* Jauge captation vs émissions */}
          {coverRatio !== null && carbonTotal > 0 && (
            <>
              <SectionTitle>Rapport captation / émissions</SectionTitle>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: R.gray, fontFamily: "sans-serif" }}>
                    Captation couvre {coverRatio}% des émissions totales
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: R.green, fontFamily: "sans-serif" }}>
                    {captationT.toFixed(1)} t / {Math.round(carbonTotal)} t
                  </span>
                </div>
                <div style={{ height: 14, borderRadius: 7, backgroundColor: "#FCA5A5", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 7,
                    width: `${coverRatio}%`,
                    backgroundColor: R.green,
                  }} />
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: R.green }} />
                    <span style={{ fontSize: 11, color: R.gray, fontFamily: "sans-serif" }}>Captation</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: "#FCA5A5" }} />
                    <span style={{ fontSize: 11, color: R.gray, fontFamily: "sans-serif" }}>Émissions non compensées</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {cap.notes && (
            <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, fontFamily: "sans-serif" }}>
              {cap.notes as string}
            </p>
          )}

          <AiBlock text={ai.captation ?? null} label="Analyse de la captation carbone" />
        </>
      )}
    </ChapterWrapper>
  );
}
