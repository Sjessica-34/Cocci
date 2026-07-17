import { Router } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, diagnosticResponsesTable, organizationsTable } from "@workspace/db";
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
import { resolveExercise } from "../lib/exercise";
import { getSubsidiaryExercises } from "../lib/consolidation";
import { UpsertDiagnosticResponsesBody } from "@workspace/api-zod";
import { computePrefillSuggestions } from "./diagnosticPrefill";

function computeSubcategoryScores(responseMap: Map<string, number>) {
  return ALL_SUBCATEGORIES.map((sub) => {
    const totalQuestions = sub.questions.length;
    const answered = sub.questions.filter((q) => responseMap.has(q.id)).length;
    const sumLevels = sub.questions.reduce((acc, q) => acc + (responseMap.get(q.id) ?? 0), 0);
    const completeness = totalQuestions > 0 ? answered / totalQuestions : 0;
    const hasEnoughData = completeness >= COMPLETENESS_THRESHOLD;
    const scorePercent = hasEnoughData ? Math.round((sumLevels / (answered * 3)) * 100) : null;
    return { subcategoryId: sub.id, categoryId: sub.categoryId, label: sub.label, totalQuestions, answered, completeness: Math.round(completeness * 100), scorePercent, maturityLabel: getMaturityLabel(scorePercent) };
  });
}

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
    const orgId = req.orgId!;
    const exercise = req.exercise!;

    // Group consolidation: aggregate subsidiary scores
    const subExercises = await getSubsidiaryExercises(orgId, exercise.year);
    if (subExercises.length > 0) {
      const allResponsesPerSub = await Promise.all(
        subExercises.map(({ orgId: subOrgId, exerciseId }) =>
          db.select().from(diagnosticResponsesTable).where(
            and(
              eq(diagnosticResponsesTable.organizationId, subOrgId),
              eq(diagnosticResponsesTable.exerciseId, exerciseId),
            ),
          ),
        ),
      );

      const numSubs = subExercises.length;
      const perSubScores = allResponsesPerSub.map((rows) => {
        const map = new Map<string, number>();
        for (const r of rows) map.set(r.questionId, r.level);
        return computeSubcategoryScores(map);
      });

      const merged = ALL_SUBCATEGORIES.map((sub, i) => {
        const subScores = perSubScores.map((s) => s[i]);
        const nonNull = subScores.map((s) => s.scorePercent).filter((v): v is number => v !== null);
        const scorePercent = nonNull.length > 0 ? Math.round(nonNull.reduce((a, b) => a + b, 0) / nonNull.length) : null;
        const totalAnswered = subScores.reduce((a, s) => a + s.answered, 0);
        const totalQuestions = sub.questions.length * numSubs;
        const completeness = totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0;
        return { subcategoryId: sub.id, categoryId: sub.categoryId, label: sub.label, totalQuestions, answered: totalAnswered, completeness, scorePercent, maturityLabel: getMaturityLabel(scorePercent) };
      });

      res.json(merged);
      return;
    }

    // Single org path
    const responses = await db
      .select()
      .from(diagnosticResponsesTable)
      .where(
        and(
          eq(diagnosticResponsesTable.organizationId, orgId),
          eq(diagnosticResponsesTable.exerciseId, exercise.id),
        ),
      );

    const responseMap = new Map<string, number>();
    for (const r of responses) responseMap.set(r.questionId, r.level);

    res.json(computeSubcategoryScores(responseMap));
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

// ─── GET CONSOLIDATED SCORES (group / root org) ────────────────────────────
router.get(
  "/organizations/:orgId/diagnostic/consolidated",
  requireAuth,
  requireOrgMembership,
  async (req, res) => {
    // Find all subsidiaries of this org
    const subsidiaries = await db
      .select({ id: organizationsTable.id, name: organizationsTable.name })
      .from(organizationsTable)
      .where(eq(organizationsTable.parentId, req.orgId!));

    if (subsidiaries.length === 0) {
      res.status(400).json({ error: "Not a group org or no subsidiaries found" });
      return;
    }

    // Resolve the exercise for the root org
    const exercise = await resolveExercise(req.orgId!, req);
    if (!exercise) {
      res.status(400).json({ error: "Exercise not found" });
      return;
    }

    // Compute scores for each subsidiary
    const result = await Promise.all(
      subsidiaries.map(async (sub) => {
        const responses = await db
          .select()
          .from(diagnosticResponsesTable)
          .where(
            and(
              eq(diagnosticResponsesTable.organizationId, sub.id),
              eq(diagnosticResponsesTable.exerciseId, exercise.id),
            ),
          );

        const responseMap = new Map<string, number>();
        for (const r of responses) {
          responseMap.set(r.questionId, r.level);
        }

        const scores = ALL_SUBCATEGORIES.map((subcat) => {
          const totalQuestions = subcat.questions.length;
          const answered = subcat.questions.filter((q) => responseMap.has(q.id)).length;
          const sumLevels = subcat.questions.reduce((acc, q) => acc + (responseMap.get(q.id) ?? 0), 0);
          const completeness = totalQuestions > 0 ? answered / totalQuestions : 0;
          const hasEnoughData = completeness >= COMPLETENESS_THRESHOLD;
          const scorePercent = hasEnoughData
            ? Math.round((sumLevels / (answered * 3)) * 100)
            : null;
          return {
            subcategoryId: subcat.id,
            categoryId: subcat.categoryId,
            label: subcat.label,
            totalQuestions,
            answered,
            completeness: Math.round(completeness * 100),
            scorePercent,
            maturityLabel: getMaturityLabel(scorePercent),
          };
        });

        return { org: { id: sub.id, name: sub.name }, scores };
      }),
    );

    res.json(result);
  },
);

export default router;
