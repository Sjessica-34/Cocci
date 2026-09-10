import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import {
  db,
  organizationsTable,
  membersTable,
  exercisesTable,
  onboardingProgressTable,
  usersTable,
} from "@workspace/db";
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

  // Superadmin impersonation: ?viewAs=<orgId> returns the target org's full
  // hierarchy (root + subsidiaries) so the admin can browse as that client.
  const viewAsRaw = req.query.viewAs;
  if (viewAsRaw && user.isSuperAdmin) {
    const rootId = Number(viewAsRaw);
    if (!Number.isFinite(rootId) || rootId <= 0) {
      res.status(400).json({ error: "Invalid viewAs org id" });
      return;
    }
    // Return the target root org + all its subsidiaries so the GroupSwitcher
    // works correctly in the admin-view client context.
    const rows = await db
      .select()
      .from(organizationsTable)
      .where(
        eq(organizationsTable.id, rootId),
      );
    // Also fetch subsidiaries.
    const children = await db
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.parentId, rootId));
    res.json(ListOrganizationsResponse.parse([...rows, ...children]));
    return;
  }

  let orgs: typeof organizationsTable.$inferSelect[] = [];
  if (user.isSuperAdmin) {
    const memberships = await db
      .select({ organization: organizationsTable })
      .from(membersTable)
      .innerJoin(organizationsTable, eq(membersTable.organizationId, organizationsTable.id))
      .where(and(eq(membersTable.userId, user.id), eq(membersTable.status, "active")));
    orgs = memberships.map((m) => m.organization);
  } else if (user.primaryOrganizationId) {
    const roots = await db
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.id, user.primaryOrganizationId));
    const children = await db
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.parentId, user.primaryOrganizationId));
    orgs = [...roots, ...children];
  } else {
    orgs = [];
  }
  res.json(ListOrganizationsResponse.parse(orgs));
});

router.post("/organizations", requireAuth, async (req, res): Promise<void> => {
  const user = await getOrCreateUser(req.clerkUserId!);

  const parsed = CreateOrganizationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  class OrganizationOwnershipConflict extends Error {}

  let org;
  try {
    org = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(67102, ${user.id})`);

      if (!parsed.data.parentId) {
        const [lockedUser] = await tx
          .select({ primaryOrganizationId: usersTable.primaryOrganizationId })
          .from(usersTable)
          .where(eq(usersTable.id, user.id))
          .limit(1);
        if (lockedUser?.primaryOrganizationId) {
          throw new OrganizationOwnershipConflict();
        }
      } else {
        if (!user.primaryOrganizationId || parsed.data.parentId !== user.primaryOrganizationId) {
          throw new OrganizationOwnershipConflict();
        }
        const [parent] = await tx
          .select({ id: organizationsTable.id, type: organizationsTable.type, parentId: organizationsTable.parentId })
          .from(organizationsTable)
          .where(eq(organizationsTable.id, parsed.data.parentId))
          .limit(1);
        if (!parent || parent.type !== "groupe" || parent.parentId !== null) {
          throw new OrganizationOwnershipConflict();
        }
      }

      const [created] = await tx
        .insert(organizationsTable)
        .values(parsed.data)
        .returning();

      if (!parsed.data.parentId) {
        await tx.insert(membersTable).values({
          userId: user.id,
          organizationId: created.id,
          role: "owner",
          status: "active",
        });
        await tx.update(usersTable)
          .set({ primaryOrganizationId: created.id, updatedAt: new Date() })
          .where(eq(usersTable.id, user.id));
        await tx.update(onboardingProgressTable)
          .set({ status: "organization_created", updatedAt: new Date() })
          .where(eq(onboardingProgressTable.userId, user.id));
      } else {
        // Une filiale créée depuis l'espace déjà configuré ne doit jamais
        // faire régresser l'onboarding vers une étape de premier parcours.
        // Seule la création de filiales pendant l'onboarding initial avance
        // organization_created → subsidiaries_configured.
        await tx.update(onboardingProgressTable)
          .set({ status: "subsidiaries_configured", updatedAt: new Date() })
          .where(and(
            eq(onboardingProgressTable.userId, user.id),
            eq(onboardingProgressTable.status, "organization_created"),
          ));
      }

      await tx.insert(exercisesTable).values({
        organizationId: created.id,
        year: new Date().getFullYear(),
        status: "active",
      });

      if (!parsed.data.parentId && parsed.data.type === "groupe") {
        const [maisonMere] = await tx
          .insert(organizationsTable)
          .values({
            name: "Maison mère / Siège social",
            type: "entreprise",
            parentId: created.id,
          })
          .returning();
        await tx.insert(exercisesTable).values({
          organizationId: maisonMere.id,
          year: new Date().getFullYear(),
          status: "active",
        });
      }

      return created;
    });
  } catch (error) {
    if (error instanceof OrganizationOwnershipConflict) {
      res.status(409).json({ error: "Un compte ne peut avoir qu'une seule organisation principale." });
      return;
    }
    throw error;
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
