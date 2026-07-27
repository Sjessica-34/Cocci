import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { eq, and, desc } from "drizzle-orm";
import {
  db,
  barometreCampaignsTable,
  barometreCustomQuestionsTable,
  barometreResponsesTable,
  barometreAnswersTable,
  barometreAiSummariesTable,
  type BarometreCampaign,
} from "@workspace/db";
import { BAROMETRE_REFERENTIAL, BAROMETRE_THEMES, getBarometreQuestion } from "@workspace/rse-referentials";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOrgMembership, requireExerciseScope, requireWritableExerciseScope } from "../middlewares/exerciseScope";
import { scopeToExercise, withExerciseValues } from "../lib/exercise";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { getSubsidiaryExercises } from "../lib/consolidation";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return Number(Array.isArray(raw) ? raw[0] : raw);
}

async function computeParticipation(campaignId: number) {
  const responses = await db
    .select()
    .from(barometreResponsesTable)
    .where(and(eq(barometreResponsesTable.campaignId, campaignId), eq(barometreResponsesTable.completed, true)));
  return responses.length;
}

function mapCampaign(row: BarometreCampaign, nbRepondants: number) {
  const tauxParticipation = row.nbCollaborateurs > 0 ? (nbRepondants / row.nbCollaborateurs) * 100 : 0;
  return {
    id: row.id,
    organizationId: row.organizationId,
    exerciseId: row.exerciseId,
    name: row.name,
    mode: row.mode,
    status: row.status,
    openDate: row.openDate,
    closeDate: row.closeDate,
    nbCollaborateurs: row.nbCollaborateurs,
    publicToken: row.publicToken,
    nbRepondants,
    tauxParticipation,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── CAMPAGNES ────────────────────────────────────────────────────────────────

router.get(
  "/organizations/:orgId/barometre-campaigns",
  requireAuth,
  requireOrgMembership,
  requireExerciseScope,
  async (req, res): Promise<void> => {
    // Consolidation: group with subsidiaries → LIST campaigns from parent + all subsidiaries
    const subExercises = await getSubsidiaryExercises(req.orgId!, req.exercise!.year);
    if (subExercises.length > 0) {
      const allSources = [
        { orgId: req.orgId!, exerciseId: req.exercise!.id },
        ...subExercises,
      ];
      const allRows = (
        await Promise.all(
          allSources.map(({ orgId, exerciseId }) =>
            db
              .select()
              .from(barometreCampaignsTable)
              .where(and(eq(barometreCampaignsTable.organizationId, orgId), eq(barometreCampaignsTable.exerciseId, exerciseId)))
              .orderBy(desc(barometreCampaignsTable.createdAt)),
          ),
        )
      ).flat();
      const items = await Promise.all(allRows.map(async (row) => mapCampaign(row, await computeParticipation(row.id))));
      res.json({ items });
      return;
    }

    const rows = await db
      .select()
      .from(barometreCampaignsTable)
      .where(scopeToExercise(barometreCampaignsTable, req))
      .orderBy(desc(barometreCampaignsTable.createdAt));
    const items = await Promise.all(rows.map(async (row) => mapCampaign(row, await computeParticipation(row.id))));
    res.json({ items });
  },
);

router.post(
  "/organizations/:orgId/barometre-campaigns",
  requireAuth,
  requireOrgMembership,
  requireWritableExerciseScope,
  async (req, res): Promise<void> => {
    const b = req.body as {
      name: string;
      mode: "anonymous" | "identified";
      openDate: string;
      closeDate: string;
      nbCollaborateurs: number;
      customQuestions?: string[];
    };

    const [campaign] = await db
      .insert(barometreCampaignsTable)
      .values(
        withExerciseValues(req, {
          name: b.name,
          mode: b.mode,
          openDate: b.openDate,
          closeDate: b.closeDate,
          nbCollaborateurs: b.nbCollaborateurs,
          publicToken: randomUUID(),
        }),
      )
      .returning();

    if (b.customQuestions?.length) {
      await db.insert(barometreCustomQuestionsTable).values(
        b.customQuestions.map((text, i) => ({ campaignId: campaign.id, text, sortOrder: i })),
      );
    }

    res.status(201).json(mapCampaign(campaign, 0));
  },
);

router.get(
  "/organizations/:orgId/barometre-campaigns/:id",
  requireAuth,
  requireOrgMembership,
  requireExerciseScope,
  async (req, res): Promise<void> => {
    const id = parseId(req.params.id);
    const [campaign] = await db
      .select()
      .from(barometreCampaignsTable)
      .where(scopeToExercise(barometreCampaignsTable, req, eq(barometreCampaignsTable.id, id)))
      .limit(1);
    if (!campaign) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const customQuestions = await db
      .select()
      .from(barometreCustomQuestionsTable)
      .where(eq(barometreCustomQuestionsTable.campaignId, id))
      .orderBy(barometreCustomQuestionsTable.sortOrder);
    res.json({
      campaign: mapCampaign(campaign, await computeParticipation(id)),
      customQuestions: customQuestions.map((q) => ({ id: q.id, text: q.text, sortOrder: q.sortOrder })),
    });
  },
);

router.patch(
  "/organizations/:orgId/barometre-campaigns/:id",
  requireAuth,
  requireOrgMembership,
  requireWritableExerciseScope,
  async (req, res): Promise<void> => {
    const id = parseId(req.params.id);
    const [campaign] = await db
      .select()
      .from(barometreCampaignsTable)
      .where(scopeToExercise(barometreCampaignsTable, req, eq(barometreCampaignsTable.id, id)))
      .limit(1);
    if (!campaign) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const { status } = req.body as { status: "active" | "closed" };
    const validTransitions: Record<string, string[]> = { draft: ["active"], active: ["closed"], closed: [] };
    if (!validTransitions[campaign.status]?.includes(status)) {
      res.status(403).json({ error: `Transition de "${campaign.status}" vers "${status}" non autorisée` });
      return;
    }
    const [updated] = await db
      .update(barometreCampaignsTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(barometreCampaignsTable.id, id))
      .returning();
    res.json(mapCampaign(updated, await computeParticipation(id)));
  },
);

router.delete(
  "/organizations/:orgId/barometre-campaigns/:id",
  requireAuth,
  requireOrgMembership,
  requireWritableExerciseScope,
  async (req, res): Promise<void> => {
    const id = parseId(req.params.id);

    // Campaign may belong to a subsidiary org — build the allowed (orgId, exerciseId) pairs.
    // Always include the current org + all subsidiaries.
    const subExercises = await getSubsidiaryExercises(req.orgId!, req.exercise!.year);
    const allowedPairs: { orgId: number; exerciseId: number }[] = [
      { orgId: req.orgId!, exerciseId: req.exercise!.id },
      ...subExercises,
    ];

    const [campaign] = await db
      .select()
      .from(barometreCampaignsTable)
      .where(eq(barometreCampaignsTable.id, id))
      .limit(1);

    if (
      !campaign ||
      !allowedPairs.some(
        (p) => p.orgId === campaign.organizationId && p.exerciseId === campaign.exerciseId,
      )
    ) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await db.delete(barometreCampaignsTable).where(eq(barometreCampaignsTable.id, id));
    res.status(204).end();
  },
);

// ─── RÉSULTATS ────────────────────────────────────────────────────────────────

async function loadQuestionResults(campaignId: number, includeComments: boolean) {
  const customQuestions = await db
    .select()
    .from(barometreCustomQuestionsTable)
    .where(eq(barometreCustomQuestionsTable.campaignId, campaignId))
    .orderBy(barometreCustomQuestionsTable.sortOrder);

  const allAnswers = await db
    .select({ answer: barometreAnswersTable, response: barometreResponsesTable })
    .from(barometreAnswersTable)
    .innerJoin(barometreResponsesTable, eq(barometreAnswersTable.responseId, barometreResponsesTable.id))
    .where(and(eq(barometreResponsesTable.campaignId, campaignId), eq(barometreResponsesTable.completed, true)));

  const questions = [
    ...BAROMETRE_REFERENTIAL.map((q) => ({ code: q.code, theme: q.theme, text: q.text, type: q.type })),
    ...customQuestions.map((q) => ({ code: `custom-${q.id}`, theme: "Questions personnalisées", text: q.text, type: "text" as const })),
  ];

  return questions.map((q) => {
    const answersForQ = allAnswers.filter((a) => a.answer.questionCode === q.code);
    if (q.type === "scale") {
      const values = answersForQ.map((a) => a.answer.scaleValue).filter((v): v is number => v != null);
      const distribution: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
      for (const v of values) distribution[String(v)] = (distribution[String(v)] ?? 0) + 1;
      return {
        code: q.code,
        theme: q.theme,
        text: q.text,
        type: q.type,
        average: values.length ? values.reduce((s, v) => s + v, 0) / values.length : null,
        responseCount: values.length,
        distribution,
      };
    }
    const comments = answersForQ.map((a) => a.answer.freeText).filter((t): t is string => !!t && t.trim().length > 0);
    return {
      code: q.code,
      theme: q.theme,
      text: q.text,
      type: q.type,
      average: null,
      responseCount: comments.length,
      comments: includeComments ? comments : undefined,
    };
  });
}

router.get(
  "/organizations/:orgId/barometre-campaigns/:id/results",
  requireAuth,
  requireOrgMembership,
  requireExerciseScope,
  async (req, res): Promise<void> => {
    const id = parseId(req.params.id);
    const [campaign] = await db
      .select()
      .from(barometreCampaignsTable)
      .where(scopeToExercise(barometreCampaignsTable, req, eq(barometreCampaignsTable.id, id)))
      .limit(1);
    if (!campaign) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const questions = await loadQuestionResults(id, true);

    // Comparison with the most recent other closed campaign of the same organization.
    const recentClosed = await db
      .select()
      .from(barometreCampaignsTable)
      .where(
        and(
          eq(barometreCampaignsTable.organizationId, campaign.organizationId),
          eq(barometreCampaignsTable.status, "closed"),
        ),
      )
      .orderBy(desc(barometreCampaignsTable.closeDate))
      .limit(2);

    let previousQuestions: Awaited<ReturnType<typeof loadQuestionResults>> = [];
    const prevCampaign = recentClosed.find((c) => c.id !== campaign.id);
    if (prevCampaign) {
      previousQuestions = await loadQuestionResults(prevCampaign.id, false);
    }

    res.json({
      campaign: mapCampaign(campaign, await computeParticipation(id)),
      questions: questions.map((q) => ({
        ...q,
        previousAverage: previousQuestions.find((p) => p.code === q.code)?.average ?? null,
      })),
    });
  },
);

// ─── SYNTHÈSE ─────────────────────────────────────────────────────────────────

async function buildSynthese(campaign: BarometreCampaign) {
  const questions = await loadQuestionResults(campaign.id, true);
  const scaleQuestions = questions.filter((q) => q.type === "scale" && q.average != null);
  const satisfactionGlobale = scaleQuestions.length
    ? scaleQuestions.reduce((s, q) => s + (q.average ?? 0), 0) / scaleQuestions.length
    : null;

  const themeScores = BAROMETRE_THEMES.map((theme) => {
    const themeQuestions = scaleQuestions.filter((q) => q.theme === theme);
    const average = themeQuestions.length
      ? themeQuestions.reduce((s, q) => s + (q.average ?? 0), 0) / themeQuestions.length
      : null;
    return { theme, average, previousAverage: null as number | null };
  });

  const sorted = [...themeScores].filter((t) => t.average != null).sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
  const pointsForts = sorted.slice(0, 2).map((t) => t.theme);
  const pointsFaibles = sorted
    .slice(-2)
    .map((t) => t.theme)
    .reverse();
  const themesASurveiller = sorted.filter((t) => (t.average ?? 5) < 3).map((t) => t.theme);

  const [aiSummary] = await db
    .select()
    .from(barometreAiSummariesTable)
    .where(eq(barometreAiSummariesTable.campaignId, campaign.id))
    .limit(1);

  return {
    campaign: mapCampaign(campaign, await computeParticipation(campaign.id)),
    satisfactionGlobale,
    nbCollaborateurs: campaign.nbCollaborateurs,
    nbRepondants: await computeParticipation(campaign.id),
    tauxParticipation:
      campaign.nbCollaborateurs > 0 ? ((await computeParticipation(campaign.id)) / campaign.nbCollaborateurs) * 100 : 0,
    themeScores,
    pointsForts,
    pointsFaibles,
    themesASurveiller,
    aiSummary: aiSummary
      ? {
          summary: aiSummary.summary,
          themes: aiSummary.themes as string[],
          suggestions: aiSummary.suggestions as string[],
          generatedAt: aiSummary.generatedAt.toISOString(),
        }
      : null,
  };
}

router.get(
  "/organizations/:orgId/barometre-campaigns/:id/synthese",
  requireAuth,
  requireOrgMembership,
  requireExerciseScope,
  async (req, res): Promise<void> => {
    const id = parseId(req.params.id);
    const [campaign] = await db
      .select()
      .from(barometreCampaignsTable)
      .where(scopeToExercise(barometreCampaignsTable, req, eq(barometreCampaignsTable.id, id)))
      .limit(1);
    if (!campaign) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(await buildSynthese(campaign));
  },
);

router.post(
  "/organizations/:orgId/barometre-campaigns/:id/synthese/regenerate",
  requireAuth,
  requireOrgMembership,
  requireExerciseScope,
  async (req, res): Promise<void> => {
    const id = parseId(req.params.id);
    const [campaign] = await db
      .select()
      .from(barometreCampaignsTable)
      .where(scopeToExercise(barometreCampaignsTable, req, eq(barometreCampaignsTable.id, id)))
      .limit(1);
    if (!campaign) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const questions = await loadQuestionResults(id, true);
    const comments = questions.flatMap((q) => q.comments ?? []).filter(Boolean);

    if (comments.length === 0) {
      await db
        .insert(barometreAiSummariesTable)
        .values({ campaignId: id, summary: "Aucun commentaire libre n'a été laissé pour cette campagne.", themes: [], suggestions: [] })
        .onConflictDoUpdate({
          target: barometreAiSummariesTable.campaignId,
          set: { summary: "Aucun commentaire libre n'a été laissé pour cette campagne.", themes: [], suggestions: [], generatedAt: new Date() },
        });
      res.json(await buildSynthese(campaign));
      return;
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Tu es un assistant RH. Voici des commentaires libres anonymes recueillis lors d'un baromètre social en entreprise :\n\n${comments
            .map((c, i) => `${i + 1}. ${c}`)
            .join("\n")}\n\nRéponds UNIQUEMENT en JSON valide avec ce format exact, en français : {"summary": "un résumé synthétique en 3-4 phrases", "themes": ["thème récurrent 1", "thème récurrent 2"], "suggestions": ["suggestion actionnable 1", "suggestion actionnable 2"]}`,
        },
      ],
    });

    const textBlock = message.content.find((c) => c.type === "text");
    let parsed: { summary: string; themes: string[]; suggestions: string[] };
    try {
      const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      parsed = { summary: "Le résumé automatique n'a pas pu être généré. Merci de réessayer.", themes: [], suggestions: [] };
    }

    await db
      .insert(barometreAiSummariesTable)
      .values({ campaignId: id, summary: parsed.summary, themes: parsed.themes ?? [], suggestions: parsed.suggestions ?? [] })
      .onConflictDoUpdate({
        target: barometreAiSummariesTable.campaignId,
        set: { summary: parsed.summary, themes: parsed.themes ?? [], suggestions: parsed.suggestions ?? [], generatedAt: new Date() },
      });

    res.json(await buildSynthese(campaign));
  },
);

// ─── PUBLIC (no auth — employees never have Cocci accounts) ──────────────────

router.get("/public/barometre/:token", async (req, res): Promise<void> => {
  const token = req.params.token as string;
  const [campaign] = await db.select().from(barometreCampaignsTable).where(eq(barometreCampaignsTable.publicToken, token)).limit(1);
  if (!campaign) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (campaign.status !== "active") {
    res.status(410).json({ error: "Cette campagne n'est pas ouverte actuellement" });
    return;
  }

  const customQuestions = await db
    .select()
    .from(barometreCustomQuestionsTable)
    .where(eq(barometreCustomQuestionsTable.campaignId, campaign.id))
    .orderBy(barometreCustomQuestionsTable.sortOrder);

  res.json({
    campaignName: campaign.name,
    mode: campaign.mode,
    closeDate: campaign.closeDate,
    questions: [
      ...BAROMETRE_REFERENTIAL.map((q) => ({ code: q.code, theme: q.theme, text: q.text, type: q.type })),
      ...customQuestions.map((q) => ({ code: `custom-${q.id}`, theme: "Questions personnalisées", text: q.text, type: "text" as const })),
    ],
  });
});

router.post("/public/barometre/:token/responses", async (req, res): Promise<void> => {
  const token = req.params.token as string;
  const [campaign] = await db.select().from(barometreCampaignsTable).where(eq(barometreCampaignsTable.publicToken, token)).limit(1);
  if (!campaign) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (campaign.status !== "active") {
    res.status(410).json({ error: "Cette campagne n'est pas ouverte actuellement" });
    return;
  }

  const b = req.body as {
    respondentLabel?: string | null;
    completed?: boolean;
    answers: { questionCode: string; scaleValue?: number | null; freeText?: string | null }[];
  };

  const [response] = await db
    .insert(barometreResponsesTable)
    .values({
      campaignId: campaign.id,
      respondentLabel: campaign.mode === "identified" ? b.respondentLabel ?? null : null,
      completed: !!b.completed,
      submittedAt: b.completed ? new Date() : null,
    })
    .returning();

  for (const a of b.answers) {
    const isKnown = a.questionCode.startsWith("custom-") || !!getBarometreQuestion(a.questionCode);
    if (!isKnown) continue;
    await db
      .insert(barometreAnswersTable)
      .values({
        responseId: response.id,
        questionCode: a.questionCode,
        scaleValue: a.scaleValue ?? null,
        freeText: a.freeText ?? null,
      })
      .onConflictDoUpdate({
        target: [barometreAnswersTable.responseId, barometreAnswersTable.questionCode],
        set: { scaleValue: a.scaleValue ?? null, freeText: a.freeText ?? null },
      });
  }

  res.json({ ok: true });
});

export default router;
