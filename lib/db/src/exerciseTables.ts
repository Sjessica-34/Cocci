import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { bioConnectionsTable, bioDependenciesTable, bioIssuesTable } from "./schema/biodiversite";
import { carbonBilansTable } from "./schema/carbonBilans";
import { carbonTravelItemsTable } from "./schema/carbonTravelItems";
import { carbonUsageItemsTable } from "./schema/carbonUsageItems";
import { customIssuesTable } from "./schema/customIssues";
import {
  employmentCustomKpisTable,
  employmentDiversityTable,
  employmentTrainingTable,
  employmentWorkforceTable,
} from "./schema/employment";
import { impactScoreResultsTable } from "./schema/impactScoreResult";
import { issueAnalysesTable } from "./schema/issueAnalyses";
import { issueRatingsTable } from "./schema/issueRatings";
import { labelsTable } from "./schema/labels";
import { nrMetaTable, nrResponsesTable } from "./schema/numeriqueResponsable";
import { stakeholdersTable } from "./schema/stakeholders";
import { suppliersTable } from "./schema/suppliers";
import { captationCarboneTable } from "./schema/captationCarbone";
import { diagnosticResponsesTable } from "./schema/diagnosticResponses";
import { organizationActionPlansTable } from "./schema/actionPlan";
import { planSlotsTable } from "./schema/planSlots";
import { publicLinksTable } from "./schema/publicLinks";
import { responsiblePurchasesTable } from "./schema/responsiblePurchases";
import { rseReportDraftsTable } from "./schema/rseReportDrafts";
import { barometreCampaignsTable } from "./schema/barometreSocial";

export type ScopedTable = PgTable & { id: PgColumn; organizationId: PgColumn; exerciseId: PgColumn };

/**
 * A table that needs custom row-remapping logic during exercise
 * duplication, beyond a plain "copy every column, swap organizationId/
 * exerciseId, drop id". See `duplicateExerciseData` in
 * `artifacts/api-server/src/routes/exercises.ts` for the handler
 * implementations, keyed by this tag.
 */
export type ExerciseTableRemap = "bioConnections" | "bioIssues" | "rseReportDrafts" | "publicLinks" | "carbonBilanItems";

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
 * Tables whose exercise data is intentionally reset rather than copied.
 * Keeping this explicit prevents a new annual workflow from accidentally
 * treating a reset module as ordinary copyable business data.
 */
export const EXERCISE_RESET_TABLES = [
  { name: "barometre_campaigns", table: barometreCampaignsTable },
] as const;

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
  { name: "carbon_bilan_travel_items", table: carbonTravelItemsTable, remap: "carbonBilanItems" },
  { name: "carbon_bilan_usage_items", table: carbonUsageItemsTable, remap: "carbonBilanItems" },
  { name: "captation_carbone", table: captationCarboneTable },
  { name: "custom_issues", table: customIssuesTable },
  { name: "diagnostic_responses", table: diagnosticResponsesTable },
  { name: "employment_workforce", table: employmentWorkforceTable },
  { name: "employment_diversity", table: employmentDiversityTable },
  { name: "employment_training", table: employmentTrainingTable },
  { name: "employment_custom_kpis", table: employmentCustomKpisTable },
  { name: "impact_score_results", table: impactScoreResultsTable },
  { name: "issue_analyses", table: issueAnalysesTable },
  { name: "issue_ratings", table: issueRatingsTable },
  { name: "labels", table: labelsTable },
  { name: "nr_meta", table: nrMetaTable },
  { name: "nr_responses", table: nrResponsesTable },
  { name: "organization_action_plans", table: organizationActionPlansTable },
  { name: "plan_slots", table: planSlotsTable },
  { name: "public_links", table: publicLinksTable, remap: "publicLinks" },
  { name: "responsible_purchases", table: responsiblePurchasesTable },
  { name: "rse_report_drafts", table: rseReportDraftsTable, remap: "rseReportDrafts" },
  { name: "stakeholders", table: stakeholdersTable },
  { name: "suppliers", table: suppliersTable },
];

/** Names used by verification to ensure no exercise-bearing module is omitted. */
export const EXERCISE_TABLE_NAMES = [
  ...EXERCISE_SCOPED_TABLES.map(({ name }) => name),
  ...EXERCISE_RESET_TABLES.map(({ name }) => name),
  "document_exercise_links",
] as const;
