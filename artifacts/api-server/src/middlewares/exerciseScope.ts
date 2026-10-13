import type { Request, Response, NextFunction } from "express";
import { eq, and, isNull, sql, or, exists } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, membersTable } from "@workspace/db";
import { organizationsTable } from "@workspace/db";
import { getOrCreateUser } from "../lib/auth";
import { requireExercise, requireWritableExercise } from "../lib/exercise";
import { logger } from "../lib/logger";
import {
  getOrganizationRoleDenial,
  type OrganizationMemberRole,
} from "../lib/organizationRolePolicy";

type MemberRole = OrganizationMemberRole;

function parseId(raw: string | string[] | undefined): number | null {
  if (raw == null) return null;
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function membershipScope(orgId: number, primaryOrganizationId: number | null) {
  const requestedOrganization = alias(organizationsTable, "requested_organization");
  return or(
    eq(membersTable.organizationId, orgId),
    exists(
      db
        .select({ id: requestedOrganization.id })
        .from(requestedOrganization)
        .where(and(
          eq(requestedOrganization.id, orgId),
          eq(requestedOrganization.parentId, membersTable.organizationId),
          primaryOrganizationId === null
            ? sql`false`
            : eq(membersTable.organizationId, primaryOrganizationId),
        )),
    ),
  );
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
        eq(membersTable.userId, user.id),
        eq(membersTable.status, "active"),
        isNull(membersTable.archivedAt),
          membershipScope(orgId, user.primaryOrganizationId),
      ))
      .limit(1);
    if (!membership) {
      res.status(403).json({ code: "ORGANIZATION_MEMBERSHIP_REQUIRED", error: "Forbidden" });
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
    res.status(400).json({ code: "INVALID_ORGANIZATION_ID", error: "Invalid organization id" });
    return;
  }

  const [organization] = await db
    .select({ id: organizationsTable.id, parentId: organizationsTable.parentId })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, orgId))
    .limit(1);
  if (!organization) {
    res.status(404).json({
      code: "ORGANIZATION_NOT_FOUND",
      error: "Organization not found",
      organizationId: orgId,
    });
    return;
  }

  const user = await getOrCreateUser(req.clerkUserId!);
  // Superadmins retain their cross-organization access for support operations.
  if (!user.isSuperAdmin) {
    const activeMembershipFilters = [
      eq(membersTable.userId, user.id),
      eq(membersTable.status, "active"),
      isNull(membersTable.archivedAt),
    ];
    const [directMembership] = await db
      .select({ role: membersTable.role })
      .from(membersTable)
      .where(and(
        ...activeMembershipFilters,
        eq(membersTable.organizationId, orgId),
      ))
      .limit(1);

    // Group administrators may manage a subsidiary only through their active
    // membership in its parent organization. Keep this lookup separate from
    // the direct membership lookup so either authorization path is observable.
    let membership = directMembership;
    if (
      !membership &&
      organization.parentId !== null &&
      organization.parentId === user.primaryOrganizationId
    ) {
      const [parentMembership] = await db
        .select({ role: membersTable.role })
        .from(membersTable)
        .where(and(
          ...activeMembershipFilters,
          eq(membersTable.organizationId, organization.parentId),
        ))
        .limit(1);
      membership = parentMembership;
    }

    const denial = getOrganizationRoleDenial(membership?.role ?? null, allowedRoles);
    if (denial === "ORGANIZATION_MEMBERSHIP_REQUIRED") {
      logger.warn({
        orgId,
        userId: user.id,
        primaryOrganizationId: user.primaryOrganizationId,
        parentOrganizationId: organization.parentId,
        requiredRoles: allowedRoles ?? null,
      }, "Organization access denied: active membership not found");
      res.status(403).json({
        code: denial,
        error: "An active membership in this organization is required.",
        organizationId: orgId,
      });
      return;
    }
    if (denial === "ORGANIZATION_ROLE_REQUIRED") {
      logger.warn({
        orgId,
        userId: user.id,
        primaryOrganizationId: user.primaryOrganizationId,
        role: membership?.role ?? null,
        requiredRoles: allowedRoles,
      }, "Organization access denied: member role is insufficient");
      res.status(403).json({
        code: denial,
        error: "Owner or administrator role is required.",
        requiredRoles: allowedRoles,
        organizationId: orgId,
      });
      return;
    }
    if (allowedRoles) {
      logger.info({
        orgId,
        userId: user.id,
        primaryOrganizationId: user.primaryOrganizationId,
        role: membership?.role ?? null,
        membershipScope: directMembership ? "direct" : "parent_organization",
        requiredRoles: allowedRoles,
      }, "Organization role access granted");
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
