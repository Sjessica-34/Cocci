import {
  ChapterWrapper, SectionTitle, ExplainerText, AiBlock, KpiGrid,
  ScoreDonut, AxisDonutReport, R, SCORE_COLOR,
} from "./_shared";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  computeScores, PILLARS, MACRO_PILLARS, maturityLabel, computeMacroPillarData,
} from "../../numerique-responsable/data";
import type { ReportData } from "../useReportData";
import type { AiAnalyses } from "../useReportAI";

// ─── Composant NR : section complète ─────────────────────────────────────────

function NrSection({ nrRaw, ai }: {
  nrRaw: { meta?: { certificationLabel?: string; certificationOther?: string | null }; responses?: Array<{ criterionId: string; checked: boolean }> } | null;
  ai: string | null;
}) {
  if (!nrRaw) return null;

  const responses = nrRaw.responses ?? [];
  const responsesMap: Record<string, boolean> = Object.fromEntries(
    responses.map(r => [r.criterionId, r.checked])
  );
  const { globalScore, pillarPcts, totalChecked, totalPossible } = computeScores(responsesMap);
  const globalPct = totalPossible > 0 ? Math.round((totalChecked / totalPossible) * 100) : 0;

  if (totalChecked === 0) return null;

  const maturity = maturityLabel(globalPct);
  const certLabel = nrRaw.meta?.certificationLabel;
  const globalRadarData = PILLARS.map(p => ({ pillar: p.shortTitle, value: pillarPcts[p.id] ?? 0 }));

  return (
    <>
      <SectionTitle>Numérique responsable</SectionTitle>
      <ExplainerText>
        Le numérique responsable vise à réduire l'empreinte environnementale, sociale et économique des usages numériques au sein de l'organisation. Il couvre des pratiques telles que l'allongement de la durée de vie des équipements, la réduction de la consommation d'énergie numérique, l'accessibilité des services digitaux et la gestion des déchets électroniques (DEEE).
      </ExplainerText>

      {/* KPIs globaux */}
      <KpiGrid items={[
        { label: "Score global", value: String(globalScore), unit: "/500", color: "#10b981" },
        { label: "Niveau de maturité", value: maturity.label, color: "#3b82f6" },
        { label: "Critères validés", value: `${totalChecked}`, unit: `/${totalPossible}`, color: "#8b5cf6" },
      ]} />

      {/* Badge certification */}
      {certLabel && certLabel !== "none" && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          backgroundColor: R.greenBg, border: `1px solid ${R.greenBorder}`,
          borderRadius: 8, padding: "6px 14px",
        }}>
          <span style={{ fontSize: 14 }}>🏆</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: R.green, fontFamily: "sans-serif" }}>
            Niveau : {certLabel}
          </span>
        </div>
      )}

      {/* Radar global — 7 piliers */}
      <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 8px" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: R.dark, margin: "0 0 4px 8px", fontFamily: "sans-serif" }}>
          Vue d'ensemble — radar des 7 piliers
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={globalRadarData}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 10, fill: "#6b7280" }} />
            <RTooltip formatter={(v: number) => [`${v}%`, "Score"]} contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }} />
            <Radar name="Score" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Score par pilier — barres horizontales */}
      <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: R.dark, margin: "0 0 4px", fontFamily: "sans-serif" }}>
          Résultats par pilier
        </p>
        {PILLARS.map(p => {
          const pct = pillarPcts[p.id] ?? 0;
          const mat = maturityLabel(pct);
          return (
            <div key={p.id}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 12, color: "#374151", fontFamily: "sans-serif" }}>{p.shortTitle}</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: mat.color, fontFamily: "sans-serif" }}>{mat.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "sans-serif" }} dangerouslySetInnerHTML={{ __html: `<span style="color:${p.color}">${pct}%</span>` }} />
                </div>
              </div>
              <div style={{ height: 8, borderRadius: 4, backgroundColor: "#F1F5F9", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 4, width: `${pct}%`, backgroundColor: p.color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Macro-piliers */}
      {MACRO_PILLARS.map(mp => {
        const { pct, radarData } = computeMacroPillarData(mp, pillarPcts, responsesMap);
        const mat = maturityLabel(pct);
        const sorted = [...radarData].sort((a, b) => b.value - a.value);
        const strengths  = sorted.filter(d => d.value > 0).slice(0, 2);
        const weaknesses = sorted.filter(d => d.value < 100).slice(-2).reverse();

        return (
          <div key={mp.id} style={{
            border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden",
          }}>
            {/* En-tête */}
            <div style={{
              borderLeft: `4px solid ${mp.color}`,
              padding: "10px 14px",
              backgroundColor: "#FAFAFA",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 18 }}>{mp.emoji}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: R.dark, margin: "0 0 4px", fontFamily: "sans-serif" }}>
                  {mp.title}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, maxWidth: 160, height: 7, borderRadius: 4, backgroundColor: "#E2E8F0", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, backgroundColor: mp.color, borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: mp.color, fontFamily: "sans-serif" }}>{pct}%</span>
                  <span style={{ fontSize: 11, color: mat.color, fontFamily: "sans-serif" }}>{mat.label}</span>
                </div>
              </div>
            </div>

            {/* Corps : radar + barres */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "8px 0" }}>
              {/* Mini radar */}
              <div style={{ padding: "4px 8px" }}>
                <ResponsiveContainer width="100%" height={180}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="name" tick={{ fontSize: 9, fill: "#6b7280" }} />
                    <RTooltip formatter={(v: number) => [`${v}%`, "Score"]} contentStyle={{ fontSize: 10, borderRadius: 6, border: "1px solid #e5e7eb" }} />
                    <Radar name="Score" dataKey="value" stroke={mp.color} fill={mp.color} fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Barres par axe + points forts / à améliorer */}
              <div style={{ padding: "8px 12px 8px 4px", display: "flex", flexDirection: "column", gap: 3 }}>
                {radarData.map(d => (
                  <div key={d.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 1 }}>
                      <span style={{ fontSize: 9, color: "#6b7280", fontFamily: "sans-serif", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: mp.color, fontFamily: "sans-serif", flexShrink: 0, marginLeft: 4 }}>{d.value}%</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, backgroundColor: "#F1F5F9", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${d.value}%`, backgroundColor: mp.color, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}

                {strengths.length > 0 && (
                  <div style={{
                    marginTop: 6, borderRadius: 6, padding: "6px 8px",
                    backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0",
                  }}>
                    <p style={{ fontSize: 9, fontWeight: 700, color: "#15803d", margin: "0 0 3px", fontFamily: "sans-serif" }}>
                      ↑ Points forts
                    </p>
                    {strengths.map(s => (
                      <div key={s.name} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 9, color: "#374151", fontFamily: "sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 110 }}>{s.name}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#16a34a", fontFamily: "sans-serif", flexShrink: 0 }}>{s.value}%</span>
                      </div>
                    ))}
                  </div>
                )}

                {weaknesses.length > 0 && (
                  <div style={{
                    borderRadius: 6, padding: "6px 8px",
                    backgroundColor: "#fffbeb", border: "1px solid #fde68a",
                  }}>
                    <p style={{ fontSize: 9, fontWeight: 700, color: "#92400e", margin: "0 0 3px", fontFamily: "sans-serif" }}>
                      ↓ À améliorer
                    </p>
                    {weaknesses.map(w => (
                      <div key={w.name} style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 9, color: "#374151", fontFamily: "sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 110 }}>{w.name}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: "#d97706", fontFamily: "sans-serif", flexShrink: 0 }}>{w.value}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <AiBlock text={ai} label="Analyse Numérique Responsable" />
    </>
  );
}

// ─── Chapitre principal ────────────────────────────────────────────────────────

export function ChapterPlanete({ data, ai }: { data: ReportData; ai: AiAnalyses }) {
  type AnyItem = Record<string, unknown>;
  const diagScores = data.diagScores as unknown as AnyItem[];
  const envScores  = diagScores.filter((s) => s.categoryId === "ENV");
  const nrRaw      = data.nrData as { meta?: { certificationLabel?: string; certificationOther?: string | null }; responses?: Array<{ criterionId: string; checked: boolean }> } | null;
  const carbon     = data.carbon as Record<string, unknown> | null;
  const suppliers  = (data as any).suppliers as Array<Record<string, unknown>> ?? [];

  // Carbon
  const carbonFields = ["energie1","energie2","horsEnergie1","horsEnergie2",
    "intrantsBiens","intrantsServices","futursEmballages","fret","deplacements",
    "dechetsDirects","immobilisations","utilisation","finDeVie"];
  const carbonTotal = carbon ? carbonFields.reduce((a, k) => a + (carbon[k] != null ? Number(carbon[k]) : 0), 0) : 0;
  const s1 = carbon ? (["energie1","horsEnergie1"].reduce((a, k) => a + (carbon[k] != null ? Number(carbon[k]) : 0), 0)) : 0;
  const s2 = carbon ? (["energie2","horsEnergie2"].reduce((a, k) => a + (carbon[k] != null ? Number(carbon[k]) : 0), 0)) : 0;
  const s3 = carbon ? (["intrantsBiens","intrantsServices","futursEmballages","fret","deplacements","dechetsDirects","immobilisations","utilisation","finDeVie"].reduce((a, k) => a + (carbon[k] != null ? Number(carbon[k]) : 0), 0)) : 0;

  return (
    <ChapterWrapper num={4} title="Agir pour la planète">

      {/* 3 grands donuts ENV */}
      {envScores.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <AxisDonutReport categoryId="ENV" scores={diagScores as any} />
          </div>

          <SectionTitle>Diagnostic environnemental — Résultats détaillés</SectionTitle>
          <ExplainerText>
            Le diagnostic environnemental évalue la maturité de l'organisation sur l'ensemble des thématiques environnementales : gestion de l'énergie, réduction des émissions, protection des ressources naturelles, gestion des déchets et mobilité durable. Chaque sous-thème est noté de 0 à 100 % selon le niveau de pratiques observées.
          </ExplainerText>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 12,
          }}>
            {envScores.map((s) => (
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

          <AiBlock text={ai.diag_env ?? null} label="Analyse environnementale" />
        </>
      )}

      {/* Bilan carbone */}
      {carbonTotal > 0 && (
        <>
          <SectionTitle>Bilan carbone</SectionTitle>
          <ExplainerText>
            Le bilan carbone mesure et quantifie les émissions de gaz à effet de serre (GES) générées par les activités de l'organisation. Il constitue le point de départ indispensable de toute stratégie de réduction. Les données sont présentées par scope selon la méthodologie GHG Protocol : Scope 1 (émissions directes), Scope 2 (énergie indirecte) et Scope 3 (émissions indirectes tout au long de la chaîne de valeur).
          </ExplainerText>

          <KpiGrid items={[
            { label: "Émissions totales", value: `${Math.round(carbonTotal)}`, unit: "tCO₂e", color: "#f97316" },
            { label: "Scope 1", value: s1 > 0 ? `${Math.round(s1)}` : "—", unit: s1 > 0 ? "tCO₂e" : "", color: "#ef4444" },
            { label: "Scope 2", value: s2 > 0 ? `${Math.round(s2)}` : "—", unit: s2 > 0 ? "tCO₂e" : "", color: "#f97316" },
            { label: "Scope 3", value: s3 > 0 ? `${Math.round(s3)}` : "—", unit: s3 > 0 ? "tCO₂e" : "", color: "#eab308" },
          ]} />

          {carbonTotal > 0 && (
            <div style={{ margin: "12px 0 4px" }}>
              <div style={{ height: 24, borderRadius: 8, overflow: "hidden", display: "flex" }}>
                {s1 > 0 && (
                  <div style={{ width: `${(s1 / carbonTotal) * 100}%`, backgroundColor: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 10, color: "white", fontWeight: 700, fontFamily: "sans-serif" }}>{Math.round((s1 / carbonTotal) * 100)}%</span>
                  </div>
                )}
                {s2 > 0 && (
                  <div style={{ width: `${(s2 / carbonTotal) * 100}%`, backgroundColor: "#f97316", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 10, color: "white", fontWeight: 700, fontFamily: "sans-serif" }}>{Math.round((s2 / carbonTotal) * 100)}%</span>
                  </div>
                )}
                {s3 > 0 && (
                  <div style={{ width: `${(s3 / carbonTotal) * 100}%`, backgroundColor: "#eab308", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 10, color: "white", fontWeight: 700, fontFamily: "sans-serif" }}>{Math.round((s3 / carbonTotal) * 100)}%</span>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                {[{l:"Scope 1",c:"#ef4444"},{l:"Scope 2",c:"#f97316"},{l:"Scope 3",c:"#eab308"}].map(({l,c}) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c }} />
                    <span style={{ fontSize: 11, color: "#5B6878", fontFamily: "sans-serif" }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <AiBlock text={ai.carbon ?? null} label="Analyse du bilan carbone" />
        </>
      )}

      {/* Numérique Responsable — section complète */}
      <NrSection nrRaw={nrRaw} ai={ai.nr ?? null} />

    </ChapterWrapper>
  );
}
