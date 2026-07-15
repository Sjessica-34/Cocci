import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, organizationsTable, membersTable, exercisesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireMembership } from "../middlewares/requireMembership";
import { getOrCreateUser } from "../lib/auth";
import {
  ListOrganizationsResponse,
  CreateOrganizationBody,
  CreateOrganizationResponse,
  GetOrganizationParams,
  GetOrganizationResponse,
  UpdateOrganizationParams,
  UpdateOrganizationBody,
  UpdateOrganizationResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/organizations", requireAuth, async (req, res): Promise<void> => {
  const user = await getOrCreateUser(req.clerkUserId!);

  const memberships = await db
    .select({ organization: organizationsTable })
    .from(membersTable)
    .innerJoin(organizationsTable, eq(membersTable.organizationId, organizationsTable.id))
    .where(and(eq(membersTable.userId, user.id), eq(membersTable.status, "active")));

  const orgs = memberships.map((m) => m.organization);
  res.json(ListOrganizationsResponse.parse(orgs));
});

router.post("/organizations", requireAuth, async (req, res): Promise<void> => {
  const user = await getOrCreateUser(req.clerkUserId!);

  const parsed = CreateOrganizationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // "1 compte = 1 org principale" — block creation of a second root org.
  if (!parsed.data.parentId) {
    const memberships = await db
      .select({ org: organizationsTable })
      .from(membersTable)
      .innerJoin(organizationsTable, eq(membersTable.organizationId, organizationsTable.id))
      .where(and(eq(membersTable.userId, user.id), eq(membersTable.status, "active")));

    const hasRootOrg = memberships.some((m) => m.org.parentId === null);
    if (hasRootOrg) {
      res.status(409).json({ error: "Un compte ne peut avoir qu'une seule organisation principale." });
      return;
    }
  }

  const [org] = await db
    .insert(organizationsTable)
    .values(parsed.data)
    .returning();

  await db.insert(membersTable).values({
    userId: user.id,
    organizationId: org.id,
    role: "owner",
    status: "active",
  });

  // If this organization has a parentId (it's a subsidiary), also ensure the
  // current user is a member of the parent group so they can navigate to it.
  // (The user creating the subsidiary is implicitly a member of the group.)
  if (parsed.data.parentId) {
    const [existingMembership] = await db
      .select({ id: membersTable.id })
      .from(membersTable)
      .where(and(eq(membersTable.userId, user.id), eq(membersTable.organizationId, parsed.data.parentId)))
      .limit(1);

    if (!existingMembership) {
      await db.insert(membersTable).values({
        userId: user.id,
        organizationId: parsed.data.parentId,
        role: "owner",
        status: "active",
      });
    }
  } else {
    // Root org (no parent): auto-create an exercise for the current year so
    // the workspace is immediately usable without a manual setup step.
    await db.insert(exercisesTable).values({
      organizationId: org.id,
      year: new Date().getFullYear(),
      status: "active",
    });
  }

  res.status(201).json(CreateOrganizationResponse.parse(org));
});

router.get(
  "/organizations/:id",
  requireAuth,
  requireMembership(["owner", "admin", "member", "viewer"]),
  async (req, res): Promise<void> => {
    const params = GetOrganizationParams.safeParse({
      id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id),
    });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [org] = await db
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.id, params.data.id))
      .limit(1);

    if (!org) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }

    res.json(GetOrganizationResponse.parse(org));
  },
);

router.patch(
  "/organizations/:id",
  requireAuth,
  requireMembership(["owner", "admin"]),
  async (req, res): Promise<void> => {
    const params = UpdateOrganizationParams.safeParse({
      id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id),
    });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = UpdateOrganizationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [updated] = await db
      .update(organizationsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(organizationsTable.id, params.data.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }

    res.json(UpdateOrganizationResponse.parse(updated));
  },
);

// GET /organizations/:id/subsidiaries — list all direct subsidiaries of a group
router.get(
  "/organizations/:id/subsidiaries",
  requireAuth,
  requireMembership(["owner", "admin", "member", "viewer"]),
  async (req, res): Promise<void> => {
    const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    if (!id || isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const subsidiaries = await db
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.parentId, id));

    res.json(subsidiaries);
  },
);

export default router;
