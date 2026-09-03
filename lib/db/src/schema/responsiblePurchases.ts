import { pgTable, serial, integer, text, numeric, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { exercisesTable } from "./exercises";

export const responsiblePurchasesTable = pgTable(
  "responsible_purchases",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercisesTable.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    amount: numeric("amount").notNull().default("0"),
    responsibleAmount: numeric("responsible_amount").notNull().default("0"),
    localAmount: numeric("local_amount").notNull().default("0"),
    circularAmount: numeric("circular_amount").notNull().default("0"),
    objectivePercent: integer("objective_percent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("responsible_purchases_org_exercise_category_unique").on(
      t.organizationId,
      t.exerciseId,
      t.category,
    ),
  ],
);

export const insertResponsiblePurchaseSchema = createInsertSchema(responsiblePurchasesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertResponsiblePurchase = z.infer<typeof insertResponsiblePurchaseSchema>;
export type ResponsiblePurchase = typeof responsiblePurchasesTable.$inferSelect;