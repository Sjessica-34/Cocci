/**
 * Visionneuse du rapport RSE illustré.
 * Charge toutes les données en parallèle, génère les analyses IA,
 * puis assemble tous les chapitres dans une mise en page print-optimisée.
 */
import { useRef } from "react";
import { Link } from "wouter";
import { useModuleContext } from "@/hooks/useModuleContext";
import { useReportData } from "./useReportData";
import { useReportAI } from "./useReportAI";

// Chapitres
import { ChapterCover }             from "./chapters/ChapterCover";
import { ChapterEditorial }         from "./chapters/ChapterEditorial";
import { ChapterQuiSommesNous }     from "./chapters/ChapterQuiSommesNous";
import { ChapterDemarcheRSE }       from "./chapters/ChapterDemarcheRSE";
import { ChapterPlanete }           from "./chapters/ChapterPlanete";
import { ChapterAchatsResponsables } from "./chapters/ChapterAchatsResponsables";
import { ChapterHumain }            from "./chapters/ChapterHumain";
import { ChapterGouvernance }       from "./chapters/ChapterGouvernance";
import { ChapterFeuilleDeRoute }    from "./chapters/ChapterFeuilleDeRoute";
import { ChapterImpactScore }       from "./chapters/ChapterImpactScore";
import { ChapterLabels }            from "./chapters/ChapterLabels";
import { ChapterCaptation }         from "./chapters/ChapterCaptation";
import { ChapterTempsForts }        from "./chapters/ChapterTempsForts";
import { ChapterPerspectives }      from "./chapters/ChapterPerspectives";
import { ChapterAnnexes }           from "./chapters/ChapterAnnexes";

const YEAR = new Date().getFullYear();

// ─── Barre d'outils ────────────────────────────────────────────────────────────

function Toolbar() {
  return (
    <div
      id="report-toolbar"
      style={{
        position: "sticky", top: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 32px",
        backgroundColor: "white",
        borderBottom: "1px solid #E2E8F0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <Link
        to="/rapport-rse"
        style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}
      >
        <span style={{ fontSize: 20, color: "#1F6B3A" }}>←</span>
        <span style={{ fontSize: 14, color: "#1F6B3A", fontWeight: 600, fontFamily: "sans-serif" }}>
          Retour au rapport
        </span>
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          fontSize: 12, color: "#5B6878", fontFamily: "sans-serif",
          backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0",
          padding: "4px 10px", borderRadius: 6,
        }}>
          Rapport illustré
        </span>
        <button
          onClick={() => window.print()}
          style={{
            backgroundColor: "#1F6B3A", color: "white",
            border: "none", borderRadius: 8,
            padding: "9px 20px", fontSize: 14, fontWeight: 600,
            cursor: "pointer", fontFamily: "sans-serif",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          🖨 Imprimer / Exporter PDF
        </button>
      </div>
    </div>
  );
}

// ─── Table des matières ────────────────────────────────────────────────────────

function TableOfContents({
  hasCaptation, hasTempsForts, hasAchats,
}: {
  hasCaptation: boolean;
  hasTempsForts: boolean;
  hasAchats: boolean;
}) {
  let num = 1;
  const chapters = [
    { num: num++, title: "Éditorial" },
    { num: num++, title: "Qui sommes-nous ?" },
    { num: num++, title: "Notre démarche RSE" },
    { num: num++, title: "Agir pour la planète" },
    ...(hasAchats ? [{ num: num++, title: "Achats responsables" }] : []),
    { num: num++, title: "Placer l'humain au cœur" },
    { num: num++, title: "Piloter une entreprise responsable" },
    { num: num++, title: "Notre feuille de route" },
    { num: num++, title: "Mon Impact Score" },
    { num: num++, title: "Labels & Certifications" },
    ...(hasCaptation ? [{ num: num++, title: "Captation carbone" }] : []),
    ...(hasTempsForts ? [{ num: num++, title: "Temps forts & Engagements" }] : []),
    { num: num++, title: "Perspectives & Ambitions" },
    { num: num++, title: "Annexes & Glossaire" },
  ];

  return (
    <div style={{ breakAfter: "page", pageBreakAfter: "always", padding: "40px 0" }}>
      <h2 style={{
        fontSize: 22, fontWeight: 700, color: "#1C2340",
        marginBottom: 24, fontFamily: "sans-serif",
        borderBottom: "3px solid #1F6B3A", paddingBottom: 10,
      }}>
        Sommaire
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {chapters.map((ch) => (
          <div key={ch.num} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              width: 28, height: 28, borderRadius: "50%",
              backgroundColor: "#1F6B3A", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, flexShrink: 0, fontFamily: "sans-serif",
            }}>
              {ch.num}
            </span>
            <div style={{ flex: 1, borderBottom: "1px dashed #CBD5E1", margin: "0 4px" }} />
            <span style={{ fontSize: 14, color: "#374151", fontFamily: "sans-serif" }}>
              {ch.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Loading ───────────────────────────────────────────────────────────────────

function LoadingReport() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "60vh", gap: 16,
    }}>
      <div style={{
        width: 48, height: 48, border: "4px solid #E2E8F0",
        borderTop: "4px solid #1F6B3A", borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }} />
      <p style={{ fontSize: 15, color: "#5B6878", fontFamily: "sans-serif" }}>
        Chargement des données du rapport…
      </p>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Composant principal ───────────────────────────────────────────────────────

export function ReportViewer() {
  const { effectiveOrgId } = useModuleContext("group");
  const data = useReportData(effectiveOrgId ?? null);
  const ai   = useReportAI(data, effectiveOrgId ?? null);

  const hasCaptation = !!(data.captation as Record<string, unknown> | null)?.captationKgPerYear;
  const draft = data.draft as Record<string, unknown> | null;
  const hasTempsForts =
    ((draft?.highlights as unknown[]) ?? []).length > 0 ||
    !!(draft?.engagementStatement) ||
    ((draft?.goals as unknown[]) ?? []).length > 0;
  const hasAchats = ((data as any).suppliers as unknown[] ?? []).length > 0;

  // Numéros de chapitres dynamiques
  let chapterNum = 4; // après Planète (4)
  if (hasAchats)    chapterNum++; // Achats = 5 si présent
  chapterNum++; // Humain
  chapterNum++; // Gouvernance
  chapterNum++; // Feuille de route
  chapterNum++; // Impact Score
  chapterNum++; // Labels

  // Chapitres optionnels après Labels
  let floatingNum = chapterNum + 1;
  const captationNum    = hasCaptation  ? floatingNum++ : null;
  const tempsFortNum    = hasTempsForts ? floatingNum++ : null;
  const perspectivesNum = floatingNum++;
  const annexesNum      = floatingNum;

  if (data.isLoading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#FAFAFA" }}>
        <Toolbar />
        <LoadingReport />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#FAFAFA", minHeight: "100vh" }}>
      <Toolbar />

      <div
        id="report-content"
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "0 40px 80px",
          backgroundColor: "white",
          boxShadow: "0 0 40px rgba(0,0,0,0.06)",
        }}
      >
        {/* Couverture */}
        <ChapterCover data={data} year={YEAR} />

        {/* Sommaire */}
        <TableOfContents
          hasCaptation={hasCaptation}
          hasTempsForts={hasTempsForts}
          hasAchats={hasAchats}
        />

        {/* Chapitres */}
        <ChapterEditorial       data={data} />
        <ChapterQuiSommesNous   data={data} />
        <ChapterDemarcheRSE     data={data} ai={ai} />
        <ChapterPlanete         data={data} ai={ai} />

        {/* Achats responsables (conditionnel) */}
        {hasAchats && (
          <ChapterAchatsResponsables
            data={data}
            ai={ai}
            chapterNum={5}
          />
        )}

        <ChapterHumain          data={data} ai={ai} />
        <ChapterGouvernance     data={data} ai={ai} />
        <ChapterFeuilleDeRoute  data={data} ai={ai} />
        <ChapterImpactScore     data={data} ai={ai} />
        <ChapterLabels          data={data} />

        {hasCaptation && captationNum !== null && (
          <ChapterCaptation data={data} ai={ai} />
        )}
        {hasTempsForts && tempsFortNum !== null && (
          <ChapterTempsForts data={data} chapterNum={tempsFortNum} />
        )}

        <ChapterPerspectives data={data} chapterNum={perspectivesNum} />
        <ChapterAnnexes      data={data} chapterNum={annexesNum} />
      </div>

      {/* CSS print global */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 1.8cm 1.5cm;
          }

          #report-toolbar {
            display: none !important;
          }

          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          #report-content {
            max-width: 100% !important;
            padding: 0 !important;
            box-shadow: none !important;
          }

          .chapter-section {
            break-before: page;
            page-break-before: always;
          }

          .chapter-section > div > * {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          * {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
