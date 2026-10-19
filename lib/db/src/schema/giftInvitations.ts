import { pgTable, serial, integer, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

export const giftInvitationsTable = pgTable("gift_invitations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull(),
  offerName: text("offer_name").notNull(),
  effectifKey: text("effectif_key").notNull(),
  maxEmployees: integer("max_employees"),
  durationMonths: integer("duration_months"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdByUserId: integer("created_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  organizationId: integer("organization_id").references(() => organizationsTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("gift_invitations_token_hash_idx").on(table.tokenHash),
  index("gift_invitations_email_idx").on(table.email),
]);

export type GiftInvitation = typeof giftInvitationsTable.$inferSelect;
