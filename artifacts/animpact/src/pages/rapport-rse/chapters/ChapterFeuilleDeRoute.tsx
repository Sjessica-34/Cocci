import {
  ChapterWrapper, SectionTitle, ExplainerText, AiBlock, KpiGrid, R,
} from "./_shared";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { ReportData } from "../useReportData";
import type { AiAnalyses } from "../useReportAI";

// ─── Constantes partagées ─────────────────────────────────────────────────────

const ESG_COLORS: Record<string, string> = {
  "ENV": "#10b981", "Environnement": "#10b981",
  "SOC": "#3b82f6", "Social": "#3b82f6",
  "GOV": "#8b5cf6", "Gouvernance": "#8b5cf6",
};

const CATEGORY_EMOJI: Record<string, string> = {
  "Environnement": "🌍",
  "Numérique responsable": "💻",
  "Biodiversité": "🌿",
  "Social": "👥",
  "Achats responsables": "🤝",
  "Gouvernance": "⚖️",
};

const LEVEL_LABEL: Record<string, string> = {
  quick: "Rapide",
  project: "Projet",
  engagement: "Engagement",
};

const LEVEL_COLOR: Record<string, string> = {
  quick: "#10b981",
  project: "#3b82f6",
  engagement: "#8b5cf6",
};

function esgColor(pillar: string | null | undefined): string {
  if (!pillar) return "#94a3b8";
  const key = Object.keys(ESG_COLORS).find(k => pillar.toUpperCase().includes(k.toUpperCase()));
  return key ? ESG_COLORS[key] : "#94a3b8";
}

// ─── Barre de progression ─────────────────────────────────────────────────────

function ProgressBar({ rate, height = 10 }: { rate: number; height?: number }) {
  const color = rate >= 70 ? R.green : rate >= 40 ? "#eab308" : "#ef4444";
  return (
    <div style={{ height, borderRadius: height / 2, backgroundColor: "#E2E8F0", overflow: "hidden" }}>
      <div style={{ height: "100%", borderRadius: height / 2, width: `${rate}%`, backgroundColor: color }} />
    </div>
  );
}

// ─── Graphique d'avancement par catégorie ────────────────────────────────────

function CategoryChart({ data }: {
  data: Array<{ name: string; done: number; total: number; pct: number }>;
}) {
  if (data.length < 2) return null;
  return (
    <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 8px" }}>
      <ResponsiveContainer width="100%" height={Math.max(120, data.length * 32)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 44 }}>
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" width={144} tick={{ fontSize: 10 }} />
          <Tooltip
            formatter={(v: number, _: string, entry: any) => [
              `${entry.payload.done}/${entry.payload.total} (${v}%)`,
              "Réalisées",
            ]}
            contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
          <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.pct >= 70 ? R.green : d.pct >= 40 ? "#eab308" : "#3b82f6"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Carte action catalogue ───────────────────────────────────────────────────

function CatalogueCard({ a }: { a: Record<string, unknown> }) {
  const name        = (a.actionName as string) ?? (a.libraryName as string) ?? (a.customName as string) ?? "Action";
  const desc        = (a.actionDescription as string) ?? null;
  const category    = (a.actionCategory as string) ?? (a.category as string) ?? null;
  const subcategory = (a.actionSubcategory as string) ?? (a.subcategory as string) ?? null;
  const esgPillar   = (a.actionEsgPillar as string) ?? null;
  const odd         = (a.actionOdd as string) ?? null;
  const completedAt = (a.completedAt as string) ?? null;
  const comment     = (a.comment as string) ?? null;
  const source      = (a.source as string) ?? null;

  return (
    <div style={{
      border: `1px solid ${R.greenBorder}`,
      borderRadius: 10,
      backgroundColor: R.greenBg,
      padding: "10px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {/* Check */}
        <div style={{
          width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 1,
          backgroundColor: R.green,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>✓</span>
        </div>

        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: R.dark, margin: 0, fontFamily: "sans-serif" }}>
            {name}
          </p>
          {desc && (
            <p style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.5, margin: "3px 0 0", fontFamily: "sans-serif" }}>
              {desc}
            </p>
          )}

          {/* Tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
            {category && (
              <span style={{
                fontSize: 10, color: "#374151",
                backgroundColor: "#F1F5F9", border: "1px solid #E2E8F0",
                borderRadius: 4, padding: "2px 6px", fontFamily: "sans-serif",
              }}>
                {CATEGORY_EMOJI[category] ?? ""} {subcategory ?? category}
              </span>
            )}
            {esgPillar && (
              <span style={{
                fontSize: 10, fontWeight: 600, color: "white",
                backgroundColor: esgColor(esgPillar),
                borderRadius: 4, padding: "2px 7px", fontFamily: "sans-serif",
              }}>
                {esgPillar}
              </span>
            )}
            {odd && (
              <span style={{
                fontSize: 10, color: "#f59e0b",
                backgroundColor: "#FFFBEB", border: "1px solid #FDE68A",
                borderRadius: 4, padding: "2px 6px", fontFamily: "sans-serif",
              }}>
                ODD {odd}
              </span>
            )}
            {source === "library" && (
              <span style={{
                fontSize: 10, color: "#6366f1",
                backgroundColor: "#EEF2FF", border: "1px solid #C7D2FE",
                borderRadius: 4, padding: "2px 6px", fontFamily: "sans-serif",
              }}>
                📚 Catalogue
              </span>
            )}
            {source === "manual" && (
              <span style={{
                fontSize: 10, color: "#64748b",
                backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0",
                borderRadius: 4, padding: "2px 6px", fontFamily: "sans-serif",
              }}>
                ✍ Personnalisée
              </span>
            )}
            {completedAt && (
              <span style={{
                fontSize: 10, color: R.green,
                backgroundColor: R.greenBg, border: `1px solid ${R.greenBorder}`,
                borderRadius: 4, padding: "2px 6px", fontFamily: "sans-serif",
              }}>
                ✓ {new Date(completedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            )}
          </div>

          {comment && (
            <p style={{
              fontSize: 11, color: "#6B7280", fontStyle: "italic",
              borderLeft: `2px solid #86EFAC`, paddingLeft: 8,
              margin: "6px 0 0", lineHeight: 1.5, fontFamily: "sans-serif",
            }}>
              {comment}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Carte action feuille de route ────────────────────────────────────────────

function PlanSlotCard({ s }: { s: Record<string, unknown> }) {
  const name           = (s.actionName as string) ?? `Action ${s.slotOrder}`;
  const desc           = (s.actionDescription as string) ?? null;
  const category       = (s.actionCategory as string) ?? null;
  const subcategory    = (s.actionSubcategory as string) ?? null;
  const level          = (s.actionLevel as string) ?? null;
  const esgPillar      = (s.actionEsgPillar as string) ?? null;
  const odd            = (s.actionOdd as string) ?? null;
  const completedAt    = (s.completedAt as string) ?? null;
  const comment        = (s.comment as string) ?? null;
  const justUrl        = (s.justificationUrl as string) ?? null;

  return (
    <div style={{
      border: `1px solid #C7D2FE`,
      borderRadius: 10,
      backgroundColor: "#EEF2FF",
      padding: "10px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {/* Check */}
        <div style={{
          width: 20, height: 20, borderRadius: "50%", flexShrink: 0, marginTop: 1,
          backgroundColor: "#6366f1",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ color: "white", fontSize: 11, fontWeight: 700 }}>✓</span>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: R.dark, margin: 0, fontFamily: "sans-serif" }}>
              {name}
            </p>
            {s.slotOrder != null && (
              <span style={{
                fontSize: 10, color: "#6366f1",
                backgroundColor: "white", border: "1px solid #C7D2FE",
                borderRadius: 6, padding: "2px 7px", fontFamily: "sans-serif",
                flexShrink: 0,
              }}>
                #{s.slotOrder as number}
              </span>
            )}
          </div>

          {desc && (
            <p style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.5, margin: "3px 0 0", fontFamily: "sans-serif" }}>
              {desc}
            </p>
          )}

          {/* Tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
            {category && (
              <span style={{
                fontSize: 10, color: "#374151",
                backgroundColor: "white", border: "1px solid #C7D2FE",
                borderRadius: 4, padding: "2px 6px", fontFamily: "sans-serif",
              }}>
                {CATEGORY_EMOJI[category] ?? ""} {subcategory ?? category}
              </span>
            )}
            {level && (
              <span style={{
                fontSize: 10, fontWeight: 600, color: "white",
                backgroundColor: LEVEL_COLOR[level] ?? "#64748b",
                borderRadius: 4, padding: "2px 7px", fontFamily: "sans-serif",
              }}>
                {LEVEL_LABEL[level] ?? level}
              </span>
            )}
            {esgPillar && (
              <span style={{
                fontSize: 10, fontWeight: 600, color: "white",
                backgroundColor: esgColor(esgPillar),
                borderRadius: 4, padding: "2px 7px", fontFamily: "sans-serif",
              }}>
                {esgPillar}
              </span>
            )}
            {odd && (
              <span style={{
                fontSize: 10, color: "#f59e0b",
                backgroundColor: "#FFFBEB", border: "1px solid #FDE68A",
                borderRadius: 4, padding: "2px 6px", fontFamily: "sans-serif",
              }}>
                ODD {odd}
              </span>
            )}
            {completedAt && (
              <span style={{
                fontSize: 10, color: "#6366f1",
                backgroundColor: "white", border: "1px solid #C7D2FE",
                borderRadius: 4, padding: "2px 6px", fontFamily: "sans-serif",
              }}>
                ✓ {new Date(completedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            )}
            {justUrl && (
              <a
                href={justUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 10, color: "#6366f1",
                  backgroundColor: "white", border: "1px solid #C7D2FE",
                  borderRadius: 4, padding: "2px 6px", fontFamily: "sans-serif",
                  textDecoration: "none",
                }}
              >
                🔗 Justificatif
              </a>
            )}
          </div>

          {comment && (
            <p style={{
              fontSize: 11, color: "#6B7280", fontStyle: "italic",
              borderLeft: `2px solid #C7D2FE`, paddingLeft: 8,
              margin: "6px 0 0", lineHeight: 1.5, fontFamily: "sans-serif",
            }}>
              {comment}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Section catalogue ────────────────────────────────────────────────────────

function SectionCatalogue({ actions }: { actions: Array<Record<string, unknown>> }) {
  const done    = actions.filter((a) => a.isChecked);
  const pending = actions.filter((a) => !a.isChecked);
  const rate    = actions.length > 0 ? Math.round((done.length / actions.length) * 100) : 0;

  const byCategory = done.reduce<Record<string, Array<Record<string, unknown>>>>((acc, a) => {
    const cat = (a.actionCategory as string) ?? (a.category as string) ?? "Autres";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(a);
    return acc;
  }, {});

  // Pour le graphique : toutes catégories (done + pending)
  const allByCategory = actions.reduce<Record<string, { d: number; t: number }>>((acc, a) => {
    const cat = (a.actionCategory as string) ?? (a.category as string) ?? "Autres";
    if (!acc[cat]) acc[cat] = { d: 0, t: 0 };
    acc[cat].t++;
    if (a.isChecked) acc[cat].d++;
    return acc;
  }, {});
  const chartData = Object.entries(allByCategory)
    .map(([cat, v]) => ({
      name: cat.length > 22 ? cat.slice(0, 20) + "…" : cat,
      done: v.d, total: v.t,
      pct: v.t > 0 ? Math.round((v.d / v.t) * 100) : 0,
    }))
    .sort((a, b) => b.pct - a.pct);

  return (
    <>
      {/* Séparateur visuel */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, margin: "20px 0 12px",
      }}>
        <div style={{
          width: 6, height: 32, borderRadius: 3, backgroundColor: R.green, flexShrink: 0,
        }} />
        <div>
          <h3 style={{
            fontSize: 17, fontWeight: 700, color: R.dark, margin: 0,
            fontFamily: "sans-serif",
          }}>
            📚 Catalogue d'actions
          </h3>
          <p style={{ fontSize: 12, color: "#5B6878", margin: 0, fontFamily: "sans-serif" }}>
            Actions issues du catalogue Cocci et des actions personnalisées
          </p>
        </div>
      </div>

      <ExplainerText>
        Le catalogue d'actions regroupe les bonnes pratiques RSE que l'organisation a choisies parmi les recommandations de la plateforme Cocci, ainsi que les actions personnalisées ajoutées par les équipes. Chaque action cochée atteste d'une démarche concrète engagée au cours de l'exercice.
      </ExplainerText>

      {actions.length === 0 ? (
        <p style={{ fontSize: 13, color: "#94A3B8", fontStyle: "italic", fontFamily: "sans-serif" }}>
          Aucune action renseignée dans le catalogue pour cet exercice.
        </p>
      ) : (
        <>
          <KpiGrid items={[
            { label: "Actions totales",    value: String(actions.length), color: "#3b82f6" },
            { label: "Actions réalisées",  value: String(done.length),    color: R.green   },
            { label: "En cours",           value: String(pending.length), color: "#eab308" },
            { label: "Taux de réalisation", value: `${rate}`, unit: "%",  color: rate >= 70 ? R.green : rate >= 40 ? "#eab308" : "#ef4444" },
          ]} />

          <div style={{ marginBottom: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: R.gray, fontFamily: "sans-serif" }}>Avancement global catalogue</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: R.dark, fontFamily: "sans-serif" }}>{rate}%</span>
            </div>
            <ProgressBar rate={rate} height={12} />
          </div>

          <CategoryChart data={chartData} />

          {/* Actions réalisées uniquement */}
          {done.length > 0 && (
            <>
              <SectionTitle>Actions réalisées — {done.length} action{done.length > 1 ? "s" : ""}</SectionTitle>
              {Object.entries(byCategory).map(([cat, items]) => (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <p style={{
                    fontSize: 12, fontWeight: 700, color: "#374151",
                    margin: "0 0 6px", fontFamily: "sans-serif",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    {CATEGORY_EMOJI[cat] ?? "•"} {cat}
                    <span style={{ fontSize: 11, fontWeight: 400, color: R.gray }}>
                      ({items.length})
                    </span>
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {items.map((a, i) => <CatalogueCard key={i} a={a} />)}
                  </div>
                </div>
              ))}
            </>
          )}

          {done.length === 0 && (
            <p style={{ fontSize: 13, color: "#94A3B8", fontStyle: "italic", fontFamily: "sans-serif" }}>
              Aucune action cochée comme réalisée dans le catalogue.
            </p>
          )}
        </>
      )}
    </>
  );
}

// ─── Section feuille de route ─────────────────────────────────────────────────

function SectionPlan({ slots }: { slots: Array<Record<string, unknown>> }) {
  const done    = slots.filter((s) => s.isDone);
  const pending = slots.filter((s) => !s.isDone);
  const rate    = slots.length > 0 ? Math.round((done.length / slots.length) * 100) : 0;

  const byCategory = done.reduce<Record<string, Array<Record<string, unknown>>>>((acc, s) => {
    const cat = (s.actionCategory as string) ?? "Non catégorisé";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const allByCategory = slots.reduce<Record<string, { d: number; t: number }>>((acc, s) => {
    const cat = (s.actionCategory as string) ?? "Non catégorisé";
    if (!acc[cat]) acc[cat] = { d: 0, t: 0 };
    acc[cat].t++;
    if (s.isDone) acc[cat].d++;
    return acc;
  }, {});
  const chartData = Object.entries(allByCategory)
    .map(([cat, v]) => ({
      name: cat.length > 22 ? cat.slice(0, 20) + "…" : cat,
      done: v.d, total: v.t,
      pct: v.t > 0 ? Math.round((v.d / v.t) * 100) : 0,
    }))
    .sort((a, b) => b.pct - a.pct);

  // Distribution par niveau d'effort
  const byLevel = done.reduce<Record<string, number>>((acc, s) => {
    const lvl = (s.actionLevel as string) ?? "—";
    acc[lvl] = (acc[lvl] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      {/* Séparateur visuel */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, margin: "28px 0 12px",
        borderTop: "2px dashed #E2E8F0", paddingTop: 20,
      }}>
        <div style={{
          width: 6, height: 32, borderRadius: 3, backgroundColor: "#6366f1", flexShrink: 0,
        }} />
        <div>
          <h3 style={{
            fontSize: 17, fontWeight: 700, color: R.dark, margin: 0,
            fontFamily: "sans-serif",
          }}>
            🗺 Feuille de route
          </h3>
          <p style={{ fontSize: 12, color: "#5B6878", margin: 0, fontFamily: "sans-serif" }}>
            Actions planifiées et suivies dans la feuille de route RSE
          </p>
        </div>
      </div>

      <ExplainerText>
        La feuille de route RSE liste les actions structurées planifiées par l'organisation pour atteindre ses objectifs RSE. Chaque action est associée à un niveau d'effort (Rapide, Projet, Engagement) et fait l'objet d'un suivi individualisé incluant une date de réalisation, un commentaire et un justificatif optionnel.
      </ExplainerText>

      {slots.length === 0 ? (
        <p style={{ fontSize: 13, color: "#94A3B8", fontStyle: "italic", fontFamily: "sans-serif" }}>
          Aucune action renseignée dans la feuille de route pour cet exercice.
        </p>
      ) : (
        <>
          <KpiGrid items={[
            { label: "Actions planifiées", value: String(slots.length),  color: "#6366f1" },
            { label: "Réalisées",          value: String(done.length),   color: R.green   },
            { label: "En cours",           value: String(pending.length),color: "#eab308" },
            { label: "Taux de réalisation", value: `${rate}`, unit: "%", color: rate >= 70 ? R.green : rate >= 40 ? "#eab308" : "#ef4444" },
          ]} />

          {/* Progression globale */}
          <div style={{ marginBottom: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: R.gray, fontFamily: "sans-serif" }}>Avancement global feuille de route</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: R.dark, fontFamily: "sans-serif" }}>{rate}%</span>
            </div>
            <div style={{ height: 12, borderRadius: 6, backgroundColor: "#E2E8F0", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 6, width: `${rate}%`,
                backgroundColor: rate >= 70 ? R.green : rate >= 40 ? "#eab308" : "#6366f1",
              }} />
            </div>
          </div>

          <CategoryChart data={chartData} />

          {/* Distribution par niveau */}
          {Object.keys(byLevel).filter(k => k !== "—").length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "4px 0 8px" }}>
              {Object.entries(byLevel).filter(([k]) => k !== "—").map(([lvl, count]) => (
                <div key={lvl} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  backgroundColor: "white", border: "1px solid #C7D2FE",
                  borderRadius: 8, padding: "5px 10px",
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    backgroundColor: LEVEL_COLOR[lvl] ?? "#94a3b8",
                  }} />
                  <span style={{ fontSize: 12, color: "#374151", fontFamily: "sans-serif" }}>
                    {LEVEL_LABEL[lvl] ?? lvl}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", fontFamily: "sans-serif" }}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Actions réalisées */}
          {done.length > 0 && (
            <>
              <SectionTitle>Actions réalisées — {done.length} action{done.length > 1 ? "s" : ""}</SectionTitle>
              {Object.entries(byCategory).map(([cat, items]) => (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <p style={{
                    fontSize: 12, fontWeight: 700, color: "#374151",
                    margin: "0 0 6px", fontFamily: "sans-serif",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    {CATEGORY_EMOJI[cat] ?? "•"} {cat}
                    <span style={{ fontSize: 11, fontWeight: 400, color: R.gray }}>
                      ({items.length})
                    </span>
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {items.map((s, i) => <PlanSlotCard key={i} s={s} />)}
                  </div>
                </div>
              ))}
            </>
          )}

          {done.length === 0 && (
            <p style={{ fontSize: 13, color: "#94A3B8", fontStyle: "italic", fontFamily: "sans-serif" }}>
              Aucune action cochée comme réalisée dans la feuille de route.
            </p>
          )}
        </>
      )}
    </>
  );
}

// ─── Chapitre principal ────────────────────────────────────────────────────────

export function ChapterFeuilleDeRoute({ data, ai }: { data: ReportData; ai: AiAnalyses }) {
  const actions   = data.actions as Array<Record<string, unknown>>;
  const planSlots = ((data as any).planSlots as Array<Record<string, unknown>>) ?? [];

  const doneActions    = actions.filter((a) => a.isChecked).length;
  const doneSlots      = planSlots.filter((s) => s.isDone).length;
  const actionRate     = actions.length > 0 ? Math.round((doneActions / actions.length) * 100) : 0;
  const slotRate       = planSlots.length > 0 ? Math.round((doneSlots / planSlots.length) * 100) : 0;

  const isEmpty = actions.length === 0 && planSlots.length === 0;

  return (
    <ChapterWrapper num={7} title="Notre feuille de route">
      <ExplainerText>
        Le suivi des actions RSE s'organise autour de deux dispositifs complémentaires : le catalogue d'actions, qui recense les bonnes pratiques sélectionnées par l'organisation, et la feuille de route, qui structure les actions planifiées avec un pilotage individualisé. Ensemble, ils témoignent de la dynamique de mise en œuvre de la démarche RSE.
      </ExplainerText>

      {/* Vue synthétique globale */}
      {!isEmpty && (
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 4,
        }}>
          {/* Catalogue */}
          <div style={{
            border: `2px solid ${R.greenBorder}`, borderRadius: 12,
            backgroundColor: R.greenBg, padding: "14px 16px",
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: R.green, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px", fontFamily: "sans-serif" }}>
              📚 Catalogue
            </p>
            <p style={{ fontSize: 26, fontWeight: 800, color: R.dark, margin: "0 0 2px", fontFamily: "sans-serif" }}>
              {doneActions}
              <span style={{ fontSize: 14, fontWeight: 400, color: R.gray }}> / {actions.length}</span>
            </p>
            <p style={{ fontSize: 12, color: R.gray, margin: "0 0 8px", fontFamily: "sans-serif" }}>actions réalisées</p>
            <ProgressBar rate={actionRate} height={8} />
            <p style={{ fontSize: 11, fontWeight: 700, color: actionRate >= 70 ? R.green : "#eab308", margin: "4px 0 0", fontFamily: "sans-serif" }}>
              {actionRate}%
            </p>
          </div>

          {/* Feuille de route */}
          <div style={{
            border: "2px solid #C7D2FE", borderRadius: 12,
            backgroundColor: "#EEF2FF", padding: "14px 16px",
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px", fontFamily: "sans-serif" }}>
              🗺 Feuille de route
            </p>
            <p style={{ fontSize: 26, fontWeight: 800, color: R.dark, margin: "0 0 2px", fontFamily: "sans-serif" }}>
              {doneSlots}
              <span style={{ fontSize: 14, fontWeight: 400, color: R.gray }}> / {planSlots.length}</span>
            </p>
            <p style={{ fontSize: 12, color: R.gray, margin: "0 0 8px", fontFamily: "sans-serif" }}>actions réalisées</p>
            <div style={{ height: 8, borderRadius: 4, backgroundColor: "#C7D2FE", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 4, width: `${slotRate}%`,
                backgroundColor: slotRate >= 70 ? R.green : slotRate >= 40 ? "#eab308" : "#6366f1",
              }} />
            </div>
            <p style={{ fontSize: 11, fontWeight: 700, color: slotRate >= 70 ? R.green : "#6366f1", margin: "4px 0 0", fontFamily: "sans-serif" }}>
              {slotRate}%
            </p>
          </div>
        </div>
      )}

      {isEmpty && (
        <p style={{ fontSize: 13, color: "#94A3B8", fontStyle: "italic", fontFamily: "sans-serif" }}>
          Aucune action RSE renseignée pour cet exercice.
        </p>
      )}

      {/* ── Catalogue ─────────────────────────────────────────────────────── */}
      <SectionCatalogue actions={actions} />

      {/* ── Feuille de route ──────────────────────────────────────────────── */}
      <SectionPlan slots={planSlots} />

      {/* ── Analyse IA ────────────────────────────────────────────────────── */}
      {!isEmpty && (
        <AiBlock text={ai.actions ?? null} label="Analyse du plan d'actions RSE" />
      )}
    </ChapterWrapper>
  );
}
