import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { usersTable } from "./users";

// ─── MESSAGES "NOUS ÉCRIRE" ───────────────────────────────────────────────────

export const cocciFeedbackTable = pgTable("cocci_feedback", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizationsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  // 'suggestion' | 'bug' | 'evolution' | 'question' | 'other'
  requestType: text("request_type").notNull(),
  message: text("message").notNull(),
  attachmentUrl: text("attachment_url"),
  wantsCallback: boolean("wants_callback").notNull().default(false),
  // 'nouveau' | 'en_cours' | 'traite' | 'ferme'
  status: text("status").notNull().default("nouveau"),
  // [{date: string, status: string, note?: string}]
  history: jsonb("history").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CocciFeedback = typeof cocciFeedbackTable.$inferSelect;

// ─── AVIS "ÉVALUER COCCI" ─────────────────────────────────────────────────────

export const cocciRatingsTable = pgTable("cocci_ratings", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizationsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  stars: integer("stars").notNull(), // 1–5
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CocciRating = typeof cocciRatingsTable.$inferSelect;
