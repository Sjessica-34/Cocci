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
  bioDependenciesTable, stakeholdersTable, suppliersTable, responsiblePurchasesTable,
  nrResponsesTable, nrMetaTable,
  employmentWorkforceTable, employmentDiversityTable, employmentTrainingTable,
  labelsTable, organizationActionPlansTable, actionLibraryTable,
  barometreCampaignsTable, barometreAiSummariesTable,
} from "@workspace/db";
import { ALL_SUBCATEGORIES, getMaturityLabel, COMPLETENESS_THRESHOLD } from "@workspace/rse-referentials";

// ─── Palette ──────────────────────────────────────────────────────────────────

const GREEN       = "1F6B3A";
const GREEN_LIGHT = "2D9E5C";
const DARK        = "1C2340";
const GRAY        = "5B6878";
const MUTED       = "94A3B8";
const AI_BG       = "EEF6F1";
const AI_BORDER   = "2D9E5C";
const ACCENT_BG   = "F0FDF4";

// ─── Formatting helpers ───────────────────────────────────────────────────────

type El = Paragraph | Table;

function spacer(lines = 1): Paragraph {
  return new Paragraph({ text: "", spacing: { after: lines * 80 } });
}

function pageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

function chapterHeading(num: number, title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    pageBreakBefore: true,
    spacing: { before: 0, after: 240 },
    children: [
      new TextRun({ text: `${num}. `, color: GREEN_LIGHT, bold: true, size: 48, font: "Calibri" }),
      new TextRun({ text: title, color: DARK, bold: true, size: 48, font: "Calibri" }),
    ],
  });
}

function sectionTitle(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 280, after: 100 },
    children: [
      new TextRun({ text, bold: true, size: 26, color: GREEN, font: "Calibri", underline: { type: UnderlineType.SINGLE, color: GREEN_LIGHT } }),
    ],
  });
}

function subTitle(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 180, after: 80 },
    children: [new TextRun({ text, bold: true, size: 23, color: DARK, font: "Calibri" })],
  });
}

function body(text: string, opts: { italic?: boolean; color?: string; center?: boolean; size?: number } = {}): Paragraph {
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    spacing: { after: 100 },
    children: [new TextRun({
      text,
      italics: opts.italic,
      color: opts.color ?? DARK,
      size: opts.size ?? 22,
      font: "Calibri",
    })],
  });
}

/** Fixed explanatory text — slightly muted, justified */
function explainer(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 21, color: "374151", font: "Calibri", italics: false })],
  });
}

function kpiLine(label: string, value: string, unit = ""): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: `${label} : `, bold: true, size: 22, font: "Calibri", color: DARK }),
      new TextRun({ text: `${value}${unit ? " " + unit : ""}`, size: 22, color: GREEN, bold: true, font: "Calibri" }),
    ],
  });
}

function divider(): Paragraph {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    children: [new TextRun({ text: "─".repeat(60), color: "D1FAE5", size: 14, font: "Calibri" })],
    alignment: AlignmentType.CENTER,
  });
}

/** AI analysis block — styled box */
function aiBlock(text: string | null): El[] {
  if (!text) return [];
  return [
    spacer(1),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { fill: AI_BG, type: ShadingType.SOLID },
              borders: {
                left: { style: BorderStyle.THICK, size: 6, color: AI_BORDER },
                top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              },
              margins: { top: 100, bottom: 100, left: 200, right: 200 },
              children: [
                new Paragraph({
                  spacing: { after: 60 },
                  children: [new TextRun({ text: "✦ Analyse", bold: true, size: 19, color: GREEN, font: "Calibri" })],
                }),
                new Paragraph({
                  spacing: { after: 0 },
                  children: [new TextRun({ text, size: 20, color: "1E3A2F", font: "Calibri", italics: true })],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    spacer(1),
  ];
}

function simpleTable(headers: string[], rows: string[][], widths?: number[]): Table {
  const colCount = headers.length;
  const colWidths = widths ?? Array(colCount).fill(Math.floor(9200 / colCount));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) =>
          new TableCell({
            width: { size: colWidths[i], type: WidthType.DXA },
            shading: { fill: GREEN, type: ShadingType.SOLID },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
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
              margins: { top: 60, bottom: 60, left: 120, right: 120 },
              children: [new Paragraph({
                children: [new TextRun({ text: cell, size: 19, font: "Calibri", color: DARK })],
              })],
            }),
          ),
        }),
      ),
    ],
  });
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

// ─── AI helper ────────────────────────────────────────────────────────────────

async function callAI(systemPrompt: string, userPrompt: string, maxTokens = 350): Promise<string | null> {
  const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey  = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!baseUrl || !apiKey) return null;

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userPrompt },
        ],
        max_completion_tokens: maxTokens,
      }),
    });
    if (!res.ok) return null;
    const json = await res.json() as { choices: Array<{ message: { content: string } }> };
    return json.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

const SYS = "Tu es expert RSE francophone. Tu rédiges des analyses courtes et factuelles (2 à 4 phrases maximum) pour un rapport RSE professionnel. Tu te bases uniquement sur les données fournies — tu n'inventes rien. Sois précis, direct, utile. Pas de jargon excessif.";

// ─── Data loading ─────────────────────────────────────────────────────────────

export async function loadReportData(orgId: number, exerciseId: number) {
  const [
    [org], [exercise], [draft],
    [impactScore], workforce, diversity, training,
    carbonRows, [captation],
    bioItems, stakeholderItems, supplierItems, responsiblePurchaseItems,
    nrResponses, [nrMeta],
    labelItems, actionItems,
    diagResponses,
    [baroCampaign],
    childOrgs,
  ] = await Promise.all([
    db.select().from(organizationsTable).where(eq(organizationsTable.id, orgId)).limit(1),
    db.select().from(exercisesTable).where(eq(exercisesTable.id, exerciseId)).limit(1),
    db.select().from(rseReportDraftsTable).where(and(eq(rseReportDraftsTable.organizationId, orgId), eq(rseReportDraftsTable.exerciseId, exerciseId))).limit(1),
    db.select().from(impactScoreResultsTable).where(and(eq(impactScoreResultsTable.organizationId, orgId), eq(impactScoreResultsTable.exerciseId, exerciseId))).limit(1),
    db.select().from(employmentWorkforceTable).where(and(eq(employmentWorkforceTable.organizationId, orgId), eq(employmentWorkforceTable.exerciseId, exerciseId))),
    db.select().from(employmentDiversityTable).where(and(eq(employmentDiversityTable.organizationId, orgId), eq(employmentDiversityTable.exerciseId, exerciseId))),
    db.select().from(employmentTrainingTable).where(and(eq(employmentTrainingTable.organizationId, orgId), eq(employmentTrainingTable.exerciseId, exerciseId))),
    db.select().from(carbonBilansTable).where(and(eq(carbonBilansTable.organizationId, orgId), eq(carbonBilansTable.exerciseId, exerciseId))),
    db.select().from(captationCarboneTable).where(and(eq(captationCarboneTable.organizationId, orgId), eq(captationCarboneTable.exerciseId, exerciseId))).limit(1),
    db.select().from(bioDependenciesTable).where(and(eq(bioDependenciesTable.organizationId, orgId), eq(bioDependenciesTable.exerciseId, exerciseId))),
    db.select().from(stakeholdersTable).where(and(eq(stakeholdersTable.organizationId, orgId), eq(stakeholdersTable.exerciseId, exerciseId))),
    db.select().from(suppliersTable).where(and(eq(suppliersTable.organizationId, orgId), eq(suppliersTable.exerciseId, exerciseId))),
    db.select().from(responsiblePurchasesTable).where(and(eq(responsiblePurchasesTable.organizationId, orgId), eq(responsiblePurchasesTable.exerciseId, exerciseId))),
    db.select().from(nrResponsesTable).where(and(eq(nrResponsesTable.organizationId, orgId), eq(nrResponsesTable.exerciseId, exerciseId))),
    db.select().from(nrMetaTable).where(and(eq(nrMetaTable.organizationId, orgId), eq(nrMetaTable.exerciseId, exerciseId))).limit(1),
    db.select().from(labelsTable).where(and(eq(labelsTable.organizationId, orgId), eq(labelsTable.exerciseId, exerciseId))),
    db.select({
      id: organizationActionPlansTable.id,
      isChecked: organizationActionPlansTable.isChecked,
      customName: organizationActionPlansTable.customName,
      libraryName: actionLibraryTable.name,
      category: actionLibraryTable.category,
      subcategory: actionLibraryTable.subcategory,
    }).from(organizationActionPlansTable)
      .leftJoin(actionLibraryTable, eq(organizationActionPlansTable.libraryActionId, actionLibraryTable.id))
      .where(and(eq(organizationActionPlansTable.organizationId, orgId), eq(organizationActionPlansTable.exerciseId, exerciseId))),
    db.select().from(diagnosticResponsesTable).where(and(eq(diagnosticResponsesTable.organizationId, orgId), eq(diagnosticResponsesTable.exerciseId, exerciseId))),
    db.select().from(barometreCampaignsTable).where(and(eq(barometreCampaignsTable.organizationId, orgId), eq(barometreCampaignsTable.exerciseId, exerciseId))).limit(1),
    db.select().from(organizationsTable).where(eq(organizationsTable.parentId, orgId)),
  ]);

  const baroSummaries = baroCampaign
    ? await db.select().from(barometreAiSummariesTable).where(eq(barometreAiSummariesTable.campaignId, baroCampaign.id))
    : [];

  // Diagnostic scores
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

  const carbonTotal = carbonRows.reduce((sum, b) => {
    const fields = [b.energie1, b.energie2, b.horsEnergie1, b.horsEnergie2, b.intrantsBiens, b.intrantsServices, b.futursEmballages, b.fret, b.deplacements, b.dechetsDirects, b.immobilisations, b.utilisation, b.finDeVie];
    return sum + fields.reduce((a, v) => a + (v != null ? Number(v) : 0), 0);
  }, 0);

  const nrChecked = nrResponses.filter((r) => r.checked).length;
  const nrScore = nrResponses.length > 0 ? Math.round((nrChecked / nrResponses.length) * 100) : 0;
  const obtainedLabels = labelItems.filter((l) => l.year != null);
  const doneActions = actionItems.filter((a) => a.isChecked).length;
  const actionRate = actionItems.length > 0 ? Math.round((doneActions / actionItems.length) * 100) : 0;

  return {
    org, exercise, draft: draft ?? null,
    impactScore: impactScore ?? null,
    wf: workforce[0] ?? null, div: diversity[0] ?? null, tr: training[0] ?? null,
    carbonRows, carbonTotal,
    captation: captation ?? null,
    bioItems, stakeholderItems, supplierItems, responsiblePurchaseItems,
    nrScore, nrMeta: nrMeta ?? null,
    obtainedLabels, labelItems,
    actionItems, doneActions, actionRate,
    diagScores,
    envScore: axisScore("ENV"), socScore: axisScore("SOC"), govScore: axisScore("GOV"),
    baroCampaign: baroCampaign ?? null, baroSummaries,
    childOrgs,
  };
}

type Data = Awaited<ReturnType<typeof loadReportData>>;

// ─── Pre-generate all AI analyses in parallel ─────────────────────────────────

async function generateAllAI(data: Data): Promise<Record<string, string | null>> {
  const { wf, div, tr, carbonTotal, carbonRows, nrScore, supplierItems, stakeholderItems, bioItems,
    diagScores, actionItems, doneActions, actionRate, impactScore, captation, baroSummaries,
    baroCampaign, envScore, socScore, govScore, obtainedLabels } = data;

  const envScores = diagScores.filter((s) => s.categoryId === "ENV" && s.scorePercent != null);
  const socScores = diagScores.filter((s) => s.categoryId === "SOC" && s.scorePercent != null);
  const govScores = diagScores.filter((s) => s.categoryId === "GOV" && s.scorePercent != null);

  const prompts: Record<string, [string, string]> = {

    stakeholders: stakeholderItems.length > 0 ? [SYS,
      `Analyse le profil des parties prenantes cartographiées. Données : ${stakeholderItems.length} parties prenantes. Catégories : ${[...new Set(stakeholderItems.map(s => s.category).filter(Boolean))].join(", ") || "non renseignées"}. Influence moyenne : ${stakeholderItems.length ? Math.round(stakeholderItems.reduce((a, s) => a + (s.influence ?? 3), 0) / stakeholderItems.length * 10) / 10 : "—"}/5. Identifie les points forts et les axes de vigilance.`
    ] : ["", ""],

    biodiversity: bioItems.length > 0 ? [SYS,
      `Analyse les dépendances à la biodiversité identifiées. Données : ${bioItems.length} dépendances. Catégories : ${[...new Set(bioItems.map(b => b.category).filter(Boolean))].join(", ") || "diverses"}. Souligne les dépendances critiques et les implications pour la stratégie RSE.`
    ] : ["", ""],

    materiality: (envScore != null || socScore != null || govScore != null) ? [SYS,
      `Analyse la matrice de matérialité RSE. Scores par axe : ENV ${envScore != null ? envScore + "%" : "N/A"}, SOC ${socScore != null ? socScore + "%" : "N/A"}, GOV ${govScore != null ? govScore + "%" : "N/A"}. Identifie les enjeux prioritaires et les axes d'amélioration.`
    ] : ["", ""],

    carbon: carbonTotal > 0 ? [SYS,
      `Analyse le bilan carbone. Émissions totales : ${Math.round(carbonTotal)} tCO₂e. ${carbonRows.length > 0 ? `Postes mesurés : ${carbonRows.length}.` : ""} Formule des recommandations de réduction adaptées et des perspectives de progression.`
    ] : ["", ""],

    nr: nrScore > 0 ? [SYS,
      `Analyse le score Numérique Responsable : ${nrScore}%. ${data.nrMeta?.certificationLabel ? `Niveau atteint : ${data.nrMeta.certificationLabel}.` : ""} Identifie les points forts et les bonnes pratiques à renforcer.`
    ] : ["", ""],

    suppliers: supplierItems.length > 0 ? [SYS,
      `Analyse la politique achats responsables. Fournisseurs référencés : ${supplierItems.length}. Évalués RSE : ${supplierItems.filter(s => s.rsePolicy || s.evalComments).length}. Certifiés : ${supplierItems.filter(s => s.certifications).length}. Identifie les leviers d'amélioration de la chaîne d'approvisionnement.`
    ] : ["", ""],

    workforce: wf ? [SYS,
      `Analyse les données Capital Humain. Effectif : ${wf.totalHeadcount ?? "N/A"}. CDI : ${wf.nbCdi ?? "N/A"}, CDD : ${wf.nbCdd ?? "N/A"}. Recrutements : ${wf.nbRecrutements ?? "N/A"}. Départs : ${wf.nbDeparts ?? "N/A"}. Formule une analyse sur la stabilité, l'attractivité et les dynamiques RH.`
    ] : ["", ""],

    diversity: (wf && div) ? [SYS,
      `Analyse les données Diversité & Inclusion. Effectif total : ${wf.totalHeadcount ?? "N/A"}. Hommes : ${div.nbHommes ?? "N/A"}, Femmes : ${div.nbFemmes ?? "N/A"}${wf.totalHeadcount && div.nbFemmes ? ` (${Math.round(div.nbFemmes / wf.totalHeadcount * 100)}% de féminisation)` : ""}. Personnes en situation de handicap : ${div.nbHandicap ?? "N/A"}. Évalue la maturité en matière d'inclusion et identifie des axes de progression.`
    ] : ["", ""],

    training: (tr && wf) ? [SYS,
      `Analyse l'effort de formation. Collaborateurs formés : ${tr.nbCollaborateursFormes ?? "N/A"}${wf.totalHeadcount && tr.nbCollaborateursFormes ? ` (${Math.round(tr.nbCollaborateursFormes / wf.totalHeadcount * 100)}% de l'effectif)` : ""}. Heures de formation : ${tr.nbHeuresFormation ?? "N/A"}. Évalue l'investissement formation et les perspectives de développement des compétences.`
    ] : ["", ""],

    diag_env: envScores.length > 0 ? [SYS,
      `Analyse le diagnostic environnemental RSE. Scores par sous-thème : ${envScores.map(s => `${s.label} : ${s.scorePercent}%`).join(", ")}. Score ENV moyen : ${envScore}%. Identifie les points forts, les lacunes et les priorités d'action environnementale.`
    ] : ["", ""],

    diag_soc: socScores.length > 0 ? [SYS,
      `Analyse le diagnostic social RSE. Scores par sous-thème : ${socScores.map(s => `${s.label} : ${s.scorePercent}%`).join(", ")}. Score SOC moyen : ${socScore}%. Formule des recommandations concrètes pour renforcer la politique sociale.`
    ] : ["", ""],

    diag_gov: govScores.length > 0 ? [SYS,
      `Analyse le diagnostic de gouvernance RSE. Scores par sous-thème : ${govScores.map(s => `${s.label} : ${s.scorePercent}%`).join(", ")}. Score GOV moyen : ${govScore}%. Identifie les pratiques de gouvernance à renforcer en priorité.`
    ] : ["", ""],

    actions: actionItems.length > 0 ? [SYS,
      `Analyse le plan d'actions RSE. Total : ${actionItems.length} actions. Réalisées : ${doneActions} (${actionRate}%). Catégories : ${[...new Set(actionItems.map(a => a.category).filter(Boolean))].slice(0, 5).join(", ") || "diverses"}. Évalue la dynamique de mise en œuvre et identifie les axes prioritaires.`
    ] : ["", ""],

    impact_score: impactScore ? [SYS,
      `Analyse l'Impact Score. Score global : ${impactScore.score}/100. Piliers : Limitation des impacts négatifs ${impactScore.limitationImpactsNegatifs ?? "N/A"}/100, Partage de la valeur ${impactScore.partageValeurPouvoir ?? "N/A"}/100, Stratégie à impact positif ${impactScore.strategieImpactPositif ?? "N/A"}/100. Fournis une analyse des forces et des axes de progression.`
    ] : ["", ""],

    captation: captation ? [SYS,
      `Analyse les données de captation carbone. Captation estimée : ${captation.captationKgPerYear ?? "N/A"} kg CO₂/an. Arbres recensés : ${captation.treeCount ?? "N/A"}. ${carbonTotal > 0 ? `À comparer aux émissions totales : ${Math.round(carbonTotal)} tCO₂e.` : ""} Contextualise cette captation dans la stratégie carbone globale et formule des perspectives.`
    ] : ["", ""],

    barometre: (baroCampaign && baroSummaries.length === 0) ? [SYS,
      `Réalise une courte synthèse du baromètre social. Des données ont été collectées mais aucune analyse n'a encore été générée. Formule une introduction générale sur l'importance du baromètre social pour la stratégie RSE et le dialogue interne.`
    ] : ["", ""],
  };

  // Run all AI calls in parallel (skip empty prompts)
  const entries = Object.entries(prompts).filter(([, [sys]]) => sys !== "");
  const results = await Promise.all(
    entries.map(([key, [sys, usr]]) =>
      callAI(sys, usr, 300).then((r) => [key, r] as [string, string | null])
    )
  );

  return Object.fromEntries(results);
}

// We need to fix the nr reference above
type NrRef = { nrResponses?: { length: number } };

// ─── Chapter builders ─────────────────────────────────────────────────────────

function buildCover(data: Data): El[] {
  const orgName = data.org?.name ?? "Mon Entreprise";
  const year    = data.exercise?.year ?? new Date().getFullYear();
  const period  = data.draft?.period ?? `Exercice ${year}`;
  const version = data.draft?.version ?? "1.0";
  const quote   = "« Construire une performance durable au service des personnes, de la planète et d'une gouvernance responsable. »";

  return [
    spacer(3),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: "RAPPORT RSE", bold: true, size: 72, color: GREEN, font: "Calibri", allCaps: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: "Responsabilité Sociétale des Entreprises", size: 28, color: GREEN_LIGHT, font: "Calibri" })],
    }),
    divider(),
    spacer(1),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: orgName, bold: true, size: 60, color: DARK, font: "Calibri" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: period, size: 28, color: GRAY, font: "Calibri" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: `Version ${version}`, size: 22, color: MUTED, font: "Calibri", italics: true })],
    }),
    spacer(2),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
      children: [new TextRun({ text: quote, italics: true, size: 24, color: GREEN, font: "Calibri" })],
    }),
    pageBreak(),
  ];
}

function buildTOC(): El[] {
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
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: true,
      spacing: { after: 240 },
      children: [new TextRun({ text: "Sommaire", bold: true, size: 48, color: DARK, font: "Calibri" })],
    }),
    ...chapters.map((c) => new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: "▸  ", color: GREEN_LIGHT, size: 20, font: "Calibri" }),
        new TextRun({ text: c, size: 22, font: "Calibri", color: DARK }),
      ],
    })),
    pageBreak(),
  ];
}

function buildEditorial(data: Data): El[] {
  const content = data.draft?.editorialContent;
  const author  = data.draft?.editorialAuthor;
  const role    = data.draft?.editorialAuthorRole;

  const parts: El[] = [chapterHeading(1, "Éditorial")];

  if (!content) {
    parts.push(body("L'éditorial n'a pas encore été rédigé.", { italic: true, color: MUTED }));
    return parts;
  }

  content.split("\n\n").filter(Boolean).forEach((para) => parts.push(body(para)));
  if (author) {
    parts.push(spacer());
    parts.push(new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: author, bold: true, size: 22, font: "Calibri", color: DARK })],
    }));
    if (role) parts.push(new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: role, size: 21, font: "Calibri", color: GRAY, italics: true })],
    }));
  }
  return parts;
}

function buildQuiSommesNous(data: Data): El[] {
  const d = data.draft;
  const parts: El[] = [chapterHeading(2, "Qui sommes-nous ?")];

  if (d?.companyDescription) {
    parts.push(body(d.companyDescription));
    parts.push(spacer());
  }

  if (d?.companyMission) {
    parts.push(sectionTitle("Notre mission"));
    if (d.isMissionEntreprise) {
      parts.push(new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: "✓ Entreprise à mission (loi PACTE)", bold: true, size: 22, color: GREEN, font: "Calibri" })],
      }));
    }
    parts.push(body(d.companyMission));
    parts.push(spacer());
  }

  if (d?.companyVision) {
    parts.push(sectionTitle("Notre vision"));
    parts.push(explainer("Notre vision exprime l'ambition de l'organisation à long terme et les valeurs qui orientent durablement ses décisions et ses actions. Découvrez la vision qui guide nos engagements et nos actions à long terme :"));
    parts.push(body(d.companyVision));
    parts.push(spacer());
  }

  if (d?.companyValues) {
    parts.push(sectionTitle("Nos valeurs"));
    parts.push(explainer("Les valeurs de l'organisation constituent les principes qui pilotent ses décisions, ses comportements et ses relations avec l'ensemble de ses parties prenantes. Elles reflètent son identité et donnent du sens à ses engagements au quotidien. Découvrez les valeurs qui inspirent nos actions et façonnent notre manière d'agir :"));
    parts.push(body(d.companyValues));
    parts.push(spacer());
  }

  // Chiffres clés auto
  const kpis: [string, string][] = [];
  if (data.wf?.totalHeadcount) kpis.push(["Effectif total", `${data.wf.totalHeadcount} collaborateurs`]);
  if (data.obtainedLabels.length > 0) kpis.push(["Labels obtenus", `${data.obtainedLabels.length}`]);
  if (data.impactScore) kpis.push(["Impact Score", `${data.impactScore.score}/100`]);
  if (data.carbonTotal > 0) kpis.push(["Émissions GES", `${Math.round(data.carbonTotal)} tCO₂e`]);
  if (data.actionItems.length > 0) kpis.push(["Actions RSE planifiées", `${data.actionItems.length} (${data.actionRate}% réalisées)`]);

  if (kpis.length > 0) {
    parts.push(sectionTitle("Chiffres clés"));
    kpis.forEach(([l, v]) => parts.push(kpiLine(l, v)));
    if (d?.companyKeyFigures) {
      parts.push(spacer());
      parts.push(body(d.companyKeyFigures));
    }
    parts.push(spacer());
  }

  // Historique
  const timeline = (d?.timeline as Array<{ date: string; title: string; description: string }> | null) ?? [];
  if (timeline.length > 0) {
    parts.push(sectionTitle("Notre historique"));
    const rows = timeline.map((e) => [e.date, e.title, e.description]);
    parts.push(simpleTable(["Date", "Événement", "Description"], rows, [1400, 2600, 5200]));
    parts.push(spacer());
  }

  // Organigramme
  if (d?.orgChartUrl) {
    parts.push(sectionTitle("Organigramme"));
    parts.push(body(`📎 Voir l'organigramme joint : ${d.orgChartUrl}`, { color: GRAY, italic: true }));
  }

  return parts;
}

function buildDemarcheRSE(data: Data, ai: Record<string, string | null>): El[] {
  const parts: El[] = [chapterHeading(3, "Notre démarche RSE")];

  // Politique RSE
  parts.push(sectionTitle("Politique RSE"));
  parts.push(explainer("La politique RSE de l'organisation exprime ses engagements et orientations stratégiques en matière de Responsabilité Sociétale des Entreprises. Elle constitue le fil conducteur de la démarche RSE et reflète les valeurs de l'organisation vis-à-vis de ses parties prenantes, de son territoire et de l'environnement."));
  parts.push(spacer());

  // Méthodologie
  parts.push(sectionTitle("Méthodologie"));
  parts.push(explainer("Le présent rapport a été élaboré à partir des données renseignées et collectées au sein de la plateforme Cocci. Il repose sur une méthodologie simplifiée destinée à structurer et valoriser la démarche RSE de l'organisation, dans une logique de pilotage et d'amélioration continue. Les informations présentées ne constituent pas un reporting réglementaire et, sauf mention contraire, ce rapport n'est pas établi conformément aux exigences de référentiels tels que la CSRD, les ESRS, la GRI ou tout autre cadre normatif."));
  if (data.draft?.reportMethodology) {
    parts.push(spacer(1));
    parts.push(body(data.draft.reportMethodology));
  }
  parts.push(spacer());

  // Périmètre
  parts.push(sectionTitle("Périmètre du rapport"));
  parts.push(explainer("Le périmètre du rapport définit les entités, activités, sites et périodes couverts par la démarche de reporting RSE. Il garantit une lecture transparente des informations présentées et permet de comprendre précisément le champ d'application des données et des indicateurs."));
  // Auto org scope
  const scopeParts = [data.org?.name ?? ""];
  if (data.childOrgs?.length > 0) {
    data.childOrgs.forEach((c) => scopeParts.push(c.name));
  }
  parts.push(body(`Le présent rapport couvre le périmètre suivant : ${scopeParts.join(" — ")}.`));
  if (data.draft?.reportScope) {
    parts.push(body(data.draft.reportScope));
  }
  parts.push(spacer());

  // Parties prenantes
  if (data.stakeholderItems.length > 0) {
    parts.push(sectionTitle("Parties prenantes"));
    parts.push(explainer("Les parties prenantes regroupent l'ensemble des acteurs qui influencent les activités de l'organisation ou sont influencés par celles-ci. Leur identification permet de mieux comprendre leurs attentes et d'intégrer leurs enjeux dans la stratégie RSE. La cartographie ci-dessous présente les principales parties prenantes identifiées."));
    parts.push(kpiLine("Nombre de parties prenantes cartographiées", `${data.stakeholderItems.length}`));
    const rows = data.stakeholderItems.slice(0, 15).map((s) => [s.name ?? "", s.category ?? "—", `Influence ${s.influence ?? "—"}/5`, `Intérêt ${s.interest ?? "—"}/5`]);
    parts.push(simpleTable(["Nom", "Catégorie", "Influence", "Intérêt"], rows, [2800, 2400, 1900, 2100]));
    parts.push(...aiBlock(ai.stakeholders));
    parts.push(spacer());
  }

  // Matrice de matérialité (diagnostic overview)
  parts.push(sectionTitle("Identification des super-enjeux stratégiques"));
  parts.push(explainer("L'identification des enjeux permet de recenser les thématiques environnementales, sociales et de gouvernance les plus pertinentes pour l'organisation et ses parties prenantes. La matrice de matérialité facilite leur hiérarchisation en fonction de leur importance stratégique et de leur niveau d'impact, afin de concentrer les efforts sur les enjeux prioritaires. Les enjeux matériels identifiés et leur niveau de priorité sont présentés dans la matrice de matérialité ci-dessous."));
  const scoreRows = [
    ["Environnement", data.envScore != null ? `${data.envScore}%` : "Non évalué", data.envScore != null ? getMaturityLabel(data.envScore) ?? "—" : "—"],
    ["Social",        data.socScore != null ? `${data.socScore}%` : "Non évalué", data.socScore != null ? getMaturityLabel(data.socScore) ?? "—" : "—"],
    ["Gouvernance",   data.govScore != null ? `${data.govScore}%` : "Non évalué", data.govScore != null ? getMaturityLabel(data.govScore) ?? "—" : "—"],
  ];
  parts.push(simpleTable(["Axe RSE", "Score de maturité", "Niveau"], scoreRows, [3000, 2500, 3700]));
  parts.push(...aiBlock(ai.materiality));
  parts.push(spacer());

  // Biodiversité
  if (data.bioItems.length > 0) {
    parts.push(sectionTitle("Dépendances à la biodiversité"));
    parts.push(explainer("L'analyse des dépendances à la biodiversité permet d'identifier les ressources naturelles, les écosystèmes, les acteurs et les activités dont dépend l'organisation pour exercer ses activités. Cette cartographie facilite la compréhension des interactions avec le vivant et constitue un outil d'aide à la décision pour mieux anticiper les risques, préserver les services écosystémiques et renforcer la résilience de l'organisation. Les principales dépendances de l'organisation à la biodiversité sont présentées ci-dessous, selon leur nature et leur position au sein de la chaîne de valeur."));
    parts.push(kpiLine("Dépendances identifiées", `${data.bioItems.length}`));
    const byCategory = data.bioItems.reduce<Record<string, number>>((acc, b) => {
      acc[b.category ?? "Autre"] = (acc[b.category ?? "Autre"] ?? 0) + 1;
      return acc;
    }, {});
    parts.push(simpleTable(["Catégorie de dépendance", "Nombre"], Object.entries(byCategory).map(([k, v]) => [k, `${v}`]), [6200, 3000]));
    parts.push(...aiBlock(ai.biodiversity));
    parts.push(spacer());
  }

  return parts;
}

function buildPlanete(data: Data, ai: Record<string, string | null>): El[] {
  const parts: El[] = [chapterHeading(4, "Agir pour la planète")];

  // Diagnostic ENV
  const envScores = data.diagScores.filter((s) => s.categoryId === "ENV");
  if (envScores.length > 0) {
    parts.push(sectionTitle("Diagnostic environnemental — Résultats détaillés"));
    parts.push(explainer("Le diagnostic environnemental évalue la maturité de l'organisation sur l'ensemble des thématiques environnementales : gestion de l'énergie, réduction des émissions, protection des ressources naturelles, gestion des déchets et mobilité durable. Les résultats ci-dessous reflètent le niveau de pratiques observées pour chaque sous-thème évalué."));
    const rows = envScores.map((s) => [
      s.label,
      s.scorePercent != null ? `${s.scorePercent}%` : "Non évalué",
      s.scorePercent != null ? getMaturityLabel(s.scorePercent) ?? "—" : "—",
      `${s.answered}/${s.totalQuestions}`,
    ]);
    parts.push(simpleTable(["Sous-thème", "Score", "Niveau", "Réponses"], rows, [3800, 1500, 2200, 1700]));
    parts.push(...aiBlock(ai.diag_env));
    parts.push(spacer());
  }

  // Bilan carbone
  if (data.carbonRows.length > 0 || data.carbonTotal > 0) {
    parts.push(sectionTitle("Bilan carbone"));
    parts.push(explainer("Le bilan carbone permet de mesurer et de quantifier les émissions de gaz à effet de serre (GES) générées par les activités de l'organisation. Il constitue le point de départ indispensable de toute stratégie de réduction carbone. Les données sont présentées par scope selon la méthodologie GHG Protocol : Scope 1 (émissions directes), Scope 2 (énergie indirecte) et Scope 3 (autres émissions indirectes)."));
    parts.push(kpiLine("Émissions totales", `${Math.round(data.carbonTotal)}`, "tCO₂e"));
    if (data.carbonRows.length > 0) {
      const carbonTableRows = data.carbonRows.map((b) => {
        const s1 = ([b.energie1, b.horsEnergie1] as (string | null)[]).reduce((a, v) => a + (v ? Number(v) : 0), 0);
        const s2 = ([b.energie2, b.horsEnergie2] as (string | null)[]).reduce((a, v) => a + (v ? Number(v) : 0), 0);
        const s3 = ([b.intrantsBiens, b.intrantsServices, b.futursEmballages, b.fret, b.deplacements, b.dechetsDirects, b.immobilisations, b.utilisation, b.finDeVie] as (string | null)[]).reduce((a, v) => a + (v ? Number(v) : 0), 0);
        return [
          s1 > 0 ? `${Math.round(s1)} tCO₂e` : "—",
          s2 > 0 ? `${Math.round(s2)} tCO₂e` : "—",
          s3 > 0 ? `${Math.round(s3)} tCO₂e` : "—",
        ];
      });
      parts.push(simpleTable(["Scope 1 — Émissions directes", "Scope 2 — Énergie indirecte", "Scope 3 — Émissions indirectes"], carbonTableRows));
    }
    parts.push(...aiBlock(ai.carbon));
    parts.push(spacer());
  }

  // Numérique responsable
  parts.push(sectionTitle("Numérique responsable"));
  parts.push(explainer("Le numérique responsable vise à réduire l'empreinte environnementale, sociale et économique des usages numériques au sein de l'organisation. Il couvre des pratiques telles que l'allongement de la durée de vie des équipements, la réduction de la consommation d'énergie numérique, l'accessibilité des services digitaux et la gestion des déchets électroniques."));
  parts.push(kpiLine("Score Numérique Responsable", `${data.nrScore}`, "%"));
  if (data.nrMeta?.certificationLabel) {
    parts.push(kpiLine("Niveau atteint", data.nrMeta.certificationLabel));
  }
  parts.push(...aiBlock(ai.nr));
  parts.push(spacer());

  // Achats responsables
  if (data.supplierItems.length > 0) {
    parts.push(sectionTitle("Achats & fournisseurs responsables"));
    parts.push(explainer("La politique d'achats responsables vise à intégrer des critères environnementaux, sociaux et de gouvernance dans la sélection et l'évaluation des fournisseurs. Elle contribue à la réduction des impacts indirects de l'organisation tout au long de sa chaîne d'approvisionnement."));
    const evalCount = data.supplierItems.filter((s) => s.rsePolicy || s.evalComments).length;
    const certCount = data.supplierItems.filter((s) => s.certifications).length;
    const rows = [
      ["Fournisseurs référencés", `${data.supplierItems.length}`],
      ["Fournisseurs évalués RSE", `${evalCount}`],
      ["Fournisseurs certifiés", `${certCount}`],
    ];
    parts.push(simpleTable(["Indicateur", "Valeur"], rows, [5500, 3700]));
    if (data.supplierItems.length <= 20) {
      const supRows = data.supplierItems.slice(0, 10).map((s) => [s.name ?? "", s.rsePolicy ? "✓" : "—", s.certifications ?? "—"]);
      if (supRows.length > 0) parts.push(simpleTable(["Fournisseur", "Évalué RSE", "Certifications"], supRows, [4500, 2000, 2700]));
    }
    parts.push(...aiBlock(ai.suppliers));
    parts.push(spacer());
  }

  // Achats responsables — placé après la partie fournisseurs
  if (data.responsiblePurchaseItems.length > 0) {
    parts.push(sectionTitle("Achats responsables"));
    parts.push(explainer("Les montants responsables sont calculés automatiquement à partir de vos estimations."));

    let totalAmount = 0;
    let responsibleAmount = 0;
    let localAmount = 0;
    let circularAmount = 0;
    const byCategory: Record<string, { amount: number; responsible: number }> = {};

    for (const purchase of data.responsiblePurchaseItems) {
      const amount = Number(purchase.amount ?? 0);
      const responsible = amount * Number(purchase.responsiblePercent ?? 0) / 100;
      totalAmount += amount;
      responsibleAmount += responsible;
      localAmount += amount * Number(purchase.localPercent ?? 0) / 100;
      circularAmount += amount * Number(purchase.circularPercent ?? 0) / 100;

      const category = purchase.category ?? "Non catégorisé";
      const current = byCategory[category] ?? { amount: 0, responsible: 0 };
      current.amount += amount;
      current.responsible += responsible;
      byCategory[category] = current;
    }

    const pct = (amount: number) =>
      totalAmount > 0 ? `${Math.round(amount / totalAmount * 100)}%` : "0%";
    const euro = (amount: number) =>
      `${Math.round(amount).toLocaleString("fr-FR")} €`;

    parts.push(simpleTable(
      ["Indicateur", "Valeur"],
      [
        ["Achats annuels", euro(totalAmount)],
        ["Part responsable", `${pct(responsibleAmount)} (${euro(responsibleAmount)})`],
        ["Part locale", `${pct(localAmount)} (${euro(localAmount)})`],
        ["Part circulaire", `${pct(circularAmount)} (${euro(circularAmount)})`],
      ],
      [5500, 3700],
    ));

    const categoryRows = Object.entries(byCategory)
      .sort(([, a], [, b]) => b.amount - a.amount)
      .map(([category, values]) => [
        category,
        euro(values.amount),
        euro(values.responsible),
      ]);
    if (categoryRows.length > 0) {
      parts.push(spacer());
      parts.push(simpleTable(
        ["Catégorie", "Achats annuels", "Achats responsables"],
        categoryRows,
        [3600, 2800, 2800],
      ));
    }
    parts.push(spacer());
  }

  return parts;
}

function buildHumain(data: Data, ai: Record<string, string | null>): El[] {
  const parts: El[] = [chapterHeading(5, "Placer l'humain au cœur de notre développement")];

  const { wf, div, tr } = data;

  // Capital humain
  if (wf) {
    parts.push(sectionTitle("Capital humain — Effectifs"));
    parts.push(explainer("Les indicateurs de capital humain renseignent sur la composition et l'évolution des effectifs de l'organisation. Ils constituent un outil de pilotage RH essentiel pour suivre les dynamiques de recrutement, de fidélisation et de transformation des équipes dans le cadre de la stratégie sociale."));
    const wfRows: string[][] = [];
    if (wf.totalHeadcount) wfRows.push(["Effectif total", `${wf.totalHeadcount}`]);
    if (wf.nbCdi)          wfRows.push(["Contrats CDI", `${wf.nbCdi}`]);
    if (wf.nbCdd)          wfRows.push(["Contrats CDD", `${wf.nbCdd}`]);
    if (wf.nbAlternants)   wfRows.push(["Alternants", `${wf.nbAlternants}`]);
    if (wf.nbRecrutements) wfRows.push(["Recrutements", `${wf.nbRecrutements}`]);
    if (wf.nbDeparts)      wfRows.push(["Départs", `${wf.nbDeparts}`]);
    if (wfRows.length) parts.push(simpleTable(["Indicateur", "Valeur"], wfRows, [5500, 3700]));
    parts.push(...aiBlock(ai.workforce));
    parts.push(spacer());
  }

  // Diversité
  if (div) {
    parts.push(sectionTitle("Diversité & Inclusion"));
    parts.push(explainer("La diversité et l'inclusion constituent des leviers essentiels de performance sociale. L'égalité professionnelle, la représentation équilibrée et l'intégration des personnes en situation de handicap reflètent l'engagement de l'organisation à créer un environnement de travail équitable et respectueux de chaque collaborateur."));
    const divRows: string[][] = [];
    if (div.nbHommes != null)   divRows.push(["Hommes", `${div.nbHommes}`]);
    if (div.nbFemmes != null)   divRows.push(["Femmes", `${div.nbFemmes}`]);
    if (wf?.totalHeadcount && div.nbFemmes) divRows.push(["Taux de féminisation", `${Math.round((div.nbFemmes / wf.totalHeadcount) * 100)}%`]);
    if (div.nbHandicap != null) divRows.push(["Collaborateurs en situation de handicap", `${div.nbHandicap}`]);
    if (divRows.length) parts.push(simpleTable(["Indicateur", "Valeur"], divRows, [5500, 3700]));
    parts.push(...aiBlock(ai.diversity));
    parts.push(spacer());
  }

  // Formation
  if (tr) {
    parts.push(sectionTitle("Formation & Développement des compétences"));
    parts.push(explainer("L'investissement dans la formation professionnelle traduit l'engagement de l'organisation envers le développement des compétences de ses collaborateurs. Il contribue à la montée en compétences des équipes, à l'adaptation aux mutations économiques et technologiques, et au renforcement de l'attractivité employeur."));
    const trRows: string[][] = [];
    if (tr.nbCollaborateursFormes) trRows.push(["Collaborateurs formés", `${tr.nbCollaborateursFormes}`]);
    if (wf?.totalHeadcount && tr.nbCollaborateursFormes) trRows.push(["Taux de formation", `${Math.round((tr.nbCollaborateursFormes / wf.totalHeadcount) * 100)}%`]);
    if (tr.nbHeuresFormation) trRows.push(["Heures de formation totales", `${tr.nbHeuresFormation} h`]);
    if (wf?.totalHeadcount && tr.nbHeuresFormation) trRows.push(["Heures par collaborateur (moy.)", `${Math.round(tr.nbHeuresFormation / wf.totalHeadcount)} h`]);
    if (trRows.length) parts.push(simpleTable(["Indicateur", "Valeur"], trRows, [5500, 3700]));
    parts.push(...aiBlock(ai.training));
    parts.push(spacer());
  }

  // Diagnostic SOC
  const socScores = data.diagScores.filter((s) => s.categoryId === "SOC");
  if (socScores.length > 0) {
    parts.push(sectionTitle("Diagnostic social — Résultats détaillés"));
    parts.push(explainer("Le diagnostic social évalue la maturité de l'organisation sur les thématiques liées au capital humain, à la qualité de vie au travail, à l'égalité professionnelle, à la formation et au dialogue social. Les résultats ci-dessous reflètent le niveau de pratiques observées pour chaque sous-thème."));
    const rows = socScores.map((s) => [
      s.label,
      s.scorePercent != null ? `${s.scorePercent}%` : "Non évalué",
      s.scorePercent != null ? getMaturityLabel(s.scorePercent) ?? "—" : "—",
      `${s.answered}/${s.totalQuestions}`,
    ]);
    parts.push(simpleTable(["Sous-thème", "Score", "Niveau", "Réponses"], rows, [3800, 1500, 2200, 1700]));
    parts.push(...aiBlock(ai.diag_soc));
    parts.push(spacer());
  }

  // Baromètre social
  if (data.baroCampaign) {
    parts.push(sectionTitle("Baromètre Social"));
    parts.push(explainer("Le baromètre social permet de mesurer régulièrement le niveau d'engagement, de bien-être et de satisfaction des collaborateurs. Il constitue un outil précieux pour orienter les politiques RH et favoriser un dialogue social constructif au sein de l'organisation."));
    if (data.baroSummaries.length > 0) {
      const summary = data.baroSummaries[0];
      if (summary?.summary) parts.push(body(summary.summary));
    } else {
      parts.push(...aiBlock(ai.barometre));
    }
    parts.push(spacer());
  }

  return parts;
}

function buildGouvernance(data: Data, ai: Record<string, string | null>): El[] {
  const parts: El[] = [chapterHeading(6, "Piloter une entreprise responsable")];

  parts.push(explainer("La gouvernance responsable repose sur des structures décisionnelles transparentes, une éthique des affaires irréprochable et une intégration des enjeux RSE au cœur de la stratégie de l'organisation. Elle garantit la cohérence entre les engagements affichés et les pratiques opérationnelles."));
  parts.push(spacer());

  const govScores = data.diagScores.filter((s) => s.categoryId === "GOV");
  if (govScores.length > 0) {
    parts.push(sectionTitle("Diagnostic de gouvernance — Résultats détaillés"));
    parts.push(explainer("Le diagnostic de gouvernance évalue la maturité de l'organisation sur les thématiques liées à l'éthique, à la transparence, aux pratiques d'achat responsable, aux relations avec les parties prenantes et à la gestion des risques RSE."));
    const rows = govScores.map((s) => [
      s.label,
      s.scorePercent != null ? `${s.scorePercent}%` : "Non évalué",
      s.scorePercent != null ? getMaturityLabel(s.scorePercent) ?? "—" : "—",
      `${s.answered}/${s.totalQuestions}`,
    ]);
    parts.push(simpleTable(["Sous-thème", "Score", "Niveau", "Réponses"], rows, [3800, 1500, 2200, 1700]));
    parts.push(...aiBlock(ai.diag_gov));
    parts.push(spacer());
  }

  return parts;
}

function buildFeuilleDeRoute(data: Data, ai: Record<string, string | null>): El[] {
  const parts: El[] = [chapterHeading(7, "Notre feuille de route")];

  parts.push(explainer("Le plan d'actions RSE matérialise les engagements de l'organisation en objectifs concrets et mesurables. Il traduit la stratégie RSE en actions opérationnelles, organisées par thématique, avec un suivi de l'avancement. Il constitue un outil de pilotage indispensable pour piloter la progression de la démarche et démontrer son sérieux auprès des parties prenantes."));

  parts.push(kpiLine("Actions planifiées", `${data.actionItems.length}`));
  parts.push(kpiLine("Actions réalisées", `${data.doneActions}`));
  parts.push(kpiLine("Taux de réalisation", `${data.actionRate}`, "%"));
  parts.push(spacer());

  if (data.actionItems.length > 0) {
    const byCategory = data.actionItems.reduce<Record<string, typeof data.actionItems>>((acc, a) => {
      const cat = a.category ?? "Autres actions";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(a);
      return acc;
    }, {});

    for (const [cat, actions] of Object.entries(byCategory)) {
      parts.push(subTitle(cat));
      const rows = actions.map((a) => [
        a.isChecked ? "✓ Réalisé" : "○ En cours",
        a.libraryName ?? a.customName ?? "—",
        a.subcategory ?? "—",
      ]);
      parts.push(simpleTable(["Statut", "Action", "Sous-thème"], rows, [1800, 5000, 2400]));
      parts.push(spacer(1));
    }
  }

  parts.push(...aiBlock(ai.actions));

  return parts;
}

function buildImpactScore(data: Data, ai: Record<string, string | null>): El[] {
  const parts: El[] = [chapterHeading(8, "Mon Impact Score")];

  parts.push(explainer("L'Impact Score est un indicateur synthétique qui mesure l'alignement de l'organisation avec une performance globale durable. Il évalue trois piliers fondamentaux : la limitation des impacts négatifs sur la société et l'environnement, le partage équitable de la valeur créée, et la mise en œuvre d'une stratégie orientée vers un impact positif. L'Impact Score est calculé à partir des données renseignées dans la plateforme Cocci."));
  parts.push(spacer());

  if (!data.impactScore) {
    parts.push(body("L'Impact Score n'a pas encore été renseigné.", { italic: true, color: MUTED }));
    return parts;
  }

  const s = data.impactScore;

  // Big score
  parts.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
    children: [new TextRun({ text: `${s.score}`, bold: true, size: 160, color: GREEN, font: "Calibri" })],
  }));
  parts.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: "/100", size: 48, color: GRAY, font: "Calibri" })],
  }));

  if (s.dateRealisation) {
    parts.push(body(`Date de réalisation : ${s.dateRealisation}`, { center: true, color: MUTED, italic: true }));
    parts.push(spacer());
  }

  // Piliers
  const pilierRows: string[][] = [];
  if (s.limitationImpactsNegatifs != null) pilierRows.push(["Limitation des impacts négatifs", `${s.limitationImpactsNegatifs}/100`]);
  if (s.partageValeurPouvoir != null)       pilierRows.push(["Partage de la valeur et du pouvoir", `${s.partageValeurPouvoir}/100`]);
  if (s.strategieImpactPositif != null)     pilierRows.push(["Stratégie à impact positif", `${s.strategieImpactPositif}/100`]);
  if (pilierRows.length > 0) {
    parts.push(sectionTitle("Répartition par pilier"));
    parts.push(simpleTable(["Pilier", "Score"], pilierRows, [6500, 2700]));
    parts.push(spacer());
  }

  if (s.commentaire) {
    parts.push(body(s.commentaire));
    parts.push(spacer());
  }

  parts.push(...aiBlock(ai.impact_score));

  return parts;
}

function buildLabels(data: Data): El[] {
  const parts: El[] = [chapterHeading(9, "Nos labels et engagements")];

  parts.push(explainer("Les labels et certifications RSE témoignent de l'engagement concret de l'organisation dans sa démarche de responsabilité sociétale. Ils constituent des preuves tangibles de la mise en œuvre de bonnes pratiques, reconnues par des tiers indépendants, et renforcent la crédibilité de la démarche auprès des clients, partenaires et parties prenantes."));
  parts.push(spacer());

  if (data.labelItems.length === 0) {
    parts.push(body("Aucun label ou certification renseigné.", { italic: true, color: MUTED }));
    return parts;
  }

  const obtained   = data.labelItems.filter((l) => l.year != null);
  const inProgress = data.labelItems.filter((l) => l.year == null);

  if (obtained.length > 0) {
    parts.push(sectionTitle(`Labels obtenus (${obtained.length})`));
    const rows = obtained.map((l) => [l.name ?? "", l.holder ?? "—", l.year ? `${l.year}` : "—", l.score ?? "—"]);
    parts.push(simpleTable(["Label", "Organisme", "Année", "Score"], rows, [3000, 2500, 1500, 2200]));
    parts.push(spacer());
  }

  if (inProgress.length > 0) {
    parts.push(sectionTitle(`En cours d'obtention (${inProgress.length})`));
    const rows = inProgress.map((l) => [l.name ?? "", l.holder ?? "—"]);
    parts.push(simpleTable(["Label", "Organisme"], rows, [5000, 4200]));
    parts.push(spacer());
  }

  return parts;
}

function buildCaptation(data: Data, ai: Record<string, string | null>): El[] {
  const parts: El[] = [chapterHeading(10, "Notre captation carbone")];

  parts.push(new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({ text: "⚠ Rappel important : ", bold: true, size: 22, color: "92400E", font: "Calibri" }),
      new TextRun({ text: "la captation carbone intervient en dernier recours, après avoir réduit au maximum les émissions directes et indirectes.", size: 22, color: "92400E", font: "Calibri", italics: true }),
    ],
  }));
  parts.push(spacer());

  parts.push(explainer("La captation carbone correspond à la quantité de dioxyde de carbone (CO₂) retirée de l'atmosphère par des puits de carbone naturels ou gérés, tels que les forêts, les haies, les prairies ou certains sols. Son estimation permet d'apprécier la contribution potentielle de ces écosystèmes au stockage du carbone et de compléter l'analyse des émissions de gaz à effet de serre dans une logique de gestion durable. Les estimations de captation carbone associées aux espaces naturels renseignés dans la plateforme sont présentées ci-dessous."));
  parts.push(spacer());

  if (!data.captation) {
    parts.push(body("Aucune donnée de captation renseignée.", { italic: true, color: MUTED }));
    return parts;
  }

  const c = data.captation;
  const captRows: string[][] = [];
  if (c.captationKgPerYear) captRows.push(["Captation annuelle estimée", `${Number(c.captationKgPerYear).toLocaleString("fr-FR")} kg CO₂/an`]);
  if (c.treeCount)          captRows.push(["Nombre d'arbres recensés", `${c.treeCount}`]);
  if (c.captationUnit)      captRows.push(["Unité de mesure", c.captationUnit]);
  if (data.carbonTotal > 0 && c.captationKgPerYear) {
    const captTonne = Number(c.captationKgPerYear) / 1000;
    const pct = Math.round((captTonne / data.carbonTotal) * 100);
    captRows.push(["Part des émissions compensées", `${pct}% (émissions totales : ${Math.round(data.carbonTotal)} tCO₂e)`]);
  }
  if (captRows.length) parts.push(simpleTable(["Indicateur", "Valeur"], captRows, [5000, 4200]));
  parts.push(spacer());

  parts.push(new Paragraph({
    spacing: { after: 100 },
    shading: { fill: "FFFBEB", type: ShadingType.SOLID },
    children: [new TextRun({
      text: "Note méthodologique : Les valeurs présentées sont des estimations calculées à partir des données renseignées dans la plateforme Cocci et de références scientifiques disponibles. Elles ont une vocation informative et d'aide au pilotage et ne constituent pas une mesure certifiée de séquestration carbone.",
      size: 19, color: "713F12", italics: true, font: "Calibri",
    })],
  }));

  parts.push(...aiBlock(ai.captation));

  return parts;
}

function buildTempsForts(data: Data): El[] {
  const parts: El[] = [chapterHeading(11, "Les temps forts de l'année")];

  const highlights = (data.draft?.highlights as Array<{ date: string; title: string; category: string; description: string; photos?: string[] }> | null) ?? [];

  parts.push(explainer("Les temps forts de l'année regroupent les événements marquants qui ont ponctué la vie de l'organisation au cours de l'exercice : engagements RSE, team building, célébrations, partenariats, certifications obtenues… Ils témoignent de la vitalité de la démarche et du collectif."));
  parts.push(spacer());

  if (highlights.length === 0) {
    parts.push(body("Aucun temps fort renseigné pour cet exercice.", { italic: true, color: MUTED }));
    return parts;
  }

  for (const ev of highlights) {
    parts.push(subTitle(`${ev.date.toUpperCase()} — ${ev.title.toUpperCase()}`));
    if (ev.category) {
      parts.push(new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "● ", color: GREEN_LIGHT, size: 20, font: "Calibri" }),
          new TextRun({ text: ev.category, bold: true, color: GREEN, size: 20, font: "Calibri" }),
        ],
      }));
    }
    if (ev.description) parts.push(body(ev.description));
    parts.push(spacer(1));
    parts.push(divider());
    parts.push(spacer(1));
  }

  return parts;
}

function buildPerspectives(data: Data): El[] {
  const parts: El[] = [chapterHeading(12, "Perspectives")];

  parts.push(explainer("Les perspectives RSE définissent les grandes orientations et les ambitions de l'organisation pour les prochains exercices. Elles traduisent la volonté de progresser de manière continue sur les thématiques environnementales, sociales et de gouvernance, en cohérence avec les enjeux stratégiques identifiés."));
  parts.push(spacer());

  const content = data.draft?.perspectivesContent;
  if (!content) {
    parts.push(body("Les perspectives n'ont pas encore été rédigées.", { italic: true, color: MUTED }));
    return parts;
  }

  content.split("\n\n").filter(Boolean).forEach((para) => parts.push(body(para)));
  return parts;
}

function buildAnnexes(data: Data): El[] {
  const parts: El[] = [chapterHeading(13, "Annexes")];

  // Périmètre détaillé
  parts.push(sectionTitle("Périmètre du rapport"));
  const scopeParts = [data.org?.name ?? "Organisation principale"];
  if (data.childOrgs?.length > 0) {
    data.childOrgs.forEach((c) => scopeParts.push(`  └ ${c.name}`));
  }
  scopeParts.forEach((s) => parts.push(body(s)));
  if (data.draft?.reportScope) parts.push(body(data.draft.reportScope));
  parts.push(spacer());

  // Glossaire
  parts.push(sectionTitle("Glossaire"));
  const glossary = [
    ["GES", "Gaz à Effet de Serre"],
    ["tCO₂e", "Tonnes équivalent CO₂ — unité de mesure des émissions de gaz à effet de serre"],
    ["RSE", "Responsabilité Sociétale des Entreprises"],
    ["CSRD", "Corporate Sustainability Reporting Directive — directive européenne de reporting extra-financier"],
    ["GHG Protocol", "Greenhouse Gas Protocol — référentiel international de comptabilisation des émissions carbone"],
    ["ENV", "Axe Environnemental du diagnostic RSE"],
    ["SOC", "Axe Social du diagnostic RSE"],
    ["GOV", "Axe Gouvernance du diagnostic RSE"],
    ["NR", "Numérique Responsable"],
    ["QVCT", "Qualité de Vie et des Conditions de Travail"],
    ["ESRS", "European Sustainability Reporting Standards — normes européennes de reporting RSE"],
    ["GRI", "Global Reporting Initiative — référentiel international de reporting RSE"],
    ["Scope 1", "Émissions directes de GES produites par les sources détenues ou contrôlées par l'organisation"],
    ["Scope 2", "Émissions indirectes liées à la consommation d'énergie achetée (électricité, chaleur…)"],
    ["Scope 3", "Autres émissions indirectes produites dans la chaîne de valeur (amont et aval)"],
  ];
  parts.push(simpleTable(["Terme", "Définition"], glossary, [2000, 7200]));

  return parts;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateReport(orgId: number, exerciseId: number, year: number): Promise<Buffer> {
  // Load all data + run all AI analyses in parallel
  const data = await loadReportData(orgId, exerciseId);
  const ai   = await generateAllAI(data);

  const nrChecked = (data as any).nrResponses?.length
    ? (data as any).nrResponses.filter((r: { checked: boolean }) => r.checked).length
    : 0;
  // Patch nrChecked in prompt reference (already computed in loadReportData via nrScore)

  const allChildren: El[] = [
    ...buildCover(data),
    ...buildTOC(),
    ...buildEditorial(data),
    ...buildQuiSommesNous(data),
    ...buildDemarcheRSE(data, ai),
    ...buildPlanete(data, ai),
    ...buildHumain(data, ai),
    ...buildGouvernance(data, ai),
    ...buildFeuilleDeRoute(data, ai),
    ...buildImpactScore(data, ai),
    ...buildLabels(data),
    ...buildCaptation(data, ai),
    ...buildTempsForts(data),
    ...buildPerspectives(data),
    ...buildAnnexes(data),
  ];

  const doc = new Document({
    creator: "Cocci — Plateforme RSE",
    description: `Rapport RSE ${year} — ${data.org?.name ?? ""}`,
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22, color: DARK } },
        heading1: { run: { font: "Calibri", bold: true, color: DARK } },
        heading2: { run: { font: "Calibri", bold: true, color: GREEN } },
        heading3: { run: { font: "Calibri", bold: true, color: DARK } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1.1),
              bottom: convertInchesToTwip(1.1),
              left: convertInchesToTwip(1.25),
              right: convertInchesToTwip(1.25),
            },
          },
        },
        headers: {
          default: new Header({
            children: [new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { after: 0 },
              children: [
                new TextRun({ text: `${data.org?.name ?? ""} — Rapport RSE ${year}`, size: 16, color: MUTED, font: "Calibri", italics: true }),
              ],
            })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
              children: [new TextRun({ text: `Rapport RSE ${year} — ${data.org?.name ?? ""} — Généré par Cocci`, size: 16, color: MUTED, font: "Calibri" })],
            })],
          }),
        },
        children: allChildren,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
