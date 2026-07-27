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
import { ChapterCover }       from "./chapters/ChapterCover";
import { ChapterEditorial }   from "./chapters/ChapterEditorial";
import { ChapterQuiSommesNous } from "./chapters/ChapterQuiSommesNous";
import { ChapterDemarcheRSE } from "./chapters/ChapterDemarcheRSE";
import { ChapterPlanete }     from "./chapters/ChapterPlanete";
import { ChapterHumain }      from "./chapters/ChapterHumain";
import { ChapterGouvernance } from "./chapters/ChapterGouvernance";
import { ChapterFeuilleDeRoute } from "./chapters/ChapterFeuilleDeRoute";
import { ChapterImpactScore } from "./chapters/ChapterImpactScore";
import { ChapterLabels }      from "./chapters/ChapterLabels";
import { ChapterCaptation }   from "./chapters/ChapterCaptation";
import { ChapterTempsForts }  from "./chapters/ChapterTempsForts";
import { ChapterPerspectives } from "./chapters/ChapterPerspectives";
import { ChapterAnnexes }     from "./chapters/ChapterAnnexes";

const YEAR = new Date().getFullYear();

// ─── Barre d'outils (masquée à l'impression) ─────────────────────────────────

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

// ─── Table des matières ───────────────────────────────────────────────────────

function TableOfContents({ hasHigh, hasCaptation, hasTempsForts }: {
  hasHigh: boolean; hasCaptation: boolean; hasTempsForts: boolean;
}) {
  const chapters = [
    { num: 1, title: "Éditorial" },
    { num: 2, title: "Qui sommes-nous ?" },
    { num: 3, title: "Notre démarche RSE" },
    { num: 4, title: "Agir pour la planète" },
    { num: 5, title: "Placer l'humain au cœur" },
    { num: 6, title: "Piloter une entreprise responsable" },
    { num: 7, title: "Notre feuille de route" },
    { num: 8, title: "Mon Impact Score" },
    { num: 9, title: "Labels & Certifications" },
    ...(hasCaptation ? [{ num: 10, title: "Captation carbone" }] : []),
    ...(hasTempsForts ? [{ num: 11, title: "Temps forts & Engagements" }] : []),
    { num: 12, title: "Perspectives & Ambitions" },
    { num: 13, title: "Annexes & Glossaire" },
  ];

  return (
    <div style={{
      breakAfter: "page",
      pageBreakAfter: "always",
      padding: "40px 0",
    }}>
      <h2 style={{
        fontSize: 22, fontWeight: 700, color: "#1C2340",
        marginBottom: 24, fontFamily: "sans-serif",
        borderBottom: "3px solid #1F6B3A", paddingBottom: 10,
      }}>
        Sommaire
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {chapters.map((ch) => (
          <div key={ch.num} style={{
            display: "flex", alignItems: "center", gap: 10,
          }}>
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

// ─── Loading state ────────────────────────────────────────────────────────────

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

// ─── Composant principal ──────────────────────────────────────────────────────

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

  // Numéros de chapitres dynamiques
  let chapterNum = 10;
  const captationNum    = hasCaptation ? chapterNum++ : null;
  const tempsFortNum    = hasTempsForts ? chapterNum++ : null;
  const perspectivesNum = chapterNum++;
  const annexesNum      = chapterNum;

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
      {/* Barre outils */}
      <Toolbar />

      {/* Corps du rapport */}
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
          hasHigh={hasTempsForts}
          hasCaptation={hasCaptation}
          hasTempsForts={hasTempsForts}
        />

        {/* Chapitres */}
        <ChapterEditorial       data={data} />
        <ChapterQuiSommesNous   data={data} />
        <ChapterDemarcheRSE     data={data} ai={ai} />
        <ChapterPlanete         data={data} ai={ai} />
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

          /* Avoid breaks inside important blocks */
          .chapter-section > div > * {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* Tables should not split mid-row */
          tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          /* Remove shadows and backgrounds that don't print well */
          * {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
