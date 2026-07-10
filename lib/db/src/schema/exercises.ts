import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const exercisesTable = pgTable(
  "exercises",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    status: text("status").notNull().default("active"), // 'active' | 'closed'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("exercises_org_year_unique").on(t.organizationId, t.year)],
);

export const insertExerciseSchema = createInsertSchema(exercisesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type Exercise = typeof exercisesTable.$inferSelect;

export const documentExerciseLinksTable = pgTable(
  "document_exercise_links",
  {
    id: serial("id").primaryKey(),
    documentId: integer("document_id").notNull(),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercisesTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("document_exercise_links_unique").on(t.documentId, t.exerciseId)],
);

export type DocumentExerciseLink = typeof documentExerciseLinksTable.$inferSelect;
