import { R } from "./_shared";
import type { ReportData } from "../useReportData";

export function ChapterCover({ data, year }: { data: ReportData; year: number }) {
  const draft   = data.draft as Record<string, unknown> | null;
  const orgName = (data.orgs?.[0] as Record<string, unknown>)?.name as string ?? "Mon Organisation";
  const period  = draft?.period as string || `Exercice ${year}`;
  const version = draft?.version as string || "1.0";
  const coverUrl = draft?.coverImageUrl as string | null;

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#F0FDF4",
      padding: "80px 60px",
      position: "relative",
      breakAfter: "page",
      pageBreakAfter: "always",
    }}>
      {/* Cover image */}
      {coverUrl && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          backgroundImage: `url(${coverUrl})`,
          backgroundSize: "cover", backgroundPosition: "center",
          opacity: 0.12,
        }} />
      )}

      <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 600 }}>
        {/* Badge */}
        <div style={{
          display: "inline-block",
          backgroundColor: R.green, color: "white",
          fontSize: 11, fontWeight: 700,
          padding: "4px 16px", borderRadius: 999,
          letterSpacing: "0.1em", textTransform: "uppercase",
          marginBottom: 32, fontFamily: "sans-serif",
        }}>
          Responsabilité Sociétale des Entreprises
        </div>

        <h1 style={{
          fontSize: 64, fontWeight: 900, color: R.green,
          letterSpacing: "-2px", margin: "0 0 8px",
          fontFamily: "sans-serif", lineHeight: 1,
          textTransform: "uppercase",
        }}>
          Rapport<br />RSE
        </h1>

        <div style={{
          width: 80, height: 4, backgroundColor: R.green,
          margin: "24px auto", borderRadius: 2,
        }} />

        <h2 style={{
          fontSize: 36, fontWeight: 700, color: R.dark,
          margin: "0 0 12px", fontFamily: "sans-serif",
        }}>
          {orgName}
        </h2>
        <p style={{ fontSize: 20, color: R.gray, margin: "0 0 8px", fontFamily: "sans-serif" }}>
          {period}
        </p>
        <p style={{ fontSize: 14, color: R.muted, margin: 0, fontFamily: "sans-serif", fontStyle: "italic" }}>
          Version {version}
        </p>

        <div style={{
          marginTop: 48, padding: "20px 30px",
          border: `1px solid ${R.greenBorder}`,
          borderRadius: 12, backgroundColor: "rgba(255,255,255,0.7)",
        }}>
          <p style={{
            fontSize: 15, fontStyle: "italic", color: R.green,
            margin: 0, lineHeight: 1.7, fontFamily: "sans-serif",
          }}>
            « Construire une performance durable au service des personnes, de la planète et d'une gouvernance responsable. »
          </p>
        </div>
      </div>
    </div>
  );
}
