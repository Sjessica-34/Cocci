import {
  ChapterWrapper, SectionTitle, ExplainerText, AiBlock, ReportTable, KpiGrid, R,
} from "./_shared";
import type { ReportData } from "../useReportData";
import type { AiAnalyses } from "../useReportAI";

export function ChapterFeuilleDeRoute({ data, ai }: { data: ReportData; ai: AiAnalyses }) {
  const actions = data.actions as Array<Record<string, unknown>>;
  const done    = actions.filter((a) => a.isChecked).length;
  const rate    = actions.length > 0 ? Math.round((done / actions.length) * 100) : 0;

  const byCategory = actions.reduce<Record<string, Array<Record<string, unknown>>>>((acc, a) => {
    const cat = (a.category as string) ?? "Autres actions";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(a);
    return acc;
  }, {});

  return (
    <ChapterWrapper num={7} title="Notre feuille de route">
      <ExplainerText>
        Le plan d'actions RSE matérialise les engagements de l'organisation en objectifs concrets et mesurables. Il traduit la stratégie RSE en actions opérationnelles, organisées par thématique, avec un suivi de l'avancement. Il constitue un outil de pilotage indispensable pour démontrer le sérieux de la démarche auprès des parties prenantes.
      </ExplainerText>

      {/* KPIs */}
      <KpiGrid items={[
        { label: "Actions planifiées", value: String(actions.length), color: "#3b82f6" },
        { label: "Actions réalisées",  value: String(done),           color: R.green  },
        { label: "Taux de réalisation", value: `${rate}`, unit: "%",  color: rate >= 70 ? R.green : rate >= 40 ? "#eab308" : "#ef4444" },
      ]} />

      {/* Barre de progression */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: R.gray, fontFamily: "sans-serif" }}>Avancement global</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: R.dark, fontFamily: "sans-serif" }}>{rate}%</span>
        </div>
        <div style={{ height: 12, borderRadius: 6, backgroundColor: "#E2E8F0", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 6,
            width: `${rate}%`,
            backgroundColor: rate >= 70 ? R.green : rate >= 40 ? "#eab308" : "#ef4444",
            transition: "width 0.3s",
          }} />
        </div>
      </div>

      {/* Actions par catégorie */}
      {Object.entries(byCategory).map(([cat, items]) => {
        const catDone = items.filter((a) => a.isChecked).length;
        const catRate = items.length > 0 ? Math.round((catDone / items.length) * 100) : 0;
        return (
          <div key={cat}>
            <SectionTitle>
              {cat}
              <span style={{ fontSize: 11, fontWeight: 400, color: R.gray, marginLeft: 8 }}>
                {catDone}/{items.length} réalisées ({catRate}%)
              </span>
            </SectionTitle>
            <ReportTable
              headers={["Statut", "Action", "Sous-thème"]}
              rows={items.map((a) => [
                <span key="s" style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  color: a.isChecked ? R.green : "#64748b",
                  fontWeight: 600, fontSize: 12, fontFamily: "sans-serif",
                }}>
                  {a.isChecked ? "✓ Réalisé" : "○ En cours"}
                </span>,
                (a.libraryName as string) ?? (a.customName as string) ?? "—",
                (a.subcategory as string) ?? "—",
              ])}
              widths={["20%", "55%", "25%"]}
            />
          </div>
        );
      })}

      {actions.length === 0 && (
        <p style={{ fontSize: 13, color: "#94A3B8", fontStyle: "italic", fontFamily: "sans-serif" }}>
          Aucune action RSE renseignée pour cet exercice.
        </p>
      )}

      <AiBlock text={ai.actions ?? null} label="Analyse du plan d'actions" />
    </ChapterWrapper>
  );
}
