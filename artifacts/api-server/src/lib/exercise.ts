import { eq, and, desc, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import type { Request, Response } from "express";
import { db, exercisesTable, organizationsTable } from "@workspace/db";
import type { Exercise } from "@workspace/db";

/** Returns the parentId of an org, or null if it is a root org. */
async function getParentOrgId(orgId: number): Promise<number | null> {
  const [row] = await db
    .select({ parentId: organizationsTable.parentId })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, orgId))
    .limit(1);
  return row?.parentId ?? null;
}

/**
 * Resolves the active exercise for a given organization + request.
 *
 * The frontend transmits the active exercise via the `X-Exercise-Id` header.
 * When absent (or invalid), falls back to the most recent exercise for the
 * organization so legacy/non-migrated clients keep working.
 *
 * Subsidiary orgs inherit the parent org's exercise: when no exercise is found
 * for `orgId` (or the header exercise doesn't match), the parent org is tried.
 * This allows subsidiary-scoped modules to work with the group's exercise.
 *
 * This is the single source of truth for exercise resolution — route
 * handlers should never read organizationId-only data without also scoping
 * by the exercise returned here.
 */
export async function resolveExercise(orgId: number, req: Request): Promise<Exercise | null> {
  const headerVal = req.header("x-exercise-id");
  if (headerVal) {
    const exId = Number(headerVal);
    if (!Number.isFinite(exId) || exId <= 0) return null;
    const [ex] = await db
      .select()
      .from(exercisesTable)
      .where(and(eq(exercisesTable.id, exId), eq(exercisesTable.organizationId, orgId)))
      .limit(1);
    if (ex) return ex;
    // Header exercise doesn't belong to orgId — try parent org (subsidiary inherits group's exercise)
    const parentId = await getParentOrgId(orgId);
    if (parentId) {
      const [parentEx] = await db
        .select()
        .from(exercisesTable)
        .where(and(eq(exercisesTable.id, exId), eq(exercisesTable.organizationId, parentId)))
        .limit(1);
      if (parentEx) return parentEx;
    }
    return null;
  }

  // No header: find latest exercise for orgId
  const [ex] = await db
    .select()
    .from(exercisesTable)
    .where(eq(exercisesTable.organizationId, orgId))
    .orderBy(desc(exercisesTable.year))
    .limit(1);
  if (ex) return ex;

  // No exercise for orgId — try parent org (subsidiary inherits group's exercise)
  const parentId = await getParentOrgId(orgId);
  if (parentId) {
    const [parentEx] = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.organizationId, parentId))
      .orderBy(desc(exercisesTable.year))
      .limit(1);
    return parentEx ?? null;
  }

  return null;
}

/** An exercise is writable only while its status is "active" ("En cours"). */
export function isExerciseWritable(exercise: Exercise): boolean {
  return exercise.status === "active";
}

/**
 * Standardized error responses for route handlers dealing with exercises.
 * Kept centralized so every module reports exercise errors identically.
 */
export const EXERCISE_NOT_FOUND = { error: "Exercise not found" } as const;
export const EXERCISE_CLOSED = { error: "Cet exercice est clôturé et en lecture seule" } as const;

/**
 * Convenience wrapper for route handlers: resolves the exercise and, if
 * missing, writes the standardized 400 response itself. Returns `null` in
 * that case so callers can simply `if (!exercise) return;`.
 *
 * This is the preferred entry point for read routes — use
 * `requireWritableExercise` instead for any route that mutates data.
 */
export async function requireExercise(orgId: number, req: Request, res: Response): Promise<Exercise | null> {
  const exercise = await resolveExercise(orgId, req);
  if (!exercise) {
    res.status(400).json(EXERCISE_NOT_FOUND);
    return null;
  }
  return exercise;
}

/**
 * Same as `requireExercise`, but also enforces that the exercise is
 * writable (status "active"), writing the standardized 403 response
 * otherwise. Use this in every create/update/delete route.
 */
export async function requireWritableExercise(orgId: number, req: Request, res: Response): Promise<Exercise | null> {
  const exercise = await requireExercise(orgId, req, res);
  if (!exercise) return null;
  if (!isExerciseWritable(exercise)) {
    res.status(403).json(EXERCISE_CLOSED);
    return null;
  }
  return exercise;
}

/**
 * Shape every exercise-scoped business table follows: an `organizationId`
 * FK plus an `exerciseId` FK. All 13 business tables introduced for the
 * "Exercice Annuel" feature share this shape by convention.
 */
type ScopedTable = PgTable & { organizationId: PgColumn; exerciseId: PgColumn };

/**
 * Builds the standard `WHERE organization_id = ... AND exercise_id = ...`
 * clause for a scoped table, using the org/exercise already attached to the
 * request by `requireOrgMembership` + `requireExerciseScope` (see
 * `middlewares/exerciseScope.ts`). Pass `extra` to AND in additional
 * conditions (e.g. matching a specific row id).
 *
 * This is the single place that knows how business rows are scoped — new
 * modules should use this instead of writing their own `eq(...)` pairs.
 */
export function scopeToExercise<T extends ScopedTable>(table: T, req: Request, extra?: SQL): SQL {
  if (req.orgId == null || req.exercise == null) {
    throw new Error("scopeToExercise called before requireOrgMembership/requireExerciseScope middleware ran");
  }
  const base = and(eq(table.organizationId, req.orgId), eq(table.exerciseId, req.exercise.id));
  return extra ? and(base, extra)! : base!;
}

/**
 * Stamps `organizationId`/`exerciseId` from the request's resolved scope
 * onto an insert payload, so modules never have to thread `orgId`/
 * `exercise.id` through their own insert calls by hand.
 */
export function withExerciseValues<T extends Record<string, unknown>>(
  req: Request,
  values: T,
): T & { organizationId: number; exerciseId: number } {
  if (req.orgId == null || req.exercise == null) {
    throw new Error("withExerciseValues called before requireOrgMembership/requireExerciseScope middleware ran");
  }
  return { ...values, organizationId: req.orgId, exerciseId: req.exercise.id };
}
