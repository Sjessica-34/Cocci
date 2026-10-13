import { sql } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const additionalUserSeatRequestsTable = pgTable(
  "additional_user_seat_requests",
  {
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key").notNull(),
    status: text("status").notNull().default("pending"),
    stripeSubscriptionId: text("stripe_subscription_id").notNull(),
    stripeUpdateParams: jsonb("stripe_update_params")
      .$type<Record<string, unknown>>()
      .notNull(),
    maxUsers: integer("max_users").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.organizationId, table.idempotencyKey] }),
    onePendingPerOrganization: uniqueIndex("additional_user_seat_requests_one_pending_org_idx")
      .on(table.organizationId)
      .where(sql`${table.status} = 'pending'`),
  }),
);

export type AdditionalUserSeatRequest = typeof additionalUserSeatRequestsTable.$inferSelect;
export type InsertAdditionalUserSeatRequest = typeof additionalUserSeatRequestsTable.$inferInsert;
