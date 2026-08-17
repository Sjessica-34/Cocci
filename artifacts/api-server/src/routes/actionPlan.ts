import { Router } from "express";
import { eq, and, isNull, isNotNull } from "drizzle-orm";
import {
  db,
  actionLibraryTable,
  organizationActionPlansTable,
  diagnosticResponsesTable,
} from "@workspace/db";
import { ALL_SUBCATEGORIES } from "@workspace/rse-referentials";
import { requireAuth } from "../middlewares/requireAuth";
import {
  requireOrgMembership,
  requireExerciseScope,
  requireWritableExerciseScope,
} from "../middlewares/exerciseScope";
import { getSubsidiaryExercises } from "../lib/consolidation";

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
const ACTION_PLAN_SELECT = {
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
  actionName: actionLibraryTable.name,
  actionDescription: actionLibraryTable.description,
  actionCategory: actionLibraryTable.category,
  actionSubcategory: actionLibraryTable.subcategory,
  actionEsgPillar: actionLibraryTable.esgPillar,
  actionOdd: actionLibraryTable.odd,
  actionLevel: actionLibraryTable.level,
};

// GET /organizations/:orgId/actions/plan
// Retourne les items du plan pour l'exercice actif, enrichis des infos bibliothèque.
router.get(
  "/organizations/:orgId/actions/plan",
  requireAuth,
  requireOrgMembership,
  requireExerciseScope,
  async (req, res) => {
    // Consolidation: group with subsidiaries → LIST all subsidiary action plans
    const subExercises = await getSubsidiaryExercises(req.orgId!, req.exercise!.year);
    if (subExercises.length > 0) {
      const allItems = (
        await Promise.all(
          subExercises.map(({ orgId, exerciseId }) =>
            db
              .select(ACTION_PLAN_SELECT)
              .from(organizationActionPlansTable)
              .leftJoin(actionLibraryTable, eq(organizationActionPlansTable.libraryActionId, actionLibraryTable.id))
              .where(and(eq(organizationActionPlansTable.organizationId, orgId), eq(organizationActionPlansTable.exerciseId, exerciseId)))
              .orderBy(organizationActionPlansTable.createdAt),
          ),
        )
      ).flat();
      res.json(allItems);
      return;
    }

    const items = await db
      .select(ACTION_PLAN_SELECT)
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

    const bodyChecked = (req.body as any).isChecked;
    const bodyCompletedAt = (req.body as any).completedAt;
    const initialIsChecked = typeof bodyChecked === "boolean" ? bodyChecked : false;
    const initialCompletedAt = bodyCompletedAt ? new Date(bodyCompletedAt) : null;

    const [created] = await db
      .insert(organizationActionPlansTable)
      .values({
        organizationId: req.orgId!,
        exerciseId: req.exercise!.id,
        libraryActionId: libraryActionId ?? null,
        customName: customName ?? null,
        source: source ?? (libraryActionId ? "library" : "manual"),
        isChecked: initialIsChecked,
        completedAt: initialIsChecked && !initialCompletedAt ? new Date() : initialCompletedAt,
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

// ─── SUGGESTIONS ──────────────────────────────────────────────────────────────
// GET /organizations/:orgId/actions/suggestions
// Retourne jusqu'à 8 actions recommandées selon les points faibles du diagnostic.
router.get(
  "/organizations/:orgId/actions/suggestions",
  requireAuth,
  requireOrgMembership,
  requireExerciseScope,
  async (req, res) => {
    // Construire la map questionId → axe (ENV | SOC | GOV)
    const questionAxisMap = new Map<string, string>();
    for (const sub of ALL_SUBCATEGORIES) {
      for (const q of sub.questions) {
        questionAxisMap.set(q.id, sub.categoryId);
      }
    }

    // Total de questions par axe
    const axisTotals: Record<string, number> = { ENV: 0, SOC: 0, GOV: 0 };
    for (const sub of ALL_SUBCATEGORIES) {
      axisTotals[sub.categoryId] = (axisTotals[sub.categoryId] ?? 0) + sub.questions.length;
    }

    // Réponses diagnostiques de cet exercice
    const responses = await db
      .select({ questionId: diagnosticResponsesTable.questionId })
      .from(diagnosticResponsesTable)
      .where(
        and(
          eq(diagnosticResponsesTable.organizationId, req.orgId!),
          eq(diagnosticResponsesTable.exerciseId, req.exercise!.id),
        ),
      );

    const axisAnswered: Record<string, number> = { ENV: 0, SOC: 0, GOV: 0 };
    for (const r of responses) {
      const axis = questionAxisMap.get(r.questionId);
      if (axis) axisAnswered[axis] = (axisAnswered[axis] ?? 0) + 1;
    }

    // Taux de complétion par axe (0–1)
    const axisCompletion: Record<string, number> = {
      ENV: axisTotals.ENV > 0 ? axisAnswered.ENV / axisTotals.ENV : 0,
      SOC: axisTotals.SOC > 0 ? axisAnswered.SOC / axisTotals.SOC : 0,
      GOV: axisTotals.GOV > 0 ? axisAnswered.GOV / axisTotals.GOV : 0,
    };

    // Pilier E/S/G → axe ENV/SOC/GOV
    const pillarToAxis: Record<string, string> = { E: "ENV", S: "SOC", G: "GOV" };
    const pillarLabel: Record<string, string> = { E: "Environnement", S: "Social", G: "Gouvernance" };

    // Actions déjà au plan pour cet exercice
    const currentPlan = await db
      .select({ libraryActionId: organizationActionPlansTable.libraryActionId })
      .from(organizationActionPlansTable)
      .where(
        and(
          eq(organizationActionPlansTable.organizationId, req.orgId!),
          eq(organizationActionPlansTable.exerciseId, req.exercise!.id),
          isNotNull(organizationActionPlansTable.libraryActionId),
        ),
      );
    const plannedIds = new Set(
      currentPlan.map(p => p.libraryActionId).filter((id): id is number => id !== null),
    );

    // Référentiel actif, hors plan
    const allLibrary = await db
      .select()
      .from(actionLibraryTable)
      .where(eq(actionLibraryTable.isActive, true))
      .orderBy(actionLibraryTable.sortOrder, actionLibraryTable.id);

    const LEVEL_ORDER: Record<string, number> = {
      starter: 0, quick: 0,
      intermediate: 1, project: 1,
      advanced: 2, engagement: 2,
    };

    const scored = allLibrary
      .filter(a => !plannedIds.has(a.id))
      .map(action => {
        const axis = pillarToAxis[action.esgPillar] ?? "ENV";
        const completion = axisCompletion[axis] ?? 0;
        let weight = 1;
        let reason = `Compléter votre démarche ${pillarLabel[action.esgPillar] ?? action.esgPillar}`;
        if (completion < 0.3) {
          weight = 3;
          reason = `Axe ${pillarLabel[action.esgPillar] ?? action.esgPillar} peu avancé — priorité haute`;
        } else if (completion < 0.6) {
          weight = 2;
          reason = `Axe ${pillarLabel[action.esgPillar] ?? action.esgPillar} en progression — action recommandée`;
        }
        const levelOrder = LEVEL_ORDER[action.level] ?? 1;
        return {
          ...action,
          relevanceScore: weight * 10 - levelOrder,
          relevanceReason: reason,
        };
      });

    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
    res.json(scored.slice(0, 8));
  },
);

export default router;
