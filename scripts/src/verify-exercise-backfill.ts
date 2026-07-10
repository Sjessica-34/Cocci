/**
 * PHASE 3 of the "Exercice Annuel" rollout — verification gate.
 *
 * Run after `backfill-exercises` (phase 2) and BEFORE restoring
 * `.notNull()` on `exerciseId` in the schema + re-running `db push`.
 *
 * Checks:
 *   1. Every business table has zero rows with a NULL `exerciseId`.
 *   2. Every document has at least one `document_exercise_links` row
 *      (documents are exercise-scoped only via that join table).
 *
 * Exits 0 and prints "OK" when the database is safe to enforce NOT NULL
 * against. Exits 1 and lists every offending table/count otherwise — do
 * NOT proceed to the NOT NULL migration step until this passes.
 *
 * Run with: pnpm --filter @workspace/scripts run verify-exercise-backfill
 */
import { isNull, count } from "drizzle-orm";
import { db, documentsTable, documentExerciseLinksTable, EXERCISE_SCOPED_TABLES } from "@workspace/db";

// Shared with `duplicateExerciseData` (exercises.ts) and
// `backfill-exercises.ts` — see lib/db/src/exerciseTables.ts. A future
// business table only needs to be registered there, once.
const BUSINESS_TABLES = EXERCISE_SCOPED_TABLES;

async function main() {
  let failed = false;

  for (const { name, table } of BUSINESS_TABLES) {
    const [{ value }] = await db.select({ value: count() }).from(table).where(isNull(table.exerciseId));
    if (value > 0) {
      failed = true;
      console.error(`FAIL: ${name} has ${value} row(s) with NULL exercise_id`);
    }
  }

  const [{ value: totalDocs }] = await db.select({ value: count() }).from(documentsTable);
  const linkedDocIds = new Set(
    (await db.select({ documentId: documentExerciseLinksTable.documentId }).from(documentExerciseLinksTable)).map(
      (l) => l.documentId,
    ),
  );
  const orphanDocs = totalDocs - linkedDocIds.size <= 0
    ? 0
    : (await db.select({ id: documentsTable.id }).from(documentsTable)).filter((d) => !linkedDocIds.has(d.id)).length;

  if (orphanDocs > 0) {
    failed = true;
    console.error(`FAIL: ${orphanDocs} document(s) have no document_exercise_links row`);
  }

  if (failed) {
    console.error(
      "\nDo NOT restore `.notNull()` on exerciseId yet. Run `pnpm --filter @workspace/scripts run backfill-exercises` again first.",
    );
    process.exit(1);
  }

  console.log("OK: every business row has an exercise_id and every document is linked. Safe to enforce NOT NULL.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Verification failed to run:", err);
    process.exit(1);
  });
