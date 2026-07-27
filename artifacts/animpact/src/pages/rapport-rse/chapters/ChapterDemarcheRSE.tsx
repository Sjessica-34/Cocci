import {
  ChapterWrapper, SectionTitle, ExplainerText, AiBlock, ReportTable, R, KpiGrid,
} from "./_shared";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { ReportData } from "../useReportData";
import type { AiAnalyses } from "../useReportAI";

// ─── Matrice de matérialité (SVG statique) ─────────────────────────────────────

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
        <rect x={PAD.left} y={PAD.top} width={PW / 2} height={PH / 2} fill="#f8fafc" />
        <rect x={PAD.left + PW / 2} y={PAD.top} width={PW / 2} height={PH / 2} fill="#f0fdf4" />
        <rect x={PAD.left} y={PAD.top + PH / 2} width={PW / 2} height={PH / 2} fill="#fef9f0" />
        <rect x={PAD.left + PW / 2} y={PAD.top + PH / 2} width={PW / 2} height={PH / 2} fill="#fef2f2" />
        <text x={PAD.left + 6} y={PAD.top + 14} fontSize={8} fill="#94a3b8">Enjeux secondaires</text>
        <text x={PAD.left + PW / 2 + 6} y={PAD.top + 14} fontSize={8} fill="#16a34a">Enjeux stratégiques</text>
        <text x={PAD.left + 6} y={PAD.top + PH - 6} fontSize={8} fill="#94a3b8">Faible importance</text>
        <text x={PAD.left + PW / 2 + 6} y={PAD.top + PH - 6} fontSize={8} fill="#d97706">Enjeux à surveiller</text>
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
        <text x={PAD.left + PW / 2} y={SVG_H - 8} textAnchor="middle" fontSize={10} fill="#475569" fontWeight={600}>
          Importance pour les parties prenantes →
        </text>
        <text x={14} y={PAD.top + PH / 2} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="#475569" fontWeight={600}
          transform={`rotate(-90, 14, ${PAD.top + PH / 2})`}>
          Importance pour l'entreprise →
        </text>
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

// ─── Cartographie des enjeux biodiversité (SVG statique 5×5) ──────────────────

const BIO_SVG_W = 420, BIO_SVG_H = 360;
const BPAD = { top: 25, right: 20, bottom: 48, left: 48 };
const BPW  = BIO_SVG_W - BPAD.left - BPAD.right;
const BPH  = BIO_SVG_H - BPAD.top - BPAD.bottom;
function bpx(v: number) { return BPAD.left + ((v - 1) / 4) * BPW; }
function bpy(v: number) { return BPAD.top  + BPH - ((v - 1) / 4) * BPH; }

const CHAIN_COLORS: Record<string, string> = {
  "amont": "#3b82f6", "in-situ": "#10b981", "aval": "#8b5cf6",
};
const CHAIN_LABELS: Record<string, string> = {
  "amont": "Amont", "in-situ": "In situ", "aval": "Aval",
};

function BioIssuesMatrix({ issues }: { issues: Array<Record<string, unknown>> }) {
  const rated = issues.filter(i => i.importanceBio != null && i.importanceOrg != null);
  if (rated.length === 0) return null;

  const chains = [...new Set(rated.map(i => i.chainPosition as string).filter(Boolean))];

  return (
    <div>
      <svg viewBox={`0 0 ${BIO_SVG_W} ${BIO_SVG_H}`} width="100%" style={{ maxHeight: 360, display: "block" }}>
        {/* Quadrant backgrounds */}
        <rect x={BPAD.left} y={BPAD.top} width={BPW / 2} height={BPH / 2} fill="#f0fdf4" opacity={0.6} />
        <rect x={BPAD.left + BPW / 2} y={BPAD.top} width={BPW / 2} height={BPH / 2} fill="#fef2f2" opacity={0.6} />
        <rect x={BPAD.left} y={BPAD.top + BPH / 2} width={BPW / 2} height={BPH / 2} fill="#f8fafc" opacity={0.6} />
        <rect x={BPAD.left + BPW / 2} y={BPAD.top + BPH / 2} width={BPW / 2} height={BPH / 2} fill="#fff7ed" opacity={0.6} />

        {/* Quadrant labels */}
        <text x={BPAD.left + 5} y={BPAD.top + 13} fontSize={7.5} fill="#94a3b8">Faible</text>
        <text x={BPAD.left + BPW / 2 + 5} y={BPAD.top + 13} fontSize={7.5} fill="#dc2626">Critique</text>
        <text x={BPAD.left + BPW / 2 + 5} y={BPAD.top + BPH - 5} fontSize={7.5} fill="#ea580c">À surveiller</text>

        {/* Grid */}
        {[1, 2, 3, 4, 5].map((v) => (
          <g key={v}>
            <line x1={bpx(v)} y1={BPAD.top} x2={bpx(v)} y2={BPAD.top + BPH} stroke="#e2e8f0" strokeWidth={0.5} />
            <line x1={BPAD.left} y1={bpy(v)} x2={BPAD.left + BPW} y2={bpy(v)} stroke="#e2e8f0" strokeWidth={0.5} />
            <text x={bpx(v)} y={BPAD.top + BPH + 13} textAnchor="middle" fontSize={8.5} fill="#94a3b8">{v}</text>
            <text x={BPAD.left - 8} y={bpy(v)} textAnchor="middle" dominantBaseline="middle" fontSize={8.5} fill="#94a3b8">{v}</text>
          </g>
        ))}
        <line x1={bpx(3)} y1={BPAD.top} x2={bpx(3)} y2={BPAD.top + BPH} stroke="#cbd5e1" strokeWidth={1.5} />
        <line x1={BPAD.left} y1={bpy(3)} x2={BPAD.left + BPW} y2={bpy(3)} stroke="#cbd5e1" strokeWidth={1.5} />

        {/* Axis labels */}
        <text x={BPAD.left + BPW / 2} y={BIO_SVG_H - 6} textAnchor="middle" fontSize={9.5} fill="#475569" fontWeight={600}>
          Importance pour la biodiversité →
        </text>
        <text x={12} y={BPAD.top + BPH / 2} textAnchor="middle" dominantBaseline="middle" fontSize={9.5} fill="#475569" fontWeight={600}
          transform={`rotate(-90, 12, ${BPAD.top + BPH / 2})`}>
          Importance pour l'organisation →
        </text>

        {/* Points */}
        {rated.map((iss, idx) => {
          const cx = bpx(iss.importanceBio as number);
          const cy = bpy(iss.importanceOrg as number);
          const color = CHAIN_COLORS[iss.chainPosition as string] ?? "#94a3b8";
          const isCritical = (iss.importanceBio as number) >= 3 && (iss.importanceOrg as number) >= 3;
          return (
            <g key={idx}>
              {isCritical && <circle cx={cx} cy={cy} r={13} fill="none" stroke={color} strokeWidth={1.5} opacity={0.5} />}
              <circle cx={cx} cy={cy} r={isCritical ? 7 : 5} fill={color} opacity={0.8} />
            </g>
          );
        })}
      </svg>

      {/* Légende */}
      {chains.length > 0 && (
        <div style={{ display: "flex", gap: 16, marginTop: 6, flexWrap: "wrap" }}>
          {chains.map(c => (
            <div key={c} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: CHAIN_COLORS[c] ?? "#94a3b8" }} />
              <span style={{ fontSize: 10, color: "#64748b", fontFamily: "sans-serif" }}>
                {CHAIN_LABELS[c] ?? c}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Cartographie visuelle des dépendances ─────────────────────────────────────

const DEP_LEVEL_LABELS = ["—", "Très faible", "Faible", "Modérée", "Élevée", "Critique"];
const DEP_LEVEL_COLORS = ["#94a3b8", "#22c55e", "#84cc16", "#facc15", "#f97316", "#ef4444"];
const CHAIN_CFG: Record<string, { label: string; icon: string; color: string; bg: string; border: string }> = {
  "amont":   { label: "Amont",   icon: "🏭", color: "#0284c7", bg: "#eff6ff", border: "#bfdbfe" },
  "in-situ": { label: "In situ", icon: "🌿", color: "#16a34a", bg: "#f0fdf4", border: "#86efac" },
  "aval":    { label: "Aval",    icon: "📦", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
};

function CartoDependances({ deps }: { deps: Array<Record<string, unknown>> }) {
  if (deps.length === 0) return null;
  const zones = ["amont", "in-situ", "aval"] as const;
  const byZone = deps.reduce<Record<string, Array<Record<string, unknown>>>>((acc, d) => {
    const z = (d.chainPosition as string) ?? "amont";
    if (!acc[z]) acc[z] = [];
    acc[z].push(d);
    return acc;
  }, {});

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
      {zones.map(zone => {
        const cfg = CHAIN_CFG[zone];
        const items = byZone[zone] ?? [];
        return (
          <div key={zone} style={{
            border: `1px solid ${cfg.border}`, borderRadius: 10,
            backgroundColor: cfg.bg, overflow: "hidden",
          }}>
            {/* Header zone */}
            <div style={{
              backgroundColor: cfg.color, color: "white",
              padding: "8px 12px", display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontSize: 14 }}>{cfg.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "sans-serif" }}>
                {cfg.label}
              </span>
              <span style={{
                marginLeft: "auto", fontSize: 11, fontFamily: "sans-serif",
                backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 10, padding: "1px 7px",
              }}>
                {items.length}
              </span>
            </div>

            {/* Dépendances */}
            <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              {items.length === 0 && (
                <p style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", fontFamily: "sans-serif", margin: 0 }}>
                  Aucune dépendance
                </p>
              )}
              {items.map((dep, i) => {
                const level = dep.dependencyLevel as number ?? 0;
                const lColor = DEP_LEVEL_COLORS[level] ?? "#94a3b8";
                return (
                  <div key={i} style={{
                    backgroundColor: "white", borderRadius: 7,
                    border: `1px solid ${cfg.border}`, padding: "7px 10px",
                  }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", margin: "0 0 3px", fontFamily: "sans-serif" }}>
                      {String(dep.name ?? "—")}
                    </p>
                    <p style={{ fontSize: 10, color: "#64748b", margin: "0 0 5px", fontFamily: "sans-serif" }}>
                      {String(dep.category ?? "")}
                      {dep.subCategory ? ` › ${String(dep.subCategory)}` : ""}
                    </p>
                    {level > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ display: "flex", gap: 2 }}>
                          {[1,2,3,4,5].map(n => (
                            <div key={n} style={{
                              width: 8, height: 8, borderRadius: 2,
                              backgroundColor: n <= level ? lColor : "#e2e8f0",
                            }} />
                          ))}
                        </div>
                        <span style={{ fontSize: 10, color: lColor, fontWeight: 600, fontFamily: "sans-serif" }}>
                          {DEP_LEVEL_LABELS[level]}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Chapitre ─────────────────────────────────────────────────────────────────

const CHART_COLORS = ["#10b981","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316"];
const POSITION_COLORS: Record<string, string> = { "amont": "#3b82f6", "in-situ": "#10b981", "aval": "#8b5cf6" };
const DEP_LEVEL_BAR_COLORS = ["#22c55e","#84cc16","#facc15","#f97316","#ef4444"];

export function ChapterDemarcheRSE({ data, ai }: { data: ReportData; ai: AiAnalyses }) {
  const draft = data.draft as Record<string, unknown> | null;
  const scope = draft?.reportScope as string | null;
  const methodology = draft?.reportMethodology as string | null;

  type AnyItem = Record<string, unknown>;
  const issues = data.issues as unknown as AnyItem[];
  const ratedIssues = issues.filter((i) => i.stakeholderScore != null && i.companyScore != null);
  const sorted = [...ratedIssues].sort((a, b) =>
    ((b.stakeholderScore as number) + (b.companyScore as number)) - ((a.stakeholderScore as number) + (a.companyScore as number))
  );
  const top12Keys = new Set(sorted.slice(0, 12).map((i) => i.key as string));
  const issueAI = data.issueAI as Record<string, unknown> | null;
  const stakeholders = data.stakeholders as unknown as AnyItem[];
  const bioDeps = data.bioDeps as unknown as AnyItem[];
  const bioIssues = (data as any).bioIssues as unknown as AnyItem[] ?? [];
  const orgs = (data.orgs as Array<Record<string, unknown>>) ?? [];

  // Statistiques biodiversité
  const posMap: Record<string, number> = { amont: 0, "in-situ": 0, aval: 0 };
  for (const d of bioDeps) { posMap[(d.chainPosition as string) ?? "amont"] = (posMap[(d.chainPosition as string) ?? "amont"] ?? 0) + 1; }
  const posData = Object.entries(posMap)
    .map(([name, value]) => ({ name: CHAIN_LABELS[name] ?? name, value, fill: POSITION_COLORS[name] ?? "#94a3b8" }))
    .filter(d => d.value > 0);

  const depLevelMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const d of bioDeps) { const l = d.dependencyLevel as number; if (l) depLevelMap[l] = (depLevelMap[l] ?? 0) + 1; }
  const depLevelData = [1, 2, 3, 4, 5].map(n => ({ name: `Niv. ${n}`, value: depLevelMap[n] ?? 0 })).filter(d => d.value > 0);

  const catMap: Record<string, number> = {};
  for (const d of bioDeps) { const c = (d.category as string) ?? "Autre"; catMap[c] = (catMap[c] ?? 0) + 1; }
  const catData = Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const critDeps = bioDeps.filter(d => (d.dependencyLevel as number ?? 0) >= 4);

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
        Le présent rapport a été élaboré à partir des données renseignées et collectées au sein de la plateforme Cocci. Il repose sur une méthodologie simplifiée destinée à structurer et valoriser la démarche RSE de l'organisation, dans une logique de pilotage et d'amélioration continue. Les informations présentées ne constituent pas un reporting réglementaire et, sauf mention contraire, ce rapport n'est pas établi conformément aux exigences de référentiels tels que la CSRD, les ESRS, la GRI ou tout autre cadre normatif.
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
            { label: "Catégories", value: String([...new Set(stakeholders.map(s => s.category as string).filter(Boolean))].length), color: "#3b82f6" },
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

      {issueAI && (issueAI.superIssues as Array<Record<string, unknown>>)?.length > 0 && (
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
      )}

      <AiBlock text={ai.materiality ?? null} label="Analyse des enjeux prioritaires" />

      {/* ── BIODIVERSITÉ ──────────────────────────────────────────────────────── */}
      {bioDeps.length > 0 && (
        <>
          <SectionTitle>Dépendances à la biodiversité</SectionTitle>
          <ExplainerText>
            L'analyse des dépendances à la biodiversité permet d'identifier les ressources naturelles, les écosystèmes, les acteurs et les activités dont dépend l'organisation pour exercer ses activités. Cette cartographie facilite la compréhension des interactions avec le vivant et constitue un outil d'aide à la décision pour mieux anticiper les risques, préserver les services écosystémiques et renforcer la résilience de l'organisation.
          </ExplainerText>
          <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, fontFamily: "sans-serif" }}>
            Les principales dépendances de l'organisation à la biodiversité sont présentées ci-dessous, selon leur nature et leur position au sein de la chaîne de valeur.
          </p>

          <KpiGrid items={[
            { label: "Dépendances identifiées", value: String(bioDeps.length), color: "#22c55e" },
            { label: "Dépendances critiques", value: String(critDeps.length), unit: "niv. ≥ 4", color: "#ef4444" },
            { label: "Catégories", value: String(Object.keys(catMap).length), color: "#14b8a6" },
          ]} />

          {/* Cartographie visuelle des dépendances par zone */}
          <p style={{ fontSize: 12, fontWeight: 700, color: "#475569", margin: "4px 0 8px", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Cartographie des dépendances par zone de chaîne de valeur
          </p>
          <CartoDependances deps={bioDeps} />

          {/* Graphiques de distribution */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
            {posData.length > 0 && (
              <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 6px" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: R.dark, margin: "0 0 6px 6px", fontFamily: "sans-serif" }}>
                  Répartition Amont / In situ / Aval
                </p>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={posData}
                      cx="50%" cy="50%"
                      outerRadius={65}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {posData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v}`, "dépendances"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {depLevelData.length > 0 && (
              <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 6px" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: R.dark, margin: "0 0 6px 6px", fontFamily: "sans-serif" }}>
                  Distribution des niveaux de dépendance
                </p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={depLevelData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => [v, "dépendances"]} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {depLevelData.map((_, i) => <Cell key={i} fill={DEP_LEVEL_BAR_COLORS[i] ?? "#94a3b8"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {catData.length > 1 && (
            <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 6px", marginTop: 4 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: R.dark, margin: "0 0 6px 6px", fontFamily: "sans-serif" }}>
                Répartition par catégorie
              </p>
              <ResponsiveContainer width="100%" height={Math.max(140, catData.length * 28)}>
                <BarChart data={catData} layout="vertical" margin={{ left: 6, right: 24 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => [v, "dépendances"]} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {catData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* ── ENJEUX BIODIVERSITÉ ────────────────────────────────────────────────── */}
      {bioIssues.length > 0 && (
        <>
          <SectionTitle>Cartographie des enjeux biodiversité</SectionTitle>
          <ExplainerText>
            La cartographie des enjeux permet de hiérarchiser les principaux enjeux identifiés au regard de leur importance et de leur position dans la chaîne de valeur. Elle offre une vision synthétique des priorités de l'organisation et facilite la définition des actions à mettre en œuvre dans le cadre de sa démarche RSE et biodiversité.
          </ExplainerText>
          <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, fontFamily: "sans-serif" }}>
            Les enjeux identifiés sont présentés ci-dessous selon leur niveau de priorité et leur position au sein de la chaîne de valeur.
          </p>

          <BioIssuesMatrix issues={bioIssues} />

          {/* Liste des enjeux critiques */}
          {bioIssues.filter(i => (i.importanceBio as number ?? 0) >= 3 && (i.importanceOrg as number ?? 0) >= 3).length > 0 && (
            <>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#475569", margin: "12px 0 6px", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Enjeux prioritaires
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {bioIssues
                  .filter(i => (i.importanceBio as number ?? 0) >= 3 && (i.importanceOrg as number ?? 0) >= 3)
                  .slice(0, 8)
                  .map((iss, i) => (
                    <div key={i} style={{
                      border: "1px solid #fca5a5", borderRadius: 8,
                      backgroundColor: "#fef2f2", padding: "8px 12px",
                      display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                    }}>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", margin: 0, fontFamily: "sans-serif" }}>
                          {String(iss.name ?? iss.title ?? "—")}
                        </p>
                        {iss.category != null && (
                          <p style={{ fontSize: 10, color: "#64748b", margin: "2px 0 0", fontFamily: "sans-serif" }}>
                            {String(iss.category)}
                            {iss.chainPosition ? ` · ${CHAIN_LABELS[iss.chainPosition as string] ?? String(iss.chainPosition)}` : ""}
                          </p>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "sans-serif" }}>Bio</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626", fontFamily: "sans-serif" }}>
                            {String(iss.importanceBio ?? "—")}/5
                          </div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "sans-serif" }}>Org.</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626", fontFamily: "sans-serif" }}>
                            {String(iss.importanceOrg ?? "—")}/5
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </>
      )}

      {(bioDeps.length > 0 || bioIssues.length > 0) && (
        <AiBlock text={ai.biodiversity ?? null} label="Analyse des dépendances à la biodiversité" />
      )}
    </ChapterWrapper>
  );
}
