import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const labelsTable = pgTable("labels", {
  id:             serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  name:           text("name"),
  logoUrl:        text("logo_url"),
  holder:         text("holder"),    // porteur (organisme certificateur)
  year:           integer("year"),
  score:          text("score"),     // libre : "87/100", "Niveau 2", "Gold"…
  documentIds:    text("document_ids"), // JSON array of document IDs
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
});
