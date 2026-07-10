import { pgTable, serial, integer, text, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { exercisesTable } from "./exercises";

export const nrMetaTable = pgTable("nr_meta", {
  id:                 serial("id").primaryKey(),
  organizationId:     integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  exerciseId:         integer("exercise_id").notNull().references(() => exercisesTable.id, { onDelete: "cascade" }),
  certificationLabel: text("certification_label").notNull().default("none"),
  certificationOther: text("certification_other"),
  updatedAt:          timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("nr_meta_exercise_idx").on(t.exerciseId),
]);

export const nrResponsesTable = pgTable("nr_responses", {
  id:             serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  exerciseId:     integer("exercise_id").notNull().references(() => exercisesTable.id, { onDelete: "cascade" }),
  criterionId:    text("criterion_id").notNull(),
  checked:        boolean("checked").notNull().default(false),
  comment:        text("comment"),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("nr_responses_exercise_criterion_idx").on(t.exerciseId, t.criterionId),
]);
