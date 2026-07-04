import { Router } from "express";
import { db, usersTable, organizationsTable, membersTable, resourcesTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireSuperAdmin } from "../middlewares/requireSuperAdmin";
const router = Router();

// Toutes les routes admin nécessitent auth + superadmin
router.use(requireAuth, requireSuperAdmin);

// GET /admin/stats — statistiques globales
router.get("/admin/stats", async (req, res) => {
  const [orgCount] = await db.select({ count: count() }).from(organizationsTable);
  const [userCount] = await db.select({ count: count() }).from(usersTable);
  const [memberCount] = await db.select({ count: count() }).from(membersTable);

  res.json({
    organizationCount: Number(orgCount.count),
    userCount: Number(userCount.count),
    memberCount: Number(memberCount.count),
  });
});

// GET /admin/organizations — liste toutes les organisations avec compteur de membres
router.get("/admin/organizations", async (req, res) => {
  const orgs = await db
    .select({
      id: organizationsTable.id,
      name: organizationsTable.name,
      legalName: organizationsTable.legalName,
      siret: organizationsTable.siret,
      sector: organizationsTable.sector,
      size: organizationsTable.size,
      createdAt: organizationsTable.createdAt,
    })
    .from(organizationsTable)
    .orderBy(desc(organizationsTable.createdAt));

  // Compteur de membres par org
  const memberCounts = await db
    .select({
      organizationId: membersTable.organizationId,
      count: count(),
    })
    .from(membersTable)
    .groupBy(membersTable.organizationId);

  const countMap = new Map(memberCounts.map((m) => [m.organizationId, Number(m.count)]));

  res.json(orgs.map((org) => ({ ...org, memberCount: countMap.get(org.id) ?? 0 })));
});

// GET /admin/organizations/:id/members — membres d'une organisation
router.get("/admin/organizations/:id/members", async (req, res) => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const orgId = Number(rawId);
  if (!orgId || isNaN(orgId)) {
    res.status(400).json({ error: "Invalid organization id" });
    return;
  }

  const members = await db
    .select({
      id: membersTable.id,
      role: membersTable.role,
      status: membersTable.status,
      createdAt: membersTable.createdAt,
      user: {
        id: usersTable.id,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        avatarUrl: usersTable.avatarUrl,
        isSuperAdmin: usersTable.isSuperAdmin,
      },
    })
    .from(membersTable)
    .innerJoin(usersTable, eq(membersTable.userId, usersTable.id))
    .where(eq(membersTable.organizationId, orgId))
    .orderBy(desc(membersTable.createdAt));

  res.json(members);
});

// GET /admin/users — liste tous les utilisateurs
router.get("/admin/users", async (req, res) => {
  const users = await db
    .select()
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt));

  res.json(users);
});

// GET /admin/organizations/:orgId/resources — ressources d'une org
router.get("/admin/organizations/:orgId/resources", async (req, res) => {
  const rawId = Array.isArray(req.params.orgId) ? req.params.orgId[0] : req.params.orgId;
  const orgId = Number(rawId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid organization id" }); return; }

  const resources = await db
    .select()
    .from(resourcesTable)
    .where(eq(resourcesTable.organizationId, orgId))
    .orderBy(desc(resourcesTable.createdAt));

  res.json(resources);
});

// POST /admin/organizations/:orgId/resources — créer une ressource
router.post("/admin/organizations/:orgId/resources", async (req, res) => {
  const rawId = Array.isArray(req.params.orgId) ? req.params.orgId[0] : req.params.orgId;
  const orgId = Number(rawId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid organization id" }); return; }

  const { title, description, category, documentType, imageUrl, fileUrl } = req.body;
  if (!title || typeof title !== "string") {
    res.status(400).json({ error: "title is required" });
    return;
  }

  const [created] = await db
    .insert(resourcesTable)
    .values({ organizationId: orgId, title, description, category, documentType, imageUrl, fileUrl })
    .returning();

  res.status(201).json(created);
});

// PATCH /admin/resources/:id — modifier une ressource
router.patch("/admin/resources/:id", async (req, res) => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = Number(rawId);
  if (!id || isNaN(id)) { res.status(400).json({ error: "Invalid resource id" }); return; }

  const { title, description, category, documentType, imageUrl, fileUrl } = req.body;
  const [updated] = await db
    .update(resourcesTable)
    .set({ title, description, category, documentType, imageUrl, fileUrl, updatedAt: new Date() })
    .where(eq(resourcesTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Resource not found" }); return; }
  res.json(updated);
});

// DELETE /admin/resources/:id — supprimer une ressource
router.delete("/admin/resources/:id", async (req, res) => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = Number(rawId);
  if (!id || isNaN(id)) { res.status(400).json({ error: "Invalid resource id" }); return; }

  const [deleted] = await db.delete(resourcesTable).where(eq(resourcesTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Resource not found" }); return; }
  res.status(204).end();
});

// PATCH /admin/resources/:id/publish — publier / dépublier
router.patch("/admin/resources/:id/publish", async (req, res) => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = Number(rawId);
  if (!id || isNaN(id)) { res.status(400).json({ error: "Invalid resource id" }); return; }

  const { isPublished } = req.body;
  if (typeof isPublished !== "boolean") {
    res.status(400).json({ error: "isPublished must be a boolean" });
    return;
  }

  const [updated] = await db
    .update(resourcesTable)
    .set({ isPublished, publishedAt: isPublished ? new Date() : null, updatedAt: new Date() })
    .where(eq(resourcesTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Resource not found" }); return; }
  res.json(updated);
});

// PATCH /admin/users/:id/superadmin — promouvoir/rétrograder superadmin
router.patch("/admin/users/:id/superadmin", async (req, res) => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const userId = Number(rawId);
  if (!userId || isNaN(userId)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  const { isSuperAdmin } = req.body;
  if (typeof isSuperAdmin !== "boolean") {
    res.status(400).json({ error: "isSuperAdmin must be a boolean" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ isSuperAdmin })
    .where(eq(usersTable.id, userId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(updated);
});

export default router;
