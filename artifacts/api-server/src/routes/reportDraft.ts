import { Router } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, rseReportDraftsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOrgMembership, requireExerciseScope } from "../middlewares/exerciseScope";
import { generateReport } from "../lib/generateReport";
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
    maxGenerations: MAX_REPORT_GENERATIONS,
    updatedAt: row.updatedAt.toISOString(),
  };
}

// GET /organizations/:orgId/report-draft
router.get("/organizations/:orgId/report-draft", requireAuth, requireOrgMembership, requireExerciseScope, async (req, res): Promise<void> => {
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
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  res.json(serializeDraft(row));
});

// PUT /organizations/:orgId/report-draft
router.put("/organizations/:orgId/report-draft", requireAuth, requireOrgMembership, requireExerciseScope, async (req, res): Promise<void> => {
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

  const values = {
    ...body,
    updatedAt: new Date(),
  };

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
router.post("/organizations/:orgId/report/ai-section", requireAuth, requireOrgMembership, async (req, res): Promise<void> => {
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

// POST /organizations/:orgId/report/register-generation
// Incrémente le compteur de générations après une génération réussie.
// Renvoie 429 si la limite est atteinte.
router.post("/organizations/:orgId/report/register-generation", requireAuth, requireOrgMembership, requireExerciseScope, async (req, res): Promise<void> => {
  const orgId = req.orgId!;
  const exercise = req.exercise!;

  try {
    // Récupérer le brouillon actuel pour lire le compteur
    const [existing] = await db
      .select({ id: rseReportDraftsTable.id, generationCount: rseReportDraftsTable.generationCount, generationYear: rseReportDraftsTable.generationYear })
      .from(rseReportDraftsTable)
      .where(and(
        eq(rseReportDraftsTable.organizationId, orgId),
        eq(rseReportDraftsTable.exerciseId, exercise.id),
      ))
      .limit(1);

    const currentYear = new Date().getFullYear();

    // Reset annuel : si l'année stockée est différente de l'année courante, on repart à 0
    const storedYear  = existing?.generationYear ?? 0;
    const yearChanged = storedYear !== currentYear;
    const currentCount = yearChanged ? 0 : (existing?.generationCount ?? 0);

    if (currentCount >= MAX_REPORT_GENERATIONS) {
      res.status(429).json({
        error: "generation_limit_reached",
        generationCount: currentCount,
        maxGenerations: MAX_REPORT_GENERATIONS,
      });
      return;
    }

    // Incrémenter le compteur (et corriger l'année si nécessaire)
    if (existing) {
      await db
        .update(rseReportDraftsTable)
        .set({
          generationCount: yearChanged
            ? 1
            : sql`${rseReportDraftsTable.generationCount} + 1`,
          generationYear: currentYear,
          updatedAt: new Date(),
        })
        .where(eq(rseReportDraftsTable.id, existing.id));
    } else {
      // Créer le brouillon s'il n'existe pas encore
      await db
        .insert(rseReportDraftsTable)
        .values({ organizationId: orgId, exerciseId: exercise.id, generationCount: 1, generationYear: currentYear })
        .onConflictDoUpdate({
          target: [rseReportDraftsTable.organizationId, rseReportDraftsTable.exerciseId],
          set: {
            generationCount: sql`${rseReportDraftsTable.generationCount} + 1`,
            generationYear: currentYear,
          },
        });
    }

    res.json({ generationCount: currentCount + 1, maxGenerations: MAX_REPORT_GENERATIONS });
  } catch (e) {
    logger.error({ e }, "register-generation error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /organizations/:orgId/report/generate
router.get("/organizations/:orgId/report/generate", requireAuth, requireOrgMembership, requireExerciseScope, async (req, res): Promise<void> => {
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

export default router;
