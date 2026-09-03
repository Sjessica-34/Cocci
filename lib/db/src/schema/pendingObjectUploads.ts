import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const pendingObjectUploadsTable = pgTable("pending_object_uploads", {
  objectPath: text("object_path").primaryKey(),
  ownerClerkId: text("owner_clerk_id").notNull(),
  organizationId: integer("organization_id").references(() => organizationsTable.id, {
    onDelete: "cascade",
  }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});