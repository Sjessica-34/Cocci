import { eq, and } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import { db, membersTable } from "@workspace/db";
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

    const [membership] = await db
      .select()
      .from(membersTable)
      .where(
        and(
          eq(membersTable.userId, user.id),
          eq(membersTable.organizationId, orgId),
          eq(membersTable.status, "active"),
        ),
      )
      .limit(1);

    if (!membership || !allowedRoles.includes(membership.role as MemberRole)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    req.currentUser = user;
    req.membership = membership;
    next();
  };
}
