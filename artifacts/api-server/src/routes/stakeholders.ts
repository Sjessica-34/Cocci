import { Router } from "express";
import { db, stakeholdersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOrgMembership, requireExerciseScope, requireWritableExerciseScope } from "../middlewares/exerciseScope";
import { scopeToExercise, withExerciseValues } from "../lib/exercise";

const router = Router();

function parseId(raw: string | string[]): number {
  return Number(Array.isArray(raw) ? raw[0] : raw);
}

// GET /organizations/:orgId/stakeholders
router.get(
  "/organizations/:orgId/stakeholders",
  requireAuth,
  requireOrgMembership,
  requireExerciseScope,
  async (req, res): Promise<void> => {
    const rows = await db
      .select()
      .from(stakeholdersTable)
      .where(scopeToExercise(stakeholdersTable, req))
      .orderBy(stakeholdersTable.createdAt);
    res.json(rows);
  },
);

// POST /organizations/:orgId/stakeholders
router.post(
  "/organizations/:orgId/stakeholders",
  requireAuth,
  requireOrgMembership,
  requireWritableExerciseScope,
  async (req, res): Promise<void> => {
    const { name, category, subcategory, description, influence, interest, notes } = req.body;
    if (!category || influence == null || interest == null) {
      res.status(400).json({ error: "Missing required fields: category, influence, interest" });
      return;
    }
    const [created] = await db
      .insert(stakeholdersTable)
      .values(
        withExerciseValues(req, {
          name: name ? String(name) : null,
          category: String(category),
          subcategory: subcategory ? String(subcategory) : null,
          description: description ? String(description) : null,
          influence: Math.min(5, Math.max(1, Number(influence))),
          interest: Math.min(5, Math.max(1, Number(interest))),
          notes: notes ? String(notes) : null,
          createdBy: req.userId!,
        }),
      )
      .returning();
    res.status(201).json(created);
  },
);

// GET /organizations/:orgId/stakeholders/:id
router.get(
  "/organizations/:orgId/stakeholders/:id",
  requireAuth,
  requireOrgMembership,
  requireExerciseScope,
  async (req, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [row] = await db
      .select()
      .from(stakeholdersTable)
      .where(scopeToExercise(stakeholdersTable, req, eq(stakeholdersTable.id, id)))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(row);
  },
);

// PUT /organizations/:orgId/stakeholders/:id
router.put(
  "/organizations/:orgId/stakeholders/:id",
  requireAuth,
  requireOrgMembership,
  requireWritableExerciseScope,
  async (req, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const { name, category, subcategory, description, influence, interest, notes } = req.body;
    const patch: {
      name?: string;
      category?: string;
      subcategory?: string | null;
      description?: string | null;
      influence?: number;
      interest?: number;
      notes?: string | null;
      updatedAt: Date;
    } = { updatedAt: new Date() };
    if (name !== undefined) patch.name = String(name);
    if (category !== undefined) patch.category = String(category);
    if (subcategory !== undefined) patch.subcategory = subcategory ? String(subcategory) : null;
    if (description !== undefined) patch.description = description ? String(description) : null;
    if (influence !== undefined) patch.influence = Math.min(5, Math.max(1, Number(influence)));
    if (interest !== undefined) patch.interest = Math.min(5, Math.max(1, Number(interest)));
    if (notes !== undefined) patch.notes = notes ? String(notes) : null;
    const [updated] = await db
      .update(stakeholdersTable)
      .set(patch)
      .where(scopeToExercise(stakeholdersTable, req, eq(stakeholdersTable.id, id)))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(updated);
  },
);

// DELETE /organizations/:orgId/stakeholders/:id
router.delete(
  "/organizations/:orgId/stakeholders/:id",
  requireAuth,
  requireOrgMembership,
  requireWritableExerciseScope,
  async (req, res): Promise<void> => {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [deleted] = await db
      .delete(stakeholdersTable)
      .where(scopeToExercise(stakeholdersTable, req, eq(stakeholdersTable.id, id)))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).end();
  },
);

export default router;
