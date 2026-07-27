import {
  ChapterWrapper, SectionTitle, ExplainerText, AiBlock, KpiGrid, R,
} from "./_shared";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { ReportData } from "../useReportData";
import type { AiAnalyses } from "../useReportAI";

const ESG_COLORS: Record<string, string> = {
  "ENV": "#10b981", "Environnement": "#10b981",
  "SOC": "#3b82f6", "Social": "#3b82f6",
  "GOV": "#8b5cf6", "Gouvernance": "#8b5cf6",
};

function esgColor(pillar: string | null | undefined): string {
  if (!pillar) return "#94a3b8";
  const key = Object.keys(ESG_COLORS).find(k => pillar.toUpperCase().includes(k.toUpperCase()));
  return key ? ESG_COLORS[key] : "#94a3b8";
}

export function ChapterFeuilleDeRoute({ data, ai }: { data: ReportData; ai: AiAnalyses }) {
  const actions = data.actions as Array<Record<string, unknown>>;

  // Normalisation des noms de champs (API peut retourner actionName ou libraryName)
  const norm = (a: Record<string, unknown>) => ({
    name:        (a.actionName as string) ?? (a.libraryName as string) ?? (a.customName as string) ?? "Action",
    desc:        (a.actionDescription as string) ?? null,
    category:    (a.actionCategory as string) ?? (a.category as string) ?? "Autres actions",
    subcategory: (a.actionSubcategory as string) ?? (a.subcategory as string) ?? null,
    esgPillar:   (a.actionEsgPillar as string) ?? null,
    odd:         (a.actionOdd as string) ?? null,
    isChecked:   Boolean(a.isChecked),
    completedAt: (a.completedAt as string) ?? null,
    comment:     (a.comment as string) ?? null,
  });

  const done = actions.filter((a) => a.isChecked).length;
  const rate = actions.length > 0 ? Math.round((done / actions.length) * 100) : 0;

  const byCategory = actions.reduce<Record<string, Array<Record<string, unknown>>>>((acc, a) => {
    const cat = norm(a).category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(a);
    return acc;
  }, {});

  // Données pour le graphique de progression par catégorie
  const progressData = Object.entries(byCategory).map(([cat, items]) => {
    const catDone = items.filter((a) => norm(a).isChecked).length;
    return {
      name: cat.length > 20 ? cat.slice(0, 18) + "…" : cat,
      fullName: cat,
      done: catDone,
      total: items.length,
      pct: items.length > 0 ? Math.round((catDone / items.length) * 100) : 0,
    };
  }).sort((a, b) => b.pct - a.pct);

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

      {/* Barre de progression globale */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: R.gray, fontFamily: "sans-serif" }}>Avancement global</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: R.dark, fontFamily: "sans-serif" }}>{rate}%</span>
        </div>
        <div style={{ height: 14, borderRadius: 7, backgroundColor: "#E2E8F0", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 7,
            width: `${rate}%`,
            backgroundColor: rate >= 70 ? R.green : rate >= 40 ? "#eab308" : "#ef4444",
            transition: "width 0.3s",
          }} />
        </div>
      </div>

      {/* Graphique de progression par catégorie */}
      {progressData.length > 1 && (
        <>
          <SectionTitle>Avancement par thématique</SectionTitle>
          <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 8px" }}>
            <ResponsiveContainer width="100%" height={Math.max(160, progressData.length * 32)}>
              <BarChart data={progressData} layout="vertical" margin={{ left: 8, right: 40 }}>
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v: number, _: string, entry: any) => [
                    `${entry.payload.done}/${entry.payload.total} (${v}%)`,
                    "Réalisées",
                  ]}
                />
                <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                  {progressData.map((d, i) => (
                    <Cell key={i} fill={d.pct >= 70 ? R.green : d.pct >= 40 ? "#eab308" : "#3b82f6"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Plan d'actions complet par catégorie */}
      {Object.entries(byCategory).map(([cat, items]) => {
        const catDone = items.filter((a) => norm(a).isChecked).length;
        const catRate = items.length > 0 ? Math.round((catDone / items.length) * 100) : 0;
        return (
          <div key={cat}>
            <SectionTitle>
              {cat}
              <span style={{ fontSize: 11, fontWeight: 400, color: R.gray, marginLeft: 8 }}>
                {catDone}/{items.length} réalisées — {catRate}%
              </span>
            </SectionTitle>

            {/* Barre de progression de la catégorie */}
            <div style={{ height: 6, borderRadius: 3, backgroundColor: "#E2E8F0", overflow: "hidden", marginBottom: 12 }}>
              <div style={{
                height: "100%", borderRadius: 3, width: `${catRate}%`,
                backgroundColor: catRate >= 70 ? R.green : catRate >= 40 ? "#eab308" : "#3b82f6",
              }} />
            </div>

            {/* Liste des actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map((a, idx) => {
                const n = norm(a);
                return (
                  <div key={idx} style={{
                    border: `1px solid ${n.isChecked ? R.greenBorder : "#E2E8F0"}`,
                    borderRadius: 10,
                    backgroundColor: n.isChecked ? R.greenBg : "#FAFAFA",
                    padding: "10px 14px",
                  }}>
                    {/* En-tête action */}
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      {/* Indicateur statut */}
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                        backgroundColor: n.isChecked ? R.green : "#E2E8F0",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {n.isChecked && (
                          <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>✓</span>
                        )}
                      </div>

                      {/* Nom de l'action */}
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontSize: 13, fontWeight: 600,
                          color: n.isChecked ? R.dark : "#374151",
                          margin: 0, fontFamily: "sans-serif",
                        }}>
                          {n.name}
                        </p>

                        {/* Description */}
                        {n.desc && (
                          <p style={{
                            fontSize: 12, color: "#6B7280", lineHeight: 1.5,
                            margin: "4px 0 0", fontFamily: "sans-serif",
                          }}>
                            {n.desc}
                          </p>
                        )}

                        {/* Métadonnées */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                          {n.subcategory && (
                            <span style={{
                              fontSize: 10, color: "#5B6878",
                              backgroundColor: "#F1F5F9", border: "1px solid #E2E8F0",
                              borderRadius: 4, padding: "2px 6px", fontFamily: "sans-serif",
                            }}>
                              {n.subcategory}
                            </span>
                          )}
                          {n.esgPillar && (
                            <span style={{
                              fontSize: 10, fontWeight: 600,
                              color: "white",
                              backgroundColor: esgColor(n.esgPillar),
                              borderRadius: 4, padding: "2px 7px", fontFamily: "sans-serif",
                            }}>
                              {n.esgPillar}
                            </span>
                          )}
                          {n.odd && (
                            <span style={{
                              fontSize: 10, color: "#f59e0b",
                              backgroundColor: "#FFFBEB", border: "1px solid #FDE68A",
                              borderRadius: 4, padding: "2px 6px", fontFamily: "sans-serif",
                            }}>
                              ODD {n.odd}
                            </span>
                          )}
                          {n.completedAt && (
                            <span style={{
                              fontSize: 10, color: R.green,
                              backgroundColor: R.greenBg, border: `1px solid ${R.greenBorder}`,
                              borderRadius: 4, padding: "2px 6px", fontFamily: "sans-serif",
                            }}>
                              ✓ {new Date(n.completedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          )}
                        </div>

                        {/* Commentaire */}
                        {n.comment && (
                          <p style={{
                            fontSize: 11, color: "#6B7280", fontStyle: "italic",
                            borderLeft: `2px solid #E2E8F0`, paddingLeft: 8,
                            margin: "6px 0 0", fontFamily: "sans-serif",
                          }}>
                            {n.comment}
                          </p>
                        )}
                      </div>

                      {/* Badge statut */}
                      <span style={{
                        flexShrink: 0, fontSize: 11, fontWeight: 600,
                        color: n.isChecked ? R.green : "#64748b",
                        fontFamily: "sans-serif",
                        padding: "2px 8px",
                        backgroundColor: n.isChecked ? R.greenBg : "#F8FAFC",
                        border: `1px solid ${n.isChecked ? R.greenBorder : "#E2E8F0"}`,
                        borderRadius: 6,
                      }}>
                        {n.isChecked ? "Réalisé" : "En cours"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
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
