import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import {
  db,
  organizationsTable,
  exercisesTable,
  documentExerciseLinksTable,
  bioDependenciesTable,
  bioConnectionsTable,
  bioIssuesTable,
  EXERCISE_SCOPED_TABLES,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOrgMembership, requireOrgRole } from "../middlewares/exerciseScope";
import { ListExercisesResponse, AdvanceExerciseResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return Number(Array.isArray(raw) ? raw[0] : raw);
}

/** Structural type matching both `db` and a `db.transaction` callback's `tx`. */
type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

router.get(
  "/organizations/:orgId/exercises",
  requireAuth,
  requireOrgMembership,
  async (req, res): Promise<void> => {
    const orgId = parseId(req.params.orgId as string);
    const rows = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.organizationId, orgId))
      .orderBy(desc(exercisesTable.year));
    res.json(ListExercisesResponse.parse(rows));
  },
);

/**
 * Duplicates every business table's rows from `fromExerciseId` into a brand
 * new `toExerciseId`, generating new ids. Documents are never duplicated —
 * only their document_exercise_links rows are re-created for the new
 * exercise, per module design (documents remain a single physical file).
 *
 * The set of tables duplicated comes from the shared
 * `EXERCISE_SCOPED_TABLES` registry (`lib/db/src/exerciseTables.ts`) — a
 * future business table only needs to be added there, once, to be
 * included in duplication, backfill, and verification alike.
 *
 * Runs against whatever `dbClient` is passed in (the module `db`, or a
 * `db.transaction` callback's `tx`), so callers can make the whole
 * close+create+duplicate sequence atomic.
 */
async function duplicateExerciseData(
  dbClient: DbClient,
  orgId: number,
  fromExerciseId: number,
  toExerciseId: number,
): Promise<void> {
  // Registered once in lib/db/src/exerciseTables.ts and shared with the
  // backfill/verify scripts — a future module only needs to add itself
  // there to be included in duplication automatically.
  const tables = EXERCISE_SCOPED_TABLES.map((entry) => entry.table);

  // bio_connections references bio_dependencies rows by id, so it must be
  // remapped after bio_dependencies has been duplicated. We handle it last
  // and rebuild the id mapping in-between.
  const bioDependencyIdMap = new Map<number, number>();

  for (const table of tables) {
    const rows = await dbClient
      .select()
      .from(table)
      .where(and(eq(table.organizationId, orgId), eq(table.exerciseId, fromExerciseId)));

    if (rows.length === 0) continue;

    if (table === bioConnectionsTable) {
      for (const row of rows as (typeof bioConnectionsTable.$inferSelect)[]) {
        const { id, fromElementId, toElementId, ...rest } = row;
        const newFrom = bioDependencyIdMap.get(fromElementId);
        const newTo = bioDependencyIdMap.get(toElementId);
        if (!newFrom || !newTo) continue; // dependency wasn't duplicated (shouldn't happen)
        await dbClient.insert(bioConnectionsTable).values({
          ...rest,
          organizationId: orgId,
          exerciseId: toExerciseId,
          fromElementId: newFrom,
          toElementId: newTo,
        });
      }
      continue;
    }

    if (table === bioIssuesTable) {
      for (const row of rows as (typeof bioIssuesTable.$inferSelect)[]) {
        const { id, dependencyIds, ...rest } = row;
        let remappedDependencyIds = dependencyIds;
        if (dependencyIds) {
          try {
            const ids = JSON.parse(dependencyIds) as number[];
            remappedDependencyIds = JSON.stringify(
              ids.map((depId) => bioDependencyIdMap.get(depId)).filter((depId): depId is number => depId != null),
            );
          } catch {
            remappedDependencyIds = dependencyIds;
          }
        }
        await dbClient.insert(bioIssuesTable).values({
          ...rest,
          organizationId: orgId,
          exerciseId: toExerciseId,
          dependencyIds: remappedDependencyIds,
        });
      }
      continue;
    }

    for (const row of rows as Record<string, unknown>[]) {
      const { id, ...rest } = row;
      const [inserted] = await dbClient
        .insert(table)
        .values({ ...rest, organizationId: orgId, exerciseId: toExerciseId } as never)
        .returning();
      if (table === bioDependenciesTable && inserted) {
        bioDependencyIdMap.set(id as number, (inserted as { id: number }).id);
      }
    }
  }

  // Re-link existing documents (no file duplication) that were attached to
  // the previous exercise.
  const previousLinks = await dbClient
    .select()
    .from(documentExerciseLinksTable)
    .where(eq(documentExerciseLinksTable.exerciseId, fromExerciseId));

  for (const link of previousLinks) {
    await dbClient.insert(documentExerciseLinksTable).values({
      documentId: link.documentId,
      exerciseId: toExerciseId,
    });
  }
}

/**
 * The ONLY way an exercise is ever closed or created. Replaces the former
 * free-form create/close/reopen/delete endpoints entirely: the user never
 * chooses a year or triggers those steps individually. This single atomic
 * operation:
 *   1. Resolves the organization's current "active" exercise.
 *   2. Refuses if the current month is before the organization's
 *      configured `exerciseOpeningMonth` (default December).
 *   3. Closes the current exercise and creates `year + 1` as the new
 *      active one, inside a DB transaction — plus the DB-level partial
 *      unique index on `exercises` guarantees at most one active exercise
 *      per organization even under concurrent requests.
 *   4. Duplicates all business data and re-links (never duplicates)
 *      documents into the new exercise.
 *
 * Deleting an exercise is intentionally not exposed here or anywhere in
 * the user-facing API surface — reserved for a future system admin tool.
 */
router.post(
  "/organizations/:orgId/exercises/advance",
  requireAuth,
  requireOrgRole(["owner", "admin"]),
  async (req, res): Promise<void> => {
    const orgId = parseId(req.params.orgId as string);

    const [org] = await db
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.id, orgId))
      .limit(1);
    if (!org) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }

    const currentMonth = new Date().getMonth() + 1; // 1-12
    if (currentMonth < org.exerciseOpeningMonth) {
      res.status(409).json({
        error: `La création du nouvel exercice n'est possible qu'à partir du mois ${org.exerciseOpeningMonth}`,
      });
      return;
    }

    const [current] = await db
      .select()
      .from(exercisesTable)
      .where(and(eq(exercisesTable.organizationId, orgId), eq(exercisesTable.status, "active")))
      .limit(1);
    if (!current) {
      res.status(409).json({ error: "Aucun exercice en cours pour cette organisation" });
      return;
    }

    const nextYear = current.year + 1;
    const [existingNext] = await db
      .select({ id: exercisesTable.id })
      .from(exercisesTable)
      .where(and(eq(exercisesTable.organizationId, orgId), eq(exercisesTable.year, nextYear)))
      .limit(1);
    if (existingNext) {
      res.status(409).json({ error: `Un exercice existe déjà pour l'année ${nextYear}` });
      return;
    }

    const created = await db.transaction(async (tx) => {
      await tx
        .update(exercisesTable)
        .set({ status: "closed", updatedAt: new Date() })
        .where(eq(exercisesTable.id, current.id));

      const [createdExercise] = await tx
        .insert(exercisesTable)
        .values({ organizationId: orgId, year: nextYear, status: "active" })
        .returning();

      await duplicateExerciseData(tx, orgId, current.id, createdExercise.id);

      return createdExercise;
    });

    res.status(201).json(AdvanceExerciseResponse.parse(created));
  },
);

export default router;
