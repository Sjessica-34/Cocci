import { pgTable, serial, integer, text, boolean, real, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";
import { exercisesTable } from "./exercises";

// ─── EFFECTIFS ──────────────────────────────────────────────────────────────
// One row per exercise. Every field is optional (nullable) — the module must
// work whether the company fills in nothing, a handful of fields, or all of
// them. Age/seniority each support two mutually-exclusive input modes
// ("precise" average vs. "brackets" distribution), tracked by a mode column
// so the frontend/synthesis know which one to render.
export const employmentWorkforceTable = pgTable(
  "employment_workforce",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id").notNull().references(() => exercisesTable.id, { onDelete: "cascade" }),

    totalHeadcount: integer("total_headcount"),
    nbCdi: integer("nb_cdi"),
    nbCdd: integer("nb_cdd"),
    nbAlternants: integer("nb_alternants"),
    nbApprentis: integer("nb_apprentis"),
    nbStagiaires: integer("nb_stagiaires"),
    nbInterimaires: integer("nb_interimaires"),
    nbTempsPlein: integer("nb_temps_plein"),
    nbTempsPartiel: integer("nb_temps_partiel"),
    nbRecrutements: integer("nb_recrutements"),
    nbDeparts: integer("nb_departs"),

    // 'precise' | 'brackets'
    ageMode: text("age_mode").notNull().default("precise"),
    avgAge: real("avg_age"),
    ageUnder25: integer("age_under_25"),
    age25to34: integer("age_25_34"),
    age35to44: integer("age_35_44"),
    age45to54: integer("age_45_54"),
    age55plus: integer("age_55_plus"),

    // 'precise' | 'brackets'
    seniorityMode: text("seniority_mode").notNull().default("precise"),
    avgSeniority: real("avg_seniority"),
    seniorityUnder2: integer("seniority_under_2"),
    seniority2to5: integer("seniority_2_5"),
    seniority5to10: integer("seniority_5_10"),
    seniorityOver10: integer("seniority_over_10"),

    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("employment_workforce_exercise_idx").on(t.exerciseId)],
);

export const insertEmploymentWorkforceSchema = createInsertSchema(employmentWorkforceTable).omit({
  id: true,
  organizationId: true,
  exerciseId: true,
  updatedAt: true,
});
export type InsertEmploymentWorkforce = z.infer<typeof insertEmploymentWorkforceSchema>;
export type EmploymentWorkforce = typeof employmentWorkforceTable.$inferSelect;

// ─── DIVERSITÉ & INCLUSION ──────────────────────────────────────────────────
export const employmentDiversityTable = pgTable(
  "employment_diversity",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id").notNull().references(() => exercisesTable.id, { onDelete: "cascade" }),

    nbHommes: integer("nb_hommes"),
    nbFemmes: integer("nb_femmes"),
    nbNonBinaire: integer("nb_non_binaire"),
    nbAutreGenre: integer("nb_autre_genre"),
    nbPrefereNePasRepondreGenre: integer("nb_prefere_ne_pas_repondre_genre"),

    nbHandicap: integer("nb_handicap"),

    nbNationaliteFrancaise: integer("nb_nationalite_francaise"),
    nbNationaliteUe: integer("nb_nationalite_ue"),
    nbNationaliteHorsUe: integer("nb_nationalite_hors_ue"),
    nbDoubleNationalite: integer("nb_double_nationalite"),
    nbPrefereNePasRepondreNationalite: integer("nb_prefere_ne_pas_repondre_nationalite"),

    politiqueDiversite: boolean("politique_diversite"),
    referentHandicap: boolean("referent_handicap"),
    sensibilisationDiversite: boolean("sensibilisation_diversite"),
    politiqueContreDiscriminations: boolean("politique_contre_discriminations"),
    politiqueEgaliteProfessionnelle: boolean("politique_egalite_professionnelle"),
    teletravailAutorise: boolean("teletravail_autorise"),
    charteDiversite: boolean("charte_diversite"),
    indexEgaliteHf: real("index_egalite_hf"),

    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("employment_diversity_exercise_idx").on(t.exerciseId)],
);

export const insertEmploymentDiversitySchema = createInsertSchema(employmentDiversityTable).omit({
  id: true,
  organizationId: true,
  exerciseId: true,
  updatedAt: true,
});
export type InsertEmploymentDiversity = z.infer<typeof insertEmploymentDiversitySchema>;
export type EmploymentDiversity = typeof employmentDiversityTable.$inferSelect;

// ─── FORMATION & DÉVELOPPEMENT ──────────────────────────────────────────────
export const employmentTrainingTable = pgTable(
  "employment_training",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id").notNull().references(() => exercisesTable.id, { onDelete: "cascade" }),

    nbHeuresFormation: real("nb_heures_formation"),
    budgetFormation: real("budget_formation"),
    nbCollaborateursFormes: integer("nb_collaborateurs_formes"),
    nbEntretiensAnnuels: integer("nb_entretiens_annuels"),
    nbEntretiensProfessionnels: integer("nb_entretiens_professionnels"),
    nbCertifications: integer("nb_certifications"),
    nbEvolutionsInternes: integer("nb_evolutions_internes"),

    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("employment_training_exercise_idx").on(t.exerciseId)],
);

export const insertEmploymentTrainingSchema = createInsertSchema(employmentTrainingTable).omit({
  id: true,
  organizationId: true,
  exerciseId: true,
  updatedAt: true,
});
export type InsertEmploymentTraining = z.infer<typeof insertEmploymentTrainingSchema>;
export type EmploymentTraining = typeof employmentTrainingTable.$inferSelect;

// ─── KPI PERSONNALISÉS ──────────────────────────────────────────────────────
// A KPI is either a manually entered value ("value" mode) or computed from a
// formula referencing predefined variable codes ("formula" mode, evaluated
// server-side — see lib/employmentIndicators.ts). category is a free-form
// discriminator used purely to group KPIs by tab in the UI ('diversite' |
// 'formation' | 'autre').
export const employmentCustomKpisTable = pgTable(
  "employment_custom_kpis",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id").notNull().references(() => exercisesTable.id, { onDelete: "cascade" }),
    category: text("category").notNull().default("autre"),
    name: text("name").notNull(),
    unit: text("unit"),
    mode: text("mode").notNull().default("value"), // 'value' | 'formula'
    value: real("value"),
    formula: text("formula"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const insertEmploymentCustomKpiSchema = createInsertSchema(employmentCustomKpisTable).omit({
  id: true,
  organizationId: true,
  exerciseId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEmploymentCustomKpi = z.infer<typeof insertEmploymentCustomKpiSchema>;
export type EmploymentCustomKpi = typeof employmentCustomKpisTable.$inferSelect;
