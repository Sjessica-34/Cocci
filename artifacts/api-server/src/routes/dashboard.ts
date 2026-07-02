import { Router, type IRouter } from "express";
import { eq, and, count } from "drizzle-orm";
import { db, membersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireMembership } from "../middlewares/requireMembership";
import {
  GetOrganizationDashboardParams,
  GetOrganizationDashboardResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get(
  "/organizations/:id/dashboard",
  requireAuth,
  requireMembership(["owner", "admin", "member", "viewer"]),
  async (req, res): Promise<void> => {
    const params = GetOrganizationDashboardParams.safeParse({
      id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id),
    });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [memberCountRow] = await db
      .select({ count: count() })
      .from(membersTable)
      .where(and(eq(membersTable.organizationId, params.data.id), eq(membersTable.status, "active")));

    const memberCount = memberCountRow?.count ?? 0;

    const summary = {
      organizationId: params.data.id,
      memberCount: Number(memberCount),
      activeModules: 0,
      completionRate: 0,
      lastActivityAt: null,
    };

    res.json(GetOrganizationDashboardResponse.parse(summary));
  },
);

export default router;
