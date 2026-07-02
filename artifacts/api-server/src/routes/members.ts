import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, membersTable, usersTable, organizationsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "./users";
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

async function assertMembership(userId: number, orgId: number, allowedRoles: string[]) {
  const [membership] = await db
    .select()
    .from(membersTable)
    .where(and(eq(membersTable.userId, userId), eq(membersTable.organizationId, orgId)))
    .limit(1);
  return membership && allowedRoles.includes(membership.role) ? membership : null;
}

async function getMembersWithUsers(orgId: number) {
  const rows = await db
    .select({ member: membersTable, user: usersTable })
    .from(membersTable)
    .innerJoin(usersTable, eq(membersTable.userId, usersTable.id))
    .where(eq(membersTable.organizationId, orgId));

  return rows.map(({ member, user }) => ({ ...member, user }));
}

router.get("/organizations/:id/members", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = (req as any).clerkUserId as string;
  const currentUser = await getOrCreateUser(clerkUserId);

  const params = ListMembersParams.safeParse({ id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const access = await assertMembership(currentUser.id, params.data.id, ["owner", "admin", "member", "viewer"]);
  if (!access) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const members = await getMembersWithUsers(params.data.id);
  res.json(ListMembersResponse.parse(members));
});

router.post("/organizations/:id/members", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = (req as any).clerkUserId as string;
  const currentUser = await getOrCreateUser(clerkUserId);

  const params = InviteMemberParams.safeParse({ id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const access = await assertMembership(currentUser.id, params.data.id, ["owner", "admin"]);
  if (!access) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = InviteMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Find or create user by email
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
});

router.patch("/organizations/:id/members/:memberId", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = (req as any).clerkUserId as string;
  const currentUser = await getOrCreateUser(clerkUserId);

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawMemberId = Array.isArray(req.params.memberId) ? req.params.memberId[0] : req.params.memberId;

  const params = UpdateMemberParams.safeParse({ id: Number(rawId), memberId: Number(rawMemberId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const access = await assertMembership(currentUser.id, params.data.id, ["owner", "admin"]);
  if (!access) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = UpdateMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(membersTable)
    .set(parsed.data)
    .where(and(eq(membersTable.id, params.data.memberId), eq(membersTable.organizationId, params.data.id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  const [memberUser] = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId)).limit(1);
  res.json(UpdateMemberResponse.parse({ ...updated, user: memberUser }));
});

router.delete("/organizations/:id/members/:memberId", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = (req as any).clerkUserId as string;
  const currentUser = await getOrCreateUser(clerkUserId);

  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawMemberId = Array.isArray(req.params.memberId) ? req.params.memberId[0] : req.params.memberId;

  const params = RemoveMemberParams.safeParse({ id: Number(rawId), memberId: Number(rawMemberId) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const access = await assertMembership(currentUser.id, params.data.id, ["owner", "admin"]);
  if (!access) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [deleted] = await db
    .delete(membersTable)
    .where(and(eq(membersTable.id, params.data.memberId), eq(membersTable.organizationId, params.data.id)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
