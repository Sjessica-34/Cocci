import { Router } from "express";
import { db, nrMetaTable, nrResponsesTable, membersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
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

function defaultMeta() {
  return { certificationLabel: "none", certificationOther: null, updatedAt: null };
}

// GET /organizations/:orgId/numerique-responsable
router.get("/organizations/:orgId/numerique-responsable", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid organization id" }); return; }
  const userId = await verifyMembership(req.clerkUserId!, orgId);
  if (!userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const [meta] = await db.select().from(nrMetaTable).where(eq(nrMetaTable.organizationId, orgId)).limit(1);
  const responses = await db.select().from(nrResponsesTable).where(eq(nrResponsesTable.organizationId, orgId));

  res.json({
    meta: meta
      ? { certificationLabel: meta.certificationLabel, certificationOther: meta.certificationOther, updatedAt: meta.updatedAt?.toISOString() ?? null }
      : defaultMeta(),
    responses: responses.map((r) => ({
      criterionId: r.criterionId,
      checked: r.checked,
      comment: r.comment,
      updatedAt: r.updatedAt?.toISOString() ?? null,
    })),
  });
});

// PUT /organizations/:orgId/numerique-responsable
router.put("/organizations/:orgId/numerique-responsable", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid organization id" }); return; }
  const userId = await verifyMembership(req.clerkUserId!, orgId);
  if (!userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const body = req.body as { meta?: { certificationLabel?: string; certificationOther?: string | null }; responses?: { criterionId: string; checked: boolean; comment?: string | null }[] };

  // Upsert meta if provided
  if (body.meta) {
    const metaPayload = {
      organizationId: orgId,
      certificationLabel: body.meta.certificationLabel ?? "none",
      certificationOther: body.meta.certificationOther ?? null,
      updatedAt: new Date(),
    };
    const [existingMeta] = await db.select({ id: nrMetaTable.id }).from(nrMetaTable).where(eq(nrMetaTable.organizationId, orgId)).limit(1);
    if (existingMeta) {
      await db.update(nrMetaTable).set(metaPayload).where(eq(nrMetaTable.id, existingMeta.id));
    } else {
      await db.insert(nrMetaTable).values(metaPayload);
    }
  }

  // Bulk upsert responses if provided
  if (body.responses && body.responses.length > 0) {
    const values = body.responses.map((r) => ({
      organizationId: orgId,
      criterionId: r.criterionId,
      checked: r.checked,
      comment: r.comment ?? null,
      updatedAt: new Date(),
    }));
    await db.insert(nrResponsesTable)
      .values(values)
      .onConflictDoUpdate({
        target: [nrResponsesTable.organizationId, nrResponsesTable.criterionId],
        set: {
          checked: sql`excluded.checked`,
          comment: sql`excluded.comment`,
          updatedAt: sql`now()`,
        },
      });
  }

  // Return updated state
  const [meta] = await db.select().from(nrMetaTable).where(eq(nrMetaTable.organizationId, orgId)).limit(1);
  const responses = await db.select().from(nrResponsesTable).where(eq(nrResponsesTable.organizationId, orgId));

  res.json({
    meta: meta
      ? { certificationLabel: meta.certificationLabel, certificationOther: meta.certificationOther, updatedAt: meta.updatedAt?.toISOString() ?? null }
      : defaultMeta(),
    responses: responses.map((r) => ({
      criterionId: r.criterionId,
      checked: r.checked,
      comment: r.comment,
      updatedAt: r.updatedAt?.toISOString() ?? null,
    })),
  });
});

export default router;
