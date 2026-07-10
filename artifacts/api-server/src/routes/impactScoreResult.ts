import { Router } from "express";
import { db, impactScoreResultsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOrgMembership, requireExerciseScope, requireWritableExerciseScope } from "../middlewares/exerciseScope";
import { scopeToExercise, withExerciseValues } from "../lib/exercise";

const router = Router();

// GET /organizations/:orgId/impact-score-result
router.get("/organizations/:orgId/impact-score-result", requireAuth, requireOrgMembership, requireExerciseScope, async (req, res): Promise<void> => {
  const [row] = await db
    .select()
    .from(impactScoreResultsTable)
    .where(scopeToExercise(impactScoreResultsTable, req))
    .limit(1);

  res.json({
    result: row
      ? {
          id: row.id,
          organizationId: row.organizationId,
          score: row.score,
          dateRealisation: row.dateRealisation,
          commentaire: row.commentaire ?? null,
          updatedAt: row.updatedAt.toISOString(),
        }
      : null,
  });
});

// PUT /organizations/:orgId/impact-score-result
router.put("/organizations/:orgId/impact-score-result", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const body = req.body as { score?: number; dateRealisation?: string; commentaire?: string | null };

  if (body.score === undefined || body.dateRealisation === undefined) {
    res.status(400).json({ error: "score and dateRealisation are required" });
    return;
  }
  if (typeof body.score !== "number" || body.score < 0 || body.score > 100) {
    res.status(400).json({ error: "score must be an integer between 0 and 100" });
    return;
  }

  const [existing] = await db
    .select({ id: impactScoreResultsTable.id })
    .from(impactScoreResultsTable)
    .where(scopeToExercise(impactScoreResultsTable, req))
    .limit(1);

  let row;
  if (existing) {
    [row] = await db
      .update(impactScoreResultsTable)
      .set({
        score: body.score,
        dateRealisation: body.dateRealisation,
        commentaire: body.commentaire ?? null,
        updatedAt: new Date(),
      })
      .where(eq(impactScoreResultsTable.id, existing.id))
      .returning();
  } else {
    [row] = await db
      .insert(impactScoreResultsTable)
      .values(
        withExerciseValues(req, {
          score: body.score,
          dateRealisation: body.dateRealisation,
          commentaire: body.commentaire ?? null,
        }),
      )
      .returning();
  }

  res.json({
    id: row.id,
    organizationId: row.organizationId,
    score: row.score,
    dateRealisation: row.dateRealisation,
    commentaire: row.commentaire ?? null,
    updatedAt: row.updatedAt.toISOString(),
  });
});

export default router;
