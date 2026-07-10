import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import {
  db,
  membersTable,
  exercisesTable,
  documentExerciseLinksTable,
  bioDependenciesTable,
  bioConnectionsTable,
  bioIssuesTable,
  EXERCISE_SCOPED_TABLES,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOrgMembership, requireOrgRole } from "../middlewares/exerciseScope";
import {
  ListExercisesResponse,
  CreateExerciseBody,
  CreateExerciseResponse,
  UpdateExerciseStatusBody,
  UpdateExerciseStatusResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return Number(Array.isArray(raw) ? raw[0] : raw);
}

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
 */
async function duplicateExerciseData(orgId: number, fromExerciseId: number, toExerciseId: number): Promise<void> {
  // Registered once in lib/db/src/exerciseTables.ts and shared with the
  // backfill/verify scripts — a future module only needs to add itself
  // there to be included in duplication automatically.
  const tables = EXERCISE_SCOPED_TABLES.map((entry) => entry.table);

  // bio_connections references bio_dependencies rows by id, so it must be
  // remapped after bio_dependencies has been duplicated. We handle it last
  // and rebuild the id mapping in-between.
  const bioDependencyIdMap = new Map<number, number>();

  for (const table of tables) {
    const rows = await db
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
        await db.insert(bioConnectionsTable).values({
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
        await db.insert(bioIssuesTable).values({
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
      const [inserted] = await db
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
  const previousLinks = await db
    .select()
    .from(documentExerciseLinksTable)
    .where(eq(documentExerciseLinksTable.exerciseId, fromExerciseId));

  for (const link of previousLinks) {
    await db.insert(documentExerciseLinksTable).values({
      documentId: link.documentId,
      exerciseId: toExerciseId,
    });
  }
}

router.post(
  "/organizations/:orgId/exercises",
  requireAuth,
  requireOrgRole(["owner", "admin"]),
  async (req, res): Promise<void> => {
    const orgId = parseId(req.params.orgId as string);

    const parsed = CreateExerciseBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [existing] = await db
      .select({ id: exercisesTable.id })
      .from(exercisesTable)
      .where(and(eq(exercisesTable.organizationId, orgId), eq(exercisesTable.year, parsed.data.year)))
      .limit(1);
    if (existing) {
      res.status(409).json({ error: "Un exercice existe déjà pour cette année" });
      return;
    }

    const [previous] = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.organizationId, orgId))
      .orderBy(desc(exercisesTable.year))
      .limit(1);

    const [created] = await db
      .insert(exercisesTable)
      .values({ organizationId: orgId, year: parsed.data.year, status: "active" })
      .returning();

    if (parsed.data.duplicatePreviousData && previous) {
      await duplicateExerciseData(orgId, previous.id, created.id);
    }

    res.status(201).json(CreateExerciseResponse.parse(created));
  },
);

router.patch(
  "/organizations/:orgId/exercises/:id",
  requireAuth,
  requireOrgRole(["owner", "admin"]),
  async (req, res): Promise<void> => {
    const orgId = parseId(req.params.orgId as string);
    const id = parseId(req.params.id as string);

    const parsed = UpdateExerciseStatusBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [updated] = await db
      .update(exercisesTable)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(and(eq(exercisesTable.id, id), eq(exercisesTable.organizationId, orgId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Exercise not found" });
      return;
    }

    res.json(UpdateExerciseStatusResponse.parse(updated));
  },
);

router.delete(
  "/organizations/:orgId/exercises/:id",
  requireAuth,
  requireOrgRole(["owner", "admin"]),
  async (req, res): Promise<void> => {
    const orgId = parseId(req.params.orgId as string);
    const id = parseId(req.params.id as string);

    const [exercise] = await db
      .select()
      .from(exercisesTable)
      .where(and(eq(exercisesTable.id, id), eq(exercisesTable.organizationId, orgId)))
      .limit(1);

    if (!exercise) {
      res.status(404).json({ error: "Exercise not found" });
      return;
    }

    if (exercise.status !== "active") {
      res.status(409).json({ error: "Un exercice clôturé ne peut pas être supprimé" });
      return;
    }

    const others = await db
      .select({ id: exercisesTable.id })
      .from(exercisesTable)
      .where(eq(exercisesTable.organizationId, orgId));
    if (others.length <= 1) {
      res.status(409).json({ error: "Impossible de supprimer le dernier exercice de l'organisation" });
      return;
    }

    await db.delete(exercisesTable).where(eq(exercisesTable.id, id));
    res.status(204).end();
  },
);

export default router;
