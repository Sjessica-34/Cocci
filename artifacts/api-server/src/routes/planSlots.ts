import { Router } from "express";
import { eq, and, inArray, notInArray, asc } from "drizzle-orm";
import { db, planSlotsTable, actionLibraryTable, exercisesTable, usersTable, membersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import {
  requireOrgMembership,
  requireExerciseScope,
  requireWritableExerciseScope,
} from "../middlewares/exerciseScope";

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLAN_SIZE = 15;
const BATCH_SIZE = 5;

// Catégories dans l'ordre de priorité pour une sélection équilibrée
const CATEGORY_ORDER = [
  "Environnement",
  "Social",
  "Numérique responsable",
  "Achats responsables",
  "Gouvernance",
  "Biodiversité",
];

/** Sélectionne N actions depuis la bibliothèque en excluant les IDs déjà utilisés. */
async function pickLibraryActions(exclude: number[], count: number) {
  const all = await db
    .select()
    .from(actionLibraryTable)
    .where(
      and(
        eq(actionLibraryTable.isActive, true),
        exclude.length > 0
          ? notInArray(actionLibraryTable.id, exclude)
          : undefined,
      ),
    )
    .orderBy(asc(actionLibraryTable.sortOrder), asc(actionLibraryTable.id));

  if (all.length === 0) return [];

  // Répartition équilibrée entre catégories
  const byCategory = new Map<string, typeof all>();
  for (const a of all) {
    const arr = byCategory.get(a.category) ?? [];
    arr.push(a);
    byCategory.set(a.category, arr);
  }

  const picked: typeof all = [];
  const categoryQueue = [...CATEGORY_ORDER, ...Array.from(byCategory.keys()).filter((c) => !CATEGORY_ORDER.includes(c))];
  const catIndexes = new Map<string, number>();

  while (picked.length < count) {
    let added = false;
    for (const cat of categoryQueue) {
      if (picked.length >= count) break;
      const idx = catIndexes.get(cat) ?? 0;
      const actions = byCategory.get(cat);
      if (actions && idx < actions.length) {
        picked.push(actions[idx]);
        catIndexes.set(cat, idx + 1);
        added = true;
      }
    }
    if (!added) break; // plus rien à prendre
  }

  return picked.slice(0, count);
}

/** Retourne les slots enrichis d'infos bibliothèque pour un exercice donné. */
async function fetchSlotsForExercise(orgId: number, exerciseId: number) {
  return db
    .select({
      id: planSlotsTable.id,
      organizationId: planSlotsTable.organizationId,
      exerciseId: planSlotsTable.exerciseId,
      libraryActionId: planSlotsTable.libraryActionId,
      slotOrder: planSlotsTable.slotOrder,
      isDone: planSlotsTable.isDone,
      assignedToUserId: planSlotsTable.assignedToUserId,
      assignedToName: sql<string | null>`nullif(trim(concat(coalesce(${usersTable.firstName}, ''), ' ', coalesce(${usersTable.lastName}, ''))), '')`,
      dueDate: planSlotsTable.dueDate,
      status: planSlotsTable.status,
      completedAt: planSlotsTable.completedAt,
      comment: planSlotsTable.comment,
      justificationUrl: planSlotsTable.justificationUrl,
      createdAt: planSlotsTable.createdAt,
      updatedAt: planSlotsTable.updatedAt,
      actionName: actionLibraryTable.name,
      actionDescription: actionLibraryTable.description,
      actionCategory: actionLibraryTable.category,
      actionSubcategory: actionLibraryTable.subcategory,
      actionLevel: actionLibraryTable.level,
    })
    .from(planSlotsTable)
    .leftJoin(actionLibraryTable, eq(planSlotsTable.libraryActionId, actionLibraryTable.id))
    .leftJoin(usersTable, eq(planSlotsTable.assignedToUserId, usersTable.id))
    .where(
      and(
        eq(planSlotsTable.organizationId, orgId),
        eq(planSlotsTable.exerciseId, exerciseId),
      ),
    )
    .orderBy(asc(planSlotsTable.slotOrder), asc(planSlotsTable.id));
}

// ─── GET /organizations/:orgId/plan-slots ────────────────────────────────────
router.get(
  "/organizations/:orgId/plan-slots",
  requireAuth,
  requireOrgMembership,
  requireExerciseScope,
  async (req, res) => {
    const slots = await fetchSlotsForExercise(req.orgId!, req.exercise!.id);
    res.json(slots);
  },
);

// ─── POST /organizations/:orgId/plan-slots/initialize ────────────────────────
router.post(
  "/organizations/:orgId/plan-slots/initialize",
  requireAuth,
  requireOrgMembership,
  requireWritableExerciseScope,
  async (req, res) => {
    const existing = await db
      .select({ id: planSlotsTable.id, libraryActionId: planSlotsTable.libraryActionId })
      .from(planSlotsTable)
      .where(
        and(
          eq(planSlotsTable.organizationId, req.orgId!),
          eq(planSlotsTable.exerciseId, req.exercise!.id),
        ),
      );

    const usedIds = existing.map((s) => s.libraryActionId).filter((id): id is number => id !== null);
    const toAdd = PLAN_SIZE - existing.length;

    if (toAdd > 0) {
      const picked = await pickLibraryActions(usedIds, toAdd);
      const startOrder = existing.length;
      if (picked.length > 0) {
        await db.insert(planSlotsTable).values(
          picked.map((a, i) => ({
            organizationId: req.orgId!,
            exerciseId: req.exercise!.id,
            libraryActionId: a.id,
            slotOrder: startOrder + i,
          })),
        );
      }
    }

    const slots = await fetchSlotsForExercise(req.orgId!, req.exercise!.id);
    res.json(slots);
  },
);

// ─── PATCH /organizations/:orgId/plan-slots/:slotId ──────────────────────────
router.patch(
  "/organizations/:orgId/plan-slots/:slotId",
  requireAuth,
  requireOrgMembership,
  requireWritableExerciseScope,
  async (req, res) => {
    const slotId = Number(
      Array.isArray(req.params.slotId) ? req.params.slotId[0] : req.params.slotId,
    );
    if (!Number.isFinite(slotId) || slotId <= 0) {
      res.status(400).json({ error: "Invalid slotId" });
      return;
    }

    const [existing] = await db
      .select()
      .from(planSlotsTable)
      .where(
        and(
          eq(planSlotsTable.id, slotId),
          eq(planSlotsTable.organizationId, req.orgId!),
          eq(planSlotsTable.exerciseId, req.exercise!.id),
        ),
      )
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const { isDone, completedAt, comment, justificationUrl, assignedToUserId, dueDate, status } =
      req.body as {
        isDone?: boolean;
        completedAt?: string | null;
        comment?: string | null;
        justificationUrl?: string | null;
        assignedToUserId?: number | null;
        dueDate?: string | null;
        status?: string;
      };

    const VALID_STATUSES = ["todo", "in_progress", "blocked", "done"] as const;
    if (status !== undefined && !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    // L'assigné doit être membre de l'organisation
    if (assignedToUserId != null) {
      const [membership] = await db
        .select({ id: membersTable.id })
        .from(membersTable)
        .where(
          and(
            eq(membersTable.organizationId, req.orgId!),
            eq(membersTable.userId, assignedToUserId),
          ),
        )
        .limit(1);
      if (!membership) {
        res.status(400).json({ error: "Assignee is not a member of this organization" });
        return;
      }
    }

    const updateData: Partial<{
      isDone: boolean;
      completedAt: Date | null;
      comment: string | null;
      justificationUrl: string | null;
      assignedToUserId: number | null;
      dueDate: Date | null;
      status: string;
      updatedAt: Date;
    }> = { updatedAt: new Date() };

    if (isDone !== undefined) updateData.isDone = isDone;
    if (completedAt !== undefined)
      updateData.completedAt = completedAt ? new Date(completedAt) : null;
    if (comment !== undefined) updateData.comment = comment ?? null;
    if (justificationUrl !== undefined) updateData.justificationUrl = justificationUrl ?? null;
    if (assignedToUserId !== undefined) updateData.assignedToUserId = assignedToUserId ?? null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (status !== undefined) updateData.status = status;

    // Synchronisation statut ⇄ isDone
    if (status !== undefined && isDone === undefined) {
      updateData.isDone = status === "done";
      if (status === "done" && !existing.completedAt && completedAt === undefined) {
        updateData.completedAt = new Date();
      }
      if (status !== "done") updateData.completedAt = completedAt !== undefined ? updateData.completedAt : null;
    }
    if (isDone !== undefined && status === undefined) {
      updateData.status = isDone ? "done" : existing.status === "done" ? "todo" : existing.status;
    }

    const [updated] = await db
      .update(planSlotsTable)
      .set(updateData)
      .where(eq(planSlotsTable.id, slotId))
      .returning();

    // ── Renouvellement par lot de 5 ───────────────────────────────────────────
    // Si on vient de marquer isDone=true, compter les done et ajouter 5 si multiple de 5
    const becameDone = updateData.isDone === true && !existing.isDone;
    if (becameDone) {
      const allSlots = await db
        .select({ id: planSlotsTable.id, isDone: planSlotsTable.isDone, libraryActionId: planSlotsTable.libraryActionId })
        .from(planSlotsTable)
        .where(
          and(
            eq(planSlotsTable.organizationId, req.orgId!),
            eq(planSlotsTable.exerciseId, req.exercise!.id),
          ),
        );

      const doneCount = allSlots.filter((s) => s.isDone).length;

      if (doneCount > 0 && doneCount % BATCH_SIZE === 0) {
        const usedIds = allSlots
          .map((s) => s.libraryActionId)
          .filter((id): id is number => id !== null);
        const newActions = await pickLibraryActions(usedIds, BATCH_SIZE);
        const maxOrder = Math.max(...allSlots.map((_, i) => i));
        if (newActions.length > 0) {
          await db.insert(planSlotsTable).values(
            newActions.map((a, i) => ({
              organizationId: req.orgId!,
              exerciseId: req.exercise!.id,
              libraryActionId: a.id,
              slotOrder: maxOrder + 1 + i,
            })),
          );
        }
      }
    }

    res.json(updated);
  },
);

// ─── GET /organizations/:orgId/plan-slots/achievements ───────────────────────
router.get(
  "/organizations/:orgId/plan-slots/achievements",
  requireAuth,
  requireOrgMembership,
  async (req, res) => {
    const rows = await db
      .select({
        id: planSlotsTable.id,
        organizationId: planSlotsTable.organizationId,
        exerciseId: planSlotsTable.exerciseId,
        libraryActionId: planSlotsTable.libraryActionId,
        slotOrder: planSlotsTable.slotOrder,
        isDone: planSlotsTable.isDone,
        completedAt: planSlotsTable.completedAt,
        comment: planSlotsTable.comment,
        justificationUrl: planSlotsTable.justificationUrl,
        createdAt: planSlotsTable.createdAt,
        updatedAt: planSlotsTable.updatedAt,
        actionName: actionLibraryTable.name,
        actionDescription: actionLibraryTable.description,
        actionCategory: actionLibraryTable.category,
        actionSubcategory: actionLibraryTable.subcategory,
        actionLevel: actionLibraryTable.level,
        exerciseYear: exercisesTable.year,
      })
      .from(planSlotsTable)
      .leftJoin(actionLibraryTable, eq(planSlotsTable.libraryActionId, actionLibraryTable.id))
      .leftJoin(exercisesTable, eq(planSlotsTable.exerciseId, exercisesTable.id))
      .where(
        and(
          eq(planSlotsTable.organizationId, req.orgId!),
          eq(planSlotsTable.isDone, true),
        ),
      )
      .orderBy(asc(planSlotsTable.completedAt));

    res.json(rows);
  },
);

export default router;
