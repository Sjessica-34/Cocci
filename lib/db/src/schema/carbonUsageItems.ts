import { pgTable, serial, integer, boolean, text, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { exercisesTable } from "./exercises";
import { carbonBilansTable } from "./carbonBilans";

export const carbonUsageItemsTable = pgTable("carbon_bilan_usage_items", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id").notNull().references(() => exercisesTable.id, { onDelete: "cascade" }),
  carbonBilanId: integer("carbon_bilan_id").notNull().references(() => carbonBilansTable.id, { onDelete: "cascade" }),
  productName: text("product_name").notNull(),
  unitsSold: integer("units_sold").notNull(),
  lifespanYears: numeric("lifespan_years", { precision: 8, scale: 2 }).notNull(),
  consumesEnergy: boolean("consumes_energy").notNull().default(true),
  energyType: text("energy_type"),
  consumptionPerYear: numeric("consumption_per_year", { precision: 14, scale: 3 }),
  unit: text("unit"),
  country: text("country"),
  emissionFactor: numeric("emission_factor", { precision: 14, scale: 9 }),
  emissions: numeric("emissions", { precision: 14, scale: 3 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  bilanIdx: index("carbon_usage_items_bilan_idx").on(table.carbonBilanId),
  organizationExerciseIdx: index("carbon_usage_items_org_exercise_idx").on(table.organizationId, table.exerciseId),
}));

export type CarbonUsageItem = typeof carbonUsageItemsTable.$inferSelect;
export type InsertCarbonUsageItem = typeof carbonUsageItemsTable.$inferInsert;