import { pgTable, serial, integer, text, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const nrMetaTable = pgTable("nr_meta", {
  id:                 serial("id").primaryKey(),
  organizationId:     integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  certificationLabel: text("certification_label").notNull().default("none"),
  certificationOther: text("certification_other"),
  updatedAt:          timestamp("updated_at").notNull().defaultNow(),
});

export const nrResponsesTable = pgTable("nr_responses", {
  id:             serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  criterionId:    text("criterion_id").notNull(),
  checked:        boolean("checked").notNull().default(false),
  comment:        text("comment"),
  updatedAt:      timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("nr_responses_org_criterion_idx").on(t.organizationId, t.criterionId),
]);
