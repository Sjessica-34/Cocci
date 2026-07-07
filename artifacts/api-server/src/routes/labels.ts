import { Router } from "express";
import { db, labelsTable, membersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/auth";

const router = Router();

function parseId(raw: string | string[]): number {
  return Number(Array.isArray(raw) ? raw[0] : raw);
}

async function verifyMembership(clerkUserId: string, orgId: number): Promise<boolean> {
  const user = await getOrCreateUser(clerkUserId);
  const [m] = await db
    .select({ id: membersTable.id })
    .from(membersTable)
    .where(and(eq(membersTable.organizationId, orgId), eq(membersTable.userId, user.id)))
    .limit(1);
  return !!m;
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

router.get("/organizations/:orgId/labels", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  if (isNaN(orgId)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!await verifyMembership(req.clerkUserId!, orgId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const rows = await db.select().from(labelsTable).where(eq(labelsTable.organizationId, orgId));
  res.json({ items: rows.map(mapLabel) });
});

router.post("/organizations/:orgId/labels", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  if (isNaN(orgId)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!await verifyMembership(req.clerkUserId!, orgId)) { res.status(403).json({ error: "Forbidden" }); return; }
  const b = req.body as Record<string, unknown>;
  const docIds = Array.isArray(b.documentIds) ? (b.documentIds as number[]) : [];
  const [row] = await db.insert(labelsTable).values({
    organizationId: orgId,
    name:           (b.name as string | undefined) ?? null,
    logoUrl:        (b.logoUrl as string | undefined) ?? null,
    holder:         (b.holder as string | undefined) ?? null,
    year:           (b.year as number | undefined) ?? null,
    score:          (b.score as string | undefined) ?? null,
    documentIds:    JSON.stringify(docIds),
  }).returning();
  res.json(mapLabel(row));
});

router.put("/organizations/:orgId/labels/:id", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  const id    = parseId(req.params.id);
  if (isNaN(orgId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!await verifyMembership(req.clerkUserId!, orgId)) { res.status(403).json({ error: "Forbidden" }); return; }
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
  }).where(and(eq(labelsTable.id, id), eq(labelsTable.organizationId, orgId))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapLabel(row));
});

router.delete("/organizations/:orgId/labels/:id", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  const id    = parseId(req.params.id);
  if (isNaN(orgId) || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!await verifyMembership(req.clerkUserId!, orgId)) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(labelsTable).where(and(eq(labelsTable.id, id), eq(labelsTable.organizationId, orgId)));
  res.status(204).send();
});

export default router;
