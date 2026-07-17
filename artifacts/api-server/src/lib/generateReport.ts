import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle, ImageRun, PageBreak, Header, Footer,
  ShadingType, convertInchesToTwip, UnderlineType,
} from "docx";
import { eq, and } from "drizzle-orm";
import {
  db,
  rseReportDraftsTable, organizationsTable, exercisesTable,
  impactScoreResultsTable, diagnosticResponsesTable,
  carbonBilansTable, captationCarboneTable,
  bioDependenciesTable, stakeholdersTable, suppliersTable,
  nrResponsesTable, nrMetaTable,
  employmentWorkforceTable, employmentDiversityTable, employmentTrainingTable,
  labelsTable, organizationActionPlansTable, actionLibraryTable,
  barometreCampaignsTable, barometreAiSummariesTable,
} from "@workspace/db";
import { ALL_SUBCATEGORIES, getMaturityLabel, COMPLETENESS_THRESHOLD } from "@workspace/rse-referentials";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GREEN = "2D6A4F";
const DARK = "1A1A2E";
const GRAY = "6B7280";
const LIGHT_GREEN_BG = "F0FDF4";

function h(text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1, pageBreak = false): Paragraph {
  return new Paragraph({
    text,
    heading: level,
    pageBreakBefore: pageBreak,
    spacing: { before: pageBreak ? 0 : 200, after: 120 },
  });
}

function p(text: string, opts: { bold?: boolean; color?: string; size?: number; center?: boolean; italic?: boolean; spacing?: number } = {}): Paragraph {
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    spacing: { after: opts.spacing ?? 100 },
    children: [new TextRun({
      text,
      bold: opts.bold,
      color: opts.color,
      size: opts.size,
      italics: opts.italic,
      font: "Calibri",
    })],
  });
}

function kpi(label: string, value: string, unit = ""): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: `${label} : `, bold: true, size: 22, font: "Calibri" }),
      new TextRun({ text: `${value}${unit ? " " + unit : ""}`, size: 22, color: GREEN, font: "Calibri" }),
    ],
  });
}

function sectionTitle(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    text,
    spacing: { before: 160, after: 80 },
  });
}

function divider(): Paragraph {
  return new Paragraph({
    text: "─────────────────────────────────────────────",
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text: "──────────────────────────────────", color: "D1FAE5", size: 14 })],
  });
}

function simpleTable(headers: string[], rows: string[][], widths?: number[]): Table {
  const totalWidth = 9200;
  const colCount = headers.length;
  const colWidths = widths ?? Array(colCount).fill(Math.floor(totalWidth / colCount));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) =>
          new TableCell({
            width: { size: colWidths[i], type: WidthType.DXA },
            shading: { fill: "2D6A4F", type: ShadingType.SOLID },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 20, font: "Calibri" })],
            })],
          }),
        ),
      }),
      ...rows.map((row, ri) =>
        new TableRow({
          children: row.map((cell, i) =>
            new TableCell({
              width: { size: colWidths[i], type: WidthType.DXA },
              shading: ri % 2 === 0 ? { fill: "F9FAFB", type: ShadingType.SOLID } : undefined,
              children: [new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 0 },
                children: [new TextRun({ text: cell, size: 19, font: "Calibri" })],
              })],
            }),
          ),
        }),
      ),
    ],
  });
}

function spacer(lines = 1): Paragraph {
  return new Paragraph({ text: "", spacing: { after: lines * 100 } });
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

// ─── Data loading ─────────────────────────────────────────────────────────────

async function loadReportData(orgId: number, exerciseId: number, year: number) {
  const prevYear = year - 1;

  const [
    [org], [exercise], [draft],
    [impactScore], workforce, diversity, training,
    carbonRows, [captation],
    bioItems, stakeholderItems, supplierItems,
    nrResponses, [nrMeta],
    labelItems, actionItems,
    diagResponses,
    [baroCampaign],
  ] = await Promise.all([
    db.select().from(organizationsTable).where(eq(organizationsTable.id, orgId)).limit(1),
    db.select().from(exercisesTable).where(eq(exercisesTable.id, exerciseId)).limit(1),
    db.select().from(rseReportDraftsTable).where(and(eq(rseReportDraftsTable.organizationId, orgId), eq(rseReportDraftsTable.exerciseId, exerciseId))).limit(1),
    db.select().from(impactScoreResultsTable).where(and(eq(impactScoreResultsTable.organizationId, orgId), eq(impactScoreResultsTable.exerciseId, exerciseId))).limit(1),
    db.select().from(employmentWorkforceTable).where(and(eq(employmentWorkforceTable.organizationId, orgId), eq(employmentWorkforceTable.exerciseId, exerciseId))).limit(1),
    db.select().from(employmentDiversityTable).where(and(eq(employmentDiversityTable.organizationId, orgId), eq(employmentDiversityTable.exerciseId, exerciseId))).limit(1),
    db.select().from(employmentTrainingTable).where(and(eq(employmentTrainingTable.organizationId, orgId), eq(employmentTrainingTable.exerciseId, exerciseId))).limit(1),
    db.select().from(carbonBilansTable).where(and(eq(carbonBilansTable.organizationId, orgId), eq(carbonBilansTable.exerciseId, exerciseId))),
    db.select().from(captationCarboneTable).where(and(eq(captationCarboneTable.organizationId, orgId), eq(captationCarboneTable.exerciseId, exerciseId))).limit(1),
    db.select().from(bioDependenciesTable).where(and(eq(bioDependenciesTable.organizationId, orgId), eq(bioDependenciesTable.exerciseId, exerciseId))),
    db.select().from(stakeholdersTable).where(eq(stakeholdersTable.organizationId, orgId)),
    db.select().from(suppliersTable).where(eq(suppliersTable.organizationId, orgId)),
    db.select().from(nrResponsesTable).where(and(eq(nrResponsesTable.organizationId, orgId), eq(nrResponsesTable.exerciseId, exerciseId))),
    db.select().from(nrMetaTable).where(and(eq(nrMetaTable.organizationId, orgId), eq(nrMetaTable.exerciseId, exerciseId))).limit(1),
    db.select().from(labelsTable).where(eq(labelsTable.organizationId, orgId)),
    db.select({
      id: organizationActionPlansTable.id,
      isChecked: organizationActionPlansTable.isChecked,
      customName: organizationActionPlansTable.customName,
      source: organizationActionPlansTable.source,
      libraryName: actionLibraryTable.name,
      category: actionLibraryTable.category,
      subcategory: actionLibraryTable.subcategory,
    }).from(organizationActionPlansTable)
      .leftJoin(actionLibraryTable, eq(organizationActionPlansTable.libraryActionId, actionLibraryTable.id))
      .where(eq(organizationActionPlansTable.organizationId, orgId)),
    db.select().from(diagnosticResponsesTable).where(and(eq(diagnosticResponsesTable.organizationId, orgId), eq(diagnosticResponsesTable.exerciseId, exerciseId))),
    db.select().from(barometreCampaignsTable).where(eq(barometreCampaignsTable.organizationId, orgId)).orderBy(barometreCampaignsTable.createdAt).limit(1),
  ]);

  const baroSummaries = baroCampaign
    ? await db.select().from(barometreAiSummariesTable).where(eq(barometreAiSummariesTable.campaignId, baroCampaign.id))
    : [];

  // Compute diagnostic scores
  const responseMap = new Map<string, number>();
  for (const r of diagResponses) responseMap.set(r.questionId, r.level);
  const diagScores = ALL_SUBCATEGORIES.map((sub) => {
    const answered = sub.questions.filter((q) => responseMap.has(q.id)).length;
    const sumLevels = sub.questions.reduce((acc, q) => acc + (responseMap.get(q.id) ?? 0), 0);
    const completeness = sub.questions.length > 0 ? answered / sub.questions.length : 0;
    const hasEnoughData = completeness >= COMPLETENESS_THRESHOLD;
    const scorePercent = hasEnoughData ? Math.round((sumLevels / (answered * 3)) * 100) : null;
    return { subcategoryId: sub.id, categoryId: sub.categoryId, label: sub.label, scorePercent, answered, totalQuestions: sub.questions.length };
  });

  const axisScore = (catId: string) => {
    const cat = diagScores.filter((s) => s.categoryId === catId && s.scorePercent != null);
    if (!cat.length) return null;
    return Math.round(cat.reduce((s, x) => s + (x.scorePercent ?? 0), 0) / cat.length);
  };

  // Carbon total (sum of all numeric emission fields)
  const carbonTotal = carbonRows.reduce((sum, b) => {
    const fields = [
      b.energie1, b.energie2, b.horsEnergie1, b.horsEnergie2,
      b.intrantsBiens, b.intrantsServices, b.futursEmballages,
      b.fret, b.deplacements, b.dechetsDirects,
      b.immobilisations, b.utilisation, b.finDeVie,
    ];
    return sum + fields.reduce((a, v) => a + (v != null ? Number(v) : 0), 0);
  }, 0);

  // NR score
  const nrChecked = nrResponses.filter((r) => r.checked).length;
  const nrScore = nrResponses.length > 0 ? Math.round((nrChecked / nrResponses.length) * 100) : 0;

  // Labels obtained
  const obtainedLabels = labelItems.filter((l) => l.year != null);

  // Action plan stats
  const doneActions = actionItems.filter((a) => a.isChecked).length;
  const actionRate = actionItems.length > 0 ? Math.round((doneActions / actionItems.length) * 100) : 0;

  const wf = workforce[0] ?? null;
  const div = diversity[0] ?? null;
  const tr = training[0] ?? null;

  return {
    org, exercise, draft: draft ?? null,
    impactScore: impactScore ?? null,
    wf, div, tr,
    carbonRows, carbonTotal,
    captation: captation ?? null,
    bioItems, stakeholderItems, supplierItems,
    nrScore, nrMeta: nrMeta ?? null,
    obtainedLabels, labelItems,
    actionItems, doneActions, actionRate,
    diagScores,
    envScore: axisScore("ENV"), socScore: axisScore("SOC"), govScore: axisScore("GOV"),
    baroCampaign: baroCampaign ?? null,
    baroSummaries,
  };
}

// ─── Chapter builders ─────────────────────────────────────────────────────────

function buildEditorial(draft: typeof rseReportDraftsTable.$inferSelect | null): (Paragraph | Table)[] {
  const content = draft?.editorialContent;
  const author = draft?.editorialAuthor;
  const role = draft?.editorialAuthorRole;

  if (!content) {
    return [
      h("1. Éditorial", HeadingLevel.HEADING_1, true),
      p("L'éditorial n'a pas encore été rédigé.", { italic: true, color: GRAY }),
    ];
  }

  const parts: Paragraph[] = [h("1. Éditorial", HeadingLevel.HEADING_1, true)];
  content.split("\n\n").filter(Boolean).forEach((para) => parts.push(p(para)));
  if (author) {
    parts.push(spacer());
    parts.push(p(`${author}${role ? `, ${role}` : ""}`, { bold: true }));
  }
  return parts;
}

function buildQuiSommesNous(draft: typeof rseReportDraftsTable.$inferSelect | null, data: Awaited<ReturnType<typeof loadReportData>>): (Paragraph | Table)[] {
  const parts: (Paragraph | Table)[] = [h("2. Qui sommes-nous ?", HeadingLevel.HEADING_1, true)];

  if (draft?.companyDescription) {
    parts.push(p(draft.companyDescription));
  }

  // Mission
  if (draft?.companyMission) {
    parts.push(sectionTitle("Notre mission"));
    if (draft.isMissionEntreprise) {
      parts.push(p("✓ Entreprise à mission", { bold: true, color: GREEN }));
    }
    parts.push(p(draft.companyMission));
  }

  // Vision
  if (draft?.companyVision) {
    parts.push(sectionTitle("Notre vision"));
    parts.push(p(draft.companyVision));
  }

  // Valeurs
  if (draft?.companyValues) {
    parts.push(sectionTitle("Nos valeurs"));
    parts.push(p(draft.companyValues));
  }

  // Chiffres clés automatiques
  parts.push(sectionTitle("Chiffres clés"));
  const kpis: [string, string][] = [];
  if (data.wf?.totalHeadcount) kpis.push(["Effectif total", `${data.wf.totalHeadcount} collaborateurs`]);
  if (data.obtainedLabels.length > 0) kpis.push(["Labels obtenus", `${data.obtainedLabels.length}`]);
  if (data.impactScore) kpis.push(["Impact Score", `${data.impactScore.score}/100`]);
  if (data.carbonTotal > 0) kpis.push(["Émissions GES", `${Math.round(data.carbonTotal)} tCO₂e`]);
  if (kpis.length > 0) {
    kpis.forEach(([l, v]) => parts.push(kpi(l, v)));
  }
  if (draft?.companyKeyFigures) {
    parts.push(spacer());
    parts.push(p(draft.companyKeyFigures));
  }

  // Historique
  const timeline = (draft?.timeline as Array<{ date: string; title: string; description: string }> | null) ?? [];
  if (timeline.length > 0) {
    parts.push(sectionTitle("Notre historique"));
    const rows = timeline.map((e) => [e.date, e.title, e.description]);
    parts.push(simpleTable(["Date", "Événement", "Description"], rows, [1500, 2500, 5200]));
  }

  return parts;
}

function buildDemarcheRSE(data: Awaited<ReturnType<typeof loadReportData>>, draft: typeof rseReportDraftsTable.$inferSelect | null): (Paragraph | Table)[] {
  const parts: (Paragraph | Table)[] = [h("3. Notre démarche RSE", HeadingLevel.HEADING_1, true)];

  if (draft?.reportScope) {
    parts.push(sectionTitle("Périmètre du rapport"));
    parts.push(p(draft.reportScope));
  }

  if (draft?.reportMethodology) {
    parts.push(sectionTitle("Méthodologie"));
    parts.push(p(draft.reportMethodology));
  }

  // Parties prenantes
  if (data.stakeholderItems.length > 0) {
    parts.push(sectionTitle("Parties prenantes"));
    parts.push(kpi("Nombre de parties prenantes cartographiées", `${data.stakeholderItems.length}`));
    const rows = data.stakeholderItems.slice(0, 10).map((s) => [s.name ?? "", s.category ?? "", `Influence ${s.influence}/5 — Intérêt ${s.interest}/5`]);
    if (rows.length) parts.push(simpleTable(["Nom", "Catégorie", "Relation"], rows, [3000, 2500, 3700]));
  }

  // Diagnostic RSE - overview
  parts.push(sectionTitle("Maturité RSE — Vue d'ensemble"));
  const scoreRows = [
    ["Environnement", data.envScore != null ? `${data.envScore}%` : "Non évalué", data.envScore != null ? getMaturityLabel(data.envScore) ?? "" : "—"],
    ["Social", data.socScore != null ? `${data.socScore}%` : "Non évalué", data.socScore != null ? getMaturityLabel(data.socScore) ?? "" : "—"],
    ["Gouvernance", data.govScore != null ? `${data.govScore}%` : "Non évalué", data.govScore != null ? getMaturityLabel(data.govScore) ?? "" : "—"],
  ];
  parts.push(simpleTable(["Axe RSE", "Score", "Niveau"], scoreRows, [3500, 2000, 3700]));

  return parts;
}

function buildPlanete(data: Awaited<ReturnType<typeof loadReportData>>): (Paragraph | Table)[] {
  const parts: (Paragraph | Table)[] = [h("4. Agir pour la planète", HeadingLevel.HEADING_1, true)];

  // Diagnostic ENV
  const envScores = data.diagScores.filter((s) => s.categoryId === "ENV" && s.scorePercent != null);
  if (envScores.length > 0) {
    parts.push(sectionTitle("Diagnostic environnemental"));
    const rows = envScores.map((s) => [s.label, `${s.scorePercent}%`, getMaturityLabel(s.scorePercent) ?? "—"]);
    parts.push(simpleTable(["Sous-catégorie", "Score", "Niveau"], rows));
  }

  // Bilan carbone
  if (data.carbonRows.length > 0) {
    parts.push(sectionTitle("Bilan carbone"));
    parts.push(kpi("Émissions totales", `${Math.round(data.carbonTotal)}`, "tCO₂e"));
    const carbonTableRows = data.carbonRows.map((b) => {
      const s1 = [b.energie1, b.horsEnergie1].reduce((a, v) => a + (v ? Number(v) : 0), 0);
      const s2 = [b.energie2, b.horsEnergie2].reduce((a, v) => a + (v ? Number(v) : 0), 0);
      const s3 = [b.intrantsBiens, b.intrantsServices, b.futursEmballages, b.fret, b.deplacements, b.dechetsDirects, b.immobilisations, b.utilisation, b.finDeVie]
        .reduce((a, v) => a + (v ? Number(v) : 0), 0);
      return [
        s1 > 0 ? `${Math.round(s1)} tCO₂e` : "—",
        s2 > 0 ? `${Math.round(s2)} tCO₂e` : "—",
        s3 > 0 ? `${Math.round(s3)} tCO₂e` : "—",
      ];
    });
    if (carbonTableRows.length) {
      parts.push(simpleTable(["Scope 1", "Scope 2", "Scope 3"], carbonTableRows));
    }
  }

  // Biodiversité
  if (data.bioItems.length > 0) {
    parts.push(sectionTitle("Biodiversité & dépendances naturelles"));
    parts.push(kpi("Dépendances identifiées", `${data.bioItems.length}`));
    const bioByCategory = data.bioItems.reduce<Record<string, number>>((acc, b) => {
      acc[b.category ?? "Autre"] = (acc[b.category ?? "Autre"] ?? 0) + 1;
      return acc;
    }, {});
    const bioRows = Object.entries(bioByCategory).map(([cat, count]) => [cat, `${count}`]);
    if (bioRows.length) parts.push(simpleTable(["Catégorie", "Nombre"], bioRows, [6000, 3200]));
  }

  // Numérique responsable
  parts.push(sectionTitle("Numérique responsable"));
  parts.push(kpi("Score", `${data.nrScore}`, "%"));
  if (data.nrMeta?.certificationLabel) {
    parts.push(kpi("Niveau", data.nrMeta.certificationLabel));
  }

  // Achats responsables
  if (data.supplierItems.length > 0) {
    parts.push(sectionTitle("Achats & fournisseurs responsables"));
    const evalCount = data.supplierItems.filter((s) => s.rsePolicy || s.evalComments).length;
    const certCount = data.supplierItems.filter((s) => s.certifications).length;
    parts.push(kpi("Fournisseurs référencés", `${data.supplierItems.length}`));
    parts.push(kpi("Évalués RSE", `${evalCount}`));
    parts.push(kpi("Certifiés", `${certCount}`));
  }

  return parts;
}

function buildHumain(data: Awaited<ReturnType<typeof loadReportData>>): (Paragraph | Table)[] {
  const parts: (Paragraph | Table)[] = [h("5. Placer l'humain au cœur de notre développement", HeadingLevel.HEADING_1, true)];

  const { wf, div, tr } = data;

  // Capital humain
  if (wf) {
    parts.push(sectionTitle("Capital humain — Effectifs"));
    const wfRows: string[][] = [];
    if (wf.totalHeadcount) wfRows.push(["Effectif total", `${wf.totalHeadcount}`]);
    if (wf.nbCdi) wfRows.push(["CDI", `${wf.nbCdi}`]);
    if (wf.nbCdd) wfRows.push(["CDD", `${wf.nbCdd}`]);
    if (wf.nbAlternants) wfRows.push(["Alternants", `${wf.nbAlternants}`]);
    if (wf.nbRecrutements) wfRows.push(["Recrutements", `${wf.nbRecrutements}`]);
    if (wf.nbDeparts) wfRows.push(["Départs", `${wf.nbDeparts}`]);
    if (wfRows.length) parts.push(simpleTable(["Indicateur", "Valeur"], wfRows, [5000, 4200]));
  }

  // Diversité
  if (div) {
    parts.push(sectionTitle("Diversité & Inclusion"));
    const divRows: string[][] = [];
    if (div.nbHommes && div.nbFemmes && wf?.totalHeadcount) {
      const feRate = Math.round((div.nbFemmes / wf.totalHeadcount) * 100);
      divRows.push(["Taux de féminisation", `${feRate}%`]);
    }
    if (div.nbHandicap) divRows.push(["Collaborateurs en situation de handicap", `${div.nbHandicap}`]);
    if (divRows.length) parts.push(simpleTable(["Indicateur", "Valeur"], divRows, [5000, 4200]));
  }

  // Formation
  if (tr) {
    parts.push(sectionTitle("Formation & Développement des compétences"));
    const trRows: string[][] = [];
    if (tr.nbCollaborateursFormes) trRows.push(["Collaborateurs formés", `${tr.nbCollaborateursFormes}`]);
    if (tr.nbHeuresFormation) trRows.push(["Heures de formation", `${tr.nbHeuresFormation}`]);
    if (wf?.totalHeadcount && tr.nbCollaborateursFormes) {
      trRows.push(["Taux de formation", `${Math.round((tr.nbCollaborateursFormes / wf.totalHeadcount) * 100)}%`]);
    }
    if (trRows.length) parts.push(simpleTable(["Indicateur", "Valeur"], trRows, [5000, 4200]));
  }

  // Diagnostic SOC
  const socScores = data.diagScores.filter((s) => s.categoryId === "SOC" && s.scorePercent != null);
  if (socScores.length > 0) {
    parts.push(sectionTitle("Diagnostic social"));
    const rows = socScores.map((s) => [s.label, `${s.scorePercent}%`, getMaturityLabel(s.scorePercent) ?? "—"]);
    parts.push(simpleTable(["Sous-catégorie", "Score", "Niveau"], rows));
  }

  // Baromètre social
  if (data.baroCampaign && data.baroSummaries.length > 0) {
    parts.push(sectionTitle("Baromètre Social"));
    const summary = data.baroSummaries[0];
    if (summary?.summary) {
      parts.push(p(summary.summary));
    }
  }

  return parts;
}

function buildGouvernance(data: Awaited<ReturnType<typeof loadReportData>>): (Paragraph | Table)[] {
  const parts: (Paragraph | Table)[] = [h("6. Piloter une entreprise responsable", HeadingLevel.HEADING_1, true)];

  // Diagnostic GOV
  const govScores = data.diagScores.filter((s) => s.categoryId === "GOV");
  if (govScores.length > 0) {
    parts.push(sectionTitle("Diagnostic de gouvernance"));
    const rows = govScores.map((s) => [
      s.label,
      s.scorePercent != null ? `${s.scorePercent}%` : "—",
      s.scorePercent != null ? getMaturityLabel(s.scorePercent) ?? "—" : "Non évalué",
      `${s.answered}/${s.totalQuestions} réponses`,
    ]);
    parts.push(simpleTable(["Sous-catégorie", "Score", "Niveau", "Avancement"], rows, [3200, 1600, 2000, 2400]));
  }

  // Fournisseurs (relations)
  if (data.supplierItems.length > 0) {
    parts.push(sectionTitle("Relations fournisseurs"));
    parts.push(kpi("Fournisseurs référencés", `${data.supplierItems.length}`));
  }

  return parts;
}

function buildFeuilleDeRoute(data: Awaited<ReturnType<typeof loadReportData>>): (Paragraph | Table)[] {
  const parts: (Paragraph | Table)[] = [h("7. Notre feuille de route", HeadingLevel.HEADING_1, true)];

  parts.push(kpi("Actions planifiées", `${data.actionItems.length}`));
  parts.push(kpi("Actions réalisées", `${data.doneActions}`));
  parts.push(kpi("Taux de réalisation", `${data.actionRate}`, "%"));
  parts.push(spacer());

  if (data.actionItems.length > 0) {
    const byCategory = data.actionItems.reduce<Record<string, typeof data.actionItems>>((acc, a) => {
      const cat = a.category ?? "Autre";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(a);
      return acc;
    }, {});

    for (const [cat, actions] of Object.entries(byCategory)) {
      parts.push(sectionTitle(cat));
      const rows = actions.map((a) => [
        a.isChecked ? "✓" : "○",
        a.libraryName ?? a.customName ?? "—",
        a.subcategory ?? "",
      ]);
      parts.push(simpleTable(["Statut", "Action", "Sous-catégorie"], rows, [1200, 5000, 3000]));
    }
  }

  return parts;
}

function buildImpactScore(data: Awaited<ReturnType<typeof loadReportData>>): (Paragraph | Table)[] {
  const parts: (Paragraph | Table)[] = [h("8. Mon Impact Score", HeadingLevel.HEADING_1, true)];

  if (!data.impactScore) {
    parts.push(p("L'Impact Score n'a pas encore été renseigné.", { italic: true, color: GRAY }));
    return parts;
  }

  const { impactScore } = data;
  parts.push(spacer());
  parts.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [new TextRun({ text: `${impactScore.score}`, bold: true, size: 96, color: GREEN, font: "Calibri" })],
  }));
  parts.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: "/100", size: 36, color: GRAY, font: "Calibri" })],
  }));

  if (impactScore.dateRealisation) {
    parts.push(p(`Date de réalisation : ${impactScore.dateRealisation}`, { center: true, color: GRAY }));
  }

  const pilierRows: string[][] = [];
  if (impactScore.limitationImpactsNegatifs != null) pilierRows.push(["Limitation des impacts négatifs", `${impactScore.limitationImpactsNegatifs}/100`]);
  if (impactScore.partageValeurPouvoir != null) pilierRows.push(["Partage de la valeur et du pouvoir", `${impactScore.partageValeurPouvoir}/100`]);
  if (impactScore.strategieImpactPositif != null) pilierRows.push(["Stratégie à impact positif", `${impactScore.strategieImpactPositif}/100`]);
  if (pilierRows.length > 0) {
    parts.push(spacer());
    parts.push(sectionTitle("Répartition par pilier"));
    parts.push(simpleTable(["Pilier", "Score"], pilierRows, [6500, 2700]));
  }

  if (impactScore.commentaire) {
    parts.push(spacer());
    parts.push(p(impactScore.commentaire));
  }

  return parts;
}

function buildLabels(data: Awaited<ReturnType<typeof loadReportData>>): (Paragraph | Table)[] {
  const parts: (Paragraph | Table)[] = [h("9. Nos labels et engagements", HeadingLevel.HEADING_1, true)];

  if (data.labelItems.length === 0) {
    parts.push(p("Aucun label ou certification renseigné.", { italic: true, color: GRAY }));
    return parts;
  }

  const obtained = data.labelItems.filter((l) => l.year != null);
  const inProgress = data.labelItems.filter((l) => l.year == null);

  if (obtained.length > 0) {
    parts.push(sectionTitle(`Labels obtenus (${obtained.length})`));
    const rows = obtained.map((l) => [l.name ?? "", l.holder ?? "—", l.year ? `${l.year}` : "—", l.score ?? "—"]);
    parts.push(simpleTable(["Label", "Organisme", "Année", "Score"], rows, [3000, 2500, 1500, 2200]));
  }

  if (inProgress.length > 0) {
    parts.push(sectionTitle(`En cours d'obtention (${inProgress.length})`));
    const rows = inProgress.map((l) => [l.name ?? "", l.holder ?? "—"]);
    parts.push(simpleTable(["Label", "Organisme"], rows, [5000, 4200]));
  }

  return parts;
}

function buildCaptation(data: Awaited<ReturnType<typeof loadReportData>>): (Paragraph | Table)[] {
  const parts: (Paragraph | Table)[] = [h("10. Notre captation carbone", HeadingLevel.HEADING_1, true)];
  parts.push(p("Rappel : la captation carbone intervient en dernier recours, après avoir réduit au maximum les émissions.", { italic: true, color: GRAY }));
  parts.push(spacer());

  if (!data.captation) {
    parts.push(p("Aucune donnée de captation renseignée.", { italic: true, color: GRAY }));
    return parts;
  }

  const c = data.captation;
  if (c.captationKgPerYear) parts.push(kpi("Captation annuelle", `${c.captationKgPerYear}`, "kg CO₂"));
  if (c.treeCount) parts.push(kpi("Nombre d'arbres", `${c.treeCount}`));
  if (c.captationUnit) parts.push(kpi("Unité de mesure", c.captationUnit));

  return parts;
}

function buildTempsFortsChapter(draft: typeof rseReportDraftsTable.$inferSelect | null): (Paragraph | Table)[] {
  const parts: (Paragraph | Table)[] = [h("11. Les temps forts de l'année", HeadingLevel.HEADING_1, true)];

  const highlights = (draft?.highlights as Array<{ date: string; title: string; category: string; description: string }> | null) ?? [];
  if (highlights.length === 0) {
    parts.push(p("Aucun temps fort renseigné.", { italic: true, color: GRAY }));
    return parts;
  }

  for (const ev of highlights) {
    parts.push(new Paragraph({
      heading: HeadingLevel.HEADING_3,
      text: `${ev.date} — ${ev.title}`,
      spacing: { before: 200, after: 80 },
    }));
    if (ev.category) {
      parts.push(new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: ev.category, bold: true, color: GREEN, size: 18, font: "Calibri" })],
      }));
    }
    if (ev.description) parts.push(p(ev.description));
  }

  return parts;
}

function buildPerspectives(draft: typeof rseReportDraftsTable.$inferSelect | null): (Paragraph | Table)[] {
  const parts: (Paragraph | Table)[] = [h("12. Perspectives", HeadingLevel.HEADING_1, true)];

  const content = draft?.perspectivesContent;
  if (!content) {
    parts.push(p("Les perspectives n'ont pas encore été rédigées.", { italic: true, color: GRAY }));
    return parts;
  }

  content.split("\n\n").filter(Boolean).forEach((para) => parts.push(p(para)));
  return parts;
}

function buildAnnexes(draft: typeof rseReportDraftsTable.$inferSelect | null): (Paragraph | Table)[] {
  const parts: (Paragraph | Table)[] = [h("13. Annexes", HeadingLevel.HEADING_1, true)];

  if (draft?.reportMethodology) {
    parts.push(sectionTitle("Méthodologie"));
    parts.push(p(draft.reportMethodology));
  }

  if (draft?.reportScope) {
    parts.push(sectionTitle("Périmètre du rapport"));
    parts.push(p(draft.reportScope));
  }

  parts.push(sectionTitle("Glossaire"));
  const glossary = [
    ["GES", "Gaz à Effet de Serre"],
    ["tCO₂e", "Tonnes équivalent CO₂ — unité de mesure des émissions"],
    ["RSE", "Responsabilité Sociétale des Entreprises"],
    ["ENV", "Axe Environnemental du diagnostic RSE"],
    ["SOC", "Axe Social du diagnostic RSE"],
    ["GOV", "Axe Gouvernance du diagnostic RSE"],
    ["NR", "Numérique Responsable"],
    ["QVCT", "Qualité de Vie et Conditions de Travail"],
  ];
  parts.push(simpleTable(["Terme", "Définition"], glossary, [2500, 6700]));

  return parts;
}

// ─── Cover page ───────────────────────────────────────────────────────────────

function buildCover(org: { name: string } | undefined, draft: typeof rseReportDraftsTable.$inferSelect | null, year: number): (Paragraph | Table)[] {
  const orgName = org?.name ?? "Mon Entreprise";
  const period = draft?.period ?? `Exercice ${year}`;
  const version = draft?.version ?? "1.0";

  return [
    spacer(3),
    new Paragraph({
      text: "RAPPORT RSE",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: "Responsabilité Sociétale des Entreprises", size: 32, color: GREEN, font: "Calibri" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: orgName, bold: true, size: 48, color: DARK, font: "Calibri" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: period, size: 28, color: GRAY, font: "Calibri" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: `Version ${version}`, size: 22, color: GRAY, font: "Calibri", italics: true })],
    }),
    spacer(2),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({
        text: "« Construire une performance durable au service des personnes, de la planète et d'une gouvernance responsable. »",
        italics: true,
        size: 26,
        color: GREEN,
        font: "Calibri",
      })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ─── Table of Contents ────────────────────────────────────────────────────────

function buildTOC(): (Paragraph | Table)[] {
  const chapters = [
    "1. Éditorial",
    "2. Qui sommes-nous ?",
    "3. Notre démarche RSE",
    "4. Agir pour la planète",
    "5. Placer l'humain au cœur de notre développement",
    "6. Piloter une entreprise responsable",
    "7. Notre feuille de route",
    "8. Mon Impact Score",
    "9. Nos labels et engagements",
    "10. Notre captation carbone",
    "11. Les temps forts de l'année",
    "12. Perspectives",
    "13. Annexes",
  ];

  return [
    h("Sommaire", HeadingLevel.HEADING_1, true),
    ...chapters.map((c) => new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: c, size: 22, font: "Calibri" })],
    })),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateReport(orgId: number, exerciseId: number, year: number): Promise<Buffer> {
  const data = await loadReportData(orgId, exerciseId, year);

  const coverImage = data.draft?.coverImageUrl ? await fetchImageBuffer(data.draft.coverImageUrl) : null;

  const allChildren: (Paragraph | Table)[] = [
    ...buildCover(data.org, data.draft, year),
    ...buildTOC(),
    ...buildEditorial(data.draft),
    ...buildQuiSommesNous(data.draft, data),
    ...buildDemarcheRSE(data, data.draft),
    ...buildPlanete(data),
    ...buildHumain(data),
    ...buildGouvernance(data),
    ...buildFeuilleDeRoute(data),
    ...buildImpactScore(data),
    ...buildLabels(data),
    ...buildCaptation(data),
    ...buildTempsFortsChapter(data.draft),
    ...buildPerspectives(data.draft),
    ...buildAnnexes(data.draft),
  ];

  const doc = new Document({
    creator: "Cocci — Plateforme RSE",
    description: `Rapport RSE ${year} — ${data.org?.name ?? ""}`,
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
        },
      },
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          run: { font: "Calibri", size: 22, color: DARK },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.2),
              right: convertInchesToTwip(1.2),
            },
          },
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `Rapport RSE ${year} — ${data.org?.name ?? ""} — Généré par Cocci`, size: 16, color: GRAY, font: "Calibri" })],
            })],
          }),
        },
        children: allChildren,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
