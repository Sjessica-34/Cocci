import { pgTable, serial, integer, text, boolean, timestamp, jsonb, unique, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { exercisesTable } from "./exercises";

export const barometreCampaignsTable = pgTable("barometre_campaigns", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id").notNull().references(() => exercisesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  mode: text("mode").notNull().default("anonymous"), // 'anonymous' | 'identified'
  status: text("status").notNull().default("draft"), // 'draft' | 'active' | 'closed'
  openDate: date("open_date").notNull(),
  closeDate: date("close_date").notNull(),
  nbCollaborateurs: integer("nb_collaborateurs").notNull().default(0),
  publicToken: text("public_token").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [unique("barometre_campaigns_token_unique").on(t.publicToken)]);

export const insertBarometreCampaignSchema = createInsertSchema(barometreCampaignsTable).omit({
  id: true,
  publicToken: true,
  status: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBarometreCampaign = z.infer<typeof insertBarometreCampaignSchema>;
export type BarometreCampaign = typeof barometreCampaignsTable.$inferSelect;

export const barometreCustomQuestionsTable = pgTable("barometre_custom_questions", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => barometreCampaignsTable.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertBarometreCustomQuestionSchema = createInsertSchema(barometreCustomQuestionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertBarometreCustomQuestion = z.infer<typeof insertBarometreCustomQuestionSchema>;
export type BarometreCustomQuestion = typeof barometreCustomQuestionsTable.$inferSelect;

export const barometreResponsesTable = pgTable("barometre_responses", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => barometreCampaignsTable.id, { onDelete: "cascade" }),
  respondentLabel: text("respondent_label"), // only set when mode === 'identified'
  completed: boolean("completed").notNull().default(false),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type BarometreResponse = typeof barometreResponsesTable.$inferSelect;

export const barometreAnswersTable = pgTable("barometre_answers", {
  id: serial("id").primaryKey(),
  responseId: integer("response_id").notNull().references(() => barometreResponsesTable.id, { onDelete: "cascade" }),
  questionCode: text("question_code").notNull(), // referential code (q1..q36) or "custom-<id>"
  scaleValue: integer("scale_value"),
  freeText: text("free_text"),
}, (t) => [unique("barometre_answers_response_question_unique").on(t.responseId, t.questionCode)]);

export type BarometreAnswer = typeof barometreAnswersTable.$inferSelect;

// Dedicated table so the barometre module can create "actions" today without
// depending on the "Mes actions" module (module 7, not built yet). Once that
// module exists, these rows can be migrated/linked instead of duplicating
// this table's purpose.
export const barometreActionsTable = pgTable("barometre_actions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").notNull().references(() => barometreCampaignsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  sourceTheme: text("source_theme"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertBarometreActionSchema = createInsertSchema(barometreActionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertBarometreAction = z.infer<typeof insertBarometreActionSchema>;
export type BarometreAction = typeof barometreActionsTable.$inferSelect;

// Cached AI summary of free-text comments for a campaign — regenerated on
// demand, never computed synchronously on every page load.
export const barometreAiSummariesTable = pgTable("barometre_ai_summaries", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => barometreCampaignsTable.id, { onDelete: "cascade" }),
  summary: text("summary").notNull(),
  themes: jsonb("themes").notNull().default([]),
  suggestions: jsonb("suggestions").notNull().default([]),
  generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [unique("barometre_ai_summaries_campaign_unique").on(t.campaignId)]);

export type BarometreAiSummary = typeof barometreAiSummariesTable.$inferSelect;
