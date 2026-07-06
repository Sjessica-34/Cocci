import { Router } from "express";
import { db, impactScoreResultsTable, membersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/auth";

const router = Router();

function parseId(raw: string | string[]): number {
  return Number(Array.isArray(raw) ? raw[0] : raw);
}

async function verifyMembership(clerkUserId: string, orgId: number): Promise<number | null> {
  const user = await getOrCreateUser(clerkUserId);
  const [membership] = await db
    .select({ id: membersTable.id })
    .from(membersTable)
    .where(and(eq(membersTable.organizationId, orgId), eq(membersTable.userId, user.id)))
    .limit(1);
  return membership ? user.id : null;
}

// GET /organizations/:orgId/impact-score-result
router.get("/organizations/:orgId/impact-score-result", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid organization id" }); return; }

  const userId = await verifyMembership(req.clerkUserId!, orgId);
  if (!userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const [row] = await db
    .select()
    .from(impactScoreResultsTable)
    .where(eq(impactScoreResultsTable.organizationId, orgId))
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
router.put("/organizations/:orgId/impact-score-result", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid organization id" }); return; }

  const userId = await verifyMembership(req.clerkUserId!, orgId);
  if (!userId) { res.status(403).json({ error: "Forbidden" }); return; }

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
    .where(eq(impactScoreResultsTable.organizationId, orgId))
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
      .values({
        organizationId: orgId,
        score: body.score,
        dateRealisation: body.dateRealisation,
        commentaire: body.commentaire ?? null,
      })
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
