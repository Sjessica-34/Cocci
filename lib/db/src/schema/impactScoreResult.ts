import { pgTable, serial, integer, text, date, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const impactScoreResultsTable = pgTable("impact_score_results", {
  id:              serial("id").primaryKey(),
  organizationId:  integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  score:           integer("score").notNull(),          // 0–100
  dateRealisation: date("date_realisation").notNull(),
  commentaire:     text("commentaire"),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("impact_score_results_org_idx").on(t.organizationId),
]);
