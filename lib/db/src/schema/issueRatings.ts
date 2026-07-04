import { pgTable, serial, integer, text, timestamp, unique } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const issueRatingsTable = pgTable(
  "issue_ratings",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    issueKey: text("issue_key").notNull(),
    stakeholderScore: integer("stakeholder_score"),
    companyScore: integer("company_score"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("issue_ratings_org_key_unique").on(t.organizationId, t.issueKey)],
);

export type IssueRating = typeof issueRatingsTable.$inferSelect;
export type InsertIssueRating = typeof issueRatingsTable.$inferInsert;
