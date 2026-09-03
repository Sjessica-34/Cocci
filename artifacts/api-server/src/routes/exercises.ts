import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, exercisesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOrgMembership } from "../middlewares/exerciseScope";
import { requireSuperAdmin } from "../middlewares/requireSuperAdmin";
import { ListExercisesResponse, AdvanceExerciseResponse } from "@workspace/api-zod";
import { currentExerciseYear, ensureAnnualLifecycle } from "../lib/exerciseLifecycle";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return Number(Array.isArray(raw) ? raw[0] : raw);
}

router.get(
  "/organizations/:orgId/exercises",
  requireAuth,
  requireOrgMembership,
  async (req, res): Promise<void> => {
    const orgId = parseId(req.params.orgId as string);
    await ensureAnnualLifecycle(orgId, { mode: "recovery" });
    const rows = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.organizationId, orgId))
      .orderBy(desc(exercisesTable.year));
    res.json(ListExercisesResponse.parse(rows));
  },
);

/**
 * Superadministrator recovery command. It calls the same idempotent annual
 * lifecycle service as scheduled maintenance and request-time recovery.
 */
router.post(
  "/organizations/:orgId/exercises/advance",
  requireAuth,
  requireSuperAdmin,
  async (req, res): Promise<void> => {
    const orgId = parseId(req.params.orgId as string);
    try {
      const targetYear = currentExerciseYear() + 1;
      const created = await ensureAnnualLifecycle(orgId, {
        targetYear,
        mode: "manual",
      });
      res.status(201).json(AdvanceExerciseResponse.parse(created));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Exercise transition failed";
      res.status(message === "Organization not found" ? 404 : 409).json({ error: message });
    }
  },
);

export default router;
