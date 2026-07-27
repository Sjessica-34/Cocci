import {
  ChapterWrapper, SectionTitle, ExplainerText, KpiGrid, ReportTable, R,
} from "./_shared";
import type { ReportData } from "../useReportData";

export function ChapterQuiSommesNous({ data }: { data: ReportData }) {
  const draft = data.draft as Record<string, unknown> | null;
  const wf    = data.workforce as Record<string, unknown> | null;
  const is_   = data.impactScore as Record<string, unknown> | null;

  const desc       = draft?.companyDescription as string | null;
  const mission    = draft?.companyMission as string | null;
  const isMission  = draft?.isMissionEntreprise as boolean;
  const vision     = draft?.companyVision as string | null;
  const values     = draft?.companyValues as string | null;
  const keyFigs    = draft?.companyKeyFigures as string | null;
  const timeline   = (draft?.timeline as Array<Record<string, string>>) ?? [];
  const orgChartUrl = draft?.orgChartUrl as string | null;

  const carbonVal = data.carbon as Record<string, unknown> | null;
  const carbonTotal = carbonVal
    ? (["energie1","energie2","horsEnergie1","horsEnergie2","intrantsBiens","intrantsServices",
        "futursEmballages","fret","deplacements","dechetsDirects","immobilisations","utilisation","finDeVie"]
      .reduce((a, k) => a + (carbonVal[k] != null ? Number(carbonVal[k]) : 0), 0))
    : 0;

  const kpis = [];
  if (wf?.totalHeadcount) kpis.push({ label: "Effectif total", value: String(wf.totalHeadcount), unit: "collaborateurs", color: "#3b82f6" });
  if ((data.labels as unknown as Array<{year?: unknown}>).filter((l) => l.year != null).length > 0) kpis.push({ label: "Labels obtenus", value: String((data.labels as unknown as Array<{year?: unknown}>).filter((l) => l.year != null).length), color: R.green });
  if (is_?.score) kpis.push({ label: "Impact Score", value: `${is_.score}`, unit: "/ 100", color: R.green });
  if (carbonTotal > 0) kpis.push({ label: "Émissions GES", value: `${Math.round(carbonTotal)}`, unit: "tCO₂e", color: "#f97316" });
  if (data.actions.length > 0) kpis.push({ label: "Actions RSE", value: String(data.actions.length), unit: "planifiées", color: "#8b5cf6" });

  return (
    <ChapterWrapper num={2} title="Qui sommes-nous ?">

      {desc && (
        <p style={{ fontSize: 14, lineHeight: 1.8, color: "#1C2340", textAlign: "justify", fontFamily: "sans-serif" }}>
          {desc}
        </p>
      )}

      {mission && (
        <>
          <SectionTitle>Notre mission</SectionTitle>
          {isMission && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              backgroundColor: "#ECFDF5", border: "1px solid #86EFAC",
              borderRadius: 8, padding: "6px 14px", marginBottom: 8,
            }}>
              <span style={{ color: R.green, fontWeight: 700, fontSize: 13, fontFamily: "sans-serif" }}>✓ Entreprise à mission (loi PACTE)</span>
            </div>
          )}
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "#1C2340", fontFamily: "sans-serif" }}>{mission}</p>
        </>
      )}

      {vision && (
        <>
          <SectionTitle>Notre vision</SectionTitle>
          <ExplainerText>Notre vision exprime l'ambition de l'organisation à long terme et les valeurs qui orientent durablement ses décisions et ses actions.</ExplainerText>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "#1C2340", fontFamily: "sans-serif" }}>{vision}</p>
        </>
      )}

      {values && (
        <>
          <SectionTitle>Nos valeurs</SectionTitle>
          <ExplainerText>Les valeurs de l'organisation constituent les principes qui pilotent ses décisions, ses comportements et ses relations avec l'ensemble de ses parties prenantes.</ExplainerText>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "#1C2340", fontFamily: "sans-serif" }}>{values}</p>
        </>
      )}

      {kpis.length > 0 && (
        <>
          <SectionTitle>Chiffres clés</SectionTitle>
          <KpiGrid items={kpis} />
          {keyFigs && <p style={{ fontSize: 13, color: "#5B6878", marginTop: 8, fontFamily: "sans-serif" }}>{keyFigs}</p>}
        </>
      )}

      {timeline.length > 0 && (
        <>
          <SectionTitle>Notre historique</SectionTitle>
          <ReportTable
            headers={["Date", "Événement", "Description"]}
            rows={timeline.map((e) => [e.date ?? "", e.title ?? "", e.description ?? ""])}
            widths={["15%", "25%", "60%"]}
          />
        </>
      )}

      {orgChartUrl && (
        <>
          <SectionTitle>Organigramme</SectionTitle>
          <img
            src={orgChartUrl}
            alt="Organigramme"
            style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid #E2E8F0" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </>
      )}
    </ChapterWrapper>
  );
}
