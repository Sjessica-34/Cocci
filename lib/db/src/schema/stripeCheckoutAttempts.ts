import { sql } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const stripeCheckoutAttemptsTable = pgTable(
  "stripe_checkout_attempts",
  {
    id: text("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    onePendingAttemptPerOrganization: uniqueIndex(
      "stripe_checkout_attempts_one_pending_org_idx",
    )
      .on(table.organizationId)
      .where(sql`${table.status} = 'pending'`),
    checkoutSessionIdUniqueIdx: uniqueIndex(
      "stripe_checkout_attempts_checkout_session_id_idx",
    ).on(table.stripeCheckoutSessionId),
    organizationStatusIdx: index("stripe_checkout_attempts_org_status_idx").on(
      table.organizationId,
      table.status,
    ),
    subscriptionIdIdx: index("stripe_checkout_attempts_subscription_id_idx").on(
      table.stripeSubscriptionId,
    ),
    paymentIntentIdIdx: index("stripe_checkout_attempts_payment_intent_id_idx").on(
      table.stripePaymentIntentId,
    ),
  }),
);

export type StripeCheckoutAttempt = typeof stripeCheckoutAttemptsTable.$inferSelect;
export type InsertStripeCheckoutAttempt = typeof stripeCheckoutAttemptsTable.$inferInsert;