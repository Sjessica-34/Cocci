import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  integer,
  uniqueIndex,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const blogPostsTable = pgTable(
  "blog_posts",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    excerpt: text("excerpt").notNull(),
    content: text("content").notNull(),
    category: text("category").notNull(),
    coverImageUrl: text("cover_image_url"),
    coverImageAlt: text("cover_image_alt").notNull().default(""),
    keywords: text("keywords").array().notNull().default([]),
    language: text("language").notNull().default("fr"),
    seoTitle: text("seo_title"),
    metaDescription: text("meta_description"),
    structuredData: jsonb("structured_data").$type<Record<string, unknown> | null>(),
    canonicalUrl: text("canonical_url"),
    source: text("source").notNull().default("local"),
    sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
    manuallyEdited: boolean("manually_edited").notNull().default(false),
    isPublished: boolean("is_published").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdByUserId: integer("created_by_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("blog_posts_slug_unique").on(table.slug),
    index("blog_posts_published_at_idx").on(table.publishedAt),
  ],
);

export type BlogPost = typeof blogPostsTable.$inferSelect;
export type InsertBlogPost = typeof blogPostsTable.$inferInsert;

export const blogSyncSettingsTable = pgTable("blog_sync_settings", {
  id: integer("id").primaryKey().default(1),
  visiaSyncEnabled: boolean("visia_sync_enabled").notNull().default(false),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastSyncError: text("last_sync_error"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BlogSyncSettings = typeof blogSyncSettingsTable.$inferSelect;
