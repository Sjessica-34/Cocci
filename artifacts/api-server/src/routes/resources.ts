import { Router } from "express";
import { db, membersTable, resourcesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/auth";

const router = Router();

// GET /organizations/:orgId/resources — ressources publiées (client)
router.get("/organizations/:orgId/resources", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.orgId) ? req.params.orgId[0] : req.params.orgId;
  const orgId = Number(rawId);
  if (!orgId || isNaN(orgId)) {
    res.status(400).json({ error: "Invalid organization id" });
    return;
  }

  const user = await getOrCreateUser(req.clerkUserId!);

  const [membership] = await db
    .select({ id: membersTable.id })
    .from(membersTable)
    .where(and(eq(membersTable.organizationId, orgId), eq(membersTable.userId, user.id)))
    .limit(1);

  if (!membership) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const resources = await db
    .select()
    .from(resourcesTable)
    .where(and(eq(resourcesTable.organizationId, orgId), eq(resourcesTable.isPublished, true)))
    .orderBy(resourcesTable.createdAt);

  res.json(resources);
});

export default router;
