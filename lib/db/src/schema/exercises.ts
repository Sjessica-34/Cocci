import { pgTable, serial, integer, text, timestamp, unique, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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
  (t) => [
    unique("exercises_org_year_unique").on(t.organizationId, t.year),
    // Enforces "un seul exercice En cours à la fois" at the database level:
    // a partial unique index over organizationId, only for active rows. Any
    // attempt to insert/update a second "active" exercise for the same
    // organization fails at the DB layer, regardless of application code
    // paths. See the atomic advance endpoint in
    // `artifacts/api-server/src/routes/exercises.ts`, the only place that
    // ever creates or closes an exercise.
    uniqueIndex("exercises_org_single_active_idx")
      .on(t.organizationId)
      .where(sql`${t.status} = 'active'`),
  ],
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
