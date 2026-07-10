/**
 * One-off, idempotent migration script for the "Exercice Annuel" rollout —
 * this is PHASE 2 of a mandatory two-phase rollout (see
 * `verify-exercise-backfill.ts` for phase 3). This repo has no formal
 * migration system (`drizzle push` is dev-only and non-transactional with
 * data), so the phases MUST be run as separate commands, in order:
 *
 *   PHASE 1 — schema, nullable:
 *     Run `lib/db/migrations/exercise-rollout/phase1_add_nullable.sql`
 *     against the target database (see that folder's README.md for the
 *     full runbook). This creates `exercises` / `document_exercise_links`
 *     and adds `exercise_id` to every business table as NULLABLE — safe on
 *     populated data, unlike a raw `drizzle push` of the already-NOT-NULL
 *     schema committed in `lib/db/src/schema/*.ts`.
 *
 *   PHASE 2 — backfill (this script):
 *     `pnpm --filter @workspace/scripts run backfill-exercises`
 *     For every organization: ensures an active "current year" exercise
 *     exists, links every pre-existing document to it via
 *     `document_exercise_links`, and backfills `exerciseId` on every
 *     business row that doesn't have one yet.
 *
 *   PHASE 3 — verify + enforce:
 *     `pnpm --filter @workspace/scripts run verify-exercise-backfill`
 *     Exits non-zero (and lists offending tables) if any row is still
 *     missing `exerciseId`. Only once it exits 0 should `exerciseId` be
 *     switched back to `.notNull()` in the schema and pushed again.
 *
 * Skipping phase 1 (pushing NOT NULL directly against a populated table)
 * will make the push fail or require a destructive `push-force`. Skipping
 * phase 3 risks enforcing NOT NULL while rows are still unscoped.
 *
 * Safe to re-run: organizations that already have an exercise, documents
 * already linked, and rows that already carry an `exerciseId` are left
 * untouched.
 */
import { eq, isNull, and } from "drizzle-orm";
import { db, organizationsTable, exercisesTable, documentsTable, documentExerciseLinksTable, EXERCISE_SCOPED_TABLES } from "@workspace/db";

// Shared with `duplicateExerciseData` (exercises.ts) and
// `verify-exercise-backfill.ts` — see lib/db/src/exerciseTables.ts. A
// future business table only needs to be registered there, once.
const BUSINESS_TABLES = EXERCISE_SCOPED_TABLES.map((entry) => entry.table);

async function ensureExerciseForOrg(orgId: number, year: number): Promise<number> {
  const [existing] = await db
    .select()
    .from(exercisesTable)
    .where(eq(exercisesTable.organizationId, orgId))
    .orderBy(exercisesTable.year)
    .limit(1);

  if (existing) return existing.id;

  const [created] = await db
    .insert(exercisesTable)
    .values({ organizationId: orgId, year, status: "active" })
    .returning();

  console.log(`  created exercise ${created.year} (id ${created.id}) for org ${orgId}`);
  return created.id;
}

async function backfillDocumentLinks(orgId: number, exerciseId: number) {
  const docs = await db
    .select({ id: documentsTable.id })
    .from(documentsTable)
    .where(eq(documentsTable.organizationId, orgId));
  if (docs.length === 0) return;

  const existingLinks = await db
    .select({ documentId: documentExerciseLinksTable.documentId })
    .from(documentExerciseLinksTable)
    .where(eq(documentExerciseLinksTable.exerciseId, exerciseId));
  const linkedIds = new Set(existingLinks.map((l) => l.documentId));

  const unlinked = docs.filter((d) => !linkedIds.has(d.id));
  if (unlinked.length === 0) return;

  await db.insert(documentExerciseLinksTable).values(unlinked.map((d) => ({ documentId: d.id, exerciseId })));
  console.log(`  linked ${unlinked.length} pre-existing document(s) to exercise ${exerciseId} for org ${orgId}`);
}

async function backfillTable(table: (typeof BUSINESS_TABLES)[number], orgId: number, exerciseId: number) {
  const result = await db
    .update(table)
    .set({ exerciseId } as never)
    .where(and(eq(table.organizationId, orgId), isNull(table.exerciseId)))
    .returning({ id: table.id });

  if (result.length > 0) {
    console.log(`  backfilled ${result.length} row(s) in ${table} for org ${orgId}`);
  }
}

async function main() {
  const currentYear = new Date().getFullYear();
  const orgs = await db.select({ id: organizationsTable.id, name: organizationsTable.name }).from(organizationsTable);

  console.log(`Found ${orgs.length} organization(s).`);

  for (const org of orgs) {
    console.log(`Processing org ${org.id} (${org.name})...`);
    const exerciseId = await ensureExerciseForOrg(org.id, currentYear);

    await backfillDocumentLinks(org.id, exerciseId);

    for (const table of BUSINESS_TABLES) {
      await backfillTable(table, org.id, exerciseId);
    }
  }

  console.log("Backfill complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
