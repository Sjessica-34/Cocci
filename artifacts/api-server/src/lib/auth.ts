import { eq, sql } from "drizzle-orm";
import { db, onboardingProgressTable, usersTable } from "@workspace/db";
import type { User } from "@workspace/db";

type AuthTraceContext = {
  requestId: string | null;
  route: string;
};

/**
 * JIT-provision a user from Clerk on their first authenticated request.
 * If the user already exists in DB, returns the existing record.
 * This is the single source of truth for user provisioning — import from here,
 * never duplicate this logic in route files.
 */
export async function getOrCreateUser(
  clerkUserId: string,
  traceContext?: AuthTraceContext,
): Promise<User> {
  return db.transaction(async (tx) => {
    // Serialize first-request provisioning for the same Clerk identity. The
    // unique clerk_id constraint remains the final safety net.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${clerkUserId}))`);

    const [existing] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkId, clerkUserId))
      .limit(1);

    if (existing) {
      await tx
        .insert(onboardingProgressTable)
        .values({ userId: existing.id })
        .onConflictDoNothing({ target: onboardingProgressTable.userId });
      if (traceContext) {
        console.log("[auth-trace] getOrCreateUser retrieved existing user", {
          ...traceContext,
          clerkUserId,
          localUserId: existing.id,
          action: "retrieved",
        });
      }
      return existing;
    }

    const [created] = await tx
      .insert(usersTable)
      .values({
        clerkId: clerkUserId,
        email: `${clerkUserId}@pending.local`,
        firstName: null,
        lastName: null,
        avatarUrl: null,
      })
      .returning();

    await tx.insert(onboardingProgressTable).values({ userId: created.id });
    if (traceContext) {
      console.log("[auth-trace] getOrCreateUser created user", {
        ...traceContext,
        clerkUserId,
        localUserId: created.id,
        action: "created",
      });
    }
    return created;
  });
}
