/**
 * Visionneuse du rapport RSE illustré.
 * Charge toutes les données en parallèle, génère les analyses IA,
 * puis assemble tous les chapitres dans une mise en page print-optimisée.
 */
import { useLayoutEffect } from "react";
import { Link } from "wouter";
import { useModuleContext } from "@/hooks/useModuleContext";
import { useReportData } from "./useReportData";
import { useReportAI } from "./useReportAI";
import { ReportEditProvider, useReportEdit } from "./ReportEditContext";

// Chapitres
import { ChapterCover }              from "./chapters/ChapterCover";
import { ChapterIntroRSE }           from "./chapters/ChapterIntroRSE";
import { ChapterChiffresCles }       from "./chapters/ChapterChiffresCles";
import { ChapterEditorial }          from "./chapters/ChapterEditorial";
import { ChapterQuiSommesNous }      from "./chapters/ChapterQuiSommesNous";
import { ChapterDemarcheRSE }        from "./chapters/ChapterDemarcheRSE";
import { ChapterPlanete }            from "./chapters/ChapterPlanete";
import { ChapterAchatsResponsables } from "./chapters/ChapterAchatsResponsables";
import { ChapterHumain }             from "./chapters/ChapterHumain";
import { ChapterGouvernance }        from "./chapters/ChapterGouvernance";
import { ChapterFeuilleDeRoute }     from "./chapters/ChapterFeuilleDeRoute";
import { ChapterImpactScore }        from "./chapters/ChapterImpactScore";
import { ChapterLabels }             from "./chapters/ChapterLabels";
import { ChapterCaptation }          from "./chapters/ChapterCaptation";
import { ChapterTempsForts }         from "./chapters/ChapterTempsForts";
import { ChapterPerspectives }       from "./chapters/ChapterPerspectives";
import { ChapterAnnexes }            from "./chapters/ChapterAnnexes";
import { ChapterNotesLibres }        from "./chapters/ChapterNotesLibres";

const YEAR = new Date().getFullYear();

// ─── Barre d'outils ────────────────────────────────────────────────────────────

function Toolbar({ orgId }: { orgId: number | null }) {
  const { editMode, toggleEditMode } = useReportEdit();

  const handlePrint = () => {
    const previousTitle = document.title;
    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };

    document.title = "Rapport RSE Cocci";
    window.addEventListener("afterprint", restoreTitle);
    window.print();
  };

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
        {/* Bouton édition */}
        <button
          onClick={toggleEditMode}
          style={{
            backgroundColor: editMode ? "#1F6B3A" : "white",
            color: editMode ? "white" : "#1F6B3A",
            border: "1px solid #1F6B3A",
            borderRadius: 8,
            padding: "9px 18px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "sans-serif",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
          title={editMode ? "Quitter le mode édition" : "Modifier les blocs de texte"}
        >
          {editMode ? "✓ Terminer l'édition" : "✏ Modifier le rapport"}
        </button>

        {editMode && (
          <span style={{
            fontSize: 11, color: "#f97316",
            backgroundColor: "#fff7ed", border: "1px solid #fed7aa",
            padding: "4px 10px", borderRadius: 6,
            fontFamily: "sans-serif",
          }}>
            Les modifications sont sauvegardées automatiquement
          </span>
        )}

        {!editMode && (
          <button
            onClick={handlePrint}
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
        )}
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
  let n = 1;
  const chapters = [
    { num: n++, title: "Éditorial" },
    // (L'intro RSE est une page non numérotée avant l'éditorial)
    { num: n++, title: "Qui sommes-nous ?" },
    { num: n++, title: "Notre démarche RSE" },
    { num: n++, title: "Agir pour la planète" },
    ...(hasAchats ? [{ num: n++, title: "Achats responsables" }] : []),
    { num: n++, title: "Placer l'humain au cœur de notre développement" },
    { num: n++, title: "Piloter une entreprise responsable" },
    { num: n++, title: "Notre feuille de route" },
    { num: n++, title: "Mon Impact Score" },
    { num: n++, title: "Nos labels et engagements" },
    ...(hasCaptation ? [{ num: n++, title: "Notre captation carbone" }] : []),
    ...(hasTempsForts ? [{ num: n++, title: "Les temps forts de l'année" }] : []),
    { num: n++, title: "Les 10 chiffres clés" },
    { num: n++, title: "Perspectives" },
    { num: n++, title: "Annexes" },
    { num: n++, title: "Notes complémentaires" },
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

// ─── Contenu du rapport ────────────────────────────────────────────────────────

function ReportContent({ orgId }: { orgId: number | null }) {
  const data = useReportData(orgId ?? null);
  const ai   = useReportAI(data, orgId ?? null);

  const hasCaptation = !!(data.captation as Record<string, unknown> | null)?.captationKgPerYear;
  const draft = data.draft as Record<string, unknown> | null;
  const hasTempsForts =
    ((draft?.highlights as unknown[]) ?? []).length > 0 ||
    !!(draft?.engagementStatement) ||
    ((draft?.goals as unknown[]) ?? []).length > 0;
  const hasAchats = ((data as any).suppliers as unknown[] ?? []).length > 0;

  // Numéros dynamiques
  let n = 4;
  const achatsNum     = hasAchats ? ++n : null;
  const humainNum     = ++n;
  const gouv          = ++n;
  const fdr           = ++n;
  const impact        = ++n;
  const labels        = ++n;
  const captNum       = hasCaptation  ? ++n : null;
  const tempsNum      = hasTempsForts ? ++n : null;
  const chiffresNum   = ++n;
  const perspNum      = ++n;
  const annexesNum    = ++n;
  const notesNum      = ++n;

  if (data.isLoading) return <LoadingReport />;

  return (
    <>
      <ChapterCover data={data} year={YEAR} />
      <TableOfContents hasCaptation={hasCaptation} hasTempsForts={hasTempsForts} hasAchats={hasAchats} />

      <ChapterIntroRSE />
      <ChapterEditorial data={data} />
      <ChapterQuiSommesNous data={data} />
      <ChapterDemarcheRSE data={data} ai={ai} />
      <ChapterPlanete data={data} ai={ai} />

      {hasAchats && achatsNum !== null && (
        <ChapterAchatsResponsables data={data} ai={ai} chapterNum={achatsNum} />
      )}

      <ChapterHumain data={data} ai={ai} />
      <ChapterGouvernance data={data} ai={ai} />
      <ChapterFeuilleDeRoute data={data} ai={ai} />
      <ChapterImpactScore data={data} ai={ai} />
      <ChapterLabels data={data} />

      {hasCaptation && captNum !== null && <ChapterCaptation data={data} ai={ai} />}
      {hasTempsForts && tempsNum !== null && <ChapterTempsForts data={data} chapterNum={tempsNum} />}

      <ChapterChiffresCles data={data} chapterNum={chiffresNum} />
      <ChapterPerspectives data={data} chapterNum={perspNum} />
      <ChapterAnnexes data={data} chapterNum={annexesNum} />
      <ChapterNotesLibres chapterNum={notesNum} />

      {/* ─── Pied de rapport ─────────────────────────────────────────── */}
      <div style={{
        marginTop: 64,
        paddingTop: 24,
        borderTop: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        color: "#9ca3af",
        fontSize: 12,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.6 }}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="currentColor"/>
        </svg>
        <span>Rapport généré avec <strong style={{ color: "#6b7280" }}>Cocci</strong> · Plateforme RSE</span>
      </div>
    </>
  );
}

// ─── Composant principal ───────────────────────────────────────────────────────

export function ReportViewer() {
  const { effectiveOrgId } = useModuleContext("group");

  useLayoutEffect(() => {
    const previousTitle = document.title;
    document.title = "Rapport RSE Cocci";

    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <ReportEditProvider orgId={effectiveOrgId ?? null}>
      <div style={{ backgroundColor: "#FAFAFA", minHeight: "100vh" }}>
        <Toolbar orgId={effectiveOrgId ?? null} />

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
          <ReportContent orgId={effectiveOrgId ?? null} />
        </div>

        {/* CSS print global */}
        <style>{`
          @media print {
            @page { size: A4; margin: 1.8cm 1.5cm; }
            #report-toolbar { display: none !important; }
            body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            #report-content { max-width: 100% !important; padding: 0 !important; box-shadow: none !important; }
            .chapter-section { break-before: page; page-break-before: always; }
            .chapter-section > div > * { break-inside: avoid; page-break-inside: avoid; }
            tr { break-inside: avoid; page-break-inside: avoid; }
            * { box-shadow: none !important; }
            textarea { display: none !important; }
          }
        `}</style>
      </div>
    </ReportEditProvider>
  );
}
