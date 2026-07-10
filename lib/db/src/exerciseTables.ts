import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { bioConnectionsTable, bioDependenciesTable, bioIssuesTable } from "./schema/biodiversite";
import { carbonBilansTable } from "./schema/carbonBilans";
import { customIssuesTable } from "./schema/customIssues";
import { impactScoreResultsTable } from "./schema/impactScoreResult";
import { issueAnalysesTable } from "./schema/issueAnalyses";
import { issueRatingsTable } from "./schema/issueRatings";
import { labelsTable } from "./schema/labels";
import { nrMetaTable, nrResponsesTable } from "./schema/numeriqueResponsable";
import { stakeholdersTable } from "./schema/stakeholders";
import { suppliersTable } from "./schema/suppliers";

export type ScopedTable = PgTable & { id: PgColumn; organizationId: PgColumn; exerciseId: PgColumn };

/**
 * A table that needs custom row-remapping logic during exercise
 * duplication, beyond a plain "copy every column, swap organizationId/
 * exerciseId, drop id". See `duplicateExerciseData` in
 * `artifacts/api-server/src/routes/exercises.ts` for the handler
 * implementations, keyed by this tag.
 */
export type ExerciseTableRemap = "bioConnections" | "bioIssues";

export interface ExerciseScopedTableEntry {
  /** SQL table name, used in logs/verification output. */
  name: string;
  table: ScopedTable;
  /**
   * Set when this table's rows reference other rows within the same
   * duplicated set by id (e.g. a graph-edge table pointing at another
   * business table's rows) and therefore cannot be duplicated with a
   * plain column copy — see `ExerciseTableRemap`.
   */
  remap?: ExerciseTableRemap;
}

/**
 * Single source of truth for every exercise-scoped business table.
 *
 * This is the "convention" a future module must follow to become
 * exercise-aware everywhere it matters: add the table here, and it is
 * automatically picked up by:
 *   - `duplicateExerciseData` (exercise creation with "reprendre les
 *     données") in `artifacts/api-server/src/routes/exercises.ts`,
 *   - `backfill-exercises` (rollout migration phase 2) in
 *     `scripts/src/backfill-exercises.ts`,
 *   - `verify-exercise-backfill` (rollout migration phase 3 gate) in
 *     `scripts/src/verify-exercise-backfill.ts`.
 *
 * No other file should hardcode this table list — always import
 * `EXERCISE_SCOPED_TABLES` from here instead.
 *
 * Requirements for a table to belong here: it must have `organizationId`
 * and `exerciseId` NOT NULL FK columns (see any existing entry for the
 * shape), and reads/writes must go through `scopeToExercise`/
 * `withExerciseValues` (`artifacts/api-server/src/lib/exercise.ts`), not
 * ad hoc `eq()` filters. Only set `remap` if the table has row-to-row FK
 * references within the same table set (rare — most tables don't).
 */
export const EXERCISE_SCOPED_TABLES: ExerciseScopedTableEntry[] = [
  { name: "bio_dependencies", table: bioDependenciesTable },
  { name: "bio_connections", table: bioConnectionsTable, remap: "bioConnections" },
  { name: "bio_issues", table: bioIssuesTable, remap: "bioIssues" },
  { name: "carbon_bilans", table: carbonBilansTable },
  { name: "custom_issues", table: customIssuesTable },
  { name: "impact_score_results", table: impactScoreResultsTable },
  { name: "issue_analyses", table: issueAnalysesTable },
  { name: "issue_ratings", table: issueRatingsTable },
  { name: "labels", table: labelsTable },
  { name: "nr_meta", table: nrMetaTable },
  { name: "nr_responses", table: nrResponsesTable },
  { name: "stakeholders", table: stakeholdersTable },
  { name: "suppliers", table: suppliersTable },
];
