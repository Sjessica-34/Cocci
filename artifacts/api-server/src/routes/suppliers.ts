import { Router } from "express";
import { db, suppliersTable, membersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/auth";

const router = Router();

function parseId(raw: string | string[]): number {
  return Number(Array.isArray(raw) ? raw[0] : raw);
}

async function verifyMembership(clerkUserId: string, orgId: number): Promise<number | null> {
  const user = await getOrCreateUser(clerkUserId);
  const [m] = await db
    .select({ id: membersTable.id })
    .from(membersTable)
    .where(and(eq(membersTable.organizationId, orgId), eq(membersTable.userId, user.id)))
    .limit(1);
  return m ? user.id : null;
}

function mapRow(row: typeof suppliersTable.$inferSelect) {
  return {
    id:                    row.id,
    organizationId:        row.organizationId,
    name:                  row.name ?? null,
    category:              row.category ?? null,
    contactName:           row.contactName ?? null,
    phone:                 row.phone ?? null,
    email:                 row.email ?? null,
    website:               row.website ?? null,
    address:               row.address ?? null,
    postalCode:            row.postalCode ?? null,
    city:                  row.city ?? null,
    department:            row.department ?? null,
    region:                row.region ?? null,
    country:               row.country ?? null,
    siret:                 row.siret ?? null,
    relationshipStartDate: row.relationshipStartDate ?? null,
    annualAmount:          row.annualAmount !== null && row.annualAmount !== undefined ? Number(row.annualAmount) : null,
    comments:              row.comments ?? null,
    criticality:           row.criticality ?? null,
    riskLevel:             row.riskLevel ?? null,
    dependency:            row.dependency ?? null,
    alternatives:          row.alternatives ?? null,
    certifications:        row.certifications ?? null,
    rsePolicy:             row.rsePolicy ?? null,
    evalComments:          row.evalComments ?? null,
    createdAt:             row.createdAt.toISOString(),
    updatedAt:             row.updatedAt.toISOString(),
  };
}

// GET /organizations/:orgId/suppliers
router.get("/organizations/:orgId/suppliers", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid organization id" }); return; }
  const userId = await verifyMembership(req.clerkUserId!, orgId);
  if (!userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const rows = await db.select().from(suppliersTable).where(eq(suppliersTable.organizationId, orgId));
  res.json({ items: rows.map(mapRow) });
});

// POST /organizations/:orgId/suppliers
router.post("/organizations/:orgId/suppliers", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid organization id" }); return; }
  const userId = await verifyMembership(req.clerkUserId!, orgId);
  if (!userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const body = req.body as Record<string, unknown>;
  const [row] = await db.insert(suppliersTable).values({
    organizationId:        orgId,
    name:                  (body.name as string | undefined) ?? null,
    category:              (body.category as string | undefined) ?? null,
    contactName:           (body.contactName as string | undefined) ?? null,
    phone:                 (body.phone as string | undefined) ?? null,
    email:                 (body.email as string | undefined) ?? null,
    website:               (body.website as string | undefined) ?? null,
    address:               (body.address as string | undefined) ?? null,
    postalCode:            (body.postalCode as string | undefined) ?? null,
    city:                  (body.city as string | undefined) ?? null,
    department:            (body.department as string | undefined) ?? null,
    region:                (body.region as string | undefined) ?? null,
    country:               (body.country as string | undefined) ?? "France",
    siret:                 (body.siret as string | undefined) ?? null,
    relationshipStartDate: (body.relationshipStartDate as string | undefined) ?? null,
    annualAmount:          (body.annualAmount as number | undefined) != null ? String(body.annualAmount) : null,
    comments:              (body.comments as string | undefined) ?? null,
    criticality:           (body.criticality as number | undefined) ?? null,
    riskLevel:             (body.riskLevel as number | undefined) ?? null,
    dependency:            (body.dependency as number | undefined) ?? null,
    alternatives:          (body.alternatives as string | undefined) ?? null,
    certifications:        (body.certifications as string | undefined) ?? null,
    rsePolicy:             (body.rsePolicy as string | undefined) ?? null,
    evalComments:          (body.evalComments as string | undefined) ?? null,
  }).returning();
  res.json(mapRow(row));
});

// GET /organizations/:orgId/suppliers/:id
router.get("/organizations/:orgId/suppliers/:id", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  const id    = parseId(req.params.id);
  if (!orgId || isNaN(orgId) || !id || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const userId = await verifyMembership(req.clerkUserId!, orgId);
  if (!userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const [row] = await db.select().from(suppliersTable)
    .where(and(eq(suppliersTable.id, id), eq(suppliersTable.organizationId, orgId)))
    .limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapRow(row));
});

// PUT /organizations/:orgId/suppliers/:id
router.put("/organizations/:orgId/suppliers/:id", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  const id    = parseId(req.params.id);
  if (!orgId || isNaN(orgId) || !id || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const userId = await verifyMembership(req.clerkUserId!, orgId);
  if (!userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const body = req.body as Record<string, unknown>;
  const [row] = await db.update(suppliersTable).set({
    name:                  (body.name as string | null | undefined) ?? null,
    category:              (body.category as string | null | undefined) ?? null,
    contactName:           (body.contactName as string | null | undefined) ?? null,
    phone:                 (body.phone as string | null | undefined) ?? null,
    email:                 (body.email as string | null | undefined) ?? null,
    website:               (body.website as string | null | undefined) ?? null,
    address:               (body.address as string | null | undefined) ?? null,
    postalCode:            (body.postalCode as string | null | undefined) ?? null,
    city:                  (body.city as string | null | undefined) ?? null,
    department:            (body.department as string | null | undefined) ?? null,
    region:                (body.region as string | null | undefined) ?? null,
    country:               (body.country as string | null | undefined) ?? null,
    siret:                 (body.siret as string | null | undefined) ?? null,
    relationshipStartDate: (body.relationshipStartDate as string | null | undefined) ?? null,
    annualAmount:          (body.annualAmount as number | null | undefined) != null ? String(body.annualAmount) : null,
    comments:              (body.comments as string | null | undefined) ?? null,
    criticality:           (body.criticality as number | null | undefined) ?? null,
    riskLevel:             (body.riskLevel as number | null | undefined) ?? null,
    dependency:            (body.dependency as number | null | undefined) ?? null,
    alternatives:          (body.alternatives as string | null | undefined) ?? null,
    certifications:        (body.certifications as string | null | undefined) ?? null,
    rsePolicy:             (body.rsePolicy as string | null | undefined) ?? null,
    evalComments:          (body.evalComments as string | null | undefined) ?? null,
    updatedAt:             new Date(),
  }).where(and(eq(suppliersTable.id, id), eq(suppliersTable.organizationId, orgId))).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapRow(row));
});

// DELETE /organizations/:orgId/suppliers/:id
router.delete("/organizations/:orgId/suppliers/:id", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  const id    = parseId(req.params.id);
  if (!orgId || isNaN(orgId) || !id || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const userId = await verifyMembership(req.clerkUserId!, orgId);
  if (!userId) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(suppliersTable).where(and(eq(suppliersTable.id, id), eq(suppliersTable.organizationId, orgId)));
  res.status(204).send();
});

export default router;
