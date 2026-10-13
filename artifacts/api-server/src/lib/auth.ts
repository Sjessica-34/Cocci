import { and, eq, isNull, like, sql } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import { db, membersTable, onboardingProgressTable, usersTable } from "@workspace/db";
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

    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const email = (
      clerkUser.primaryEmailAddress?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress ??
      `${clerkUserId}@pending.local`
    ).trim().toLowerCase();
    const [pendingInvite] = await tx
      .select({ user: usersTable, member: membersTable })
      .from(usersTable)
      .innerJoin(membersTable, eq(membersTable.userId, usersTable.id))
      .where(and(
        eq(usersTable.email, email),
        like(usersTable.clerkId, "invited_%"),
        eq(membersTable.status, "invited"),
        isNull(membersTable.archivedAt),
      ))
      .limit(1);

    if (pendingInvite) {
      const [accepted] = await tx
        .update(usersTable)
        .set({
          clerkId: clerkUserId,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          avatarUrl: clerkUser.imageUrl,
          primaryOrganizationId: pendingInvite.member.organizationId,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, pendingInvite.user.id))
        .returning();
      await tx
        .update(membersTable)
        .set({ status: "active" })
        .where(eq(membersTable.id, pendingInvite.member.id));
      await tx
        .insert(onboardingProgressTable)
        .values({ userId: accepted.id })
        .onConflictDoNothing({ target: onboardingProgressTable.userId });
      return accepted;
    }

    const [created] = await tx
      .insert(usersTable)
      .values({
        clerkId: clerkUserId,
        email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        avatarUrl: clerkUser.imageUrl,
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
