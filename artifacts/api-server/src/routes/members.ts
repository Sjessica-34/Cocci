import { Router, type IRouter } from "express";
import { eq, and, count, ne, sql } from "drizzle-orm";
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
  async (req, res): Promise<void> => {
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

    // ── Vérification de la limite d'utilisateurs ──────────────────────────────
    // Lit COALESCE(override_max_users, max_users) depuis la table subscriptions.
    // Si la valeur est NULL, aucune limite n'est appliquée.
    const subRes = await pool.query<{ effective_max: number | null }>(
      `SELECT COALESCE(override_max_users, max_users) AS effective_max
       FROM subscriptions WHERE organization_id = $1 LIMIT 1`,
      [params.data.id],
    );
    // Défaut produit : 1 utilisateur inclus si aucune ligne de souscription n'existe encore.
    const effectiveMax: number = subRes.rows[0]?.effective_max ?? 1;

    if (true) {
      const [{ value: memberCount }] = await db
        .select({ value: count() })
        .from(membersTable)
        .where(
          and(
            eq(membersTable.organizationId, params.data.id),
            ne(membersTable.status, "suspended"),
          ),
        );
      if (Number(memberCount) >= effectiveMax) {
        res.status(402).json({ error: "USER_LIMIT_REACHED", maxUsers: effectiveMax });
        return;
      }
    }

    let [targetUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, parsed.data.email))
      .limit(1);

    if (!targetUser) {
      [targetUser] = await db
        .insert(usersTable)
        .values({ clerkId: `invited_${Date.now()}`, email: parsed.data.email })
        .returning();
    }

    const [member] = await db
      .insert(membersTable)
      .values({
        userId: targetUser.id,
        organizationId: params.data.id,
        role: parsed.data.role,
        status: "invited",
      })
      .returning();

    res.status(201).json(InviteMemberResponse.parse({ ...member, user: targetUser }));
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
