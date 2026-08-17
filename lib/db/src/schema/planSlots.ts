import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { exercisesTable } from "./exercises";
import { usersTable } from "./users";
import { actionLibraryTable } from "./actionPlan";

// ─── PLAN D'ACTION COCCI ──────────────────────────────────────────────────────
// 15 actions actives en permanence. Les actions réalisées restent affichées
// (barrées + badge vert) pendant tout l'exercice.
// Renouvellement automatique par lot de 5 dès que 5 actions sont réalisées.
// À la clôture de l'exercice, les réalisations passent dans l'historique.
export const planSlotsTable = pgTable(
  "plan_slots",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercisesTable.id, { onDelete: "cascade" }),
    libraryActionId: integer("library_action_id").references(
      () => actionLibraryTable.id,
      { onDelete: "set null" },
    ),
    slotOrder: integer("slot_order").notNull().default(0),
    isDone: boolean("is_done").notNull().default(false),
    // Suivi d'exécution : responsable, échéance, statut (todo/in_progress/blocked/done)
    assignedToUserId: integer("assigned_to_user_id").references(
      () => usersTable.id,
      { onDelete: "set null" },
    ),
    dueDate: timestamp("due_date", { withTimezone: true }),
    status: text("status").notNull().default("todo"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    comment: text("comment"),
    justificationUrl: text("justification_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("plan_slots_org_exercise_idx").on(t.organizationId, t.exerciseId),
  ],
);

export const insertPlanSlotSchema = createInsertSchema(planSlotsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPlanSlot = z.infer<typeof insertPlanSlotSchema>;
export type PlanSlot = typeof planSlotsTable.$inferSelect;
