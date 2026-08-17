import { pgTable, serial, integer, text, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { exercisesTable } from "./exercises";

export const publicLinksTable = pgTable("public_links", {
  id:                serial("id").primaryKey(),
  organizationId:    integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  exerciseId:        integer("exercise_id").notNull().references(() => exercisesTable.id, { onDelete: "cascade" }),
  token:             text("token").notNull().unique(),
  customDescription: text("custom_description"),
  showReport:        boolean("show_report").notNull().default(false),
  createdAt:         timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("public_links_org_exercise_idx").on(t.organizationId, t.exerciseId),
]);
