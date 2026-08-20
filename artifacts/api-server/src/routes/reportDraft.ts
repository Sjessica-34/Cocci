import { Router } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, documentsTable, documentExerciseLinksTable, rseReportDraftsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireActiveOrgMembership, requireExerciseScope, requireWritableExerciseScope, requireWritableOrgMembership } from "../middlewares/exerciseScope";
import { generateReport } from "../lib/generateReport";
import { generatePdfReport } from "../lib/generateReportPdf";
import { logger } from "../lib/logger";
import { MAX_REPORT_GENERATIONS } from "@workspace/rse-referentials";

const router = Router();

function serializeDraft(row: typeof rseReportDraftsTable.$inferSelect) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    exerciseId: row.exerciseId,
    coverImageUrl: row.coverImageUrl ?? null,
    version: row.version ?? "1.0",
    period: row.period ?? null,
    editorialMode: row.editorialMode ?? null,
    editorialAuthor: row.editorialAuthor ?? null,
    editorialAuthorRole: row.editorialAuthorRole ?? null,
    editorialCoSigned: row.editorialCoSigned ?? false,
    editorialTone: row.editorialTone ?? null,
    editorialThemes: (row.editorialThemes as string[]) ?? [],
    editorialLength: row.editorialLength ?? null,
    editorialContext: row.editorialContext ?? null,
    editorialContent: row.editorialContent ?? null,
    companyDescription: row.companyDescription ?? null,
    companyMission: row.companyMission ?? null,
    isMissionEntreprise: row.isMissionEntreprise ?? false,
    companyVision: row.companyVision ?? null,
    companyValues: row.companyValues ?? null,
    companyKeyFigures: row.companyKeyFigures ?? null,
    timeline: row.timeline ?? [],
    orgChartUrl: row.orgChartUrl ?? null,
    institutionalPhotos: row.institutionalPhotos ?? [],
    highlights: row.highlights ?? [],
    perspectivesMode: row.perspectivesMode ?? null,
    perspectivesContent: row.perspectivesContent ?? null,
    reportScope: row.reportScope ?? null,
    reportMethodology: row.reportMethodology ?? null,
    generationCount: row.generationCount ?? 0,
    generationYear: row.generationYear ?? 0,
    additionalGenerations: row.generationBonus ?? 0,
    maxGenerations: MAX_REPORT_GENERATIONS + (row.generationBonus ?? 0),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// GET /organizations/:orgId/report-draft
router.get("/organizations/:orgId/report-draft", requireAuth, requireActiveOrgMembership, requireExerciseScope, async (req, res): Promise<void> => {
  const [row] = await db
    .select()
    .from(rseReportDraftsTable)
    .where(and(
      eq(rseReportDraftsTable.organizationId, req.orgId!),
      eq(rseReportDraftsTable.exerciseId, req.exercise!.id),
    ))
    .limit(1);

  if (!row) {
    // Return empty draft with defaults
    res.json({
      id: null,
      organizationId: req.orgId!,
      exerciseId: req.exercise!.id,
      coverImageUrl: null,
      version: "1.0",
      period: null,
      editorialMode: null,
      editorialAuthor: null,
      editorialAuthorRole: null,
      editorialCoSigned: false,
      editorialTone: null,
      editorialThemes: [],
      editorialLength: null,
      editorialContext: null,
      editorialContent: null,
      companyDescription: null,
      companyMission: null,
      isMissionEntreprise: false,
      companyVision: null,
      companyValues: null,
      companyKeyFigures: null,
      timeline: [],
      orgChartUrl: null,
      institutionalPhotos: [],
      highlights: [],
      perspectivesMode: null,
      perspectivesContent: null,
      reportScope: null,
      reportMethodology: null,
      generationCount: 0,
      additionalGenerations: 0,
      maxGenerations: MAX_REPORT_GENERATIONS,
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  res.json(serializeDraft(row));
});

// PUT /organizations/:orgId/report-draft
router.put("/organizations/:orgId/report-draft", requireAuth, requireWritableOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const body = req.body as Partial<{
    coverImageUrl: string | null;
    version: string | null;
    period: string | null;
    editorialMode: string | null;
    editorialAuthor: string | null;
    editorialAuthorRole: string | null;
    editorialCoSigned: boolean | null;
    editorialTone: string | null;
    editorialThemes: string[] | null;
    editorialLength: string | null;
    editorialContext: string | null;
    editorialContent: string | null;
    companyDescription: string | null;
    companyMission: string | null;
    isMissionEntreprise: boolean | null;
    companyVision: string | null;
    companyValues: string | null;
    companyKeyFigures: string | null;
    timeline: Array<{ id: string; date: string; title: string; description: string; photoUrl?: string }> | null;
    orgChartUrl: string | null;
    institutionalPhotos: Array<{ url: string; caption?: string }> | null;
    highlights: Array<{ id: string; date: string; title: string; category: string; description: string; photos: string[] }> | null;
    perspectivesMode: string | null;
    perspectivesContent: string | null;
    reportScope: string | null;
    reportMethodology: string | null;
  }>;

  const [existing] = await db
    .select({ id: rseReportDraftsTable.id })
    .from(rseReportDraftsTable)
    .where(and(
      eq(rseReportDraftsTable.organizationId, req.orgId!),
      eq(rseReportDraftsTable.exerciseId, req.exercise!.id),
    ))
    .limit(1);

  // Keep quota fields server-owned. The draft table also stores generation
  // metadata, so spreading req.body here would let any writable member change
  // a quota that only superadmins may grant.
  const editableFields = [
    "coverImageUrl", "version", "period", "editorialMode", "editorialAuthor",
    "editorialAuthorRole", "editorialCoSigned", "editorialTone", "editorialThemes",
    "editorialLength", "editorialContext", "editorialContent", "companyDescription",
    "companyMission", "isMissionEntreprise", "companyVision", "companyValues",
    "companyKeyFigures", "timeline", "orgChartUrl", "institutionalPhotos",
    "highlights", "perspectivesMode", "perspectivesContent", "reportScope",
    "reportMethodology",
  ] as const;
  const values = Object.fromEntries(
    Object.entries(body).filter(([key]) => editableFields.includes(key as typeof editableFields[number])),
  ) as Partial<typeof rseReportDraftsTable.$inferInsert>;
  values.updatedAt = new Date();

  let row;
  if (existing) {
    [row] = await db
      .update(rseReportDraftsTable)
      .set(values)
      .where(eq(rseReportDraftsTable.id, existing.id))
      .returning();
  } else {
    [row] = await db
      .insert(rseReportDraftsTable)
      .values({
        organizationId: req.orgId!,
        exerciseId: req.exercise!.id,
        ...values,
      })
      .returning();
  }

  res.json(serializeDraft(row));
});

// POST /organizations/:orgId/report/ai-section
router.post("/organizations/:orgId/report/ai-section", requireAuth, requireWritableOrgMembership, async (req, res): Promise<void> => {
  const { section, tone, length, author, authorRole, themes, context, data } = req.body as {
    section: string;
    tone?: string;
    length?: string;
    author?: string;
    authorRole?: string;
    themes?: string[];
    context?: string;
    data?: Record<string, unknown>;
  };

  const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

  if (!baseUrl || !apiKey) {
    res.status(503).json({ error: "AI integration not configured" });
    return;
  }

  const lengthMap: Record<string, string> = {
    courte: "80 à 100 mots",
    standard: "130 à 160 mots",
    detaillee: "200 à 250 mots",
  };

  const systemPrompt = section === "editorial"
    ? `Tu es expert RSE francophone. Tu rédiges un éditorial professionnel pour un rapport RSE. Sois direct, sincère et humain. Évite le jargon. Maximum ${lengthMap[length ?? "standard"] ?? "130 à 160 mots"}.`
    : section === "analyse"
    ? `Tu es expert RSE francophone. Tu analyses des données RSE et rédiges des analyses factuelles (3 à 5 phrases). Base-toi uniquement sur les données fournies. Sois direct, précis et utile. Formule des recommandations concrètes et des axes d'amélioration mesurables. Évite le jargon excessif.`
    : `Tu es expert RSE francophone. Tu rédiges de courtes introductions ou conclusions de chapitres pour un rapport RSE professionnel. Sois concis, factuel et fluide. Ne décris pas les graphiques. Maximum ${section === "intro" ? "100 à 130 mots" : "80 à 110 mots"}.`;

  let userPrompt = "";
  if (section === "editorial") {
    userPrompt = `Rédige un éditorial RSE pour le rapport de l'exercice.\n`;
    if (author) userPrompt += `Auteur : ${author}${authorRole ? `, ${authorRole}` : ""}.\n`;
    if (tone) userPrompt += `Ton souhaité : ${tone}.\n`;
    if (themes?.length) userPrompt += `Thématiques à mettre en avant : ${themes.join(", ")}.\n`;
    if (context) userPrompt += `Contexte : ${context}.\n`;
    if (data) userPrompt += `Données clés disponibles : ${JSON.stringify(data)}.\n`;
  } else if (section === "analyse") {
    userPrompt = `Analyse les données suivantes et rédige une synthèse factuelle pour le rapport RSE.\n`;
    if (context) userPrompt += `Données et contexte : ${context}.\n`;
    if (data) {
      const { chapterName: _, ...relevantData } = data as { chapterName?: string; [k: string]: unknown };
      if (Object.keys(relevantData).length > 0) {
        userPrompt += `Données additionnelles : ${JSON.stringify(relevantData)}.\n`;
      }
    }
  } else {
    const chapterName = data?.chapterName ?? section;
    const sectionType = section === "intro" ? "une introduction" : "une conclusion";
    userPrompt = `Rédige ${sectionType} pour le chapitre "${chapterName}" du rapport RSE.\n`;
    if (data) {
      // Remove chapterName from data before sending
      const { chapterName: _, ...relevantData } = data as { chapterName?: string; [k: string]: unknown };
      if (Object.keys(relevantData).length > 0) {
        userPrompt += `Données du chapitre : ${JSON.stringify(relevantData)}.\n`;
      }
    }
    if (context) userPrompt += `Contexte additionnel : ${context}.\n`;
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 400,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      logger.error({ err }, "AI API error");
      res.status(502).json({ error: "AI generation failed" });
      return;
    }

    const json = await response.json() as { choices: Array<{ message: { content: string } }> };
    res.json({ content: json.choices[0]?.message?.content?.trim() ?? "" });
  } catch (e) {
    logger.error({ e }, "AI section generation error");
    res.status(502).json({ error: "AI generation failed" });
  }
});

// GET /organizations/:orgId/report/generate
router.get("/organizations/:orgId/report/generate", requireAuth, requireActiveOrgMembership, requireExerciseScope, async (req, res): Promise<void> => {
  const orgId = req.orgId!;
  const exercise = req.exercise!;

  try {
    const buffer = await generateReport(orgId, exercise.id, exercise.year);
    const filename = `rapport-rse-${exercise.year}.docx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) {
    logger.error({ e }, "Report generation error");
    res.status(500).json({ error: "Report generation failed" });
  }
});

// POST /organizations/:orgId/report/generate-pdf
// Génère et archive le PDF dans un seul traitement : le quota n'est débité
// qu'une fois le document et son lien à l'exercice créés avec succès.
router.post("/organizations/:orgId/report/generate-pdf", requireAuth, requireWritableOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const orgId = req.orgId!;
  const exercise = req.exercise!;
  const currentYear = new Date().getFullYear();

  try {
    const [beforeGeneration] = await db
      .select({
        generationCount: rseReportDraftsTable.generationCount,
        generationYear: rseReportDraftsTable.generationYear,
        generationBonus: rseReportDraftsTable.generationBonus,
      })
      .from(rseReportDraftsTable)
      .where(and(
        eq(rseReportDraftsTable.organizationId, orgId),
        eq(rseReportDraftsTable.exerciseId, exercise.id),
      ))
      .limit(1);
    const beforeCount = beforeGeneration?.generationYear === currentYear
      ? (beforeGeneration.generationCount ?? 0)
      : 0;
    const beforeMaxGenerations = MAX_REPORT_GENERATIONS + (beforeGeneration?.generationBonus ?? 0);

    if (beforeCount >= beforeMaxGenerations) {
      res.status(429).json({
        error: "generation_limit_reached",
        generationCount: beforeCount,
        maxGenerations: beforeMaxGenerations,
      });
      return;
    }

    const pdf = await generatePdfReport(orgId, exercise.id);
    const generatedAt = new Date();
    const stamp = generatedAt.toISOString().replace(/[:.]/g, "-");
    const filename = `rapport-rse-${exercise.year}-${stamp}.pdf`;

    const result = await db.transaction(async (tx) => {
      // Serialize concurrent PDF generations for this organization/exercise so
      // the quota check and archival remain a single reservation.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${orgId}, ${exercise.id})`);

      const [existing] = await tx
        .select({
          id: rseReportDraftsTable.id,
          generationCount: rseReportDraftsTable.generationCount,
          generationYear: rseReportDraftsTable.generationYear,
          generationBonus: rseReportDraftsTable.generationBonus,
          period: rseReportDraftsTable.period,
        })
        .from(rseReportDraftsTable)
        .where(and(
          eq(rseReportDraftsTable.organizationId, orgId),
          eq(rseReportDraftsTable.exerciseId, exercise.id),
        ))
        .limit(1);

      const currentCount = existing?.generationYear === currentYear
        ? (existing.generationCount ?? 0)
        : 0;
      const maxGenerations = MAX_REPORT_GENERATIONS + (existing?.generationBonus ?? 0);
      if (currentCount >= maxGenerations) {
        return { limitReached: true as const, generationCount: currentCount, maxGenerations };
      }

      const [document] = await tx
        .insert(documentsTable)
        .values({
          organizationId: orgId,
          uploadedByUserId: req.userId!,
          category: "rapport-rse",
          label: `Rapport RSE ${existing?.period ?? exercise.year}`,
          description: `PDF généré le ${generatedAt.toLocaleDateString("fr-FR")}`,
          originalName: filename,
          mimeType: "application/pdf",
          size: pdf.length,
          content: pdf,
        })
        .returning({
          id: documentsTable.id,
          organizationId: documentsTable.organizationId,
          uploadedByUserId: documentsTable.uploadedByUserId,
          category: documentsTable.category,
          label: documentsTable.label,
          description: documentsTable.description,
          originalName: documentsTable.originalName,
          mimeType: documentsTable.mimeType,
          size: documentsTable.size,
          createdAt: documentsTable.createdAt,
        });

      await tx.insert(documentExerciseLinksTable).values({
        documentId: document!.id,
        exerciseId: exercise.id,
      });

      if (existing) {
        await tx
          .update(rseReportDraftsTable)
          .set({
            generationCount: currentCount + 1,
            generationYear: currentYear,
            updatedAt: generatedAt,
          })
          .where(eq(rseReportDraftsTable.id, existing.id));
      } else {
        await tx
          .insert(rseReportDraftsTable)
          .values({
            organizationId: orgId,
            exerciseId: exercise.id,
            generationCount: 1,
            generationYear: currentYear,
          });
      }

      return {
        limitReached: false as const,
        generationCount: currentCount + 1,
        maxGenerations,
        document: { ...document!, createdAt: document!.createdAt.toISOString() },
      };
    });

    if (result.limitReached) {
      res.status(429).json({
        error: "generation_limit_reached",
        generationCount: result.generationCount,
        maxGenerations: result.maxGenerations,
      });
      return;
    }

    res.status(201).json({
      document: result.document,
      generationCount: result.generationCount,
      maxGenerations: result.maxGenerations,
    });
  } catch (e) {
    logger.error({ e, orgId, exerciseId: exercise.id }, "PDF report generation error");
    res.status(500).json({ error: "PDF report generation failed" });
  }
});

export default router;
