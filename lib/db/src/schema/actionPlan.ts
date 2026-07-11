import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { exercisesTable } from "./exercises";

// ─── BIBLIOTHÈQUE D'ACTIONS ──────────────────────────────────────────────────
// Référentiel Cocci : actions RSE prédéfinies + actions personnalisées ajoutées
// par les admins. is_system=true = action Cocci, is_system=false = ajout admin.
// Le référentiel est enrichissable sans modifier le code (insert en DB).
export const actionLibraryTable = pgTable("action_library", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),      // Environnement | Numérique responsable | Biodiversité | Social | Achats responsables | Gouvernance
  subcategory: text("subcategory"),
  esgPillar: text("esg_pillar").notNull(),   // E | S | G
  odd: text("odd"),                          // ex: "7,13" — ODD concernés
  level: text("level").notNull(),            // quick | project | engagement
  isSystem: boolean("is_system").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertActionLibrarySchema = createInsertSchema(actionLibraryTable).omit({
  id: true,
  createdAt: true,
});
export type InsertActionLibrary = z.infer<typeof insertActionLibrarySchema>;
export type ActionLibraryItem = typeof actionLibraryTable.$inferSelect;

// ─── PLAN D'ACTIONS ──────────────────────────────────────────────────────────
// Une ligne par action ajoutée dans le plan d'une organisation pour un exercice.
// libraryActionId = null pour les actions créées manuellement.
export const organizationActionPlansTable = pgTable(
  "organization_action_plans",
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
    // Pour les actions manuelles (libraryActionId = null)
    customName: text("custom_name"),
    source: text("source").notNull().default("library"), // library | suggestion | manual
    isChecked: boolean("is_checked").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    comment: text("comment"),
    justificationUrl: text("justification_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("action_plan_org_exercise_library_idx").on(
      t.organizationId,
      t.exerciseId,
      t.libraryActionId,
    ),
  ],
);

export const insertOrganizationActionPlanSchema = createInsertSchema(
  organizationActionPlansTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrganizationActionPlan = z.infer<typeof insertOrganizationActionPlanSchema>;
export type OrganizationActionPlan = typeof organizationActionPlansTable.$inferSelect;
