import { Router, type IRouter, type RequestHandler } from "express";
import { eq, and, count, ne, sql, isNull, lte } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import {
  db,
  membersTable,
  usersTable,
  pool,
  organizationInvitationsTable,
  onboardingProgressTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireMembership } from "../middlewares/requireMembership";
import { getPublicAppUrl } from "../appUrl";
import { logger } from "../lib/logger";
import { getOrCreateUser } from "../lib/auth";
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

function redactInvitationRedirectUrl(organizationId: number, redirectUrl: string): string {
  const parsedUrl = new URL(redirectUrl);
  return `${parsedUrl.origin}${parsedUrl.pathname}?organizationId=${organizationId}&email=[redacted]`;
}

function getDatabaseFailureDetails(error: unknown): {
  databaseCode?: string;
  databaseConstraint?: string;
  databaseTable?: string;
  databaseColumn?: string;
} {
  let current: unknown = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== "object") return {};
    const candidate = current as {
      code?: unknown;
      constraint?: unknown;
      table?: unknown;
      column?: unknown;
      cause?: unknown;
    };
    if (candidate.code || candidate.constraint || candidate.table || candidate.column) {
      return {
        databaseCode: typeof candidate.code === "string" ? candidate.code : undefined,
        databaseConstraint: typeof candidate.constraint === "string" ? candidate.constraint : undefined,
        databaseTable: typeof candidate.table === "string" ? candidate.table : undefined,
        databaseColumn: typeof candidate.column === "string" ? candidate.column : undefined,
      };
    }
    current = candidate.cause;
  }
  return {};
}

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
    expiresInDays?: number;
    publicMetadata: { cocciOrganizationId: number; cocciRole: string };
    redirectUrl: string;
  }): Promise<unknown>;
  recordInvitation?: (input: {
    organizationId: number;
    memberId: number;
    email: string;
    role: string;
    clerkInvitationId: string | null;
    invitedByUserId: number | null;
    expiresAt: Date;
  }) => Promise<void>;
  revokeInvitation?: (clerkInvitationId: string) => Promise<unknown>;
  getRedirectUrl(organizationId: number, email: string): string;
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
  revokeInvitation(clerkInvitationId: string) {
    return clerkClient.invitations.revokeInvitation(clerkInvitationId);
  },
  getRedirectUrl(organizationId: number, email: string) {
    return `${getPublicAppUrl()}/accept-invitation?organizationId=${organizationId}&email=${encodeURIComponent(email)}`;
  },
  async recordInvitation(input) {
    await db.insert(organizationInvitationsTable).values({
      organizationId: input.organizationId,
      memberId: input.memberId,
      email: input.email,
      role: input.role,
      clerkInvitationId: input.clerkInvitationId,
      invitedByUserId: input.invitedByUserId,
      expiresAt: input.expiresAt,
    });
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

    let effectiveMax: number;
    let memberCount: number;
    let targetUser: Awaited<ReturnType<InviteMemberDependencies["findUserByEmail"]>>;
    try {
      effectiveMax = await dependencies.getEffectiveMaxUsers(organizationId);
      memberCount = await dependencies.countMembers(organizationId);
      targetUser = await dependencies.findUserByEmail(inviteEmail);
    } catch (error) {
      req.log.error({ err: error, orgId: organizationId, stage: "organization_or_database" }, "Unable to prepare member invitation");
      res.status(500).json({ code: "INVITATION_DATABASE_FAILED", error: "The organization or member records could not be loaded." });
      return;
    }
    if (memberCount >= effectiveMax) {
      res.status(402).json({ code: "USER_LIMIT_REACHED", error: "USER_LIMIT_REACHED", maxUsers: effectiveMax });
      return;
    }

    if (!targetUser) {
      try {
        targetUser = await dependencies.createPlaceholderUser(inviteEmail, organizationId);
      } catch (error) {
        req.log.error({ err: error, orgId: organizationId, stage: "database_create_user" }, "Unable to create invitation user");
        res.status(500).json({ code: "INVITATION_DATABASE_FAILED", error: "The invited user could not be created." });
        return;
      }
    }

    if (targetUser.primaryOrganizationId && targetUser.primaryOrganizationId !== organizationId) {
      res.status(409).json({ error: "Cet utilisateur appartient déjà à une autre organisation principale." });
      return;
    }

    let currentRelation: { organizationId: number } | undefined;
    try {
      currentRelation = await dependencies.findCurrentMembership(targetUser.id);
    } catch (error) {
      req.log.error({ err: error, orgId: organizationId, stage: "database_membership_lookup" }, "Unable to check existing organization membership");
      res.status(500).json({ code: "INVITATION_DATABASE_FAILED", error: "Existing organization membership could not be checked." });
      return;
    }
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
    let createdClerkInvitationId: string | null = null;
    try {
      member = await dependencies.createMembership({
        userId: targetUser.id,
        organizationId,
        role: parsed.data.role,
        status: "invited",
      });
    } catch (error: any) {
      if (error?.code === "23505") {
        res.status(409).json({ error: "Cet utilisateur appartient déjà à une organisation principale." });
        return;
      }
      req.log.error({ err: error, orgId: organizationId, stage: "database_create_membership" }, "Unable to create invitation membership");
      res.status(500).json({ code: "INVITATION_DATABASE_FAILED", error: "The organization membership could not be created." });
      return;
    }

    let invitationStage: "clerk" | "database_record" = "clerk";
    try {
      const redirectUrl = dependencies.getRedirectUrl(organizationId, inviteEmail);
      logger.info(
        { organizationId, redirectUrl: redactInvitationRedirectUrl(organizationId, redirectUrl) },
        "Creating Clerk invitation with Cocci return URL",
      );
      const clerkInvitation = await dependencies.sendInvitation({
        emailAddress: inviteEmail,
        notify: true,
        ignoreExisting: true,
        expiresInDays: 30,
        publicMetadata: {
          cocciOrganizationId: organizationId,
          cocciRole: parsed.data.role,
        },
        redirectUrl,
      });
      const clerkInvitationId =
        clerkInvitation && typeof clerkInvitation === "object" && "id" in clerkInvitation
          ? String(clerkInvitation.id)
          : null;
      createdClerkInvitationId = clerkInvitationId;
      invitationStage = "database_record";
      await dependencies.recordInvitation?.({
        organizationId,
        memberId: member.id,
        email: inviteEmail,
        role: parsed.data.role,
        clerkInvitationId,
        invitedByUserId: req.currentUser?.id ?? null,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    } catch (error) {
      if (createdClerkInvitationId) {
        try {
          await dependencies.revokeInvitation?.(createdClerkInvitationId);
        } catch (revokeError) {
          req.log.error({ err: revokeError, clerkInvitationId: createdClerkInvitationId }, "Failed to revoke unrecorded Clerk invitation");
        }
      }
      try {
        await dependencies.deleteMembership(member.id);
      } catch (cleanupError) {
        req.log.error({ err: cleanupError, orgId: organizationId, memberId: member.id }, "Failed to clean up invitation membership");
      }
      if (isPendingClerkAccount) {
        try {
          await dependencies.deleteUser(targetUser.id);
        } catch (cleanupError) {
          req.log.error({ err: cleanupError, orgId: organizationId, userId: targetUser.id }, "Failed to clean up placeholder invitation user");
        }
      }
      req.log.error({
        err: error,
        orgId: organizationId,
        stage: invitationStage,
        memberId: member.id,
        role: parsed.data.role,
        clerkInvitationId: createdClerkInvitationId,
        invitedByUserId: req.currentUser?.id ?? null,
        ...getDatabaseFailureDetails(error),
      }, "Member invitation failed");
      res.status(invitationStage === "clerk" ? 502 : 500).json({
        code: invitationStage === "clerk" ? "CLERK_INVITATION_FAILED" : "INVITATION_DATABASE_FAILED",
        stage: invitationStage,
        error: invitationStage === "clerk"
          ? "Clerk could not send the invitation email."
          : "The invitation could not be recorded; the Clerk invitation was rolled back.",
      });
      return;
    }

    res.status(201).json(InviteMemberResponse.parse({ ...member, user: targetUser }));
  };
}

async function getMembersWithUsers(orgId: number) {
  const expiredInvitations = await db.select({
    id: organizationInvitationsTable.id,
    memberId: organizationInvitationsTable.memberId,
  }).from(organizationInvitationsTable).where(and(
    eq(organizationInvitationsTable.organizationId, orgId),
    eq(organizationInvitationsTable.status, "pending"),
    lte(organizationInvitationsTable.expiresAt, new Date()),
  ));
  for (const invitation of expiredInvitations) {
    await db.transaction(async (tx) => {
      await tx.update(organizationInvitationsTable)
        .set({ status: "expired", updatedAt: new Date() })
        .where(and(
          eq(organizationInvitationsTable.id, invitation.id),
          eq(organizationInvitationsTable.status, "pending"),
        ));
      if (invitation.memberId !== null) {
        await tx.update(membersTable)
          .set({ status: "suspended" })
          .where(and(
            eq(membersTable.id, invitation.memberId),
            eq(membersTable.status, "invited"),
          ));
      }
    });
  }
  const rows = await db
    .select({ member: membersTable, user: usersTable })
    .from(membersTable)
    .innerJoin(usersTable, eq(membersTable.userId, usersTable.id))
    .where(eq(membersTable.organizationId, orgId));

  const invitations = await db.select({
    memberId: organizationInvitationsTable.memberId,
    status: organizationInvitationsTable.status,
  }).from(organizationInvitationsTable)
    .where(eq(organizationInvitationsTable.organizationId, orgId));
  const statusByMemberId = new Map(
    invitations
      .filter((invitation) => invitation.memberId !== null)
      .map((invitation) => [invitation.memberId!, invitation.status]),
  );
  return rows.map(({ member, user }) => ({
    ...member,
    user,
    invitationStatus: statusByMemberId.get(member.id) ?? null,
  }));
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

router.post(
  "/organizations/:id/members/accept-invitation",
  requireAuth,
  async (req, res): Promise<void> => {
    const organizationId = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
    if (!Number.isInteger(organizationId) || organizationId <= 0) {
      res.status(400).json({ error: "Invalid organization id" });
      return;
    }
    const user = await getOrCreateUser(req.clerkUserId!);
    const [invitation] = await db
      .select()
      .from(organizationInvitationsTable)
      .where(and(
        eq(organizationInvitationsTable.organizationId, organizationId),
        eq(organizationInvitationsTable.email, user.email.toLowerCase()),
        eq(organizationInvitationsTable.status, "pending"),
      ))
      .limit(1);
    if (!invitation?.memberId) {
      res.status(404).json({ error: "Aucune invitation en attente pour ce compte." });
      return;
    }
    if (invitation.expiresAt && invitation.expiresAt.getTime() <= Date.now()) {
      await db.update(organizationInvitationsTable)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(organizationInvitationsTable.id, invitation.id));
      await db.update(membersTable)
        .set({ status: "suspended" })
        .where(eq(membersTable.id, invitation.memberId));
      res.status(410).json({ error: "Cette invitation a expiré." });
      return;
    }
    await db.transaction(async (tx) => {
      await tx.update(membersTable)
        .set({ status: "active" })
        .where(and(
          eq(membersTable.id, invitation.memberId!),
          eq(membersTable.organizationId, organizationId),
        ));
      await tx.update(organizationInvitationsTable)
        .set({ status: "accepted", updatedAt: new Date() })
        .where(eq(organizationInvitationsTable.id, invitation.id));
      await tx.update(usersTable)
        .set({ primaryOrganizationId: organizationId, updatedAt: new Date() })
        .where(eq(usersTable.id, user.id));
      const completedAt = new Date();
      await tx.insert(onboardingProgressTable)
        .values({ userId: user.id, status: "completed", completedAt })
        .onConflictDoUpdate({
          target: onboardingProgressTable.userId,
          set: { status: "completed", completedAt, updatedAt: completedAt },
        });
    });
    res.json({ organizationId, role: invitation.role });
  },
);

router.post(
  "/organizations/:id/members/:memberId/invitation/resend",
  requireAuth,
  requireMembership(["owner", "admin"]),
  async (req, res): Promise<void> => {
    const organizationId = Number(req.params.id);
    const memberId = Number(req.params.memberId);
    if (!Number.isInteger(organizationId) || !Number.isInteger(memberId)) {
      res.status(400).json({ error: "Invalid member invitation" });
      return;
    }
    const [invitation] = await db.select().from(organizationInvitationsTable)
      .where(and(
        eq(organizationInvitationsTable.organizationId, organizationId),
        eq(organizationInvitationsTable.memberId, memberId),
      ))
      .limit(1);
    const [member] = await db.select().from(membersTable)
      .where(and(eq(membersTable.id, memberId), eq(membersTable.organizationId, organizationId)))
      .limit(1);
    if (!invitation || !member || !["invited", "suspended"].includes(member.status) || !["pending", "expired"].includes(invitation.status)) {
      res.status(404).json({ error: "Invitation introuvable ou déjà acceptée." });
      return;
    }
    if (member.status === "suspended") {
      const maxUsers = await inviteMemberDependencies.getEffectiveMaxUsers(organizationId);
      const currentCount = await inviteMemberDependencies.countMembers(organizationId);
      if (currentCount >= maxUsers) {
        res.status(402).json({ error: "USER_LIMIT_REACHED", maxUsers });
        return;
      }
    }
    try {
      if (invitation.clerkInvitationId) {
        await clerkClient.invitations.revokeInvitation(invitation.clerkInvitationId);
      }
      const redirectUrl = `${getPublicAppUrl()}/accept-invitation?organizationId=${organizationId}&email=${encodeURIComponent(invitation.email)}`;
      logger.info(
        { organizationId, redirectUrl: redactInvitationRedirectUrl(organizationId, redirectUrl) },
        "Resending Clerk invitation with Cocci return URL",
      );
      const clerkInvite = await clerkClient.invitations.createInvitation({
        emailAddress: invitation.email,
        notify: true,
        ignoreExisting: true,
        expiresInDays: 30,
        redirectUrl,
        publicMetadata: { cocciOrganizationId: organizationId, cocciRole: invitation.role },
      });
      await db.update(organizationInvitationsTable).set({
        status: "pending",
        clerkInvitationId: clerkInvite.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      }).where(eq(organizationInvitationsTable.id, invitation.id));
      await db.update(membersTable).set({ status: "invited" })
        .where(eq(membersTable.id, memberId));
      res.json({ status: "pending" });
    } catch (error) {
      req.log.error({ err: error, organizationId, memberId }, "Clerk invitation resend failed");
      res.status(502).json({ error: "Impossible de renvoyer l’invitation." });
    }
  },
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

    const [pendingInvitation] = await db.select().from(organizationInvitationsTable)
      .where(and(
        eq(organizationInvitationsTable.organizationId, params.data.id),
        eq(organizationInvitationsTable.memberId, params.data.memberId),
        eq(organizationInvitationsTable.status, "pending"),
      ))
      .limit(1);
    if (pendingInvitation?.clerkInvitationId) {
      try {
        await clerkClient.invitations.revokeInvitation(pendingInvitation.clerkInvitationId);
      } catch (error) {
        req.log.error({ err: error, memberId: params.data.memberId }, "Clerk invitation revoke failed");
        res.status(502).json({ error: "Impossible d’annuler l’invitation Clerk." });
        return;
      }
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

    if (pendingInvitation) {
      await db.update(organizationInvitationsTable)
        .set({ status: "revoked", updatedAt: new Date() })
        .where(eq(organizationInvitationsTable.id, pendingInvitation.id));
    }

    res.sendStatus(204);
  },
);

export default router;
