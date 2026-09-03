import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db, responsiblePurchasesTable } from "@workspace/db";
import {
  CreateResponsiblePurchaseResponse,
  CreateResponsiblePurchaseBody,
  ListResponsiblePurchasesResponse,
  UpdateResponsiblePurchaseBody,
  UpdateResponsiblePurchaseResponse,
  type ResponsiblePurchaseInput,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import {
  requireExerciseScope,
  requireOrgMembership,
  requireWritableExerciseScope,
} from "../middlewares/exerciseScope";
import { getSubsidiaryExercises, getSubsidiaryIds } from "../lib/consolidation";
import { scopeToExercise, withExerciseValues } from "../lib/exercise";

const router = Router();

function parseId(raw: string | string[]): number {
  return Number(Array.isArray(raw) ? raw[0] : raw);
}

function mapRow(row: typeof responsiblePurchasesTable.$inferSelect) {
  return {
    id: row.id,
    organizationId: row.organizationId,
    category: row.category,
    amount: Number(row.amount),
    responsibleAmount: Number(row.responsibleAmount),
    localAmount: Number(row.localAmount),
    circularAmount: Number(row.circularAmount),
    objectivePercent: row.objectivePercent,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function validateAmounts(body: ResponsiblePurchaseInput): string | null {
  if (
    body.responsibleAmount > body.amount ||
    body.localAmount > body.amount ||
    body.circularAmount > body.amount
  ) {
    return "Les montants responsables, locaux et circulaires ne peuvent pas dépasser le montant total.";
  }
  return null;
}

router.get(
  "/organizations/:orgId/responsible-purchases",
  requireAuth,
  requireOrgMembership,
  requireExerciseScope,
  async (req, res): Promise<void> => {
    const subsidiaryExercises = await getSubsidiaryExercises(req.orgId!, req.exercise!.year);
    if (subsidiaryExercises.length > 0) {
      const rows = (
        await Promise.all(
          subsidiaryExercises.map(({ orgId, exerciseId }) =>
            db
              .select()
              .from(responsiblePurchasesTable)
              .where(
                and(
                  eq(responsiblePurchasesTable.organizationId, orgId),
                  eq(responsiblePurchasesTable.exerciseId, exerciseId),
                ),
              ),
          ),
        )
      ).flat();
      res.json(ListResponsiblePurchasesResponse.parse({ items: rows.map(mapRow) }));
      return;
    }

    const rows = await db
      .select()
      .from(responsiblePurchasesTable)
      .where(scopeToExercise(responsiblePurchasesTable, req));
    res.json(ListResponsiblePurchasesResponse.parse({ items: rows.map(mapRow) }));
  },
);

router.post(
  "/organizations/:orgId/responsible-purchases",
  requireAuth,
  requireOrgMembership,
  requireWritableExerciseScope,
  async (req, res): Promise<void> => {
    const subsidiaryIds = await getSubsidiaryIds(req.orgId!);
    if (subsidiaryIds.length > 0) {
      res
        .status(403)
        .json({ error: "Cette organisation est un groupe. Gérez les données directement au niveau de chaque filiale." });
      return;
    }

    const parsed = CreateResponsiblePurchaseBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const amountError = validateAmounts(parsed.data);
    if (amountError) {
      res.status(400).json({ error: amountError });
      return;
    }

    const existing = await db
      .select({ id: responsiblePurchasesTable.id })
      .from(responsiblePurchasesTable)
      .where(
        and(
          eq(responsiblePurchasesTable.organizationId, req.orgId!),
          eq(responsiblePurchasesTable.exerciseId, req.exercise!.id),
          eq(responsiblePurchasesTable.category, parsed.data.category),
        ),
      )
      .limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Cette catégorie existe déjà pour l'exercice courant." });
      return;
    }

    const [row] = await db
      .insert(responsiblePurchasesTable)
      .values(
        withExerciseValues(req, {
          category: parsed.data.category,
          amount: String(parsed.data.amount),
          responsibleAmount: String(parsed.data.responsibleAmount),
          localAmount: String(parsed.data.localAmount),
          circularAmount: String(parsed.data.circularAmount),
          objectivePercent: parsed.data.objectivePercent ?? null,
        }),
      )
      .returning();
    res.status(201).json(CreateResponsiblePurchaseResponse.parse(mapRow(row)));
  },
);

router.put(
  "/organizations/:orgId/responsible-purchases/:id",
  requireAuth,
  requireOrgMembership,
  requireWritableExerciseScope,
  async (req, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (!id || Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const subsidiaryIds = await getSubsidiaryIds(req.orgId!);
    if (subsidiaryIds.length > 0) {
      res
        .status(403)
        .json({ error: "Cette organisation est un groupe. Gérez les données directement au niveau de chaque filiale." });
      return;
    }

    const parsed = UpdateResponsiblePurchaseBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const amountError = validateAmounts(parsed.data);
    if (amountError) {
      res.status(400).json({ error: amountError });
      return;
    }

    const duplicate = await db
      .select({ id: responsiblePurchasesTable.id })
      .from(responsiblePurchasesTable)
      .where(
        and(
          eq(responsiblePurchasesTable.organizationId, req.orgId!),
          eq(responsiblePurchasesTable.exerciseId, req.exercise!.id),
          eq(responsiblePurchasesTable.category, parsed.data.category),
        ),
      )
      .limit(1);
    if (duplicate.length > 0 && duplicate[0].id !== id) {
      res.status(409).json({ error: "Cette catégorie existe déjà pour l'exercice courant." });
      return;
    }

    const [row] = await db
      .update(responsiblePurchasesTable)
      .set({
        category: parsed.data.category,
        amount: String(parsed.data.amount),
        responsibleAmount: String(parsed.data.responsibleAmount),
        localAmount: String(parsed.data.localAmount),
        circularAmount: String(parsed.data.circularAmount),
        objectivePercent: parsed.data.objectivePercent ?? null,
        updatedAt: new Date(),
      })
      .where(scopeToExercise(responsiblePurchasesTable, req, eq(responsiblePurchasesTable.id, id)))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(UpdateResponsiblePurchaseResponse.parse(mapRow(row)));
  },
);

router.delete(
  "/organizations/:orgId/responsible-purchases/:id",
  requireAuth,
  requireOrgMembership,
  requireWritableExerciseScope,
  async (req, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (!id || Number.isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const subsidiaryIds = await getSubsidiaryIds(req.orgId!);
    if (subsidiaryIds.length > 0) {
      res
        .status(403)
        .json({ error: "Cette organisation est un groupe. Gérez les données directement au niveau de chaque filiale." });
      return;
    }

    const [deleted] = await db
      .delete(responsiblePurchasesTable)
      .where(scopeToExercise(responsiblePurchasesTable, req, eq(responsiblePurchasesTable.id, id)))
      .returning({ id: responsiblePurchasesTable.id });
    if (!deleted) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).send();
  },
);

export default router;