import { pgTable, serial, text, integer, timestamp, type AnyPgColumn } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const organizationsTable = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  legalName: text("legal_name"),
  siret: text("siret"),
  sector: text("sector"),
  size: text("size"), // TPE | PME | ETI | GE
  logoUrl: text("logo_url"),
  /**
   * Entity type: 'entreprise' (default) or 'groupe'.
   * A groupe can contain multiple entreprises (subsidiaries).
   */
  type: text("type").notNull().default("entreprise"), // 'entreprise' | 'groupe'
  /**
   * FK to parent organization (only set when this org is a subsidiary of a group).
   * Null for standalone organizations and top-level groups.
   */
  parentId: integer("parent_id").references((): AnyPgColumn => organizationsTable.id),
  /**
   * How the group calculates its results when it has subsidiaries.
   * 'manual' = data entered directly on the group level.
   * 'auto' = results aggregated from subsidiaries.
   * Only relevant for type='groupe' with at least one subsidiary.
   */
  groupMode: text("group_mode"), // 'manual' | 'auto' | null
  /**
   * Month (1-12) from which the "Clôturer et créer l'exercice suivant"
   * action becomes available for this organization. Defaults to December
   * (12). This is the ONLY exercise-related setting a user can configure —
   * everything else about exercise lifecycle (year, single active
   * exercise, duplication) is fully automatic. See
   * `artifacts/api-server/src/routes/exercises.ts`.
   */
  exerciseOpeningMonth: integer("exercise_opening_month").notNull().default(12),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertOrganizationSchema = createInsertSchema(organizationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizationsTable.$inferSelect;
