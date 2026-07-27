import { ChapterWrapper, SectionTitle, ExplainerText, R } from "./_shared";
import type { ReportData } from "../useReportData";

export function ChapterTempsForts({ data, chapterNum }: { data: ReportData; chapterNum: number }) {
  const draft = data.draft as Record<string, unknown> | null;
  const highlights = (draft?.highlights as Array<Record<string, string>>) ?? [];
  const commitment = draft?.engagementStatement as string | null;
  const goals      = (draft?.goals as string[]) ?? [];

  if (highlights.length === 0 && !commitment && goals.length === 0) return null;

  return (
    <ChapterWrapper num={chapterNum} title="Temps forts &amp; Engagements">
      {commitment && (
        <>
          <SectionTitle>Engagement de l'organisation</SectionTitle>
          <div style={{
            borderLeft: `4px solid ${R.green}`,
            padding: "12px 16px",
            backgroundColor: R.greenBg,
            borderRadius: "0 8px 8px 0",
          }}>
            <p style={{ fontSize: 14, color: R.dark, lineHeight: 1.7, margin: 0, fontStyle: "italic", fontFamily: "sans-serif" }}>
              {commitment}
            </p>
          </div>
        </>
      )}

      {goals.length > 0 && (
        <>
          <SectionTitle>Objectifs RSE</SectionTitle>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {goals.map((g, i) => (
              <li key={i} style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, marginBottom: 4, fontFamily: "sans-serif" }}>
                {g}
              </li>
            ))}
          </ul>
        </>
      )}

      {highlights.length > 0 && (
        <>
          <SectionTitle>Événements &amp; initiatives marquants</SectionTitle>
          <ExplainerText>
            Cette section présente les temps forts de l'année en matière de RSE : initiatives lancées, projets réalisés, événements auxquels l'organisation a participé, et actions emblématiques qui illustrent concrètement l'engagement de l'entreprise.
          </ExplainerText>

          {/* Timeline visuelle */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {highlights.map((h, i) => (
              <div key={i} style={{ display: "flex", gap: 16 }}>
                {/* Timeligne gauche */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 40 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    backgroundColor: R.green, border: `3px solid ${R.greenBg}`,
                    boxShadow: `0 0 0 2px ${R.green}`,
                    flexShrink: 0, zIndex: 1,
                  }} />
                  {i < highlights.length - 1 && (
                    <div style={{ width: 2, flex: 1, backgroundColor: R.greenBorder, minHeight: 24 }} />
                  )}
                </div>

                {/* Contenu */}
                <div style={{
                  flex: 1, padding: "2px 0 20px",
                }}>
                  {h.date && (
                    <p style={{ fontSize: 11, color: R.green, fontWeight: 700, margin: "0 0 2px", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {h.date}
                    </p>
                  )}
                  <p style={{ fontSize: 14, fontWeight: 700, color: R.dark, margin: "0 0 4px", fontFamily: "sans-serif" }}>
                    {h.title}
                  </p>
                  {h.description && (
                    <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, margin: 0, fontFamily: "sans-serif" }}>
                      {h.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </ChapterWrapper>
  );
}
