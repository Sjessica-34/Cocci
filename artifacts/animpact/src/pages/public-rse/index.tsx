import { useEffect, useState } from "react";
import { useParams } from "wouter";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import { PILLARS, computeScores, maturityLabel } from "../numerique-responsable/data";
import { apiUrl } from "@/lib/apiUrl";

// ─── Types ────────────────────────────────────────────────────────────────────

type SubcategoryScore = {
  id: string;
  name: string;
  categoryId: string;
  score: number | null;
  answeredCount: number;
  totalCount: number;
};

type PublicData = {
  organization: { name: string; logoUrl: string | null; sector: string | null; size: string | null };
  exercise: { year: number };
  updatedAt: string;
  scores: { global: number | null; env: number | null; soc: number | null; gov: number | null };
  actionPlan: { total: number; done: number; byCategory: Record<string, { total: number; done: number }> };
  labels: Array<{ name: string | null; logoUrl: string | null; holder: string | null; score: string | null }>;
  stakeholderCount: number;
  barometre: { satisfactionGlobale: number | null; tauxParticipation: number | null; nbRepondants: number | null; nbCollaborateurs: number | null } | null;
  responsiblePurchases: {
    responsiblePercent: number;
    localPercent: number;
    circularPercent: number;
    byCategory: Array<{ category: string; sharePercent: number }>;
  } | null;
  numeriqueResponsable: {
    responses: Array<{ criterionId: string; checked: boolean }>;
  } | null;
  parite: { womenPercent: number; menPercent: number } | null;
  progression: { diagnostic: boolean; stakeholders: boolean; materiality: boolean; actionPlan: boolean; actionsInProgress: boolean; reportGenerated: boolean };
  reportGenerationCount: number;
  subcategoryScores: SubcategoryScore[];
  customDescription: string | null;
  showReport: boolean;
};

// ─── Couleurs ─────────────────────────────────────────────────────────────────

const C = {
  green: "#1d6a3c",
  greenLight: "#e8f5ee",
  greenMid: "#4caf7c",
  env: "#2563eb",
  soc: "#0891b2",
  gov: "#d97706",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray400: "#9ca3af",
  gray600: "#4b5563",
  gray700: "#374151",
  gray800: "#1f2937",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function ScoreBadge({ score, color, size = 48 }: { score: number | null; color: string; size?: number }) {
  return (
    <span style={{ fontSize: size, fontWeight: 800, color, lineHeight: 1 }}>
      {score !== null ? score : "–"}
      <span style={{ fontSize: size * 0.35, fontWeight: 600, color: C.gray400 }}>/100</span>
    </span>
  );
}

function Stars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span style={{ color: "#f59e0b", fontSize: 20 }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i}>{i < Math.round(value) ? "★" : "☆"}</span>
      ))}
    </span>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ background: C.gray200, borderRadius: 4, height: 6, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(value, 100)}%`, background: color, height: "100%", borderRadius: 4, transition: "width 0.6s" }} />
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: `1px solid ${C.gray200}`, padding: "20px 24px", ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 14, fontWeight: 700, color: C.gray800, margin: "0 0 16px" }}>{children}</h2>;
}

// ─── Composants de section ────────────────────────────────────────────────────

function ScoreDonut({ score, color }: { score: number | null; color: string }) {
  const pct = score ?? 0;
  const data = [{ v: pct }, { v: 100 - pct }];
  return (
    <div style={{ position: "relative", width: 80, height: 80 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="v" innerRadius={28} outerRadius={38} startAngle={90} endAngle={-270} strokeWidth={0}>
            <Cell fill={color} />
            <Cell fill={C.gray100} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color }}>
        {score !== null ? score : "–"}
      </div>
    </div>
  );
}

function AxisRow({ label, score, color, criteria }: { label: string; score: number | null; color: string; criteria?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0", borderTop: `1px solid ${C.gray100}` }}>
      <ScoreDonut score={score} color={color} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <span style={{ fontWeight: 600, color: C.gray800 }}>{label}</span>
          {criteria && <span style={{ fontSize: 11, color: C.gray400 }}>{criteria} critères évalués</span>}
        </div>
        <ProgressBar value={score ?? 0} color={color} />
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function PublicRsePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [expandedAxis, setExpandedAxis] = useState<string>("ENV");
  const [showAllSubs, setShowAllSubs] = useState<Record<string, boolean>>({});
  const pageUrl = window.location.href;

  useEffect(() => {
    if (!token) return;
    fetch(apiUrl(`/api/public/rse/${token}`))
      .then(async (r) => {
        if (!r.ok) { setNotFound(true); return; }
        const json = await r.json();
        if (!json?.organization) { setNotFound(true); return; }
        setData(json);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.gray50 }}>
        <div style={{ textAlign: "center", color: C.gray400 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌿</div>
          <p style={{ fontSize: 14 }}>Chargement en cours…</p>
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.gray50 }}>
        <div style={{ textAlign: "center", color: C.gray600 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌿</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Page introuvable</h1>
          <p style={{ fontSize: 14, color: C.gray400 }}>Ce lien n'existe pas ou a été révoqué.</p>
        </div>
      </div>
    );
  }

  const {
    organization,
    exercise,
    updatedAt,
    scores,
    actionPlan,
    labels,
    stakeholderCount,
    barometre,
    responsiblePurchases,
    numeriqueResponsable,
    parite,
    progression,
    subcategoryScores = [],
    customDescription,
  } = data;
  const pctDone = actionPlan.total > 0 ? Math.round((actionPlan.done / actionPlan.total) * 100) : 0;
  const nrResponsesMap = numeriqueResponsable
    ? Object.fromEntries(numeriqueResponsable.responses.map((response) => [response.criterionId, response.checked]))
    : null;
  const nrScores = nrResponsesMap ? computeScores(nrResponsesMap) : null;
  const nrGlobalPct = nrScores && nrScores.totalPossible > 0
    ? Math.round((nrScores.totalChecked / nrScores.totalPossible) * 100)
    : 0;
  const nrMaturity = maturityLabel(nrGlobalPct);
  const nrMaturityColor = nrGlobalPct < 20
    ? "#dc2626"
    : nrGlobalPct < 40
      ? "#ea580c"
      : nrGlobalPct < 60
        ? "#ca8a04"
        : nrGlobalPct < 80
          ? "#2563eb"
          : "#059669";
  const nrRadarData = PILLARS.map((pillar) => ({
    pillar: pillar.shortTitle,
    value: nrScores?.pillarPcts[pillar.id] ?? 0,
  }));

  const progressionSteps = [
    { label: "Diagnostic réalisé", done: progression.diagnostic },
    { label: "Parties prenantes identifiées", done: progression.stakeholders },
    { label: "Matrice de matérialité réalisée", done: progression.materiality },
    { label: "Plan d'action établi", done: progression.actionPlan },
    { label: "Actions en cours", done: progression.actionsInProgress },
    { label: "Revue annuelle", done: progression.reportGenerated },
  ];

  const engagements = [
    { icon: "🌍", title: "Réduire notre impact environnemental", desc: "Agir pour la transition énergétique et la préservation des ressources naturelles.", color: C.env },
    { icon: "👥", title: "Prendre soin de nos collaborateurs", desc: "Favoriser le bien-être, la sécurité et le développement de chacun.", color: C.soc },
    { icon: "🤝", title: "Agir responsablement avec nos partenaires", desc: "Promouvoir des relations éthiques, durables et créatrices de valeur partagée.", color: C.gov },
  ];

  const sectorData = [
    { name: "Moyen\n0-25", v: 18 },
    { name: "Bien\n25-50", v: 35 },
    { name: "Très bien\n50-75", v: 29 },
    { name: "Excellent\n75-100", v: 18, highlight: scores.global !== null && scores.global >= 75 },
  ];

  const globalHighlight = scores.global !== null && scores.global >= 75 ? 3
    : scores.global !== null && scores.global >= 50 ? 2
    : scores.global !== null && scores.global >= 25 ? 1 : 0;

  return (
    <div style={{ background: C.gray50, minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif", color: C.gray800 }}>
      {/* ── Header ── */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${C.gray200}`, padding: "12px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {organization.logoUrl ? (
            <img src={organization.logoUrl} alt={organization.name} style={{ height: 36, objectFit: "contain" }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: 8, background: C.greenLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🌿</div>
          )}
          <span style={{ fontWeight: 700, fontSize: 16, color: C.gray800 }}>{organization.name}</span>
        </div>
        <span style={{ fontSize: 12, color: C.gray400 }}>Dernière mise à jour : {fmt(updatedAt)}</span>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 16px 80px" }}>

        {/* ── Hero ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 32, alignItems: "start", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: C.green, margin: "0 0 12px" }}>Notre engagement RSE</h1>
            {customDescription ? (
              <p style={{ fontSize: 14, color: C.gray600, lineHeight: 1.6, margin: "0 0 8px", whiteSpace: "pre-line" }}>
                {customDescription}
              </p>
            ) : (
              <p style={{ fontSize: 14, color: C.gray600, lineHeight: 1.6, margin: "0 0 8px" }}>
                {organization.name} s'engage dans une démarche de responsabilité sociétale structurée et mesurable.
                Nous agissons chaque jour pour créer de la valeur tout en prenant soin de l'humain et de l'environnement.
              </p>
            )}
            <p style={{ fontSize: 12, color: C.gray400, margin: 0 }}>
              Cette page présente les principaux indicateurs de notre démarche, mis à jour automatiquement depuis Cocci.
            </p>
          </div>
        </div>

        {/* ── Maturité RSE + Comparaison secteur ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <Card>
            <SectionTitle>Notre maturité RSE</SectionTitle>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 24, marginBottom: 16 }}>
              <div>
                <ScoreBadge score={scores.global} color={C.green} size={52} />
                <div style={{ fontSize: 11, color: C.greenMid, marginTop: 4 }}>⬆ En progression</div>
              </div>
              <div style={{ display: "flex", gap: 20, flex: 1 }}>
                {[
                  { label: "Environnement", score: scores.env, color: C.env, icon: "🌱" },
                  { label: "Social", score: scores.soc, color: C.soc, icon: "👥" },
                  { label: "Gouvernance", score: scores.gov, color: C.gov, icon: "🏛" },
                ].map(({ label, score, color, icon }) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color }}>
                      {score !== null ? score : "–"}
                      <span style={{ fontSize: 10, color: C.gray400 }}>/100</span>
                    </div>
                    <div style={{ fontSize: 10, color: C.gray400, lineHeight: 1.2 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle>Comparaison avec les entreprises du secteur</SectionTitle>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={sectorData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: C.gray400 }} />
                <YAxis tick={{ fontSize: 9, fill: C.gray400 }} domain={[0, 50]} />
                <Bar dataKey="v" radius={[3, 3, 0, 0]}>
                  {sectorData.map((_, i) => (
                    <Cell key={i} fill={i === globalHighlight ? C.green : C.gray200} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {scores.global !== null && (
              <div style={{ fontSize: 11, color: C.gray400, textAlign: "center", marginTop: 4 }}>
                Notre score : <strong style={{ color: C.green }}>{scores.global} %</strong>
              </div>
            )}
          </Card>
        </div>

        {/* ── Baromètre + Progression ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          {/* Baromètre social */}
          <Card>
            <SectionTitle>Baromètre social</SectionTitle>
            {barometre && barometre.satisfactionGlobale !== null ? (
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 40, fontWeight: 800, color: C.gray800 }}>{barometre.satisfactionGlobale.toFixed(1)}</span>
                  <span style={{ fontSize: 16, color: C.gray400 }}>/5</span>
                </div>
                <Stars value={barometre.satisfactionGlobale} />
                {barometre.tauxParticipation !== null && (
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.gray800, margin: "8px 0 2px" }}>
                    {Math.round(barometre.tauxParticipation)} % <span style={{ fontWeight: 400, fontSize: 12, color: C.gray400 }}>de satisfaction globale</span>
                  </p>
                )}
                {barometre.nbRepondants !== null && (
                  <p style={{ fontSize: 11, color: C.gray400, margin: 0 }}>Basé sur {barometre.nbRepondants} réponses collaborateurs</p>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: C.gray400 }}>Aucune campagne clôturée pour cet exercice.</p>
            )}
          </Card>

          {/* Progression */}
          <Card>
            <SectionTitle>Notre progression</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {progressionSteps.map(({ label, done }, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: done ? C.green : C.gray400 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: done ? C.green : C.gray200,
                    color: done ? "#fff" : C.gray400,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, flexShrink: 0,
                  }}>
                    {done ? "✓" : i + 1}
                  </div>
                  <span style={{ lineHeight: 1.3 }}>{label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Engagements + Chiffres clés ── */}
        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16, marginBottom: 16 }}>
          <Card>
            <SectionTitle>Nos engagements prioritaires</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {engagements.map(({ icon, title, desc, color }) => (
                <div key={title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                    {icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.gray800, marginBottom: 2 }}>{title}</div>
                    <div style={{ fontSize: 11, color: C.gray400, lineHeight: 1.4 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionTitle>Nos chiffres clés</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { value: actionPlan.total, label: "actions\nengagées", icon: "✅", color: C.green },
                { value: `${pctDone} %`, label: "du plan\nréalisé", icon: "🎯", color: C.env },
                { value: stakeholderCount, label: "parties\nprenantes", icon: "👥", color: C.soc },
                { value: labels.length, label: "labels\nobtenus", icon: "🏅", color: C.gov },
              ].map(({ value, label, icon, color }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, marginBottom: 4 }}>{icon}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
                  <div style={{ fontSize: 10, color: C.gray400, whiteSpace: "pre-line", lineHeight: 1.3 }}>{label}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Achats responsables ── */}
        {responsiblePurchases && (
          <Card style={{ marginBottom: 16 }}>
            <SectionTitle>Achats responsables</SectionTitle>
            <p style={{ fontSize: 12, color: C.gray600, lineHeight: 1.5, margin: "-6px 0 16px" }}>
              Les montants responsables sont calculés automatiquement à partir de vos estimations.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Part responsable", value: responsiblePurchases.responsiblePercent, icon: "🌱", color: C.green },
                { label: "Part locale", value: responsiblePurchases.localPercent, icon: "📍", color: C.gov },
                { label: "Part circulaire", value: responsiblePurchases.circularPercent, icon: "♻️", color: C.soc },
              ].map(({ label, value, icon, color }) => (
                <div key={label} style={{ background: C.gray50, borderRadius: 10, padding: "14px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 18, marginBottom: 5 }}>{icon}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color }}>{value} %</div>
                  <div style={{ fontSize: 11, color: C.gray400, marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>
            {responsiblePurchases.byCategory.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 12 }}>
                  Répartition par catégorie
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {responsiblePurchases.byCategory.map(({ category, sharePercent }) => (
                    <div key={category}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, gap: 12 }}>
                        <span style={{ fontSize: 12, color: C.gray700 }}>{category}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.gray600 }}>{sharePercent} %</span>
                      </div>
                      <ProgressBar value={sharePercent} color={C.greenMid} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ── Synthèses complémentaires ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
          <Card>
            <SectionTitle>Numérique responsable</SectionTitle>
            {nrScores ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
                  <div style={{ border: `1px solid ${C.gray200}`, borderRadius: 10, padding: "16px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: C.gray600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Score global</div>
                    <div style={{ marginTop: 6 }}>
                      <span style={{ fontSize: 36, fontWeight: 800, color: C.gray800 }}>{nrScores.globalScore}</span>
                      <span style={{ fontSize: 18, color: C.gray400 }}>/500</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.gray400, marginTop: 4 }}>{nrGlobalPct}% des critères validés</div>
                  </div>
                  <div style={{ border: `1px solid ${C.gray200}`, borderRadius: 10, padding: "16px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: C.gray600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Niveau de maturité</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: nrMaturityColor, marginTop: 10 }}>{nrMaturity.label}</div>
                    <div style={{ height: 8, borderRadius: 4, background: C.gray100, overflow: "hidden", marginTop: 10 }}>
                      <div style={{ width: `${nrGlobalPct}%`, height: "100%", borderRadius: 4, background: nrMaturityColor }} />
                    </div>
                  </div>
                  <div style={{ border: `1px solid ${C.gray200}`, borderRadius: 10, padding: "16px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: C.gray600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Critères validés</div>
                    <div style={{ marginTop: 6 }}>
                      <span style={{ fontSize: 36, fontWeight: 800, color: C.gray800 }}>{nrScores.totalChecked}</span>
                      <span style={{ fontSize: 18, color: C.gray400 }}>/{nrScores.totalPossible}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.gray400, marginTop: 4 }}>sur l'ensemble du référentiel</div>
                  </div>
                </div>
                <div style={{ border: `1px solid ${C.gray200}`, borderRadius: 12, padding: "16px 12px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.gray800, margin: "0 0 4px 8px" }}>
                    Vue d'ensemble — radar global (7 piliers)
                  </div>
                  {nrScores.totalChecked === 0 ? (
                    <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: C.gray400 }}>
                      Commencez l'évaluation pour voir le radar.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <RadarChart data={nrRadarData}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 11, fill: "#6b7280" }} />
                        <Radar dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </>
            ) : (
              <p style={{ fontSize: 13, color: C.gray400, margin: 0 }}>
                Aucune donnée renseignée pour cet exercice.
              </p>
            )}
          </Card>

          <Card>
            <SectionTitle>Parité femmes-hommes</SectionTitle>
            {parite ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: C.soc }}>{parite.womenPercent} %</div>
                    <div style={{ fontSize: 11, color: C.gray400 }}>Femmes</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: C.gov }}>{parite.menPercent} %</div>
                    <div style={{ fontSize: 11, color: C.gray400 }}>Hommes</div>
                  </div>
                </div>
                <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: C.gray100 }}>
                  <div style={{ width: `${parite.womenPercent}%`, background: C.soc }} />
                  <div style={{ width: `${parite.menPercent}%`, background: C.gov }} />
                </div>
                <p style={{ fontSize: 12, color: C.gray600, lineHeight: 1.5, margin: "10px 0 0" }}>
                  La répartition femmes-hommes est présentée à partir des effectifs dont le genre est renseigné.
                </p>
              </>
            ) : (
              <p style={{ fontSize: 13, color: C.gray400, margin: 0 }}>
                Aucune donnée renseignée pour cet exercice.
              </p>
            )}
          </Card>
        </div>

        {/* ── Résultats détaillés ── */}
        <Card style={{ marginBottom: 16 }}>
          {/* En-tête + légende */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: C.gray800, margin: 0 }}>Nos résultats détaillés par critère</h2>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {([["Excellent", C.green], ["Très bien", C.greenMid], ["Bien", C.env], ["Moyen", C.gray200]] as [string, string][]).map(([lbl, col]) => (
                <span key={lbl} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.gray600 }}>
                  <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: col }} />{lbl}
                </span>
              ))}
            </div>
          </div>

          {subcategoryScores.length === 0 ? (
            <p style={{ fontSize: 13, color: C.gray400, textAlign: "center", padding: "24px 0" }}>
              Le diagnostic RSE n'a pas encore été réalisé pour cet exercice.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {([
                { label: "Environnement", score: scores.env, color: C.env, icon: "🌱", catId: "ENV" },
                { label: "Social",        score: scores.soc, color: C.soc, icon: "👥", catId: "SOC" },
                { label: "Gouvernance",   score: scores.gov, color: C.gov, icon: "🏛",  catId: "GOV" },
              ] as const).map(({ label, score, color, icon, catId }) => {
                const allSubs   = subcategoryScores.filter((s) => s.categoryId === catId);
                const scoredSubs = allSubs.filter((s) => s.score !== null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
                const totalCount = allSubs.length;
                const isExpanded = expandedAxis === catId;
                const showAll = showAllSubs[catId] ?? false;
                const displaySubs = showAll ? scoredSubs : scoredSubs.slice(0, 4);

                const bands = [
                  { lbl: "Excellent (75-100)", col: C.green,   test: (v: number) => v >= 75 },
                  { lbl: "Très bien (50-75)",  col: C.greenMid, test: (v: number) => v >= 50 && v < 75 },
                  { lbl: "Bien (25-50)",        col: C.env,     test: (v: number) => v >= 25 && v < 50 },
                  { lbl: "Moyen (0-25)",        col: C.gray400, test: (v: number) => v < 25 },
                ];
                const distribution = bands.map((b) => ({
                  ...b,
                  count: scoredSubs.filter((s) => b.test(s.score!)).length,
                  pct: scoredSubs.length > 0 ? Math.round((scoredSubs.filter((s) => b.test(s.score!)).length / scoredSubs.length) * 100) : 0,
                }));
                const pieData = distribution.map((d) => ({ v: d.pct || 0, col: d.col }));

                const scoreColor = (v: number) =>
                  v >= 75 ? C.green : v >= 50 ? C.greenMid : v >= 25 ? C.env : C.gray400;

                // ── Ligne réduite ───────────────────────────────────────────
                if (!isExpanded) {
                  return (
                    <div
                      key={catId}
                      style={{ borderTop: `1px solid ${C.gray100}`, paddingTop: 14, paddingBottom: 14, display: "flex", alignItems: "center", gap: 16, cursor: "pointer" }}
                      onClick={() => setExpandedAxis(catId)}
                    >
                      {/* Icône + label + score */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 200 }}>
                        <span style={{ fontSize: 18 }}>{icon}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.gray800 }}>{label}</span>
                        {score !== null && (
                          <span style={{ fontSize: 18, fontWeight: 800, color, marginLeft: 4 }}>
                            {score}<span style={{ fontSize: 11, fontWeight: 500, color: C.gray400 }}>/100</span>
                          </span>
                        )}
                      </div>

                      {/* Barre + comptage */}
                      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <ProgressBar value={score ?? 0} color={color} />
                        </div>
                        <span style={{ fontSize: 11, color: C.gray400, whiteSpace: "nowrap" }}>
                          {totalCount} critère{totalCount > 1 ? "s" : ""} évalué{totalCount > 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Voir le détail */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.green, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                        Voir le détail
                        <span style={{ fontSize: 14, lineHeight: 1 }}>›</span>
                        <span style={{ fontSize: 11, color: C.gray400, marginLeft: 2 }}>∨</span>
                      </div>
                    </div>
                  );
                }

                // ── Section dépliée ─────────────────────────────────────────
                return (
                  <div
                    key={catId}
                    style={{ borderTop: `1px solid ${C.gray100}`, paddingTop: 20, paddingBottom: 20, background: C.gray50, borderRadius: 10, padding: 20, marginTop: 4, marginBottom: 4 }}
                  >
                    {score === null && totalCount === 0 ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 18 }}>{icon}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.gray800 }}>{label}</span>
                        <span style={{ fontSize: 12, color: C.gray400, fontStyle: "italic" }}>— Diagnostic non réalisé pour cet axe.</span>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr", gap: 24, alignItems: "start" }}>

                        {/* Colonne gauche : score + barre + comptage */}
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                            <span style={{ fontSize: 16 }}>{icon}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: C.gray800 }}>{label}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 10 }}>
                            <span style={{ fontSize: 42, fontWeight: 800, color, lineHeight: 1 }}>
                              {score !== null ? score : "–"}
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 500, color: C.gray400 }}>/100</span>
                          </div>
                          <ProgressBar value={score ?? 0} color={color} />
                          <p style={{ fontSize: 11, color: C.gray400, marginTop: 8 }}>
                            {totalCount} critère{totalCount > 1 ? "s" : ""} évalué{totalCount > 1 ? "s" : ""}
                          </p>
                          <button
                            onClick={() => setExpandedAxis("")}
                            style={{ marginTop: 8, background: "none", border: "none", color: C.gray400, fontSize: 11, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}
                          >
                            Réduire ∧
                          </button>
                        </div>

                        {/* Colonne centrale : donut + légende */}
                        {scoredSubs.length > 0 && (
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 600, color: C.gray600, marginBottom: 12 }}>Répartition des scores</p>
                            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                              <div style={{ width: 120, height: 120, flexShrink: 0 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie data={pieData} dataKey="v" innerRadius={34} outerRadius={54} startAngle={90} endAngle={-270} strokeWidth={0}>
                                      {pieData.map((d, i) => <Cell key={i} fill={d.v > 0 ? d.col : C.gray100} />)}
                                    </Pie>
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                {distribution.filter((d) => d.count > 0).map((d) => (
                                  <div key={d.lbl} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                                    <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: d.col, flexShrink: 0 }} />
                                    <span style={{ color: C.gray700 }}>{d.lbl}</span>
                                    <span style={{ fontWeight: 700, color: C.gray800, marginLeft: "auto", paddingLeft: 12 }}>{d.pct}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Colonne droite : barres par critère */}
                        {scoredSubs.length > 0 && (
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 600, color: C.gray600, marginBottom: 12 }}>Aperçu des critères</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                              {displaySubs.map((sub) => (
                                <div key={sub.id}>
                                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, gap: 8 }}>
                                    <span style={{ fontSize: 11, color: C.gray700, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {sub.name}
                                    </span>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor(sub.score!), flexShrink: 0 }}>
                                      {sub.score}%
                                    </span>
                                  </div>
                                  <ProgressBar value={sub.score ?? 0} color={scoreColor(sub.score!)} />
                                </div>
                              ))}
                            </div>
                            {scoredSubs.length > 4 && (
                              <button
                                onClick={() => setShowAllSubs((prev) => ({ ...prev, [catId]: !showAll }))}
                                style={{ marginTop: 12, background: "none", border: "none", color: C.green, fontSize: 11, fontWeight: 600, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}
                              >
                                {showAll
                                  ? `Voir moins ∧`
                                  : `Voir les ${scoredSubs.length} critères évalués →`}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* ── Plan d'actions par catégorie ── */}
        {actionPlan.total > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <SectionTitle>Notre plan d'actions ({actionPlan.done}/{actionPlan.total} réalisées)</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.entries(actionPlan.byCategory)
                .sort((a, b) => b[1].total - a[1].total)
                .slice(0, 8)
                .map(([cat, { total, done }]) => {
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  return (
                    <div key={cat}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: C.gray700 }}>{cat}</span>
                        <span style={{ fontSize: 11, color: C.gray400 }}>{done}/{total}</span>
                      </div>
                      <ProgressBar value={pct} color={C.green} />
                    </div>
                  );
                })}
            </div>
          </Card>
        )}

        {/* ── Labels ── */}
        {labels.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <SectionTitle>Nos labels et certifications ({labels.length})</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {labels.map((label, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: C.gray50, borderRadius: 8, padding: "8px 12px", border: `1px solid ${C.gray200}` }}>
                  {label.logoUrl && <img src={label.logoUrl} alt={label.name ?? ""} style={{ height: 28, objectFit: "contain" }} />}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{label.name}</div>
                    {label.holder && <div style={{ fontSize: 10, color: C.gray400 }}>{label.holder}</div>}
                    {label.score && <div style={{ fontSize: 10, color: C.green }}>{label.score}</div>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}


        {/* ── Méthode ── */}
        <Card style={{ marginBottom: 16 }}>
          <SectionTitle>Notre méthode</SectionTitle>
          <p style={{ fontSize: 12, color: C.gray600, lineHeight: 1.5, marginBottom: 12 }}>
            Notre démarche s'appuie sur les référentiels et bonnes pratiques reconnus au niveau international.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { icon: "📋", label: "ISO 26000" },
              { icon: "🌐", label: "Les 17 Objectifs de Développement Durable (ODD)" },
              { icon: "✅", label: "Bonnes pratiques de responsabilité sociétale" },
            ].map(({ icon, label }) => (
              <div key={label} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                <span style={{ fontSize: 11, color: C.gray600, lineHeight: 1.4 }}>{label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Footer ── */}
        <div style={{ borderTop: `1px solid ${C.gray200}`, paddingTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>🔄</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.gray600 }}>Mis à jour automatiquement</span>
            </div>
            <p style={{ fontSize: 11, color: C.gray400, lineHeight: 1.4, margin: 0 }}>
              Toutes les informations présentées sur cette page sont mises à jour automatiquement depuis la plateforme Cocci.<br />
              Dernière synchronisation : {fmt(updatedAt)}
            </p>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.gray600, marginBottom: 6 }}>À propos de Cocci</div>
            <p style={{ fontSize: 11, color: C.gray400, lineHeight: 1.4, margin: "0 0 8px" }}>
              Cette page est générée automatiquement par Cocci, la plateforme RSE dédiée aux TPE et PME françaises.
            </p>
            <a
              href={import.meta.env.VITE_APP_URL || window.location.origin}
              style={{ fontSize: 11, color: C.green, textDecoration: "none", fontWeight: 600 }}
            >
              Découvrir Cocci →
            </a>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.gray100}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.gray400 }}>
            <span>Powered by</span>
            <span style={{ fontWeight: 800, color: C.green, fontSize: 13 }}>🌿 COCCI</span>
          </div>
        </div>

      </div>
    </div>
  );
}
