import { Router } from "express";
import { db, captationCarboneTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOrgMembership, requireExerciseScope, requireWritableExerciseScope } from "../middlewares/exerciseScope";
import { scopeToExercise, withExerciseValues } from "../lib/exercise";

const router = Router();

function numOrNull(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : String(n);
}

function computeCaptationKg(body: Record<string, unknown>): string | null {
  const mode = String(body.mode ?? "");
  if (mode === "saisie") {
    const val = Number(body.captationValue);
    const unit = String(body.captationUnit ?? "kg");
    if (isNaN(val) || !val) return null;
    return unit === "t" ? String(val * 1000) : String(val);
  }
  if (mode === "estimation") {
    const trees = Number(body.treeCount);
    if (isNaN(trees) || !trees) return null;
    const ARNAUD_DE_GRAVE_KG_PER_TREE = 10;
    return String(trees * ARNAUD_DE_GRAVE_KG_PER_TREE);
  }
  return null;
}

// GET /organizations/:orgId/captation-carbone
router.get("/organizations/:orgId/captation-carbone", requireAuth, requireOrgMembership, requireExerciseScope, async (req, res): Promise<void> => {
  const [record] = await db
    .select()
    .from(captationCarboneTable)
    .where(scopeToExercise(captationCarboneTable, req))
    .limit(1);

  if (!record) { res.status(404).json({ error: "No captation yet" }); return; }
  res.json(serialize(record));
});

// PUT /organizations/:orgId/captation-carbone
router.put("/organizations/:orgId/captation-carbone", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;

  const payload = withExerciseValues(req, {
    year: Number(body.year) || new Date().getFullYear(),
    mode: String(body.mode ?? "saisie"),
    captationValue: numOrNull(body.captationValue),
    captationUnit: (body.captationUnit as string) ?? "kg",
    treeCount: body.treeCount != null ? Number(body.treeCount) : null,
    captationKgPerYear: computeCaptationKg(body),
    updatedAt: new Date(),
  });

  const [existing] = await db
    .select({ id: captationCarboneTable.id })
    .from(captationCarboneTable)
    .where(scopeToExercise(captationCarboneTable, req))
    .limit(1);

  let record;
  if (existing) {
    [record] = await db
      .update(captationCarboneTable)
      .set(payload)
      .where(eq(captationCarboneTable.id, existing.id))
      .returning();
  } else {
    [record] = await db.insert(captationCarboneTable).values(payload).returning();
  }

  res.json(serialize(record!));
});

// DELETE /organizations/:orgId/captation-carbone
router.delete("/organizations/:orgId/captation-carbone", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const deleted = await db
    .delete(captationCarboneTable)
    .where(scopeToExercise(captationCarboneTable, req))
    .returning();

  if (!deleted.length) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).end();
});

function serialize(r: typeof captationCarboneTable.$inferSelect) {
  const toNum = (v: string | null | undefined) => (v != null ? Number(v) : null);
  return {
    id: r.id,
    organizationId: r.organizationId,
    year: r.year,
    mode: r.mode,
    captationValue: toNum(r.captationValue),
    captationUnit: r.captationUnit,
    treeCount: r.treeCount,
    captationKgPerYear: toNum(r.captationKgPerYear),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export default router;
