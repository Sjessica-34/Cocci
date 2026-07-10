import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { exercisesTable } from "./exercises";

export const customIssuesTable = pgTable("custom_issues", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizationsTable.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id")
    .notNull()
    .references(() => exercisesTable.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  label: text("label").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CustomIssue = typeof customIssuesTable.$inferSelect;
export type InsertCustomIssue = typeof customIssuesTable.$inferInsert;
