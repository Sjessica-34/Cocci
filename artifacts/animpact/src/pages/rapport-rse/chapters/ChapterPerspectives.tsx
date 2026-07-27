import { ChapterWrapper, SectionTitle, ExplainerText, R } from "./_shared";
import type { ReportData } from "../useReportData";

export function ChapterPerspectives({ data, chapterNum }: { data: ReportData; chapterNum: number }) {
  const draft = data.draft as Record<string, unknown> | null;
  const perspectives = draft?.perspectives as string | null;
  const perspectiveItems = (draft?.perspectiveItems as Array<Record<string, string>>) ?? [];
  const openQuestion = draft?.openQuestion as string | null;

  type AnyAction = Record<string, unknown>;
  const actions = data.actions as unknown as AnyAction[];
  const todo = actions.filter((a) => !a.isChecked);

  return (
    <ChapterWrapper num={chapterNum} title="Perspectives &amp; Ambitions">
      <ExplainerText>
        Les perspectives RSE projettent l'organisation dans ses ambitions à venir. Elles permettent de communiquer transparemment sur la trajectoire envisagée, les engagements futurs et les axes de progrès identifiés sur la base des résultats de l'exercice écoulé.
      </ExplainerText>

      {perspectives && (
        <p style={{ fontSize: 14, color: "#1C2340", lineHeight: 1.8, textAlign: "justify", fontFamily: "sans-serif" }}>
          {perspectives}
        </p>
      )}

      {perspectiveItems.length > 0 && (
        <>
          <SectionTitle>Engagements pour le prochain exercice</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {perspectiveItems.map((p, i) => {
              const colors = ["#3b82f6","#22c55e","#8b5cf6","#f59e0b","#ec4899"];
              const c = colors[i % colors.length];
              return (
                <div key={i} style={{
                  display: "flex", gap: 12, alignItems: "flex-start",
                  padding: 14, borderRadius: 10,
                  backgroundColor: "#F8FAFC",
                  border: `1px solid ${c}30`,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    backgroundColor: c + "20", border: `2px solid ${c}`,
                    color: c, fontSize: 12, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, fontFamily: "sans-serif",
                  }}>
                    {i + 1}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#1C2340", margin: "0 0 4px", fontFamily: "sans-serif" }}>
                      {p.title}
                    </p>
                    {p.description && (
                      <p style={{ fontSize: 12, color: "#374151", margin: 0, lineHeight: 1.6, fontFamily: "sans-serif" }}>
                        {p.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Actions encore à réaliser */}
      {todo.length > 0 && (
        <>
          <SectionTitle>Actions RSE en cours ({todo.length})</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {todo.slice(0, 8).map((a, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", borderRadius: 8,
                backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0",
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: "50%",
                  border: `2px solid ${R.green}`, flexShrink: 0,
                }} />
                <span style={{ fontSize: 13, color: "#374151", fontFamily: "sans-serif" }}>
                  {(a.libraryName as string) ?? (a.customName as string) ?? "Action"}
                </span>
                {a.category != null && (
                  <span style={{
                    marginLeft: "auto", fontSize: 10, color: "#64748B",
                    backgroundColor: "#F1F5F9", padding: "2px 6px", borderRadius: 4,
                    fontFamily: "sans-serif",
                  }}>
                    {String(a.category)}
                  </span>
                )}
              </div>
            ))}
            {todo.length > 8 && (
              <p style={{ fontSize: 12, color: "#94A3B8", fontStyle: "italic", fontFamily: "sans-serif" }}>
                … et {todo.length - 8} autres actions en cours.
              </p>
            )}
          </div>
        </>
      )}

      {openQuestion && (
        <>
          <SectionTitle>Un mot pour conclure</SectionTitle>
          <p style={{ fontSize: 14, color: "#1C2340", lineHeight: 1.8, fontStyle: "italic", fontFamily: "sans-serif" }}>
            {openQuestion}
          </p>
        </>
      )}

      {!perspectives && perspectiveItems.length === 0 && todo.length === 0 && !openQuestion && (
        <p style={{ fontSize: 13, color: "#94A3B8", fontStyle: "italic", fontFamily: "sans-serif" }}>
          Les perspectives n'ont pas encore été renseignées.
        </p>
      )}
    </ChapterWrapper>
  );
}
