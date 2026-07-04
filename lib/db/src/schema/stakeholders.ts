import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const stakeholdersTable = pgTable("stakeholders", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizationsTable.id, { onDelete: "cascade" }),
  name: text("name"),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  description: text("description"),
  influence: integer("influence").notNull().default(3),
  interest: integer("interest").notNull().default(3),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Stakeholder = typeof stakeholdersTable.$inferSelect;
export type InsertStakeholder = typeof stakeholdersTable.$inferInsert;
