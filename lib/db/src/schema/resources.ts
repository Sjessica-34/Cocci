import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const resourcesTable = pgTable("resources", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .references(() => organizationsTable.id, { onDelete: "cascade" }),
  isGlobal: boolean("is_global").notNull().default(false),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  documentType: text("document_type"),
  imageUrl: text("image_url"),
  fileUrl: text("file_url"),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Resource = typeof resourcesTable.$inferSelect;
export type InsertResource = typeof resourcesTable.$inferInsert;
