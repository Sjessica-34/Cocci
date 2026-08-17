// ── Export PDF des résultats Numérique Responsable ────────────────────────────
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  PILLARS, MACRO_PILLARS, maturityLabel, computeMacroPillarData,
} from "./data";

interface Scores {
  globalScore: number;
  pillarPcts: Record<string, number>;
  totalChecked: number;
  totalPossible: number;
}

const GREEN: [number, number, number] = [16, 185, 129];
const GRAY: [number, number, number] = [107, 114, 128];

export function exportNrResultsPdf(scores: Scores, responsesMap: Record<string, boolean>) {
  const { globalScore, pillarPcts, totalChecked, totalPossible } = scores;
  const globalPct = totalPossible > 0 ? Math.round((totalChecked / totalPossible) * 100) : 0;
  const maturity = maturityLabel(globalPct);
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // ── En-tête ──
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pageW, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Numérique Responsable — Résultats de l'évaluation", 14, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Export généré le ${today}`, 14, 19);

  // ── KPIs globaux ──
  doc.setTextColor(0, 0, 0);
  let y = 38;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Synthèse globale", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Score global", "Niveau de maturité", "Critères validés"]],
    body: [[`${globalScore} / 500 (${globalPct}%)`, maturity.label, `${totalChecked} / ${totalPossible}`]],
    theme: "grid",
    headStyles: { fillColor: GREEN, fontSize: 9 },
    bodyStyles: { fontSize: 10, halign: "center" },
    styles: { cellPadding: 3 },
  });

  // ── Scores par pilier (7 piliers) ──
  y = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text("Scores par pilier", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Pilier", "Score", "Maturité"]],
    body: PILLARS.map((p) => {
      const pct = pillarPcts[p.id] ?? 0;
      return [p.title, `${pct}%`, maturityLabel(pct).label];
    }),
    theme: "striped",
    headStyles: { fillColor: GREEN, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: "center", cellWidth: 20 }, 2: { cellWidth: 32 } },
  });

  // ── Vue par grands piliers (macro) ──
  y = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text("Vue par grands piliers", 14, y);
  y += 4;

  const macroRows: string[][] = [];
  for (const mp of MACRO_PILLARS) {
    const { pct, radarData } = computeMacroPillarData(mp, pillarPcts, responsesMap);
    macroRows.push([`${mp.title}`, `${pct}%`, ""]);
    for (const axis of radarData) {
      macroRows.push([`    • ${axis.name}`, `${axis.value}%`, ""]);
    }
  }
  autoTable(doc, {
    startY: y,
    head: [["Axe", "Score", ""]],
    body: macroRows,
    theme: "striped",
    headStyles: { fillColor: GREEN, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: "center", cellWidth: 20 }, 2: { cellWidth: 2 } },
    didParseCell: (data) => {
      if (data.section === "body" && !String((data.row.raw as string[])?.[0] ?? "").startsWith("    •")) {
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  // ── Détail des critères ──
  doc.addPage();
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Détail du référentiel", 14, 16);

  const detailRows: string[][] = [];
  for (const pillar of PILLARS) {
    detailRows.push([`${pillar.title}`, ""]);
    for (const section of pillar.sections) {
      for (const cr of section.criteria) {
        if (cr.isSpecial) continue;
        detailRows.push([`    ${cr.label}`, responsesMap[cr.id] ? "Validé" : "—"]);
      }
    }
  }
  autoTable(doc, {
    startY: 20,
    head: [["Critère", "Statut"]],
    body: detailRows,
    theme: "striped",
    headStyles: { fillColor: GREEN, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 1: { halign: "center", cellWidth: 20 } },
    didParseCell: (data) => {
      if (data.section === "body") {
        const isHeader = !String((data.row.raw as string[])?.[0] ?? "").startsWith("    ");
        if (isHeader) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [236, 253, 245];
        } else if (data.column.index === 1 && data.cell.text[0] === "Validé") {
          data.cell.styles.textColor = GREEN;
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  // Pied de page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(`Numérique Responsable — page ${i}/${pageCount}`, pageW - 14, doc.internal.pageSize.getHeight() - 8, { align: "right" });
  }

  doc.save(`resultats-numerique-responsable-${new Date().toISOString().slice(0, 10)}.pdf`);
}
