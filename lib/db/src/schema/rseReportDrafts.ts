import { pgTable, serial, integer, text, boolean, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";
import { exercisesTable } from "./exercises";

export const rseReportDraftsTable = pgTable("rse_report_drafts", {
  id:             serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull().references(() => organizationsTable.id, { onDelete: "cascade" }),
  exerciseId:     integer("exercise_id").notNull().references(() => exercisesTable.id, { onDelete: "cascade" }),

  // Informations générales
  coverImageUrl:  text("cover_image_url"),
  version:        text("version").default("1.0"),
  period:         text("period"),

  // Éditorial
  editorialMode:       text("editorial_mode"),   // "ai" | "manual"
  editorialAuthor:     text("editorial_author"),
  editorialAuthorRole: text("editorial_author_role"),
  editorialCoSigned:   boolean("editorial_co_signed").default(false),
  editorialTone:       text("editorial_tone"),   // "institutionnel" | "inspirant" | "humain" | "technique" | "ambitieux" | "transparent"
  editorialThemes:     jsonb("editorial_themes").$type<string[]>().default([]),
  editorialLength:     text("editorial_length"), // "courte" | "standard" | "detaillee"
  editorialContext:    text("editorial_context"),
  editorialContent:    text("editorial_content"),

  // Présentation de l'entreprise
  companyDescription:    text("company_description"),
  companyMission:        text("company_mission"),
  isMissionEntreprise:   boolean("is_mission_entreprise").default(false),
  companyVision:         text("company_vision"),
  companyValues:         text("company_values"),
  companyKeyFigures:     text("company_key_figures"),

  // Historique (frise chronologique)
  timeline: jsonb("timeline").$type<Array<{
    id: string;
    date: string;
    title: string;
    description: string;
    photoUrl?: string;
  }>>().default([]),

  // Organigramme
  orgChartUrl: text("org_chart_url"),

  // Photos institutionnelles
  institutionalPhotos: jsonb("institutional_photos").$type<Array<{
    url: string;
    caption?: string;
  }>>().default([]),

  // Temps forts de l'année
  highlights: jsonb("highlights").$type<Array<{
    id: string;
    date: string;
    title: string;
    category: string;
    description: string;
    photos: string[];
  }>>().default([]),

  // Perspectives
  perspectivesMode:    text("perspectives_mode"),    // "ai" | "manual"
  perspectivesContent: text("perspectives_content"),

  // Périmètre & Méthodologie
  reportScope:       text("report_scope"),
  reportMethodology: text("report_methodology"),

  // Quota de générations (rapport illustré) — se réinitialise au 1er janvier chaque année civile
  generationCount: integer("generation_count").notNull().default(0),
  generationYear:  integer("generation_year").notNull().default(0), // 0 = jamais généré

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  uniqueIndex("rse_report_drafts_org_exercise_idx").on(t.organizationId, t.exerciseId),
]);
