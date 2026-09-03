import type { Request, Response, NextFunction } from "express";
import { eq, and } from "drizzle-orm";
import { db, membersTable } from "@workspace/db";
import { getOrCreateUser } from "../lib/auth";
import { requireExercise, requireWritableExercise } from "../lib/exercise";

type MemberRole = "owner" | "admin" | "member" | "viewer";

function parseId(raw: string | string[] | undefined): number | null {
  if (raw == null) return null;
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Validates the `:orgId` route param and checks that the authenticated
 * Clerk user is a member of that organization. On success, attaches
 * `req.orgId` and `req.userId` (the local user id) for downstream
 * middleware/handlers. Must run after `requireAuth`.
 *
 * This is the single place org membership is checked — route handlers
 * should never re-implement this check.
 */
export async function requireOrgMembership(req: Request, res: Response, next: NextFunction): Promise<void> {
  const orgId = parseId(req.params.orgId);
  if (!orgId) {
    res.status(400).json({ error: "Invalid organization id" });
    return;
  }
  const user = await getOrCreateUser(req.clerkUserId!);
  // Superadmins can access any organization without being a member.
  if (!user.isSuperAdmin) {
    const [membership] = await db
      .select({ id: membersTable.id })
      .from(membersTable)
      .where(and(
        eq(membersTable.organizationId, orgId),
        eq(membersTable.userId, user.id),
        eq(membersTable.status, "active"),
      ))
      .limit(1);
    if (!membership) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }
  req.orgId = orgId;
  req.userId = user.id;
  next();
}

async function requireActiveOrganizationAccess(
  req: Request,
  res: Response,
  next: NextFunction,
  allowedRoles?: MemberRole[],
): Promise<void> {
  const orgId = parseId(req.params.orgId);
  if (!orgId) {
    res.status(400).json({ error: "Invalid organization id" });
    return;
  }

  const user = await getOrCreateUser(req.clerkUserId!);
  // Superadmins retain their cross-organization access for support operations.
  if (!user.isSuperAdmin) {
    const [membership] = await db
      .select({ role: membersTable.role })
      .from(membersTable)
      .where(and(
        eq(membersTable.organizationId, orgId),
        eq(membersTable.userId, user.id),
        eq(membersTable.status, "active"),
      ))
      .limit(1);

    if (!membership || (allowedRoles && !allowedRoles.includes(membership.role as MemberRole))) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  req.orgId = orgId;
  req.userId = user.id;
  next();
}

/** Requires an active organization member. Use for private read routes. */
export async function requireActiveOrgMembership(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireActiveOrganizationAccess(req, res, next);
}

/** Requires an active member with permission to change organization data. */
export async function requireWritableOrgMembership(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireActiveOrganizationAccess(req, res, next, ["owner", "admin", "member"]);
}

/**
 * Same as `requireOrgMembership`, but additionally restricts access to the
 * given member roles. Use this (not `requireMembership`, which reads
 * `:id`) on any `:orgId`-based route that needs role gating, e.g. the
 * exercise create/close/delete endpoints (owner/admin only).
 */
export function requireOrgRole(allowedRoles: MemberRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await requireActiveOrganizationAccess(req, res, next, allowedRoles);
  };
}

/**
 * Resolves the active exercise for `req.orgId` and attaches it as
 * `req.exercise`. Must run after `requireOrgMembership`. Use for read
 * routes; use `requireWritableExerciseScope` for any route that mutates
 * data.
 */
export async function requireExerciseScope(req: Request, res: Response, next: NextFunction): Promise<void> {
  const exercise = await requireExercise(req.orgId!, req, res);
  if (!exercise) return;
  req.exercise = exercise;
  next();
}

/**
 * Same as `requireExerciseScope`, but also enforces that the exercise is
 * writable (status "active"). Use on every create/update/delete route.
 */
export async function requireWritableExerciseScope(req: Request, res: Response, next: NextFunction): Promise<void> {
  const exercise = await requireWritableExercise(req.orgId!, req, res);
  if (!exercise) return;
  req.exercise = exercise;
  next();
}
