import { and, eq, inArray } from "drizzle-orm";
import { db, organizationsTable, exercisesTable } from "@workspace/db";

/**
 * Returns the direct subsidiary org IDs for a given org.
 * Returns an empty array if the org has no subsidiaries (solo or leaf org).
 */
export async function getSubsidiaryIds(orgId: number): Promise<number[]> {
  const rows = await db
    .select({ id: organizationsTable.id })
    .from(organizationsTable)
    .where(eq(organizationsTable.parentId, orgId));
  return rows.map((r) => r.id);
}

/**
 * For a group org, returns { orgId, exerciseId } pairs for the given year.
 * Only includes subsidiaries that have an exercise matching that year.
 * Returns an empty array if the org has no subsidiaries.
 */
export async function getSubsidiaryExercises(
  orgId: number,
  year: number,
): Promise<Array<{ orgId: number; exerciseId: number }>> {
  const subIds = await getSubsidiaryIds(orgId);
  if (subIds.length === 0) return [];

  const exercises = await db
    .select({ organizationId: exercisesTable.organizationId, id: exercisesTable.id })
    .from(exercisesTable)
    .where(
      and(
        inArray(exercisesTable.organizationId, subIds),
        eq(exercisesTable.year, year),
      ),
    );

  return exercises.map((e) => ({ orgId: e.organizationId, exerciseId: e.id }));
}

/**
 * Sums an array of nullable numbers.
 * Returns null only if ALL values are null (no subsidiary entered data for this field).
 */
export function sumNullable(values: (number | null | undefined)[]): number | null {
  const defined = values.filter((v): v is number => v != null);
  return defined.length > 0 ? defined.reduce((a, b) => a + b, 0) : null;
}

/**
 * Returns true if any subsidiary has the boolean flag set to true.
 * Returns null if all values are null.
 */
export function anyTrue(values: (boolean | null | undefined)[]): boolean | null {
  const defined = values.filter((v): v is boolean => v != null);
  if (defined.length === 0) return null;
  return defined.some(Boolean);
}
