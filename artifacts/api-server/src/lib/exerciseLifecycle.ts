import { randomUUID } from "node:crypto";
import { and, count, desc, eq, sql } from "drizzle-orm";
import {
  db,
  organizationsTable,
  exercisesTable,
  documentExerciseLinksTable,
  bioDependenciesTable,
  bioConnectionsTable,
  bioIssuesTable,
  carbonBilansTable,
  captationCarboneTable,
  publicLinksTable,
  rseReportDraftsTable,
  EXERCISE_RESET_TABLES,
  EXERCISE_SCOPED_TABLES,
} from "@workspace/db";
import type { Exercise } from "@workspace/db";
import { logger } from "./logger";

export const EXERCISE_TIME_ZONE = "Europe/Paris";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type ExerciseTransitionMode = "scheduled" | "recovery" | "manual";

export interface ExerciseTransitionOptions {
  now?: Date;
  targetYear?: number;
  mode?: ExerciseTransitionMode;
}

export interface ExerciseDuplicationCheck {
  table: string;
  sourceCount: number;
  targetCount: number;
  strategy: "duplicate" | "reset" | "link";
}

function zonedDateParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: EXERCISE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return { year: value("year"), month: value("month"), day: value("day") };
}

export function currentExerciseYear(now = new Date()): number {
  return zonedDateParts(now).year;
}

export function isExerciseGraceOpen(exerciseYear: number, now = new Date()): boolean {
  const current = zonedDateParts(now);
  const cutoffYear = exerciseYear + 1;
  if (current.year < cutoffYear) return true;
  if (current.year > cutoffYear) return false;
  return current.month < 3;
}

function lifecycleStatus(exerciseYear: number, activeYear: number, now: Date): "active" | "grace" | "closed" {
  if (exerciseYear === activeYear) return "active";
  if (exerciseYear === activeYear - 1 && isExerciseGraceOpen(exerciseYear, now)) return "grace";
  return "closed";
}

async function rowCount(
  dbClient: DbClient,
  table: (typeof EXERCISE_SCOPED_TABLES)[number]["table"],
  orgId: number,
  exerciseId: number,
): Promise<number> {
  const [result] = await dbClient
    .select({ value: count() })
    .from(table)
    .where(and(eq(table.organizationId, orgId), eq(table.exerciseId, exerciseId)));
  return Number(result?.value ?? 0);
}

/**
 * Copies a complete annual snapshot. It is only called for a brand-new target
 * exercise inside the same transaction that creates it, so a failed copy
 * cannot leave a partially populated year behind.
 */
export async function duplicateExerciseData(
  dbClient: DbClient,
  orgId: number,
  fromExerciseId: number,
  toExerciseId: number,
): Promise<ExerciseDuplicationCheck[]> {
  const checks: ExerciseDuplicationCheck[] = [];
  const bioDependencyIdMap = new Map<number, number>();
  const [targetExercise] = await dbClient
    .select({ year: exercisesTable.year })
    .from(exercisesTable)
    .where(and(
      eq(exercisesTable.id, toExerciseId),
      eq(exercisesTable.organizationId, orgId),
    ))
    .limit(1);
  if (!targetExercise) throw new Error("Target exercise not found");

  for (const entry of EXERCISE_SCOPED_TABLES) {
    const { table } = entry;
    const rows = await dbClient
      .select()
      .from(table)
      .where(and(eq(table.organizationId, orgId), eq(table.exerciseId, fromExerciseId)));

    if (entry.remap === "bioConnections") {
      for (const row of rows as (typeof bioConnectionsTable.$inferSelect)[]) {
        const { id: _id, fromElementId, toElementId, ...rest } = row;
        const newFrom = bioDependencyIdMap.get(fromElementId);
        const newTo = bioDependencyIdMap.get(toElementId);
        if (!newFrom || !newTo) {
          throw new Error("Impossible de remapper une connexion biodiversité");
        }
        await dbClient.insert(bioConnectionsTable).values({
          ...rest,
          organizationId: orgId,
          exerciseId: toExerciseId,
          fromElementId: newFrom,
          toElementId: newTo,
        });
      }
    } else if (entry.remap === "bioIssues") {
      for (const row of rows as (typeof bioIssuesTable.$inferSelect)[]) {
        const { id: _id, dependencyIds, ...rest } = row;
        let remappedDependencyIds = dependencyIds;
        if (dependencyIds) {
          const ids = JSON.parse(dependencyIds) as number[];
          const remapped = ids.map((depId) => {
            const newId = bioDependencyIdMap.get(depId);
            if (!newId) throw new Error("Impossible de remapper un enjeu biodiversité");
            return newId;
          });
          remappedDependencyIds = JSON.stringify(remapped);
        }
        await dbClient.insert(bioIssuesTable).values({
          ...rest,
          organizationId: orgId,
          exerciseId: toExerciseId,
          dependencyIds: remappedDependencyIds,
        });
      }
    } else if (entry.remap === "publicLinks") {
      for (const row of rows as (typeof publicLinksTable.$inferSelect)[]) {
        const { id: _id, token: _token, createdAt: _createdAt, ...rest } = row;
        await dbClient.insert(publicLinksTable).values({
          ...rest,
          organizationId: orgId,
          exerciseId: toExerciseId,
          token: randomUUID(),
        });
      }
    } else if (entry.remap === "rseReportDrafts") {
      for (const row of rows as (typeof rseReportDraftsTable.$inferSelect)[]) {
        const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = row;
        await dbClient.insert(rseReportDraftsTable).values({
          ...rest,
          organizationId: orgId,
          exerciseId: toExerciseId,
          generationCount: 0,
          generationYear: 0,
        });
      }
    } else {
      for (const row of rows as Record<string, unknown>[]) {
        const { id, ...rest } = row;
        const annualValues =
          table === carbonBilansTable || table === captationCarboneTable
            ? { ...rest, year: targetExercise.year }
            : rest;
        const [inserted] = await dbClient
          .insert(table)
          .values({ ...annualValues, organizationId: orgId, exerciseId: toExerciseId } as never)
          .returning();
        if (table === bioDependenciesTable && inserted) {
          bioDependencyIdMap.set(id as number, (inserted as { id: number }).id);
        }
      }
    }

    const targetCount = await rowCount(dbClient, table, orgId, toExerciseId);
    if (targetCount !== rows.length) {
      throw new Error(
        `Duplication incomplète pour ${entry.name}: ${targetCount}/${rows.length}`,
      );
    }
    checks.push({
      table: entry.name,
      sourceCount: rows.length,
      targetCount,
      strategy: "duplicate",
    });
  }

  for (const entry of EXERCISE_RESET_TABLES) {
    const [source] = await dbClient
      .select({ value: count() })
      .from(entry.table)
      .where(and(eq(entry.table.organizationId, orgId), eq(entry.table.exerciseId, fromExerciseId)));
    const [target] = await dbClient
      .select({ value: count() })
      .from(entry.table)
      .where(and(eq(entry.table.organizationId, orgId), eq(entry.table.exerciseId, toExerciseId)));
    if (Number(target?.value ?? 0) !== 0) {
      throw new Error(`La table ${entry.name} devait être réinitialisée`);
    }
    checks.push({
      table: entry.name,
      sourceCount: Number(source?.value ?? 0),
      targetCount: 0,
      strategy: "reset",
    });
  }

  const previousLinks = await dbClient
    .select()
    .from(documentExerciseLinksTable)
    .where(eq(documentExerciseLinksTable.exerciseId, fromExerciseId));

  if (previousLinks.length > 0) {
    await dbClient.insert(documentExerciseLinksTable).values(
      previousLinks.map((link) => ({
        documentId: link.documentId,
        exerciseId: toExerciseId,
      })),
    );
  }

  const [targetLinks] = await dbClient
    .select({ value: count() })
    .from(documentExerciseLinksTable)
    .where(eq(documentExerciseLinksTable.exerciseId, toExerciseId));
  if (Number(targetLinks?.value ?? 0) !== previousLinks.length) {
    throw new Error("Duplication incomplète des liaisons de documents");
  }
  checks.push({
    table: "document_exercise_links",
    sourceCount: previousLinks.length,
    targetCount: Number(targetLinks?.value ?? 0),
    strategy: "link",
  });

  return checks;
}

/**
 * Ensures one organization has a complete annual lifecycle up to targetYear.
 * The advisory transaction lock, organization/year uniqueness and atomic copy
 * make scheduled, recovery and manual calls share exactly the same safe path.
 */
export async function ensureAnnualLifecycle(
  orgId: number,
  options: ExerciseTransitionOptions = {},
): Promise<Exercise> {
  const now = options.now ?? new Date();
  const requestedYear = options.targetYear ?? currentExerciseYear(now);
  if (!Number.isInteger(requestedYear) || requestedYear < 2000 || requestedYear > 2200) {
    throw new Error("Invalid target exercise year");
  }

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${orgId})`);

    const [organization] = await tx
      .select({ id: organizationsTable.id })
      .from(organizationsTable)
      .where(eq(organizationsTable.id, orgId))
      .limit(1);
    if (!organization) throw new Error("Organization not found");

    let exercises = await tx
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.organizationId, orgId))
      .orderBy(desc(exercisesTable.year));

    if (exercises.length === 0) {
      const [created] = await tx
        .insert(exercisesTable)
        .values({ organizationId: orgId, year: requestedYear, status: "active" })
        .returning();
      return created;
    }

    let latest = exercises[0];
    const finalYear = Math.max(requestedYear, latest.year);

    while (latest.year < finalYear) {
      const nextYear = latest.year + 1;
      await tx
        .update(exercisesTable)
        .set({
          status: isExerciseGraceOpen(latest.year, now) ? "grace" : "closed",
          updatedAt: now,
        })
        .where(eq(exercisesTable.id, latest.id));

      const [created] = await tx
        .insert(exercisesTable)
        .values({ organizationId: orgId, year: nextYear, status: "active" })
        .returning();
      await duplicateExerciseData(tx, orgId, latest.id, created.id);
      latest = created;
    }

    exercises = await tx
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.organizationId, orgId))
      .orderBy(desc(exercisesTable.year));
    latest = exercises[0];

    for (const exercise of exercises) {
      const expected = lifecycleStatus(exercise.year, latest.year, now);
      if (exercise.status !== expected) {
        await tx
          .update(exercisesTable)
          .set({ status: expected, updatedAt: now })
          .where(eq(exercisesTable.id, exercise.id));
      }
    }

    logger.info(
      { orgId, activeYear: latest.year, mode: options.mode ?? "recovery" },
      "Annual exercise lifecycle ensured",
    );

    return { ...latest, status: "active", updatedAt: now };
  });
}

export async function ensureAnnualLifecycleIfNeeded(orgId: number, now = new Date()): Promise<void> {
  const exercises = await db
    .select()
    .from(exercisesTable)
    .where(eq(exercisesTable.organizationId, orgId))
    .orderBy(desc(exercisesTable.year));
  const desiredYear = Math.max(currentExerciseYear(now), exercises[0]?.year ?? 0);
  const lifecycleIsCurrent =
    exercises.length > 0 &&
    exercises.every(
      (exercise) => exercise.status === lifecycleStatus(exercise.year, desiredYear, now),
    );
  if (!lifecycleIsCurrent) {
    await ensureAnnualLifecycle(orgId, { now, mode: "recovery" });
  }
}

export async function ensureAllOrganizationsAnnualLifecycle(now = new Date()): Promise<void> {
  const organizations = await db.select({ id: organizationsTable.id }).from(organizationsTable);
  for (const organization of organizations) {
    try {
      await ensureAnnualLifecycle(organization.id, { now, mode: "scheduled" });
    } catch (error) {
      logger.error({ err: error, orgId: organization.id }, "Annual exercise maintenance failed");
    }
  }
}