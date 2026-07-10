import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { exercisesTable } from "./exercises";

export const issueRatingsTable = pgTable(
  "issue_ratings",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercisesTable.id, { onDelete: "cascade" }),
    issueKey: text("issue_key").notNull(),
    stakeholderScore: integer("stakeholder_score"),
    companyScore: integer("company_score"),
    impactScore: integer("impact_score"),
    tendance: text("tendance"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("issue_ratings_exercise_key_unique").on(t.exerciseId, t.issueKey)],
);

export type IssueRating = typeof issueRatingsTable.$inferSelect;
export type InsertIssueRating = typeof issueRatingsTable.$inferInsert;
