import { eq, and, isNull, sql } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import { db, membersTable, organizationsTable } from "@workspace/db";
import { getOrCreateUser } from "../lib/auth";

type MemberRole = "owner" | "admin" | "member" | "viewer";

/**
 * Middleware factory — verifies the authenticated user is a member of the
 * organization identified by :id in the route params, and that their role
 * is among the allowed roles.
 *
 * Prerequisites: requireAuth must run before this middleware (sets req.clerkUserId).
 *
 * Side effects: attaches req.currentUser and req.membership to the request
 * so route handlers don't need to re-query them.
 *
 * Usage:
 *   router.get("/organizations/:id/...", requireAuth, requireMembership(["owner","admin"]), handler)
 */
export function requireMembership(allowedRoles: MemberRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const orgId = Number(rawId);

    if (!rawId || Number.isNaN(orgId) || orgId <= 0) {
      res.status(400).json({ error: "Invalid organization id" });
      return;
    }

    const clerkUserId = req.clerkUserId!;
    const user = await getOrCreateUser(clerkUserId);

    // Superadmins bypass the membership check entirely.
    if (!user.isSuperAdmin) {
      const [row] = await db
        .select({ membership: membersTable })
        .from(membersTable)
        .innerJoin(organizationsTable, eq(membersTable.organizationId, organizationsTable.id))
        .where(and(
          eq(membersTable.userId, user.id),
          eq(membersTable.status, "active"),
          isNull(membersTable.archivedAt),
          sql`(${membersTable.organizationId} = ${orgId} OR (${organizationsTable.id} = ${orgId} AND ${organizationsTable.parentId} = ${user.primaryOrganizationId}))`,
        ))
        .limit(1);
      const membership = row?.membership;

      if (!membership || !allowedRoles.includes(membership.role as MemberRole)) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      req.membership = membership;
    }

    req.currentUser = user;
    next();
  };
}
