import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/**
 * Historique des consentements utilisateur (RGPD art. 7).
 * Une ligne par version acceptée — les anciennes lignes ne sont jamais supprimées.
 * documentType: "cgu" | "privacy"
 */
export const userConsentsTable = pgTable("user_consents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  documentType: text("document_type").notNull(), // "cgu" | "privacy"
  documentVersion: text("document_version").notNull(), // ex. "2025-01"
  acceptedAt: timestamp("accepted_at", { withTimezone: true }).defaultNow().notNull(),
  ipAddress: text("ip_address"),
});

export type UserConsent = typeof userConsentsTable.$inferSelect;
