/**
 * Page d'introduction RSE — placée avant l'éditorial.
 * Deux sections : définition de la RSE + "À propos de ce rapport".
 */
import { R } from "./_shared";

export function ChapterIntroRSE() {
  return (
    <section
      className="chapter-section"
      style={{
        paddingBottom: 48,
      }}
    >
      {/* ── Section 1 : La RSE ─────────────────────────────────────────── */}
      <div style={{
        borderBottom: `3px solid ${R.green}`,
        paddingBottom: 12,
        marginBottom: 24,
      }}>
        <h2 style={{
          fontSize: 26, fontWeight: 700, color: R.dark,
          fontFamily: "sans-serif", margin: 0, lineHeight: 1.2,
        }}>
          La Responsabilité Sociétale des Entreprises (RSE)
        </h2>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            `La Responsabilité Sociétale des Entreprises (RSE) désigne la contribution volontaire des organisations au développement durable à travers leurs activités, leurs décisions et leurs relations avec leurs parties prenantes.`,
            `Elle consiste à intégrer les enjeux environnementaux, sociaux, sociétaux et de gouvernance dans la stratégie et le fonctionnement quotidien de l'entreprise, afin de créer de la valeur durable tout en maîtrisant ses impacts.`,
            `Cette démarche s'appuie notamment sur les principes définis par la norme internationale ISO 26000, qui constitue le cadre de référence en matière de responsabilité sociétale. Celle-ci identifie sept questions centrales : la gouvernance de l'organisation, les droits humains, les relations et conditions de travail, l'environnement, la loyauté des pratiques, les questions relatives aux consommateurs ainsi que les communautés et le développement local.`,
            `La RSE contribue également à l'atteinte des 17 Objectifs de Développement Durable (ODD) définis par les Nations Unies. Ces objectifs constituent une feuille de route mondiale visant à concilier développement économique, protection de l'environnement et progrès social d'ici 2030.`,
            `Au-delà des obligations réglementaires, la RSE représente aujourd'hui un véritable levier de performance, d'innovation, de maîtrise des risques et d'attractivité pour les entreprises, quels que soient leur taille ou leur secteur d'activité.`,
          ].map((text, i) => (
            <p key={i} style={{
              fontSize: 13, color: "#374151", lineHeight: 1.75,
              textAlign: "justify", margin: 0,
              fontFamily: "sans-serif",
            }}>
              {text}
            </p>
          ))}
        </div>

        {/* Image ODD */}
        <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
          <img
            src="/odd-objectifs.png"
            alt="Les 17 Objectifs de Développement Durable des Nations Unies"
            style={{
              width: "100%",
              maxWidth: 680,
              height: "auto",
              borderRadius: 8,
            }}
          />
        </div>

        {/* ── Section 2 : À propos de ce rapport ──────────────────────── */}
        <div style={{
          borderTop: `2px solid ${R.greenBorder}`,
          paddingTop: 20,
          marginTop: 4,
        }}>
          <h3 style={{
            fontSize: 18, fontWeight: 700, color: R.dark,
            fontFamily: "sans-serif", margin: "0 0 16px",
            borderLeft: `4px solid ${R.green}`, paddingLeft: 10,
          }}>
            À propos de ce rapport
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              `Ce rapport présente une synthèse de la démarche RSE de l'organisation à partir des informations renseignées dans la plateforme Cocci.`,
              `Il rassemble les principaux indicateurs, les actions engagées, les résultats obtenus ainsi que des analyses générées à partir des données disponibles, afin d'offrir une vision globale de la maturité de la démarche.`,
              `Ce document a pour objectif d'accompagner les entreprises dans le pilotage, le suivi et la valorisation de leurs engagements auprès de leurs parties prenantes. Il peut également constituer un support de dialogue avec les collaborateurs, les clients, les fournisseurs, les partenaires financiers ou les organismes de certification.`,
            ].map((text, i) => (
              <p key={i} style={{
                fontSize: 13, color: "#374151", lineHeight: 1.75,
                textAlign: "justify", margin: 0, fontFamily: "sans-serif",
              }}>
                {text}
              </p>
            ))}

            {/* Avertissement légal */}
            <div style={{
              border: "1px solid #FDE68A",
              backgroundColor: "#FFFBEB",
              borderRadius: 8,
              padding: "12px 16px",
              marginTop: 4,
            }}>
              <p style={{
                fontSize: 12, color: "#92400E", margin: "0 0 8px",
                fontFamily: "sans-serif", lineHeight: 1.6,
              }}>
                <strong>⚠ Note légale</strong> — Ce rapport ne constitue pas un rapport de durabilité conforme aux exigences de la directive européenne CSRD (Corporate Sustainability Reporting Directive), aux normes ESRS ou à toute autre obligation réglementaire de reporting extra-financier. Il ne remplace pas les obligations réglementaires applicables aux organisations concernées et ne constitue pas une déclaration de performance extra-financière (DPEF) ni un rapport d'audit.
              </p>
              <p style={{
                fontSize: 12, color: "#92400E", margin: 0,
                fontFamily: "sans-serif", lineHeight: 1.6,
              }}>
                Il s'agit d'un rapport volontaire, conçu pour aider les organisations à structurer, piloter et valoriser leur démarche RSE dans une logique d'amélioration continue.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
