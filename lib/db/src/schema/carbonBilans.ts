import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const carbonBilansTable = pgTable("carbon_bilans", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id")
    .notNull()
    .references(() => organizationsTable.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  mode: text("mode").notNull(),           // 'saisie' | 'estimation'
  status: text("status").notNull().default("draft"), // 'draft' | 'validated'
  // ── Saisie fields ──────────────────────────────────────────────────────────
  methodology: text("methodology"),
  scope: text("scope"),                   // '1-2' | '1-2-3'
  energie1: numeric("energie1", { precision: 10, scale: 3 }),
  energie2: numeric("energie2", { precision: 10, scale: 3 }),
  horsEnergie1: numeric("hors_energie1", { precision: 10, scale: 3 }),
  horsEnergie2: numeric("hors_energie2", { precision: 10, scale: 3 }),
  intrantsBiens: numeric("intrants_biens", { precision: 10, scale: 3 }),
  intrantsServices: numeric("intrants_services", { precision: 10, scale: 3 }),
  futursEmballages: numeric("futurs_emballages", { precision: 10, scale: 3 }),
  fret: numeric("fret", { precision: 10, scale: 3 }),
  deplacements: numeric("deplacements", { precision: 10, scale: 3 }),
  dechetsDirects: numeric("dechets_directs", { precision: 10, scale: 3 }),
  immobilisations: numeric("immobilisations", { precision: 10, scale: 3 }),
  utilisation: numeric("utilisation", { precision: 10, scale: 3 }),
  finDeVie: numeric("fin_de_vie", { precision: 10, scale: 3 }),
  // ── Estimation fields ──────────────────────────────────────────────────────
  estEmployeeCount: integer("est_employee_count"),
  estOfficeSqm: integer("est_office_sqm"),
  estSubsidiaryCount: integer("est_subsidiary_count"),
  estHeatingType: text("est_heating_type"),   // 'gaz'|'fioul'|'electrique'|'pompe-chaleur'|'bois'|'reseau'
  estElecKwhYear: numeric("est_elec_kwh_year", { precision: 12, scale: 0 }),
  estVehicleCount: integer("est_vehicle_count"),
  estVehicleFuelType: text("est_vehicle_fuel_type"), // 'essence'|'diesel'|'electrique'|'hybride'|'gnv'
  estTrainKmYear: numeric("est_train_km_year", { precision: 12, scale: 0 }),
  estPlaneKmYear: numeric("est_plane_km_year", { precision: 12, scale: 0 }),
  estBuysGoodsKeur: numeric("est_buys_goods_keur", { precision: 10, scale: 1 }),
  estBuysServicesKeur: numeric("est_buys_services_keur", { precision: 10, scale: 1 }),
  estWasteTons: numeric("est_waste_tons", { precision: 10, scale: 2 }),
  estFreightTkm: numeric("est_freight_tkm", { precision: 12, scale: 0 }),
  // ──────────────────────────────────────────────────────────────────────────
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type CarbonBilan = typeof carbonBilansTable.$inferSelect;
export type InsertCarbonBilan = typeof carbonBilansTable.$inferInsert;
