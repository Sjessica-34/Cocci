import {
  ChapterWrapper, SectionTitle, ExplainerText, AiBlock, ReportTable, R, KpiGrid,
  SCORE_COLOR, MATURITY_LABEL, MATURITY_STYLE,
} from "./_shared";
import type { ReportData } from "../useReportData";
import type { AiAnalyses } from "../useReportAI";

// ─── Matrice de matérialité (SVG statique, identique à TabMatriceViz) ──────────

const SVG_W = 500, SVG_H = 420;
const PAD   = { top: 30, right: 30, bottom: 50, left: 50 };
const PW    = SVG_W - PAD.left - PAD.right;
const PH    = SVG_H - PAD.top - PAD.bottom;
function px(v: number) { return PAD.left + ((v - 1) / 4) * PW; }
function py(v: number) { return PAD.top  + PH - ((v - 1) / 4) * PH; }

const CAT_COLORS: Record<string, string> = {
  "Changements climatiques": "#14b8a6", "Biodiversité": "#22c55e",
  "Communication / Marketing": "#f97316", "Pratiques responsables des affaires": "#6366f1",
  "Diversité, égalité et inclusion": "#ec4899", "Santé et sécurité": "#ef4444",
  "Économie circulaire": "#84cc16", "Bien-être et vie quotidienne": "#8b5cf6",
  "Excellence opérationnelle": "#3b82f6", "Création de valeur locale": "#f59e0b",
  "Patrimoine et ancrage territorial": "#10b981",
};

function MatriceStatique({ issues, top12Keys }: {
  issues: Array<Record<string, unknown>>;
  top12Keys: Set<string>;
}) {
  const rated = issues.filter((i) => i.stakeholderScore != null && i.companyScore != null);
  if (rated.length === 0) return null;
  const categories = [...new Set(rated.map((i) => i.category as string))];

  return (
    <div>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%" style={{ maxHeight: 420, display: "block" }}>
        {/* Quadrant backgrounds */}
        <rect x={PAD.left} y={PAD.top} width={PW / 2} height={PH / 2} fill="#f8fafc" />
        <rect x={PAD.left + PW / 2} y={PAD.top} width={PW / 2} height={PH / 2} fill="#f0fdf4" />
        <rect x={PAD.left} y={PAD.top + PH / 2} width={PW / 2} height={PH / 2} fill="#fef9f0" />
        <rect x={PAD.left + PW / 2} y={PAD.top + PH / 2} width={PW / 2} height={PH / 2} fill="#fef2f2" />

        {/* Quadrant labels */}
        <text x={PAD.left + 6} y={PAD.top + 14} fontSize={8} fill="#94a3b8">Enjeux secondaires</text>
        <text x={PAD.left + PW / 2 + 6} y={PAD.top + 14} fontSize={8} fill="#16a34a">Enjeux stratégiques</text>
        <text x={PAD.left + 6} y={PAD.top + PH - 6} fontSize={8} fill="#94a3b8">Faible importance</text>
        <text x={PAD.left + PW / 2 + 6} y={PAD.top + PH - 6} fontSize={8} fill="#d97706">Enjeux à surveiller</text>

        {/* Grid */}
        {[1, 2, 3, 4, 5].map((v) => (
          <g key={v}>
            <line x1={px(v)} y1={PAD.top} x2={px(v)} y2={PAD.top + PH} stroke="#e2e8f0" strokeWidth={0.5} />
            <line x1={PAD.left} y1={py(v)} x2={PAD.left + PW} y2={py(v)} stroke="#e2e8f0" strokeWidth={0.5} />
            <text x={px(v)} y={PAD.top + PH + 14} textAnchor="middle" fontSize={9} fill="#94a3b8">{v}</text>
            <text x={PAD.left - 10} y={py(v)} textAnchor="middle" dominantBaseline="middle" fontSize={9} fill="#94a3b8">{v}</text>
          </g>
        ))}
        <line x1={px(3)} y1={PAD.top} x2={px(3)} y2={PAD.top + PH} stroke="#cbd5e1" strokeWidth={1.5} />
        <line x1={PAD.left} y1={py(3)} x2={PAD.left + PW} y2={py(3)} stroke="#cbd5e1" strokeWidth={1.5} />

        {/* Axis labels */}
        <text x={PAD.left + PW / 2} y={SVG_H - 8} textAnchor="middle" fontSize={10} fill="#475569" fontWeight={600}>
          Importance pour les parties prenantes →
        </text>
        <text x={14} y={PAD.top + PH / 2} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="#475569" fontWeight={600}
          transform={`rotate(-90, 14, ${PAD.top + PH / 2})`}>
          Importance pour l'entreprise →
        </text>

        {/* Points */}
        {rated.map((item, idx) => {
          const cx = px(item.stakeholderScore as number);
          const cy = py(item.companyScore as number);
          const color = CAT_COLORS[item.category as string] ?? "#94a3b8";
          const isPriority = top12Keys.has(item.key as string);
          return (
            <g key={idx}>
              {isPriority && <circle cx={cx} cy={cy} r={15} fill="none" stroke={color} strokeWidth={1.5} opacity={0.6} />}
              <circle cx={cx} cy={cy} r={isPriority ? 8 : 5} fill={color} opacity={isPriority ? 0.9 : 0.5} />
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {categories.map((cat) => (
          <div key={cat} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: CAT_COLORS[cat] ?? "#94a3b8" }} />
            <span style={{ fontSize: 10, color: "#64748b", fontFamily: "sans-serif" }}>{cat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chapitre ─────────────────────────────────────────────────────────────────

export function ChapterDemarcheRSE({ data, ai }: { data: ReportData; ai: AiAnalyses }) {
  const draft = data.draft as Record<string, unknown> | null;
  const scope = draft?.reportScope as string | null;
  const methodology = draft?.reportMethodology as string | null;

  // Issues pour la matrice
  type AnyItem = Record<string, unknown>;
  const issues = data.issues as unknown as AnyItem[];
  const ratedIssues = issues.filter((i) => i.stakeholderScore != null && i.companyScore != null);
  const sorted = [...ratedIssues].sort((a, b) =>
    ((b.stakeholderScore as number) + (b.companyScore as number)) - ((a.stakeholderScore as number) + (a.companyScore as number))
  );
  const top12Keys = new Set(sorted.slice(0, 12).map((i) => i.key as string));
  const issueAI = data.issueAI as Record<string, unknown> | null;

  // Parties prenantes
  const stakeholders = data.stakeholders as unknown as AnyItem[];

  // Biodiversité
  const bioDeps = data.bioDeps as unknown as AnyItem[];
  const bioByZone = bioDeps.reduce<Record<string, Array<Record<string, unknown>>>>((acc, b) => {
    const zone = (b.chainPosition as string) ?? "Non renseigné";
    if (!acc[zone]) acc[zone] = [];
    acc[zone].push(b);
    return acc;
  }, {});

  // Filiales
  const orgs = (data.orgs as Array<Record<string, unknown>>) ?? [];

  return (
    <ChapterWrapper num={3} title="Notre démarche RSE">

      {/* Politique RSE */}
      <SectionTitle>Politique RSE</SectionTitle>
      <ExplainerText>
        La politique RSE de l'organisation exprime ses engagements et orientations stratégiques en matière de Responsabilité Sociétale des Entreprises. Elle constitue le fil conducteur de la démarche RSE et reflète les valeurs de l'organisation vis-à-vis de ses parties prenantes, de son territoire et de l'environnement.
      </ExplainerText>

      {/* Méthodologie */}
      <SectionTitle>Méthodologie</SectionTitle>
      <ExplainerText>
        Le présent rapport a été élaboré à partir des données renseignées et collectées au sein de la plateforme Cocci. Il repose sur une méthodologie simplifiée destinée à structurer et valoriser la démarche RSE dans une logique de pilotage et d'amélioration continue. Les informations présentées ne constituent pas un reporting réglementaire au sens de la CSRD, des ESRS, de la GRI ou de tout autre cadre normatif.
      </ExplainerText>
      {methodology && (
        <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, fontFamily: "sans-serif" }}>{methodology}</p>
      )}

      {/* Périmètre */}
      <SectionTitle>Périmètre du rapport</SectionTitle>
      <ExplainerText>
        Le périmètre du rapport définit les entités, activités, sites et périodes couverts par la démarche de reporting RSE. Il garantit une lecture transparente des informations présentées et permet de comprendre précisément le champ d'application des données et des indicateurs.
      </ExplainerText>
      {scope && <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, fontFamily: "sans-serif" }}>{scope}</p>}
      {orgs.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {orgs.map((o, i) => (
            <span key={i} style={{
              backgroundColor: "#F0FDF4", border: "1px solid #86EFAC",
              borderRadius: 6, padding: "4px 10px",
              fontSize: 12, color: R.green, fontFamily: "sans-serif",
            }}>
              {o.name as string}
            </span>
          ))}
        </div>
      )}

      {/* Parties prenantes */}
      {stakeholders.length > 0 && (
        <>
          <SectionTitle>Parties prenantes</SectionTitle>
          <ExplainerText>
            Les parties prenantes regroupent l'ensemble des acteurs qui influencent les activités de l'organisation ou sont influencés par celles-ci. Leur identification permet de mieux comprendre leurs attentes et d'intégrer leurs enjeux dans la stratégie RSE.
          </ExplainerText>
          <KpiGrid items={[
            { label: "Parties prenantes", value: String(stakeholders.length), unit: "cartographiées", color: R.green },
            {
              label: "Catégories",
              value: String([...new Set(stakeholders.map(s => s.category as string).filter(Boolean))].length),
              color: "#3b82f6",
            },
          ]} />
          <ReportTable
            headers={["Partie prenante", "Catégorie", "Influence", "Intérêt"]}
            rows={stakeholders.slice(0, 15).map((s) => [
              s.name as string ?? "—",
              s.category as string ?? "—",
              `${s.influence ?? "—"}/5`,
              `${s.interest ?? "—"}/5`,
            ])}
            widths={["35%", "30%", "17%", "18%"]}
          />
          <AiBlock text={ai.stakeholders ?? null} label="Analyse des parties prenantes" />
        </>
      )}

      {/* Matrice de matérialité */}
      <SectionTitle>Identification des super-enjeux stratégiques</SectionTitle>
      <ExplainerText>
        L'identification des enjeux permet de recenser les thématiques environnementales, sociales et de gouvernance les plus pertinentes pour l'organisation et ses parties prenantes. La matrice de matérialité facilite leur hiérarchisation en fonction de leur importance stratégique et de leur niveau d'impact, afin de concentrer les efforts sur les enjeux prioritaires.
      </ExplainerText>

      {ratedIssues.length > 0 && (
        <MatriceStatique issues={issues} top12Keys={top12Keys} />
      )}

      {/* Super-enjeux IA */}
      {issueAI && (issueAI.superIssues as Array<Record<string, unknown>>)?.length > 0 && (
        <>
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: R.dark, marginBottom: 10, fontFamily: "sans-serif" }}>
              Super-enjeux stratégiques identifiés par l'IA
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {(issueAI.superIssues as Array<Record<string, unknown>>).map((si, i) => (
                <div key={i} style={{
                  backgroundColor: ["#EFF6FF","#F5F3FF","#FFF7ED","#FDF2F8"][i] ?? "#F0FDF4",
                  border: `1px solid ${["#BFDBFE","#DDD6FE","#FDE68A","#F9A8D4"][i] ?? "#86EFAC"}`,
                  borderRadius: 10, padding: 14,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: "50%",
                      backgroundColor: ["#3b82f6","#8b5cf6","#f59e0b","#ec4899"][i] ?? R.green,
                      color: "white", fontSize: 11, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "sans-serif",
                    }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: R.dark, fontFamily: "sans-serif" }}>
                      {si.title as string}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: "#374151", lineHeight: 1.5, margin: 0, fontFamily: "sans-serif" }}>
                    {si.summary as string}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <AiBlock text={ai.materiality ?? null} label="Analyse des enjeux prioritaires" />

      {/* Biodiversité */}
      {bioDeps.length > 0 && (
        <>
          <SectionTitle>Dépendances à la biodiversité</SectionTitle>
          <ExplainerText>
            L'analyse des dépendances à la biodiversité permet d'identifier les ressources naturelles, les écosystèmes et les activités dont dépend l'organisation pour exercer ses activités. Cette cartographie facilite la compréhension des interactions avec le vivant et constitue un outil d'aide à la décision pour préserver les services écosystémiques.
          </ExplainerText>
          <KpiGrid items={[
            { label: "Dépendances identifiées", value: String(bioDeps.length), color: "#22c55e" },
            { label: "Catégories", value: String([...new Set(bioDeps.map(b => b.category as string).filter(Boolean))].length), color: "#14b8a6" },
          ]} />

          {/* Table par zone */}
          {Object.entries(bioByZone).map(([zone, items]) => (
            <div key={zone}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#475569", margin: "12px 0 6px", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Zone : {zone}
              </p>
              <ReportTable
                headers={["Élément", "Catégorie", "Sous-type"]}
                rows={items.map((b) => [b.name as string ?? "—", b.category as string ?? "—", b.subCategory as string ?? "—"])}
                widths={["40%", "35%", "25%"]}
              />
            </div>
          ))}
          <AiBlock text={ai.biodiversity ?? null} label="Analyse des dépendances à la biodiversité" />
        </>
      )}
    </ChapterWrapper>
  );
}
