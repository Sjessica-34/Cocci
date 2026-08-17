import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { organizationsTable } from "./organizations";

/**
 * Audit log — événements de sécurité et opérations importantes.
 * Ne jamais stocker : mots de passe, tokens, secrets API, cookies de session.
 */
export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  organizationId: integer("organization_id").references(() => organizationsTable.id, {
    onDelete: "set null",
  }),
  // Catégories : user.*, org.*, member.*, resource.*, admin.*, security.*
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  success: boolean("success").notNull().default(true),
  metadata: text("metadata"), // JSON stringifié — uniquement données non sensibles
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AuditLog = typeof auditLogsTable.$inferSelect;
