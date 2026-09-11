import { pgTable, serial, integer, text, numeric, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { exercisesTable } from "./exercises";
import { carbonBilansTable } from "./carbonBilans";

export const carbonTravelItemsTable = pgTable("carbon_bilan_travel_items", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id").notNull().references(() => exercisesTable.id, { onDelete: "cascade" }),
  carbonBilanId: integer("carbon_bilan_id").notNull().references(() => carbonBilansTable.id, { onDelete: "cascade" }),
  categoryKey: text("category_key").notNull(),
  label: text("label").notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 3 }).notNull(),
  unit: text("unit").notNull().default("km"),
  emissionFactor: numeric("emission_factor", { precision: 14, scale: 9 }),
  emissions: numeric("emissions", { precision: 14, scale: 3 }),
  scope: text("scope").notNull().default("3"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  bilanCategoryUnique: uniqueIndex("carbon_travel_items_bilan_category_idx").on(table.carbonBilanId, table.categoryKey),
  organizationExerciseIdx: index("carbon_travel_items_org_exercise_idx").on(table.organizationId, table.exerciseId),
}));

export type CarbonTravelItem = typeof carbonTravelItemsTable.$inferSelect;
export type InsertCarbonTravelItem = typeof carbonTravelItemsTable.$inferInsert;