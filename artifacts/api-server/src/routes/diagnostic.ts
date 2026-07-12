import { Router } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, diagnosticResponsesTable } from "@workspace/db";
import {
  ALL_SUBCATEGORIES,
  ALL_QUESTIONS,
  getMaturityLabel,
  COMPLETENESS_THRESHOLD,
} from "@workspace/rse-referentials";
import { requireAuth } from "../middlewares/requireAuth";
import {
  requireOrgMembership,
  requireExerciseScope,
  requireWritableExerciseScope,
} from "../middlewares/exerciseScope";
import { UpsertDiagnosticResponsesBody } from "@workspace/api-zod";
import { computePrefillSuggestions } from "./diagnosticPrefill";

const router = Router();

// ─── GET RESPONSES ─────────────────────────────────────────────────────────────
router.get(
  "/organizations/:orgId/diagnostic/responses",
  requireAuth,
  requireOrgMembership,
  requireExerciseScope,
  async (req, res) => {
    const rows = await db
      .select()
      .from(diagnosticResponsesTable)
      .where(
        and(
          eq(diagnosticResponsesTable.organizationId, req.orgId!),
          eq(diagnosticResponsesTable.exerciseId, req.exercise!.id),
        ),
      );
    res.json(rows);
  },
);

// ─── UPSERT RESPONSES ─────────────────────────────────────────────────────────
router.put(
  "/organizations/:orgId/diagnostic/responses",
  requireAuth,
  requireOrgMembership,
  requireWritableExerciseScope,
  async (req, res) => {
    const parsed = UpsertDiagnosticResponsesBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", details: parsed.error.issues });
      return;
    }

    const validQuestionIds = new Set(ALL_QUESTIONS.map((q) => q.id));
    const invalidIds = parsed.data.responses
      .filter((r) => !validQuestionIds.has(r.questionId))
      .map((r) => r.questionId);

    if (invalidIds.length > 0) {
      res.status(400).json({ error: "Unknown question ids", details: invalidIds });
      return;
    }

    const values = parsed.data.responses.map((r) => ({
      organizationId: req.orgId!,
      exerciseId: req.exercise!.id,
      questionId: r.questionId,
      level: r.level,
      comment: r.comment ?? null,
      updatedAt: new Date(),
    }));

    await db
      .insert(diagnosticResponsesTable)
      .values(values)
      .onConflictDoUpdate({
        target: [
          diagnosticResponsesTable.organizationId,
          diagnosticResponsesTable.exerciseId,
          diagnosticResponsesTable.questionId,
        ],
        set: {
          level: sql`excluded.level`,
          comment: sql`excluded.comment`,
          updatedAt: sql`now()`,
        },
      });

    const updated = await db
      .select()
      .from(diagnosticResponsesTable)
      .where(
        and(
          eq(diagnosticResponsesTable.organizationId, req.orgId!),
          eq(diagnosticResponsesTable.exerciseId, req.exercise!.id),
        ),
      );

    res.json(updated);
  },
);

// ─── GET SCORES ───────────────────────────────────────────────────────────────
router.get(
  "/organizations/:orgId/diagnostic/scores",
  requireAuth,
  requireOrgMembership,
  requireExerciseScope,
  async (req, res) => {
    const responses = await db
      .select()
      .from(diagnosticResponsesTable)
      .where(
        and(
          eq(diagnosticResponsesTable.organizationId, req.orgId!),
          eq(diagnosticResponsesTable.exerciseId, req.exercise!.id),
        ),
      );

    const responseMap = new Map<string, number>();
    for (const r of responses) {
      responseMap.set(r.questionId, r.level);
    }

    const scores = ALL_SUBCATEGORIES.map((sub) => {
      const totalQuestions = sub.questions.length;
      const answered = sub.questions.filter((q) => responseMap.has(q.id)).length;
      const sumLevels = sub.questions.reduce((acc, q) => {
        const level = responseMap.get(q.id);
        return acc + (level ?? 0);
      }, 0);

      const completeness = totalQuestions > 0 ? answered / totalQuestions : 0;
      const hasEnoughData = completeness >= COMPLETENESS_THRESHOLD;
      const scorePercent = hasEnoughData
        ? Math.round((sumLevels / (answered * 3)) * 100)
        : null;

      return {
        subcategoryId: sub.id,
        categoryId: sub.categoryId,
        label: sub.label,
        totalQuestions,
        answered,
        completeness: Math.round(completeness * 100),
        scorePercent,
        maturityLabel: getMaturityLabel(scorePercent),
      };
    });

    res.json(scores);
  },
);

// ─── GET PREFILL SUGGESTIONS ───────────────────────────────────────────────
router.get(
  "/organizations/:orgId/diagnostic/prefill",
  requireAuth,
  requireOrgMembership,
  requireExerciseScope,
  async (req, res) => {
    const suggestions = await computePrefillSuggestions(
      req.orgId!,
      req.exercise!.id,
    );
    res.json(suggestions);
  },
);

export default router;
