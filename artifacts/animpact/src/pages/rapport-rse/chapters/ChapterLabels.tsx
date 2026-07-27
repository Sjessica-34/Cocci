import {
  ChapterWrapper, SectionTitle, ExplainerText, ReportTable, KpiGrid, R,
} from "./_shared";
import type { ReportData } from "../useReportData";

const LABEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Obtenu":          { bg: "#F0FDF4", text: "#166534", border: "#86EFAC" },
  "En cours":        { bg: "#EFF6FF", text: "#1E40AF", border: "#BFDBFE" },
  "Non retenu":      { bg: "#F8FAFC", text: "#64748B", border: "#E2E8F0" },
};

export function ChapterLabels({ data }: { data: ReportData }) {
  type AnyLabel = Record<string, unknown>;
  const labels = data.labels as unknown as AnyLabel[];
  const obtained = labels.filter((l) => l.year != null);
  const inProgress = labels.filter((l) => l.year == null && l.isTargeted);

  return (
    <ChapterWrapper num={9} title="Labels &amp; Certifications">
      <ExplainerText>
        Les labels et certifications RSE constituent des reconnaissances officielles de l'engagement de l'organisation dans une démarche de responsabilité sociétale. Ils renforcent la crédibilité de la démarche, facilitent la communication transparente avec les parties prenantes et valorisent les efforts accomplis dans une logique d'amélioration continue.
      </ExplainerText>

      {labels.length === 0 && (
        <p style={{ fontSize: 13, color: "#94A3B8", fontStyle: "italic", fontFamily: "sans-serif" }}>
          Aucun label ou certification renseigné.
        </p>
      )}

      {obtained.length > 0 && (
        <>
          <SectionTitle>Labels obtenus</SectionTitle>
          <KpiGrid items={[
            { label: "Labels obtenus", value: String(obtained.length), color: R.green },
          ]} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
            {obtained.map((l, i) => (
              <div key={i} style={{
                border: `2px solid ${R.greenBorder}`,
                backgroundColor: R.greenBg,
                borderRadius: 12, padding: "14px 20px",
                flex: "0 0 auto", minWidth: 180, maxWidth: 240,
              }}>
                {l.logoUrl != null && (
                  <img
                    src={String(l.logoUrl)}
                    alt={String(l.name ?? "")}
                    style={{ height: 48, objectFit: "contain", marginBottom: 8 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <p style={{ fontSize: 14, fontWeight: 700, color: R.dark, margin: "0 0 4px", fontFamily: "sans-serif" }}>
                  {String(l.name ?? "—")}
                </p>
                {l.year != null && (
                  <p style={{ fontSize: 12, color: R.green, margin: "0 0 2px", fontFamily: "sans-serif" }}>
                    Obtenu en {String(l.year)}
                  </p>
                )}
                {l.level != null && (
                  <p style={{ fontSize: 11, color: R.gray, margin: 0, fontFamily: "sans-serif" }}>
                    Niveau : {String(l.level)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {inProgress.length > 0 && (
        <>
          <SectionTitle>Labels en cours d'obtention</SectionTitle>
          <ReportTable
            headers={["Label", "Organisme", "Avancement"]}
            rows={inProgress.map((l) => [
              l.name as string ?? "—",
              l.provider as string ?? "—",
              l.progressNote as string ?? "En cours",
            ])}
            widths={["40%", "30%", "30%"]}
          />
        </>
      )}
    </ChapterWrapper>
  );
}
