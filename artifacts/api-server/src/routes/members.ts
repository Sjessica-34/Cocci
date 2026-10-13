import { Router, type IRouter, type RequestHandler } from "express";
import { eq, and, count, ne, sql, isNull } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import { db, membersTable, usersTable, pool } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireMembership } from "../middlewares/requireMembership";
import {
  ListMembersParams,
  ListMembersResponse,
  InviteMemberParams,
  InviteMemberBody,
  InviteMemberResponse,
  UpdateMemberParams,
  UpdateMemberBody,
  UpdateMemberResponse,
  RemoveMemberParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

type InviteMemberDependencies = {
  getEffectiveMaxUsers(organizationId: number): Promise<number>;
  countMembers(organizationId: number): Promise<number>;
  findUserByEmail(email: string): Promise<typeof usersTable.$inferSelect | undefined>;
  createPlaceholderUser(email: string, organizationId: number): Promise<typeof usersTable.$inferSelect>;
  findCurrentMembership(userId: number): Promise<{ organizationId: number } | undefined>;
  createMembership(input: {
    userId: number;
    organizationId: number;
    role: string;
    status: string;
  }): Promise<typeof membersTable.$inferSelect>;
  setPrimaryOrganization(userId: number, organizationId: number): Promise<typeof usersTable.$inferSelect>;
  sendInvitation(input: {
    emailAddress: string;
    notify: boolean;
    ignoreExisting: boolean;
    publicMetadata: { cocciOrganizationId: number; cocciRole: string };
  }): Promise<unknown>;
  deleteMembership(memberId: number): Promise<void>;
  deleteUser(userId: number): Promise<void>;
};

const inviteMemberDependencies: InviteMemberDependencies = {
  async getEffectiveMaxUsers(organizationId) {
    const result = await pool.query<{ effective_max: number | null }>(
      `SELECT COALESCE(override_max_users, max_users) AS effective_max
       FROM subscriptions WHERE organization_id = $1 LIMIT 1`,
      [organizationId],
    );
    return result.rows[0]?.effective_max ?? 1;
  },
  async countMembers(organizationId) {
    const [{ value }] = await db
      .select({ value: count() })
      .from(membersTable)
      .where(
        and(
          eq(membersTable.organizationId, organizationId),
          ne(membersTable.status, "suspended"),
        ),
      );
    return Number(value);
  },
  async findUserByEmail(email) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    return user;
  },
  async createPlaceholderUser(email, organizationId) {
    const [user] = await db
      .insert(usersTable)
      .values({
        clerkId: `invited_${Date.now()}`,
        email,
        primaryOrganizationId: organizationId,
      })
      .returning();
    return user;
  },
  async findCurrentMembership(userId) {
    const [membership] = await db
      .select({ organizationId: membersTable.organizationId })
      .from(membersTable)
      .where(and(
        eq(membersTable.userId, userId),
        isNull(membersTable.archivedAt),
        ne(membersTable.status, "suspended"),
      ))
      .limit(1);
    return membership;
  },
  async createMembership(input) {
    const [member] = await db.insert(membersTable).values(input).returning();
    return member;
  },
  async setPrimaryOrganization(userId, organizationId) {
    const [user] = await db
      .update(usersTable)
      .set({ primaryOrganizationId: organizationId, updatedAt: new Date() })
      .where(eq(usersTable.id, userId))
      .returning();
    return user;
  },
  sendInvitation(input) {
    return clerkClient.invitations.createInvitation(input);
  },
  async deleteMembership(memberId) {
    await db.delete(membersTable).where(eq(membersTable.id, memberId));
  },
  async deleteUser(userId) {
    await db.delete(usersTable).where(eq(usersTable.id, userId));
  },
};

export function createInviteMemberHandler(
  dependencies: InviteMemberDependencies = inviteMemberDependencies,
): RequestHandler {
  return async (req, res): Promise<void> => {
    const params = InviteMemberParams.safeParse({
      id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id),
    });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = InviteMemberBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const inviteEmail = parsed.data.email.trim().toLowerCase();
    const organizationId = params.data.id;

    const effectiveMax = await dependencies.getEffectiveMaxUsers(organizationId);
    const memberCount = await dependencies.countMembers(organizationId);
    if (memberCount >= effectiveMax) {
      res.status(402).json({ error: "USER_LIMIT_REACHED", maxUsers: effectiveMax });
      return;
    }

    let targetUser = await dependencies.findUserByEmail(inviteEmail);
    if (!targetUser) {
      targetUser = await dependencies.createPlaceholderUser(inviteEmail, organizationId);
    }

    if (targetUser.primaryOrganizationId && targetUser.primaryOrganizationId !== organizationId) {
      res.status(409).json({ error: "Cet utilisateur appartient déjà à une autre organisation principale." });
      return;
    }

    const currentRelation = await dependencies.findCurrentMembership(targetUser.id);
    if (currentRelation) {
      res.status(409).json({
        error: currentRelation.organizationId === organizationId
          ? "Cet utilisateur est déjà invité ou membre de cette organisation."
          : "Cet utilisateur appartient déjà à une autre organisation principale.",
      });
      return;
    }

    const isPendingClerkAccount = targetUser.clerkId.startsWith("invited_");
    let member: typeof membersTable.$inferSelect;
    try {
      member = await dependencies.createMembership({
        userId: targetUser.id,
        organizationId,
        role: parsed.data.role,
        status: isPendingClerkAccount ? "invited" : "active",
      });
    } catch (error: any) {
      if (error?.code === "23505") {
        res.status(409).json({ error: "Cet utilisateur appartient déjà à une organisation principale." });
        return;
      }
      throw error;
    }

    if (!isPendingClerkAccount && !targetUser.primaryOrganizationId) {
      targetUser = await dependencies.setPrimaryOrganization(targetUser.id, organizationId);
    }

    try {
      await dependencies.sendInvitation({
        emailAddress: inviteEmail,
        notify: true,
        ignoreExisting: true,
        publicMetadata: {
          cocciOrganizationId: organizationId,
          cocciRole: parsed.data.role,
        },
      });
    } catch (error) {
      await dependencies.deleteMembership(member.id);
      if (isPendingClerkAccount) {
        await dependencies.deleteUser(targetUser.id);
      }
      req.log.error({ err: error, orgId: organizationId }, "Clerk member invitation failed");
      res.status(502).json({ error: "L'invitation e-mail n'a pas pu être envoyée. Réessayez." });
      return;
    }

    res.status(201).json(InviteMemberResponse.parse({ ...member, user: targetUser }));
  };
}

async function getMembersWithUsers(orgId: number) {
  const rows = await db
    .select({ member: membersTable, user: usersTable })
    .from(membersTable)
    .innerJoin(usersTable, eq(membersTable.userId, usersTable.id))
    .where(eq(membersTable.organizationId, orgId));

  return rows.map(({ member, user }) => ({ ...member, user }));
}

class LastOwnerMutationError extends Error {}

router.get(
  "/organizations/:id/members",
  requireAuth,
  requireMembership(["owner", "admin", "member", "viewer"]),
  async (req, res): Promise<void> => {
    const params = ListMembersParams.safeParse({
      id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id),
    });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const members = await getMembersWithUsers(params.data.id);
    res.json(ListMembersResponse.parse(members));
  },
);

router.post(
  "/organizations/:id/members",
  requireAuth,
  requireMembership(["owner", "admin"]),
  createInviteMemberHandler(),
);

router.patch(
  "/organizations/:id/members/:memberId",
  requireAuth,
  requireMembership(["owner", "admin"]),
  async (req, res): Promise<void> => {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const rawMemberId = Array.isArray(req.params.memberId) ? req.params.memberId[0] : req.params.memberId;

    const params = UpdateMemberParams.safeParse({ id: Number(rawId), memberId: Number(rawMemberId) });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = UpdateMemberBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    let updated;
    try {
      updated = await db.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(67101, ${params.data.id})`,
        );
        const [target] = await tx
          .select({ role: membersTable.role, status: membersTable.status })
          .from(membersTable)
          .where(and(
            eq(membersTable.id, params.data.memberId),
            eq(membersTable.organizationId, params.data.id),
          ))
          .limit(1);
        const nextRole = parsed.data.role ?? target?.role;
        const nextStatus = parsed.data.status ?? target?.status;
        if (
          target?.role === "owner" &&
          target.status === "active" &&
          (nextRole !== "owner" || nextStatus !== "active")
        ) {
          const [otherOwner] = await tx
            .select({ id: membersTable.id })
            .from(membersTable)
            .where(and(
              eq(membersTable.organizationId, params.data.id),
              eq(membersTable.role, "owner"),
              eq(membersTable.status, "active"),
              ne(membersTable.id, params.data.memberId),
            ))
            .limit(1);
          if (!otherOwner) throw new LastOwnerMutationError();
        }
        const [result] = await tx
          .update(membersTable)
          .set(parsed.data)
          .where(and(
            eq(membersTable.id, params.data.memberId),
            eq(membersTable.organizationId, params.data.id),
          ))
          .returning();
        return result;
      });
    } catch (error) {
      if (error instanceof LastOwnerMutationError) {
        res.status(409).json({ error: "Le dernier propriétaire de l'organisation ne peut pas être rétrogradé" });
        return;
      }
      throw error;
    }

    if (!updated) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    const [memberUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, updated.userId))
      .limit(1);

    res.json(UpdateMemberResponse.parse({ ...updated, user: memberUser }));
  },
);

router.delete(
  "/organizations/:id/members/:memberId",
  requireAuth,
  requireMembership(["owner", "admin"]),
  async (req, res): Promise<void> => {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const rawMemberId = Array.isArray(req.params.memberId) ? req.params.memberId[0] : req.params.memberId;

    const params = RemoveMemberParams.safeParse({ id: Number(rawId), memberId: Number(rawMemberId) });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    let deleted;
    try {
      deleted = await db.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(67101, ${params.data.id})`,
        );
        const [target] = await tx
          .select({ role: membersTable.role, status: membersTable.status })
          .from(membersTable)
          .where(and(
            eq(membersTable.id, params.data.memberId),
            eq(membersTable.organizationId, params.data.id),
          ))
          .limit(1);
        if (target?.role === "owner" && target.status === "active") {
          const [otherOwner] = await tx
            .select({ id: membersTable.id })
            .from(membersTable)
            .where(and(
              eq(membersTable.organizationId, params.data.id),
              eq(membersTable.role, "owner"),
              eq(membersTable.status, "active"),
              ne(membersTable.id, params.data.memberId),
            ))
            .limit(1);
          if (!otherOwner) throw new LastOwnerMutationError();
        }
        const [result] = await tx
          .delete(membersTable)
          .where(and(
            eq(membersTable.id, params.data.memberId),
            eq(membersTable.organizationId, params.data.id),
          ))
          .returning();
        return result;
      });
    } catch (error) {
      if (error instanceof LastOwnerMutationError) {
        res.status(409).json({ error: "Le dernier propriétaire de l'organisation ne peut pas être supprimé" });
        return;
      }
      throw error;
    }

    if (!deleted) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    res.sendStatus(204);
  },
);

export default router;
