import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import type { User } from "@workspace/db";

/**
 * JIT-provision a user from Clerk on their first authenticated request.
 * If the user already exists in DB, returns the existing record.
 * This is the single source of truth for user provisioning — import from here,
 * never duplicate this logic in route files.
 */
export async function getOrCreateUser(clerkUserId: string): Promise<User> {
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
      email: `${clerkUserId}@pending.local`,
      firstName: null,
      lastName: null,
      avatarUrl: null,
    })
    .returning();

  return created;
}
