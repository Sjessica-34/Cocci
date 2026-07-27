import {
  ChapterWrapper, SectionTitle, ExplainerText, AiBlock, ReportTable, KpiGrid,
  ScoreDonut, AxisDonutReport, R, SCORE_COLOR,
} from "./_shared";
import type { ReportData } from "../useReportData";
import type { AiAnalyses } from "../useReportAI";

export function ChapterPlanete({ data, ai }: { data: ReportData; ai: AiAnalyses }) {
  type AnyItem = Record<string, unknown>;
  const diagScores = data.diagScores as unknown as AnyItem[];
  const envScores  = diagScores.filter((s) => s.categoryId === "ENV");
  const nr         = data.nrData as Record<string, unknown> | null;
  const carbon     = data.carbon as Record<string, unknown> | null;
  const suppliers  = (data as any).suppliers as Array<Record<string, unknown>> ?? [];

  // Carbon total
  const carbonFields = ["energie1","energie2","horsEnergie1","horsEnergie2",
    "intrantsBiens","intrantsServices","futursEmballages","fret","deplacements",
    "dechetsDirects","immobilisations","utilisation","finDeVie"];
  const carbonTotal = carbon
    ? carbonFields.reduce((a, k) => a + (carbon[k] != null ? Number(carbon[k]) : 0), 0)
    : 0;
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

          {/* Grille de donuts par sous-catégorie */}
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

          {/* Barre visuelle des scopes */}
          {carbonTotal > 0 && (
            <div style={{ margin: "12px 0 4px" }}>
              <div style={{ height: 24, borderRadius: 8, overflow: "hidden", display: "flex" }}>
                {s1 > 0 && (
                  <div style={{
                    width: `${(s1 / carbonTotal) * 100}%`,
                    backgroundColor: "#ef4444",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ fontSize: 10, color: "white", fontWeight: 700, fontFamily: "sans-serif" }}>
                      {Math.round((s1 / carbonTotal) * 100)}%
                    </span>
                  </div>
                )}
                {s2 > 0 && (
                  <div style={{
                    width: `${(s2 / carbonTotal) * 100}%`,
                    backgroundColor: "#f97316",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ fontSize: 10, color: "white", fontWeight: 700, fontFamily: "sans-serif" }}>
                      {Math.round((s2 / carbonTotal) * 100)}%
                    </span>
                  </div>
                )}
                {s3 > 0 && (
                  <div style={{
                    width: `${(s3 / carbonTotal) * 100}%`,
                    backgroundColor: "#eab308",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ fontSize: 10, color: "white", fontWeight: 700, fontFamily: "sans-serif" }}>
                      {Math.round((s3 / carbonTotal) * 100)}%
                    </span>
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

      {/* Numérique Responsable */}
      {nr && (
        <>
          <SectionTitle>Numérique responsable</SectionTitle>
          <ExplainerText>
            Le numérique responsable vise à réduire l'empreinte environnementale, sociale et économique des usages numériques au sein de l'organisation. Il couvre des pratiques telles que l'allongement de la durée de vie des équipements, la réduction de la consommation d'énergie numérique, l'accessibilité des services digitaux et la gestion des déchets électroniques (DEEE).
          </ExplainerText>

          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            <ScoreDonut
              score={(nr.score as number) ?? null}
              label="Score NR"
              size={130}
              innerRadius={38}
              outerRadius={52}
            />
            <div style={{ flex: 1 }}>
              {nr.certificationLabel != null && (
                <div style={{
                  backgroundColor: R.greenBg, border: `1px solid ${R.greenBorder}`,
                  borderRadius: 8, padding: "8px 14px", marginBottom: 8,
                  display: "inline-block",
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: R.green, fontFamily: "sans-serif" }}>
                    Niveau : {String(nr.certificationLabel)}
                  </span>
                </div>
              )}
              <AiBlock text={ai.nr ?? null} label="Analyse NR" />
            </div>
          </div>
        </>
      )}

      {/* Achats responsables */}
      {suppliers.length > 0 && (
        <>
          <SectionTitle>Achats &amp; fournisseurs responsables</SectionTitle>
          <ExplainerText>
            La politique d'achats responsables vise à intégrer des critères environnementaux, sociaux et de gouvernance dans la sélection et l'évaluation des fournisseurs. Elle contribue à la réduction des impacts indirects de l'organisation tout au long de sa chaîne d'approvisionnement.
          </ExplainerText>
          <KpiGrid items={[
            { label: "Fournisseurs référencés", value: String(suppliers.length), color: "#8b5cf6" },
            { label: "Évalués RSE", value: String(suppliers.filter(s => s.rsePolicy || s.evalComments).length), color: R.green },
            { label: "Certifiés", value: String(suppliers.filter(s => s.certifications).length), color: "#3b82f6" },
          ]} />
        </>
      )}
    </ChapterWrapper>
  );
}
