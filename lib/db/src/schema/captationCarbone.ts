import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { exercisesTable } from "./exercises";

export const captationCarboneTable = pgTable("captation_carbone", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizationsTable.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id")
    .notNull()
    .references(() => exercisesTable.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  mode: text("mode").notNull(),
  captationValue: numeric("captation_value", { precision: 12, scale: 3 }),
  captationUnit: text("captation_unit"),
  treeCount: integer("tree_count"),
  captationKgPerYear: numeric("captation_kg_per_year", { precision: 14, scale: 3 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CaptationCarbone = typeof captationCarboneTable.$inferSelect;
export type InsertCaptationCarbone = typeof captationCarboneTable.$inferInsert;
