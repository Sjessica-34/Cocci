import { pgTable, serial, integer, text, timestamp, customType } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() { return "bytea"; },
});

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizationsTable.id, { onDelete: "cascade" }),
  uploadedByUserId: integer("uploaded_by_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  category: text("category").notNull(), // 'parties-prenantes'|'materialite'|'bilan-carbone'|'biodiversite'|'demarche-rse'|'numerique-responsable'|'autre'
  label: text("label"),          // custom label for personalized documents
  description: text("description"), // custom description for personalized documents
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(), // bytes
  content: bytea("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Document = typeof documentsTable.$inferSelect;
export type InsertDocument = typeof documentsTable.$inferInsert;
