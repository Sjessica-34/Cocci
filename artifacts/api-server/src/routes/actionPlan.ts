import { Router } from "express";
import { eq, and, isNull, isNotNull } from "drizzle-orm";
import {
  db,
  actionLibraryTable,
  organizationActionPlansTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import {
  requireOrgMembership,
  requireExerciseScope,
  requireWritableExerciseScope,
} from "../middlewares/exerciseScope";

const router = Router();

// ─── BIBLIOTHÈQUE ─────────────────────────────────────────────────────────────
// GET /organizations/:orgId/actions/library
// Retourne l'ensemble du référentiel actif (sans filtre d'exercice).
router.get(
  "/organizations/:orgId/actions/library",
  requireAuth,
  requireOrgMembership,
  async (req, res) => {
    const rows = await db
      .select()
      .from(actionLibraryTable)
      .where(eq(actionLibraryTable.isActive, true))
      .orderBy(actionLibraryTable.sortOrder, actionLibraryTable.id);

    res.json(rows);
  },
);

// ─── PLAN D'ACTIONS ───────────────────────────────────────────────────────────
// GET /organizations/:orgId/actions/plan
// Retourne les items du plan pour l'exercice actif, enrichis des infos bibliothèque.
router.get(
  "/organizations/:orgId/actions/plan",
  requireAuth,
  requireOrgMembership,
  requireExerciseScope,
  async (req, res) => {
    const items = await db
      .select({
        id: organizationActionPlansTable.id,
        organizationId: organizationActionPlansTable.organizationId,
        exerciseId: organizationActionPlansTable.exerciseId,
        libraryActionId: organizationActionPlansTable.libraryActionId,
        customName: organizationActionPlansTable.customName,
        source: organizationActionPlansTable.source,
        isChecked: organizationActionPlansTable.isChecked,
        completedAt: organizationActionPlansTable.completedAt,
        comment: organizationActionPlansTable.comment,
        justificationUrl: organizationActionPlansTable.justificationUrl,
        createdAt: organizationActionPlansTable.createdAt,
        updatedAt: organizationActionPlansTable.updatedAt,
        // Library fields (null for manual actions)
        actionName: actionLibraryTable.name,
        actionDescription: actionLibraryTable.description,
        actionCategory: actionLibraryTable.category,
        actionSubcategory: actionLibraryTable.subcategory,
        actionEsgPillar: actionLibraryTable.esgPillar,
        actionOdd: actionLibraryTable.odd,
        actionLevel: actionLibraryTable.level,
      })
      .from(organizationActionPlansTable)
      .leftJoin(
        actionLibraryTable,
        eq(organizationActionPlansTable.libraryActionId, actionLibraryTable.id),
      )
      .where(
        and(
          eq(organizationActionPlansTable.organizationId, req.orgId!),
          eq(organizationActionPlansTable.exerciseId, req.exercise!.id),
        ),
      )
      .orderBy(organizationActionPlansTable.createdAt);

    res.json(items);
  },
);

// POST /organizations/:orgId/actions/plan
// Ajoute une action au plan (depuis la bibliothèque ou action manuelle).
router.post(
  "/organizations/:orgId/actions/plan",
  requireAuth,
  requireOrgMembership,
  requireWritableExerciseScope,
  async (req, res) => {
    const { libraryActionId, customName, source } = req.body as {
      libraryActionId?: number | null;
      customName?: string | null;
      source?: string;
    };

    if (!libraryActionId && !customName) {
      res.status(400).json({ error: "libraryActionId or customName required" });
      return;
    }

    // Check uniqueness for library-backed actions
    if (libraryActionId) {
      const existing = await db
        .select({ id: organizationActionPlansTable.id })
        .from(organizationActionPlansTable)
        .where(
          and(
            eq(organizationActionPlansTable.organizationId, req.orgId!),
            eq(organizationActionPlansTable.exerciseId, req.exercise!.id),
            eq(organizationActionPlansTable.libraryActionId, libraryActionId),
          ),
        )
        .limit(1);
      if (existing.length > 0) {
        res.status(409).json({ error: "Action already in plan" });
        return;
      }
    }

    const [created] = await db
      .insert(organizationActionPlansTable)
      .values({
        organizationId: req.orgId!,
        exerciseId: req.exercise!.id,
        libraryActionId: libraryActionId ?? null,
        customName: customName ?? null,
        source: source ?? (libraryActionId ? "library" : "manual"),
        isChecked: false,
      })
      .returning();

    res.status(201).json(created);
  },
);

// PATCH /organizations/:orgId/actions/plan/:actionId
// Met à jour un item du plan (isChecked, completedAt, comment, justificationUrl).
router.patch(
  "/organizations/:orgId/actions/plan/:actionId",
  requireAuth,
  requireOrgMembership,
  requireWritableExerciseScope,
  async (req, res) => {
    const actionId = Number(
      Array.isArray(req.params.actionId) ? req.params.actionId[0] : req.params.actionId,
    );
    if (!Number.isFinite(actionId) || actionId <= 0) {
      res.status(400).json({ error: "Invalid actionId" });
      return;
    }

    const { isChecked, completedAt, comment, justificationUrl } = req.body as {
      isChecked?: boolean;
      completedAt?: string | null;
      comment?: string | null;
      justificationUrl?: string | null;
    };

    // Verify ownership
    const [existing] = await db
      .select({ id: organizationActionPlansTable.id })
      .from(organizationActionPlansTable)
      .where(
        and(
          eq(organizationActionPlansTable.id, actionId),
          eq(organizationActionPlansTable.organizationId, req.orgId!),
          eq(organizationActionPlansTable.exerciseId, req.exercise!.id),
        ),
      )
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const updateData: Partial<{
      isChecked: boolean;
      completedAt: Date | null;
      comment: string | null;
      justificationUrl: string | null;
      updatedAt: Date;
    }> = { updatedAt: new Date() };

    if (isChecked !== undefined) updateData.isChecked = isChecked;
    if (completedAt !== undefined)
      updateData.completedAt = completedAt ? new Date(completedAt) : null;
    if (comment !== undefined) updateData.comment = comment ?? null;
    if (justificationUrl !== undefined)
      updateData.justificationUrl = justificationUrl ?? null;

    const [updated] = await db
      .update(organizationActionPlansTable)
      .set(updateData)
      .where(eq(organizationActionPlansTable.id, actionId))
      .returning();

    res.json(updated);
  },
);

// DELETE /organizations/:orgId/actions/plan/:actionId
// Supprime un item du plan.
router.delete(
  "/organizations/:orgId/actions/plan/:actionId",
  requireAuth,
  requireOrgMembership,
  requireWritableExerciseScope,
  async (req, res) => {
    const actionId = Number(
      Array.isArray(req.params.actionId) ? req.params.actionId[0] : req.params.actionId,
    );
    if (!Number.isFinite(actionId) || actionId <= 0) {
      res.status(400).json({ error: "Invalid actionId" });
      return;
    }

    const deleted = await db
      .delete(organizationActionPlansTable)
      .where(
        and(
          eq(organizationActionPlansTable.id, actionId),
          eq(organizationActionPlansTable.organizationId, req.orgId!),
          eq(organizationActionPlansTable.exerciseId, req.exercise!.id),
        ),
      )
      .returning();

    if (deleted.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.status(204).send();
  },
);

export default router;
