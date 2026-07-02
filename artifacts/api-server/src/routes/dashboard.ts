import { Router, type IRouter } from "express";
import { eq, and, count } from "drizzle-orm";
import { db, membersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "./users";
import {
  GetOrganizationDashboardParams,
  GetOrganizationDashboardResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/organizations/:id/dashboard", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = (req as any).clerkUserId as string;
  const currentUser = await getOrCreateUser(clerkUserId);

  const params = GetOrganizationDashboardParams.safeParse({ id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [access] = await db
    .select()
    .from(membersTable)
    .where(and(eq(membersTable.userId, currentUser.id), eq(membersTable.organizationId, params.data.id)))
    .limit(1);

  if (!access) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [memberCountRow] = await db
    .select({ count: count() })
    .from(membersTable)
    .where(and(eq(membersTable.organizationId, params.data.id), eq(membersTable.status, "active")));

  const memberCount = memberCountRow?.count ?? 0;

  // Module 1 only — RSE modules not yet implemented.
  // completionRate and activeModules will grow as we add RSE modules.
  const summary = {
    organizationId: params.data.id,
    memberCount: Number(memberCount),
    activeModules: 0,
    completionRate: 0,
    lastActivityAt: null,
  };

  res.json(GetOrganizationDashboardResponse.parse(summary));
});

export default router;
