import { Router } from "express";
import { db, nrMetaTable, nrResponsesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOrgMembership, requireExerciseScope, requireWritableExerciseScope } from "../middlewares/exerciseScope";
import { scopeToExercise, withExerciseValues } from "../lib/exercise";

const router = Router();

function defaultMeta() {
  return { certificationLabel: "none", certificationOther: null, updatedAt: null };
}

// GET /organizations/:orgId/numerique-responsable
router.get("/organizations/:orgId/numerique-responsable", requireAuth, requireOrgMembership, requireExerciseScope, async (req, res): Promise<void> => {
  const [meta] = await db.select().from(nrMetaTable).where(scopeToExercise(nrMetaTable, req)).limit(1);
  const responses = await db.select().from(nrResponsesTable).where(scopeToExercise(nrResponsesTable, req));

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
router.put("/organizations/:orgId/numerique-responsable", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const body = req.body as { meta?: { certificationLabel?: string; certificationOther?: string | null }; responses?: { criterionId: string; checked: boolean; comment?: string | null }[] };

  // Upsert meta if provided
  if (body.meta) {
    const metaPayload = withExerciseValues(req, {
      certificationLabel: body.meta.certificationLabel ?? "none",
      certificationOther: body.meta.certificationOther ?? null,
      updatedAt: new Date(),
    });
    const [existingMeta] = await db.select({ id: nrMetaTable.id }).from(nrMetaTable).where(scopeToExercise(nrMetaTable, req)).limit(1);
    if (existingMeta) {
      await db.update(nrMetaTable).set(metaPayload).where(eq(nrMetaTable.id, existingMeta.id));
    } else {
      await db.insert(nrMetaTable).values(metaPayload);
    }
  }

  // Bulk upsert responses if provided
  if (body.responses && body.responses.length > 0) {
    const values = body.responses.map((r) =>
      withExerciseValues(req, {
        criterionId: r.criterionId,
        checked: r.checked,
        comment: r.comment ?? null,
        updatedAt: new Date(),
      }),
    );
    await db.insert(nrResponsesTable)
      .values(values)
      .onConflictDoUpdate({
        target: [nrResponsesTable.exerciseId, nrResponsesTable.criterionId],
        set: {
          checked: sql`excluded.checked`,
          comment: sql`excluded.comment`,
          updatedAt: sql`now()`,
        },
      });
  }

  // Return updated state
  const [meta] = await db.select().from(nrMetaTable).where(scopeToExercise(nrMetaTable, req)).limit(1);
  const responses = await db.select().from(nrResponsesTable).where(scopeToExercise(nrResponsesTable, req));

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
