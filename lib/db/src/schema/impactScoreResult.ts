import { pgTable, serial, integer, text, date, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { exercisesTable } from "./exercises";

export const impactScoreResultsTable = pgTable("impact_score_results", {
  id:              serial("id").primaryKey(),
  organizationId:  integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  exerciseId:      integer("exercise_id").notNull().references(() => exercisesTable.id, { onDelete: "cascade" }),
  score:           integer("score").notNull(),          // 0–100
  dateRealisation: date("date_realisation").notNull(),
  commentaire:     text("commentaire"),
  limitationImpactsNegatifs:  text("limitation_impacts_negatifs"),
  partageValeurPouvoir:       text("partage_valeur_pouvoir"),
  strategieImpactPositif:     text("strategie_impact_positif"),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("impact_score_results_exercise_idx").on(t.exerciseId),
]);
