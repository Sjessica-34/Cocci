import { Router } from "express";
import { db, membersTable, stakeholdersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/auth";

const router = Router();

function parseId(raw: string | string[]): number {
  return Number(Array.isArray(raw) ? raw[0] : raw);
}

async function verifyMembership(
  clerkUserId: string,
  orgId: number,
): Promise<number | null> {
  const user = await getOrCreateUser(clerkUserId);
  const [membership] = await db
    .select({ id: membersTable.id })
    .from(membersTable)
    .where(
      and(
        eq(membersTable.organizationId, orgId),
        eq(membersTable.userId, user.id),
      ),
    )
    .limit(1);
  return membership ? user.id : null;
}

// GET /organizations/:orgId/stakeholders
router.get(
  "/organizations/:orgId/stakeholders",
  requireAuth,
  async (req, res): Promise<void> => {
    const orgId = parseId(req.params.orgId);
    if (!orgId || isNaN(orgId)) {
      res.status(400).json({ error: "Invalid organization id" });
      return;
    }
    const userId = await verifyMembership(req.clerkUserId!, orgId);
    if (!userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const rows = await db
      .select()
      .from(stakeholdersTable)
      .where(eq(stakeholdersTable.organizationId, orgId))
      .orderBy(stakeholdersTable.createdAt);
    res.json(rows);
  },
);

// POST /organizations/:orgId/stakeholders
router.post(
  "/organizations/:orgId/stakeholders",
  requireAuth,
  async (req, res): Promise<void> => {
    const orgId = parseId(req.params.orgId);
    if (!orgId || isNaN(orgId)) {
      res.status(400).json({ error: "Invalid organization id" });
      return;
    }
    const userId = await verifyMembership(req.clerkUserId!, orgId);
    if (!userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const { name, category, subcategory, description, influence, interest, notes } = req.body;
    if (!name || !category || influence == null || interest == null) {
      res.status(400).json({ error: "Missing required fields: name, category, influence, interest" });
      return;
    }
    const [created] = await db
      .insert(stakeholdersTable)
      .values({
        organizationId: orgId,
        name: String(name),
        category: String(category),
        subcategory: subcategory ? String(subcategory) : null,
        description: description ? String(description) : null,
        influence: Math.min(5, Math.max(1, Number(influence))),
        interest: Math.min(5, Math.max(1, Number(interest))),
        notes: notes ? String(notes) : null,
        createdBy: userId,
      })
      .returning();
    res.status(201).json(created);
  },
);

// GET /organizations/:orgId/stakeholders/:id
router.get(
  "/organizations/:orgId/stakeholders/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const orgId = parseId(req.params.orgId);
    const id = parseId(req.params.id);
    if (!orgId || !id) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const userId = await verifyMembership(req.clerkUserId!, orgId);
    if (!userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const [row] = await db
      .select()
      .from(stakeholdersTable)
      .where(
        and(
          eq(stakeholdersTable.id, id),
          eq(stakeholdersTable.organizationId, orgId),
        ),
      )
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
  async (req, res): Promise<void> => {
    const orgId = parseId(req.params.orgId);
    const id = parseId(req.params.id);
    if (!orgId || !id) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const userId = await verifyMembership(req.clerkUserId!, orgId);
    if (!userId) {
      res.status(403).json({ error: "Forbidden" });
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
      .where(
        and(
          eq(stakeholdersTable.id, id),
          eq(stakeholdersTable.organizationId, orgId),
        ),
      )
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
  async (req, res): Promise<void> => {
    const orgId = parseId(req.params.orgId);
    const id = parseId(req.params.id);
    if (!orgId || !id) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const userId = await verifyMembership(req.clerkUserId!, orgId);
    if (!userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const [deleted] = await db
      .delete(stakeholdersTable)
      .where(
        and(
          eq(stakeholdersTable.id, id),
          eq(stakeholdersTable.organizationId, orgId),
        ),
      )
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).end();
  },
);

export default router;
