import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, organizationsTable, membersTable } from "@workspace/db";
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

export default router;
