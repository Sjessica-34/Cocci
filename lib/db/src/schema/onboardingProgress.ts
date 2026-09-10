import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const ONBOARDING_STATUSES = [
  "not_started",
  "organization_created",
  "subsidiaries_configured",
  "workforce_completed",
  "subscription_selected",
  "payment_pending",
  "completed",
] as const;

export const onboardingStatusSchema = z.enum(ONBOARDING_STATUSES);
export type OnboardingStatus = z.infer<typeof onboardingStatusSchema>;

export const onboardingProgressTable = pgTable("onboarding_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("not_started"),
  effectifKey: text("effectif_key"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("onboarding_progress_user_unique").on(t.userId),
]);

export const insertOnboardingProgressSchema = createInsertSchema(onboardingProgressTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOnboardingProgress = z.infer<typeof insertOnboardingProgressSchema>;
export type OnboardingProgress = typeof onboardingProgressTable.$inferSelect;