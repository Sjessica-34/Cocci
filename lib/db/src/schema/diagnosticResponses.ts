import {
  pgTable,
  serial,
  integer,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { exercisesTable } from "./exercises";

export const diagnosticResponsesTable = pgTable(
  "diagnostic_responses",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercisesTable.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull(),
    level: smallint("level").notNull(),
    comment: text("comment"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("diagnostic_responses_org_exercise_question_idx").on(
      t.organizationId,
      t.exerciseId,
      t.questionId,
    ),
    index("diagnostic_responses_org_exercise_idx").on(t.organizationId, t.exerciseId),
  ],
);

export const insertDiagnosticResponseSchema = createInsertSchema(diagnosticResponsesTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertDiagnosticResponse = z.infer<typeof insertDiagnosticResponseSchema>;
export type DiagnosticResponse = typeof diagnosticResponsesTable.$inferSelect;
