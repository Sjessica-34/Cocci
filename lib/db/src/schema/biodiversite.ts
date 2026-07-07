import { pgTable, serial, integer, text, timestamp, real } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const bioDependenciesTable = pgTable("bio_dependencies", {
  id:              serial("id").primaryKey(),
  organizationId:  integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  name:            text("name"),
  category:        text("category"),
  subCategory:     text("sub_category"),
  chainPosition:   text("chain_position"),
  element:         text("element"),
  description:     text("description"),
  dependencyLevel: integer("dependency_level"),
  masteryLevel:    integer("mastery_level"),
  comments:        text("comments"),
  documentIds:     text("document_ids"),
  posX:            real("pos_x"),
  posY:            real("pos_y"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  updatedAt:       timestamp("updated_at").notNull().defaultNow(),
});

export const bioConnectionsTable = pgTable("bio_connections", {
  id:             serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  fromElementId:  integer("from_element_id").notNull().references(() => bioDependenciesTable.id, { onDelete: "cascade" }),
  toElementId:    integer("to_element_id").notNull().references(() => bioDependenciesTable.id, { onDelete: "cascade" }),
  relationType:   text("relation_type"),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});

export const bioIssuesTable = pgTable("bio_issues", {
  id:             serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  name:           text("name"),
  description:    text("description"),
  importance:     integer("importance"),
  comments:       text("comments"),
  dependencyIds:  text("dependency_ids"),
  chainPosition:  text("chain_position"),
  posX:           real("pos_x"),
  posY:           real("pos_y"),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});
