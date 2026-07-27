import {
  ChapterWrapper, SectionTitle, ExplainerText, AiBlock, EditableAiBlock, ReportTable,
  KpiGrid, ScoreDonut, AxisDonutReport, R,
} from "./_shared";
import { TrendingUp, TrendingDown, ThumbsUp, ThumbsDown, AlertTriangle } from "lucide-react";
import type { ReportData } from "../useReportData";
import type { AiAnalyses } from "../useReportAI";

function TrendBadge({ current, previous }: { current: number | null; previous: number | null }) {
  if (current == null || previous == null) return null;
  const delta = current - previous;
  if (Math.abs(delta) < 0.05) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      fontSize: 11, color: delta > 0 ? "#16a34a" : "#dc2626",
      fontFamily: "sans-serif",
    }}>
      {delta > 0 ? "↑" : "↓"}
      {delta > 0 ? "+" : ""}{delta.toFixed(1)}
    </span>
  );
}

export function ChapterHumain({ data, ai }: { data: ReportData; ai: AiAnalyses }) {
  type AnyItem = Record<string, unknown>;
  const diagScores = data.diagScores as unknown as AnyItem[];
  const socScores  = diagScores.filter((s) => s.categoryId === "SOC");
  const wf         = data.workforce as Record<string, unknown> | null;
  const div        = data.diversity as Record<string, unknown> | null;
  const tr         = data.training  as Record<string, unknown> | null;
  const baro       = data.baroSynthese as Record<string, unknown> | null;
  const campaign   = data.baroCampaign as Record<string, unknown> | null;

  const feminRate = wf?.totalHeadcount && div?.nbFemmes
    ? Math.round(Number(div.nbFemmes) / Number(wf.totalHeadcount) * 100)
    : null;
  const trainingRate = wf?.totalHeadcount && tr?.nbCollaborateursFormes
    ? Math.round(Number(tr.nbCollaborateursFormes) / Number(wf.totalHeadcount) * 100)
    : null;
  const hPerCollab = wf?.totalHeadcount && tr?.nbHeuresFormation
    ? Math.round(Number(tr.nbHeuresFormation) / Number(wf.totalHeadcount))
    : null;

  // Baromètre synthèse
  const themeScores = (baro?.themeScores as Array<Record<string, unknown>>) ?? [];
  const pointsForts = (baro?.pointsForts as string[]) ?? [];
  const pointsFaibles = (baro?.pointsFaibles as string[]) ?? [];
  const themesASurveiller = (baro?.themesASurveiller as string[]) ?? [];
  const aiSummary = baro?.aiSummary as Record<string, unknown> | null;

  return (
    <ChapterWrapper num={5} title="Placer l'humain au cœur de notre développement">

      {/* Grand donut SOC */}
      {socScores.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <AxisDonutReport categoryId="SOC" scores={diagScores as any} />
          </div>

          <SectionTitle>Diagnostic social — Résultats détaillés</SectionTitle>
          <ExplainerText>
            Le diagnostic social évalue la maturité de l'organisation sur les thématiques liées au capital humain, à la qualité de vie au travail, à l'égalité professionnelle, à la formation et au dialogue social. Chaque sous-thème est noté de 0 à 100 % selon le niveau de pratiques observées.
          </ExplainerText>
          <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, fontFamily: "sans-serif" }}>
            Les résultats du diagnostic social sont présentés ci-dessous, par thématique, afin d'identifier le niveau de maturité de l'organisation et les principaux axes de progression.
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 12,
          }}>
            {socScores.map((s) => (
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
          <EditableAiBlock id="diag_soc" text={ai.diag_soc ?? null} label="Analyse du diagnostic social" />
        </>
      )}

      {/* Capital humain */}
      {wf && (
        <>
          <SectionTitle>Capital humain — Effectifs</SectionTitle>
          <ExplainerText>
            Les indicateurs de capital humain renseignent sur la composition et l'évolution des effectifs de l'organisation. Ils constituent un outil de pilotage RH essentiel pour suivre les dynamiques de recrutement, de fidélisation et de transformation des équipes dans le cadre de la stratégie sociale.
          </ExplainerText>
          <KpiGrid items={[
            ...(wf.totalHeadcount ? [{ label: "Effectif total", value: String(wf.totalHeadcount), unit: "collaborateurs", color: "#3b82f6" }] : []),
            ...(wf.nbCdi ? [{ label: "CDI", value: String(wf.nbCdi), color: "#3b82f6" }] : []),
            ...(wf.nbCdd ? [{ label: "CDD", value: String(wf.nbCdd), color: "#64748b" }] : []),
            ...(wf.nbAlternants ? [{ label: "Alternants", value: String(wf.nbAlternants), color: "#8b5cf6" }] : []),
            ...(wf.nbRecrutements ? [{ label: "Recrutements", value: String(wf.nbRecrutements), color: R.green }] : []),
            ...(wf.nbDeparts ? [{ label: "Départs", value: String(wf.nbDeparts), color: "#f97316" }] : []),
          ]} />
        </>
      )}

      {/* Diversité */}
      {div && (
        <>
          <SectionTitle>Diversité &amp; Inclusion</SectionTitle>
          <ExplainerText>
            La diversité et l'inclusion constituent des leviers essentiels de performance sociale. L'égalité professionnelle, la représentation équilibrée et l'intégration des personnes en situation de handicap reflètent l'engagement de l'organisation à créer un environnement de travail équitable et respectueux.
          </ExplainerText>

          {(div.nbHommes != null || div.nbFemmes != null) && wf?.totalHeadcount && (
            <div style={{ margin: "8px 0 12px" }}>
              <p style={{ fontSize: 11, color: "#5B6878", marginBottom: 4, fontFamily: "sans-serif" }}>Répartition Femmes / Hommes</p>
              <div style={{ height: 20, borderRadius: 6, overflow: "hidden", display: "flex", maxWidth: 400 }}>
                {div.nbFemmes != null && (
                  <div style={{
                    width: `${Math.round(Number(div.nbFemmes) / Number(wf.totalHeadcount) * 100)}%`,
                    backgroundColor: "#ec4899",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ fontSize: 10, color: "white", fontWeight: 700, fontFamily: "sans-serif" }}>
                      {feminRate}% F
                    </span>
                  </div>
                )}
                {div.nbHommes != null && (
                  <div style={{
                    flex: 1, backgroundColor: "#3b82f6",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ fontSize: 10, color: "white", fontWeight: 700, fontFamily: "sans-serif" }}>
                      {feminRate != null ? 100 - feminRate : "—"}% H
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <KpiGrid items={[
            ...(div.nbFemmes != null ? [{ label: "Femmes", value: String(div.nbFemmes), color: "#ec4899" }] : []),
            ...(div.nbHommes != null ? [{ label: "Hommes", value: String(div.nbHommes), color: "#3b82f6" }] : []),
            ...(feminRate != null ? [{ label: "Taux de féminisation", value: `${feminRate}`, unit: "%", color: "#ec4899" }] : []),
            ...(div.nbHandicap != null ? [{ label: "Situation de handicap", value: String(div.nbHandicap), color: "#8b5cf6" }] : []),
          ]} />
        </>
      )}

      {/* Formation */}
      {tr && (
        <>
          <SectionTitle>Formation &amp; Développement des compétences</SectionTitle>
          <ExplainerText>
            L'investissement dans la formation professionnelle traduit l'engagement de l'organisation envers le développement des compétences de ses collaborateurs. Il contribue à la montée en compétences des équipes, à l'adaptation aux mutations économiques et technologiques, et au renforcement de l'attractivité employeur.
          </ExplainerText>
          <KpiGrid items={[
            ...(tr.nbCollaborateursFormes != null ? [{ label: "Collaborateurs formés", value: String(tr.nbCollaborateursFormes), color: R.green }] : []),
            ...(trainingRate != null ? [{ label: "Taux de formation", value: `${trainingRate}`, unit: "%", color: R.green }] : []),
            ...(tr.nbHeuresFormation != null ? [{ label: "Heures de formation", value: String(tr.nbHeuresFormation), unit: "h", color: "#3b82f6" }] : []),
            ...(hPerCollab != null ? [{ label: "Heures par collab.", value: `${hPerCollab}`, unit: "h", color: "#8b5cf6" }] : []),
          ]} />
        </>
      )}

      <EditableAiBlock id="workforce" text={ai.workforce ?? null} label="Analyse du capital humain &amp; social" />

      {/* ── BAROMÈTRE SOCIAL ──────────────────────────────────────────────── */}
      {baro != null && (
        <>
          <SectionTitle>Baromètre Social</SectionTitle>
          <ExplainerText>
            Le baromètre social permet de mesurer régulièrement le niveau d'engagement, de bien-être et de satisfaction des collaborateurs. Il constitue un outil précieux pour orienter les politiques RH et favoriser un dialogue social constructif au sein de l'organisation.
          </ExplainerText>

          {campaign != null && (
            <p style={{ fontSize: 12, color: "#5B6878", fontFamily: "sans-serif", marginBottom: 4 }}>
              Campagne : <strong>{String(campaign.title ?? campaign.name ?? "")}</strong>
              {campaign.year != null && ` — ${String(campaign.year)}`}
            </p>
          )}

          {/* KPIs Baromètre */}
          <KpiGrid items={[
            ...(baro.satisfactionGlobale != null ? [{
              label: "Satisfaction globale",
              value: `${(baro.satisfactionGlobale as number).toFixed(1)}/5`,
              color: (baro.satisfactionGlobale as number) >= 3.5 ? R.green : "#f97316",
            }] : []),
            { label: "Répondants", value: String(baro.nbRepondants), unit: `/${baro.nbCollaborateurs}`, color: "#3b82f6" },
            { label: "Participation", value: `${(baro.tauxParticipation as number).toFixed(0)}`, unit: "%", color: "#8b5cf6" },
          ]} />

          {/* Scores par thématique */}
          {themeScores.length > 0 && (
            <>
              <p style={{ fontSize: 13, fontWeight: 600, color: R.dark, margin: "8px 0 4px", fontFamily: "sans-serif" }}>
                Résultats par thématique
              </p>
              <div style={{
                border: "1px solid #E2E8F0", borderRadius: 10,
                overflow: "hidden",
              }}>
                {themeScores.map((t, i) => {
                  const avg = t.average as number | null;
                  const prev = t.previousAverage as number | null;
                  const pct = avg != null ? Math.round((avg / 5) * 100) : null;
                  const scoreColor = avg != null
                    ? (avg >= 4 ? "#10b981" : avg >= 3 ? "#3b82f6" : avg >= 2 ? "#f97316" : "#ef4444")
                    : "#94a3b8";
                  return (
                    <div key={i} style={{
                      padding: "10px 14px",
                      backgroundColor: i % 2 === 0 ? "#FAFAFA" : "white",
                      borderBottom: i < themeScores.length - 1 ? "1px solid #F1F5F9" : "none",
                      display: "flex", alignItems: "center", gap: 12,
                    }}>
                      <span style={{ fontSize: 12, color: R.dark, fontFamily: "sans-serif", flex: "1 1 140px" }}>
                        {String(t.theme ?? "")}
                      </span>
                      <div style={{ flex: "2 1 120px", height: 7, borderRadius: 4, backgroundColor: "#E2E8F0", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct ?? 0}%`, backgroundColor: scoreColor, borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor, fontFamily: "sans-serif", minWidth: 36 }}>
                        {avg != null ? `${avg.toFixed(1)}/5` : "—"}
                      </span>
                      <TrendBadge current={avg} previous={prev} />
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Points forts / Points faibles */}
          {(pointsForts.length > 0 || pointsFaibles.length > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {pointsForts.length > 0 && (
                <div style={{
                  border: "1px solid #bbf7d0", borderRadius: 10,
                  backgroundColor: "#f0fdf4", padding: "12px 14px",
                }}>
                  <p style={{
                    fontSize: 12, fontWeight: 700, color: "#15803d",
                    margin: "0 0 8px", fontFamily: "sans-serif",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    👍 Points forts
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {pointsForts.map((p, i) => (
                      <li key={i} style={{ fontSize: 12, color: "#166534", lineHeight: 1.5, fontFamily: "sans-serif", marginBottom: 3 }}>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {pointsFaibles.length > 0 && (
                <div style={{
                  border: "1px solid #fecaca", borderRadius: 10,
                  backgroundColor: "#fef2f2", padding: "12px 14px",
                }}>
                  <p style={{
                    fontSize: 12, fontWeight: 700, color: "#dc2626",
                    margin: "0 0 8px", fontFamily: "sans-serif",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    👎 Points faibles
                  </p>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {pointsFaibles.map((p, i) => (
                      <li key={i} style={{ fontSize: 12, color: "#991b1b", lineHeight: 1.5, fontFamily: "sans-serif", marginBottom: 3 }}>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Thématiques à surveiller */}
          {themesASurveiller.length > 0 && (
            <div style={{
              border: "1px solid #fde68a", borderRadius: 10,
              backgroundColor: "#fffbeb", padding: "10px 14px",
              display: "flex", alignItems: "flex-start", gap: 10,
            }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#92400e", margin: "0 0 6px", fontFamily: "sans-serif" }}>
                  Thématiques à surveiller
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {themesASurveiller.map((t, i) => (
                    <span key={i} style={{
                      fontSize: 11, color: "#92400e",
                      backgroundColor: "#fef3c7", border: "1px solid #fde68a",
                      borderRadius: 6, padding: "2px 8px",
                      fontFamily: "sans-serif",
                    }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Synthèse IA baromètre */}
          {aiSummary?.summary != null && (
            <EditableAiBlock
              id="baro_social"
              text={String(aiSummary.summary)}
              label="Synthèse du Baromètre Social"
            />
          )}
        </>
      )}
    </ChapterWrapper>
  );
}
