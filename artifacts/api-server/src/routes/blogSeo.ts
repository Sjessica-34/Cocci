import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db, blogPostsTable } from "@workspace/db";
import { escapeHtml, sanitizeBlogHtml } from "../lib/blogContent";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const router = Router();
const frontendDistDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../animpact/dist/public");
const fallbackDocument = "<!doctype html><html lang=\"fr\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head><body><div id=\"root\"></div></body></html>";

async function documentWithContent(title: string, description: string, canonical: string, content: string, jsonLd?: unknown) {
  let document = fallbackDocument;
  try {
    document = await fs.readFile(path.join(frontendDistDir, "index.html"), "utf8");
  } catch {
    // The API can still serve the content if the frontend bundle is absent.
  }
  const head = `<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><link rel="canonical" href="${escapeHtml(canonical)}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonical)}">${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>` : ""}`;
  document = document.replace("</head>", `${head}</head>`);
  document = document.replace(/<div id="root"><\/div>/, `<div id="root">${content}</div>`);
  document = document.replace(/<script\b(?=[^>]*\btype=["']module["'])[^>]*>[\s\S]*?<\/script>/gi, "");
  return document;
}

function siteOrigin(req: import("express").Request) {
  const value = process.env.APP_URL;
  if (value) return new URL(value).origin;
  return `${req.protocol}://${req.get("host")}`;
}

function pageShell(main: string) {
  return `<div class="blog-font-body min-h-screen bg-[#fbfcf8] text-[#29382f]"><header class="border-b border-[#e8ece6]"><div class="mx-auto flex min-h-[66px] max-w-6xl items-center justify-between gap-4 px-5 sm:px-8"><a href="/" aria-label="Cocci, accueil"><img src="/logo-dark.png" alt="Cocci" width="92" height="28"></a><nav aria-label="Navigation du site" class="flex gap-5 text-sm"><a href="/">La plateforme</a><a href="/blog" aria-current="page">Le journal</a><a href="/sign-in">Se connecter</a></nav></div></header><main class="mx-auto min-h-[70vh] max-w-6xl px-5 py-10 sm:px-8">${main}</main><footer class="border-t border-[#e5e9e2] bg-[#f7f8f3] px-5 py-7 text-xs text-[#718075]"><a href="/">Cocci — la RSE, pas à pas</a><span class="mx-4">·</span><a href="/legal">Mentions légales</a></footer></div>`;
}

router.get("/sitemap.xml", async (req, res, next) => {
  try {
    const posts = await db.select({ slug: blogPostsTable.slug, updatedAt: blogPostsTable.updatedAt })
      .from(blogPostsTable).where(eq(blogPostsTable.isPublished, true))
      .orderBy(desc(blogPostsTable.publishedAt));
    const origin = siteOrigin(req);
    let existingPaths: string[] = [];
    try {
      const current = await fs.readFile(path.join(frontendDistDir, "sitemap.xml"), "utf8");
      existingPaths = [...current.matchAll(/<loc>([^<]+)<\/loc>/g)]
        .map((match) => new URL(match[1], origin).pathname);
    } catch {
      existingPaths = ["/"];
    }
    const paths = [...new Set([
      ...existingPaths,
      "/blog",
      ...posts.map((post) => `/blog/${encodeURIComponent(post.slug)}`),
    ])];
    const updatedAtByPath = new Map(posts.map((post) => [`/blog/${encodeURIComponent(post.slug)}`, post.updatedAt]));
    const urls = paths.map((pathname) => {
      const lastmod = updatedAtByPath.get(pathname);
      return `<url><loc>${escapeHtml(`${origin}${pathname}`)}</loc>${lastmod ? `<lastmod>${lastmod.toISOString()}</lastmod>` : ""}</url>`;
    });
    res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`);
  } catch (error) { next(error); }
});

router.get("/robots.txt", (req, res) => {
  res.type("text/plain").send(`User-agent: *\nAllow: /\nSitemap: ${siteOrigin(req)}/sitemap.xml\n`);
});

router.get("/blog", async (req, res, next) => {
  try {
    const posts = await db.select().from(blogPostsTable).where(eq(blogPostsTable.isPublished, true))
      .orderBy(desc(blogPostsTable.publishedAt), desc(blogPostsTable.createdAt));
    const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
    const pageSize = 12;
    const visible = posts.slice((page - 1) * pageSize, page * pageSize);
    const cards = visible.map((post) => {
      const image = post.coverImageUrl && /^https:\/\//i.test(post.coverImageUrl)
        ? `<img src="${escapeHtml(post.coverImageUrl)}" alt="${escapeHtml(post.coverImageAlt || post.title)}" loading="lazy" width="1200" height="675" class="mb-4 aspect-video w-full rounded-lg object-cover">`
        : "";
      return `<article class="mb-6 rounded-xl border border-[#e5e8df] bg-white p-5 sm:p-6">${image}<p class="text-xs text-[#527565]">${escapeHtml(post.category === "rse_advice" ? "Conseils RSE" : "Nouvelles de Cocci")}</p><h2 class="mt-2 text-2xl font-semibold text-[#263b30]"><a href="/blog/${encodeURIComponent(post.slug)}">${escapeHtml(post.title)}</a></h2><p class="mt-2 text-sm leading-6 text-[#667269]">${escapeHtml(post.metaDescription || post.excerpt)}</p><a class="mt-4 inline-block text-sm font-semibold text-[#245b43]" href="/blog/${encodeURIComponent(post.slug)}">Lire l’article →</a></article>`;
    }).join("");
    const paging = posts.length > pageSize ? `<nav aria-label="Pagination" class="flex justify-between"><a href="/blog?page=${Math.max(1, page - 1)}">← Précédent</a><a href="/blog?page=${page + 1}">Suivant →</a></nav>` : "";
    const main = `<p class="text-xs font-semibold uppercase tracking-widest text-[#527565]">Le journal Cocci</p><h1 class="mt-3 text-4xl font-semibold text-[#253d30]">Faire avancer la RSE, concrètement.</h1><p class="mt-4 mb-8 max-w-2xl text-[#67746a]">Des conseils utiles pour les petites et moyennes entreprises, et la vie de Cocci au fil du chemin.</p>${cards || "<p>Aucun article publié pour le moment.</p>"}${paging}`;
    const origin = siteOrigin(req);
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.send(await documentWithContent("Le journal Cocci — Conseils RSE et nouvelles", "Des repères pratiques pour faire avancer votre démarche RSE, et les nouvelles de l’équipe Cocci.", `${origin}/blog`, pageShell(main)));
  } catch (error) { next(error); }
});

router.get("/blog/:slug", async (req, res, next) => {
  try {
    const [post] = await db.select().from(blogPostsTable)
      .where(eq(blogPostsTable.slug, req.params.slug)).limit(1);
    if (!post || !post.isPublished) {
      res.status(404).send(await documentWithContent("Article introuvable — Le journal Cocci", "Cet article n’est pas disponible.", `${siteOrigin(req)}/blog/${encodeURIComponent(req.params.slug)}`, pageShell("<h1>Article introuvable</h1><p>Cet article n’est pas disponible.</p><a href=\"/blog\">Retour au journal</a>")));
      return;
    }
    const origin = siteOrigin(req);
    const canonical = `${origin}/blog/${encodeURIComponent(post.slug)}`;
    const title = post.seoTitle || post.title;
    const description = post.metaDescription || post.excerpt;
    const content = `<article class="mx-auto max-w-3xl"><p class="text-sm text-[#527565]">${escapeHtml(post.publishedAt?.toISOString().slice(0, 10) || "")}</p><h1 class="mt-3 text-4xl font-semibold text-[#253d30]">${escapeHtml(post.title)}</h1><p class="mt-4 text-lg text-[#67746a]">${escapeHtml(post.excerpt)}</p>${post.coverImageUrl && /^https:\/\//i.test(post.coverImageUrl) ? `<img src="${escapeHtml(post.coverImageUrl)}" alt="${escapeHtml(post.coverImageAlt || post.title)}" width="1200" height="675" class="my-8 aspect-video w-full rounded-xl object-cover">` : ""}<div class="blog-article-content">${sanitizeBlogHtml(post.content)}</div><p class="mt-10"><a href="/blog">← Tous les articles</a></p></article>`;
    const jsonLd = { "@context": "https://schema.org", "@type": "Article", headline: post.title, description, datePublished: post.publishedAt?.toISOString(), image: post.coverImageUrl || undefined, mainEntityOfPage: canonical };
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.send(await documentWithContent(`${title} — Le journal Cocci`, description, canonical, pageShell(content), jsonLd));
  } catch (error) { next(error); }
});

export default router;
