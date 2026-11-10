import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  CreateAdminBlogPostBody,
  CreateAdminBlogPostResponse,
  DeleteAdminBlogPostParams,
  GetPublishedBlogPostParams,
  GetPublishedBlogPostResponse,
  ListAdminBlogPostsResponse,
  ListPublishedBlogPostsQueryParams,
  ListPublishedBlogPostsResponse,
  SetAdminBlogPostPublishedBody,
  SetAdminBlogPostPublishedParams,
  SetAdminBlogPostPublishedResponse,
  UpdateAdminBlogPostBody,
  UpdateAdminBlogPostParams,
  UpdateAdminBlogPostResponse,
} from "@workspace/api-zod";
import { db, blogPostsTable, blogSyncSettingsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireSuperAdmin } from "../middlewares/requireSuperAdmin";
import { sanitizeBlogHtml } from "../lib/blogContent";

const router = Router();
router.use("/admin/blog", requireAuth, requireSuperAdmin);

function isUniqueSlugViolation(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === "23505";
}

function normalizePostInput(input: {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: "rse_advice" | "cocci_news";
  coverImageUrl?: string | null;
  coverImageAlt?: string;
  keywords?: string[];
  language?: string;
  seoTitle?: string | null;
  metaDescription?: string | null;
}) {
  return {
    title: input.title.trim(),
    slug: input.slug.trim().toLowerCase(),
    excerpt: input.excerpt.trim(),
    content: sanitizeBlogHtml(input.content.trim()),
    category: input.category,
    coverImageUrl: input.coverImageUrl?.trim() || null,
    coverImageAlt: input.coverImageAlt?.trim() ?? "",
    keywords: input.keywords ?? [],
    language: input.language?.trim() || "fr",
    seoTitle: input.seoTitle?.trim() || null,
    metaDescription: input.metaDescription?.trim() || null,
  };
}

router.get("/blog/posts", async (req, res): Promise<void> => {
  const query = ListPublishedBlogPostsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const rows = await db
    .select()
    .from(blogPostsTable)
    .where(query.data.category
      ? and(eq(blogPostsTable.isPublished, true), eq(blogPostsTable.category, query.data.category))
      : eq(blogPostsTable.isPublished, true))
    .orderBy(desc(blogPostsTable.publishedAt), desc(blogPostsTable.createdAt));

  res.json(ListPublishedBlogPostsResponse.parse(rows));
});

router.get("/blog/posts/:slug", async (req, res): Promise<void> => {
  const params = GetPublishedBlogPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [post] = await db
    .select()
    .from(blogPostsTable)
    .where(and(eq(blogPostsTable.slug, params.data.slug), eq(blogPostsTable.isPublished, true)))
    .limit(1);

  if (!post) {
    res.status(404).json({ error: "Article introuvable" });
    return;
  }

  res.json(GetPublishedBlogPostResponse.parse(post));
});

router.get("/admin/blog/posts", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(blogPostsTable)
    .orderBy(desc(blogPostsTable.updatedAt), desc(blogPostsTable.id));
  res.json(ListAdminBlogPostsResponse.parse(rows));
});

router.post("/admin/blog/posts", async (req, res): Promise<void> => {
  const parsed = CreateAdminBlogPostBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const input = normalizePostInput(parsed.data);
  if (!input.title || !input.slug || !input.content) {
    res.status(400).json({ error: "Le titre, le slug et le contenu sont obligatoires." });
    return;
  }

  try {
    const [post] = await db
      .insert(blogPostsTable)
      .values({
        ...input,
        source: "local",
        manuallyEdited: false,
        createdByUserId: req.currentUser!.id,
      })
      .returning();
    res.status(201).json(CreateAdminBlogPostResponse.parse(post));
  } catch (error) {
    if (isUniqueSlugViolation(error)) {
      res.status(409).json({ error: "Ce slug est déjà utilisé." });
      return;
    }
    throw error;
  }
});

router.patch("/admin/blog/posts/:id", async (req, res): Promise<void> => {
  const params = UpdateAdminBlogPostParams.safeParse(req.params);
  const parsed = UpdateAdminBlogPostBody.safeParse(req.body);
  if (!params.success || !parsed.success || !Number.isInteger(params.data?.id) || params.data.id < 1) {
    res.status(400).json({ error: !params.success ? params.error.message : !parsed.success ? parsed.error.message : "ID invalide." });
    return;
  }

  const input = normalizePostInput(parsed.data);
  if (!input.title || !input.slug || !input.content) {
    res.status(400).json({ error: "Le titre, le slug et le contenu sont obligatoires." });
    return;
  }

  try {
    const [post] = await db
      .update(blogPostsTable)
      .set({ ...input, manuallyEdited: true, updatedAt: new Date() })
      .where(eq(blogPostsTable.id, params.data.id))
      .returning();

    if (!post) {
      res.status(404).json({ error: "Article introuvable" });
      return;
    }
    res.json(UpdateAdminBlogPostResponse.parse(post));
  } catch (error) {
    if (isUniqueSlugViolation(error)) {
      res.status(409).json({ error: "Ce slug est déjà utilisé." });
      return;
    }
    throw error;
  }
});

router.delete("/admin/blog/posts/:id", async (req, res): Promise<void> => {
  const params = DeleteAdminBlogPostParams.safeParse(req.params);
  if (!params.success || !Number.isInteger(params.data?.id) || params.data.id < 1) {
    res.status(400).json({ error: params.success ? "ID invalide." : params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(blogPostsTable)
    .where(eq(blogPostsTable.id, params.data.id))
    .returning({ id: blogPostsTable.id });
  if (!deleted) {
    res.status(404).json({ error: "Article introuvable" });
    return;
  }
  res.sendStatus(204);
});

router.patch("/admin/blog/posts/:id/publish", async (req, res): Promise<void> => {
  const params = SetAdminBlogPostPublishedParams.safeParse(req.params);
  const body = SetAdminBlogPostPublishedBody.safeParse(req.body);
  if (!params.success || !body.success || !Number.isInteger(params.data?.id) || params.data.id < 1) {
    res.status(400).json({ error: !params.success ? params.error.message : !body.success ? body.error.message : "ID invalide." });
    return;
  }

  const [existing] = await db
    .select({ isPublished: blogPostsTable.isPublished, publishedAt: blogPostsTable.publishedAt })
    .from(blogPostsTable)
    .where(eq(blogPostsTable.id, params.data.id))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Article introuvable" });
    return;
  }

  const [post] = await db
    .update(blogPostsTable)
    .set({
      isPublished: body.data.isPublished,
      publishedAt: body.data.isPublished
        ? existing.publishedAt ?? new Date()
        : null,
      updatedAt: new Date(),
    })
    .where(eq(blogPostsTable.id, params.data.id))
    .returning();

  res.json(SetAdminBlogPostPublishedResponse.parse(post));
});

router.get("/admin/blog/settings", async (_req, res): Promise<void> => {
  const [settings] = await db
    .select()
    .from(blogSyncSettingsTable)
    .where(eq(blogSyncSettingsTable.id, 1))
    .limit(1);
  res.json({
    visiaSyncEnabled: settings?.visiaSyncEnabled ?? false,
    lastSyncAt: settings?.lastSyncAt ?? null,
    lastSyncError: settings?.lastSyncError ?? null,
    rightsConfirmed: process.env.VISIA_CONTENT_REUSE_CONFIRMED === "true",
  });
});

router.patch("/admin/blog/settings", async (req, res): Promise<void> => {
  const enabled = req.body?.visiaSyncEnabled;
  if (typeof enabled !== "boolean") {
    res.status(400).json({ error: "visiaSyncEnabled doit être un booléen." });
    return;
  }
  if (enabled && process.env.VISIA_CONTENT_REUSE_CONFIRMED !== "true") {
    res.status(409).json({ error: "Les droits de réutilisation Visia doivent être confirmés avant d’activer la synchronisation." });
    return;
  }
  const [settings] = await db
    .insert(blogSyncSettingsTable)
    .values({ id: 1, visiaSyncEnabled: enabled, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: blogSyncSettingsTable.id,
      set: { visiaSyncEnabled: enabled, updatedAt: new Date() },
    })
    .returning();
  res.json({
    visiaSyncEnabled: settings.visiaSyncEnabled,
    lastSyncAt: settings.lastSyncAt,
    lastSyncError: settings.lastSyncError,
    rightsConfirmed: process.env.VISIA_CONTENT_REUSE_CONFIRMED === "true",
  });
});

async function syncVisiaArticles(): Promise<{ imported: number; updated: number; skipped: number }> {
  if (process.env.VISIA_CONTENT_REUSE_CONFIRMED !== "true") {
    throw new Error("Les droits de réutilisation Visia ne sont pas confirmés.");
  }
  const feedUrl = process.env.VISIA_FEED_URL;
  if (!feedUrl) throw new Error("VISIA_FEED_URL n’est pas configurée.");
  const parsedFeedUrl = new URL(feedUrl);
  if (parsedFeedUrl.protocol !== "https:") throw new Error("Le flux Visia doit utiliser HTTPS.");
  const response = await fetch(parsedFeedUrl, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Le flux Visia a répondu HTTP ${response.status}.`);
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object" || !("articles" in payload) || !Array.isArray(payload.articles)) {
    throw new Error("Le flux Visia n’a pas le format attendu.");
  }
  if (payload.articles.length > 300) throw new Error("Le flux Visia dépasse la limite de 300 articles.");

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  for (const candidate of payload.articles) {
    if (!candidate || typeof candidate !== "object") { skipped++; continue; }
    const article = candidate as Record<string, unknown>;
    const title = typeof article.title === "string" ? article.title.trim() : "";
    const slug = typeof article.slug === "string" ? article.slug.trim().toLowerCase() : "";
    const description = typeof article.description === "string" ? article.description.trim() : "";
    const rawHtml = typeof article.bodyHtml === "string" ? article.bodyHtml : "";
    if (!title || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !rawHtml) { skipped++; continue; }
    const content = sanitizeBlogHtml(rawHtml);
    if (!content) { skipped++; continue; }
    const cover = typeof article.coverImage === "string" ? article.coverImage : null;
    const safeCover = cover && /^https:\/\//i.test(cover) ? cover : null;
    const language = typeof article.language === "string" ? article.language.slice(0, 12) : "fr";
    const keywords = Array.isArray(article.keywords)
      ? article.keywords.filter((item): item is string => typeof item === "string").slice(0, 30)
      : [];
    const sourceUpdatedAt = typeof article.publishedAt === "string" && !Number.isNaN(Date.parse(article.publishedAt))
      ? new Date(article.publishedAt)
      : null;
    const structuredData = article.jsonLd && typeof article.jsonLd === "object" && !Array.isArray(article.jsonLd)
      ? article.jsonLd as Record<string, unknown>
      : null;
    const values = {
      title: title.slice(0, 180),
      slug,
      excerpt: description.slice(0, 400),
      content,
      category: "rse_advice",
      coverImageUrl: safeCover,
      coverImageAlt: title.slice(0, 250),
      keywords,
      language,
      seoTitle: title.slice(0, 180),
      metaDescription: description.slice(0, 400),
      structuredData,
      canonicalUrl: null,
      source: "visia",
      sourceUpdatedAt,
      isPublished: Boolean(sourceUpdatedAt),
      publishedAt: sourceUpdatedAt,
      updatedAt: new Date(),
    } as const;
    const [existing] = await db.select().from(blogPostsTable).where(eq(blogPostsTable.slug, slug)).limit(1);
    if (existing && (existing.source === "local" || existing.manuallyEdited)) { skipped++; continue; }
    if (existing) {
      const [changed] = await db.update(blogPostsTable).set(values)
        .where(and(
          eq(blogPostsTable.id, existing.id),
          eq(blogPostsTable.source, "visia"),
          eq(blogPostsTable.manuallyEdited, false),
        ))
        .returning({ id: blogPostsTable.id });
      if (changed) updated++;
      else skipped++;
    } else {
      await db.insert(blogPostsTable).values(values);
      imported++;
    }
  }
  return { imported, updated, skipped };
}

async function runSync(res: import("express").Response): Promise<void> {
  const [settings] = await db
    .select()
    .from(blogSyncSettingsTable)
    .where(eq(blogSyncSettingsTable.id, 1))
    .limit(1);
  if (!settings?.visiaSyncEnabled) {
    res.status(409).json({ error: "La synchronisation Visia est désactivée." });
    return;
  }
  try {
    const result = await syncVisiaArticles();
    await db.insert(blogSyncSettingsTable).values({
      id: 1,
      visiaSyncEnabled: true,
      lastSyncAt: new Date(),
      lastSyncError: null,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: blogSyncSettingsTable.id,
      set: { lastSyncAt: new Date(), lastSyncError: null, updatedAt: new Date() },
    });
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue pendant la synchronisation.";
    await db.insert(blogSyncSettingsTable).values({
      id: 1,
      visiaSyncEnabled: true,
      lastSyncError: message.slice(0, 1000),
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: blogSyncSettingsTable.id,
      set: { lastSyncError: message.slice(0, 1000), updatedAt: new Date() },
    });
    res.status(502).json({ error: message });
  }
}

router.post("/admin/blog/sync", async (_req, res): Promise<void> => runSync(res));

router.post("/blog/cron-sync", async (req, res): Promise<void> => {
  const expected = process.env.BLOG_SYNC_TOKEN;
  const authorization = req.header("authorization") ?? "";
  let provided = authorization.replace(/^Bearer\s+/i, "");
  if (/^Basic\s+/i.test(authorization)) {
    try {
      const decoded = Buffer.from(authorization.replace(/^Basic\s+/i, ""), "base64").toString("utf8");
      provided = decoded.slice(decoded.indexOf(":") + 1);
    } catch {
      provided = "";
    }
  }
  if (!expected || !provided || expected.length !== provided.length) {
    res.status(401).json({ error: "Non autorisé." });
    return;
  }
  const { timingSafeEqual } = await import("node:crypto");
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) {
    res.status(401).json({ error: "Non autorisé." });
    return;
  }
  await runSync(res);
});

export default router;
