import { pgTable, serial, integer, text, date, numeric, timestamp } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { exercisesTable } from "./exercises";

export const suppliersTable = pgTable("suppliers", {
  id:                    serial("id").primaryKey(),
  organizationId:        integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  exerciseId:            integer("exercise_id").notNull().references(() => exercisesTable.id, { onDelete: "cascade" }),
  // Identity
  name:                  text("name"),
  category:              text("category"),
  contactName:           text("contact_name"),
  phone:                 text("phone"),
  email:                 text("email"),
  website:               text("website"),
  address:               text("address"),
  postalCode:            text("postal_code"),
  city:                  text("city"),
  department:            text("department"),
  region:                text("region"),
  country:               text("country"),
  siret:                 text("siret"),
  relationshipStartDate: date("relationship_start_date"),
  annualAmount:          numeric("annual_amount"),
  comments:              text("comments"),
  // Evaluation
  criticality:           integer("criticality"),   // 1-5
  riskLevel:             integer("risk_level"),    // 1-5
  dependency:            integer("dependency"),    // 1-5
  alternatives:          text("alternatives"),
  certifications:        text("certifications"),
  rsePolicy:             text("rse_policy"),
  evalComments:          text("eval_comments"),
  // Timestamps
  createdAt:             timestamp("created_at").notNull().defaultNow(),
  updatedAt:             timestamp("updated_at").notNull().defaultNow(),
});
