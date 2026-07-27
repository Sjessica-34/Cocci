import {
  ChapterWrapper, SectionTitle, ExplainerText, AiBlock, ReportTable, KpiGrid,
  ScoreDonut, AxisDonutReport, R,
} from "./_shared";
import type { ReportData } from "../useReportData";
import type { AiAnalyses } from "../useReportAI";

export function ChapterHumain({ data, ai }: { data: ReportData; ai: AiAnalyses }) {
  type AnyItem = Record<string, unknown>;
  const diagScores = data.diagScores as unknown as AnyItem[];
  const socScores  = diagScores.filter((s) => s.categoryId === "SOC");
  const wf         = data.workforce as Record<string, unknown> | null;
  const div        = data.diversity as Record<string, unknown> | null;
  const tr         = data.training  as Record<string, unknown> | null;
  const baro       = data.baroSynthese as Record<string, unknown> | null;

  const feminRate = wf?.totalHeadcount && div?.nbFemmes
    ? Math.round(Number(div.nbFemmes) / Number(wf.totalHeadcount) * 100)
    : null;
  const trainingRate = wf?.totalHeadcount && tr?.nbCollaborateursFormes
    ? Math.round(Number(tr.nbCollaborateursFormes) / Number(wf.totalHeadcount) * 100)
    : null;
  const hPerCollab = wf?.totalHeadcount && tr?.nbHeuresFormation
    ? Math.round(Number(tr.nbHeuresFormation) / Number(wf.totalHeadcount))
    : null;

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

          {/* Grille de donuts SOC */}
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
          <AiBlock text={ai.diag_soc ?? null} label="Analyse du diagnostic social" />
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

      <AiBlock text={ai.workforce ?? null} label="Analyse du capital humain & social" />

      {/* Baromètre social */}
      {baro && (
        <>
          <SectionTitle>Baromètre Social</SectionTitle>
          <ExplainerText>
            Le baromètre social permet de mesurer régulièrement le niveau d'engagement, de bien-être et de satisfaction des collaborateurs. Il constitue un outil précieux pour orienter les politiques RH et favoriser un dialogue social constructif au sein de l'organisation.
          </ExplainerText>
          {(baro.summary as string | null) && (
            <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, fontFamily: "sans-serif" }}>
              {baro.summary as string}
            </p>
          )}
        </>
      )}
    </ChapterWrapper>
  );
}
