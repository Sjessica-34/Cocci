import { pgTable, serial, integer, text, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

/**
 * Un abonnement par organisation.
 * mode : stripe | invoice | free | demo
 * status : active | trial | suspended | expired
 */
export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .unique()
    .references(() => organizationsTable.id, { onDelete: "cascade" }),

  // Mode de facturation
  mode: text("mode").notNull().default("free"), // stripe | invoice | free | demo

  // Statut de l'abonnement
  status: text("status").notNull().default("active"), // active | trial | suspended | expired

  // Offre
  offerName: text("offer_name"), // "TPE", "PME", "ETI", "Sur-mesure", etc.
  maxEmployees: integer("max_employees"),
  maxUsers: integer("max_users"),

  // Dates
  startAt: date("start_at", { mode: "string" }),
  endAt: date("end_at", { mode: "string" }),
  trialStartAt: date("trial_start_at", { mode: "string" }),
  trialEndAt: date("trial_end_at", { mode: "string" }),
  autoRenew: boolean("auto_renew").notNull().default(true),

  // Stripe (référence externe, lecture seule côté Cocci pour l'instant)
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeCustomerId: text("stripe_customer_id"),

  // Modules activés (liste de slugs, ex. ["biodiversite", "bilan-carbone"])
  modules: text("modules").array(),

  // Notes admin internes
  notes: text("notes"),

  // Dérogations administrateur (applicables indépendamment du mode)
  overrideMaxEmployees: integer("override_max_employees"),
  overrideMaxUsers: integer("override_max_users"),
  overrideNote: text("override_note"),
  overrideExpiresAt: date("override_expires_at", { mode: "string" }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptionsTable.$inferSelect;
