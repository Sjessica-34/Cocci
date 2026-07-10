import { Router } from "express";
import { db, labelsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOrgMembership, requireExerciseScope, requireWritableExerciseScope } from "../middlewares/exerciseScope";
import { scopeToExercise, withExerciseValues } from "../lib/exercise";

const router = Router();

function parseId(raw: string | string[]): number {
  return Number(Array.isArray(raw) ? raw[0] : raw);
}

function mapLabel(row: typeof labelsTable.$inferSelect) {
  return {
    id:             row.id,
    organizationId: row.organizationId,
    name:           row.name ?? null,
    logoUrl:        row.logoUrl ?? null,
    holder:         row.holder ?? null,
    year:           row.year ?? null,
    score:          row.score ?? null,
    documentIds:    row.documentIds ? (JSON.parse(row.documentIds) as number[]) : [],
    createdAt:      row.createdAt.toISOString(),
    updatedAt:      row.updatedAt.toISOString(),
  };
}

router.get("/organizations/:orgId/labels", requireAuth, requireOrgMembership, requireExerciseScope, async (req, res): Promise<void> => {
  const rows = await db.select().from(labelsTable).where(scopeToExercise(labelsTable, req));
  res.json({ items: rows.map(mapLabel) });
});

router.post("/organizations/:orgId/labels", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const b = req.body as Record<string, unknown>;
  const docIds = Array.isArray(b.documentIds) ? (b.documentIds as number[]) : [];
  const [row] = await db.insert(labelsTable).values(
    withExerciseValues(req, {
      name:        (b.name as string | undefined) ?? null,
      logoUrl:     (b.logoUrl as string | undefined) ?? null,
      holder:      (b.holder as string | undefined) ?? null,
      year:        (b.year as number | undefined) ?? null,
      score:       (b.score as string | undefined) ?? null,
      documentIds: JSON.stringify(docIds),
    }),
  ).returning();
  res.json(mapLabel(row));
});

router.put("/organizations/:orgId/labels/:id", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const b = req.body as Record<string, unknown>;
  const docIds = Array.isArray(b.documentIds) ? (b.documentIds as number[]) : [];
  const [row] = await db.update(labelsTable).set({
    name:        (b.name as string | null | undefined) ?? null,
    logoUrl:     (b.logoUrl as string | null | undefined) ?? null,
    holder:      (b.holder as string | null | undefined) ?? null,
    year:        (b.year as number | null | undefined) ?? null,
    score:       (b.score as string | null | undefined) ?? null,
    documentIds: JSON.stringify(docIds),
    updatedAt:   new Date(),
  }).where(scopeToExercise(labelsTable, req, eq(labelsTable.id, id))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapLabel(row));
});

router.delete("/organizations/:orgId/labels/:id", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(labelsTable).where(scopeToExercise(labelsTable, req, eq(labelsTable.id, id)));
  res.status(204).send();
});

export default router;
