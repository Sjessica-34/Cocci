import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const bioDependenciesTable = pgTable("bio_dependencies", {
  id:              serial("id").primaryKey(),
  organizationId:  integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  name:            text("name"),
  category:        text("category"),
  subCategory:     text("sub_category"),
  chainPosition:   text("chain_position"),    // amont | in-situ | aval
  element:         text("element"),
  description:     text("description"),
  dependencyLevel: integer("dependency_level"),  // 1-5
  masteryLevel:    integer("mastery_level"),      // 1-5
  comments:        text("comments"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

export const bioIssuesTable = pgTable("bio_issues", {
  id:             serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  name:           text("name"),
  description:    text("description"),
  importance:     integer("importance"),   // 1-5
  comments:       text("comments"),
  dependencyIds:  text("dependency_ids"),  // JSON array of dependency IDs
  chainPosition:  text("chain_position"),  // computed from linked dependencies
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});
