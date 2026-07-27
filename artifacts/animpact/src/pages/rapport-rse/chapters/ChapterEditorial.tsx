import { ChapterWrapper, ExplainerText } from "./_shared";
import type { ReportData } from "../useReportData";

export function ChapterEditorial({ data }: { data: ReportData }) {
  const draft   = data.draft as Record<string, unknown> | null;
  const content = draft?.editorialContent as string | null;
  const author  = draft?.editorialAuthor as string | null;
  const role    = draft?.editorialAuthorRole as string | null;

  return (
    <ChapterWrapper num={1} title="Éditorial">
      {!content ? (
        <ExplainerText>L'éditorial n'a pas encore été rédigé.</ExplainerText>
      ) : (
        <>
          {(content.split("\n\n").filter(Boolean)).map((para, i) => (
            <p key={i} style={{
              fontSize: 14, lineHeight: 1.8, color: "#1C2340",
              textAlign: "justify", margin: "0 0 12px",
              fontFamily: "sans-serif",
            }}>
              {para}
            </p>
          ))}
          {author && (
            <div style={{
              marginTop: 24, paddingTop: 16,
              borderTop: "1px solid #E2E8F0",
            }}>
              <p style={{
                fontSize: 14, fontWeight: 700, color: "#1C2340",
                margin: "0 0 2px", fontFamily: "sans-serif",
              }}>
                {author}
              </p>
              {role && (
                <p style={{
                  fontSize: 13, color: "#5B6878",
                  margin: 0, fontStyle: "italic", fontFamily: "sans-serif",
                }}>
                  {role}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </ChapterWrapper>
  );
}
