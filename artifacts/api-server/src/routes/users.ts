import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import {
  GetMeResponse,
  UpdateMeBody,
  UpdateMeResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

/**
 * JIT-provision the current user from Clerk if they don't exist yet.
 * Returns the local DB user record.
 */
async function getOrCreateUser(clerkUserId: string, email?: string, firstName?: string, lastName?: string, avatarUrl?: string) {
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkUserId))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(usersTable)
    .values({
      clerkId: clerkUserId,
      email: email ?? `${clerkUserId}@unknown.local`,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      avatarUrl: avatarUrl ?? null,
    })
    .returning();

  return created;
}

router.get("/users/me", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = (req as any).clerkUserId as string;
  const user = await getOrCreateUser(clerkUserId);
  res.json(GetMeResponse.parse(user));
});

router.patch("/users/me", requireAuth, async (req, res): Promise<void> => {
  const clerkUserId = (req as any).clerkUserId as string;

  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkUserId))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(usersTable.id, existing.id))
    .returning();

  res.json(UpdateMeResponse.parse(updated));
});

export { getOrCreateUser };
export default router;
