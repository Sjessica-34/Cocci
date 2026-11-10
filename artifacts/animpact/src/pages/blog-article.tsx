import { useEffect } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, ArrowUpRight, RefreshCw } from "lucide-react";
import {
  getGetPublishedBlogPostQueryKey,
  useGetPublishedBlogPost,
} from "@workspace/api-client-react";
import type { BlogPostCategory } from "@workspace/api-client-react";

function categoryLabel(category: BlogPostCategory) {
  return category === "rse_advice" ? "Conseils RSE" : "Nouvelles de Cocci";
}

function safeImageUrl(url: string | null | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function setArticleMetadata(title: string, description: string, slug: string) {
  document.title = `${title} — Le journal Cocci`;
  const meta = document.head.querySelector<HTMLMetaElement>('meta[name="description"]')
    ?? document.head.appendChild(Object.assign(document.createElement("meta"), { name: "description" }));
  meta.content = description;
  for (const [property, value] of [["og:title", document.title], ["og:description", description]]) {
    let element = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
    if (!element) {
      element = document.createElement("meta");
      element.setAttribute("property", property);
      document.head.appendChild(element);
    }
    element.content = value;
  }
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = `${window.location.origin}/blog/${encodeURIComponent(slug)}`;
}

export function BlogArticle() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const { data: post, isLoading, isError, refetch, isFetching } = useGetPublishedBlogPost(slug, {
    query: { queryKey: getGetPublishedBlogPostQueryKey(slug), enabled: Boolean(slug) },
  });

  useEffect(() => {
    if (post) setArticleMetadata(post.title, post.excerpt, post.slug);
    else if (!isLoading) {
      document.title = "Article introuvable — Le journal Cocci";
    }
  }, [post, isLoading]);

  const imageUrl = safeImageUrl(post?.coverImageUrl);
  const date = post?.publishedAt
    ? new Date(post.publishedAt)
    : post?.createdAt ? new Date(post.createdAt) : null;
  const dateLabel = date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(date)
    : null;

  return (
    <div className="blog-font-body flex min-h-[100dvh] flex-col bg-[#fbfcf8] text-[#29382f]">
      <header className="border-b border-[#e8ece6] bg-[#fbfcf8]">
        <div className="mx-auto flex min-h-[66px] max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" aria-label="Cocci, accueil" className="shrink-0" data-testid="link-article-home">
            <img src={`${import.meta.env.BASE_URL}logo-dark.png`} alt="Cocci" className="h-7 w-auto" />
          </Link>
          <nav aria-label="Navigation du site" className="flex items-center gap-5 text-sm">
            <Link href="/" className="hidden text-[#58665b] hover:text-[#163028] sm:inline" data-testid="link-article-platform">La plateforme</Link>
            <Link href="/blog" className="font-semibold text-[#176347]" data-testid="link-article-journal">Le journal</Link>
            <Link href="/sign-in" className="rounded-md border border-[#dbe4da] px-3 py-2 font-medium text-[#33453b] hover:bg-[#f0f5ee]" data-testid="link-article-signin">Se connecter</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-10">
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-medium text-[#5e7164] hover:text-[#1d6045]" data-testid="link-article-back">
            <ArrowLeft className="h-4 w-4" /> Tous les articles
          </Link>
          {isLoading ? (
            <div className="mt-8 space-y-5" aria-label="Chargement de l’article" data-testid="loading-blog-article">
              <div className="h-5 w-32 animate-pulse rounded bg-[#e8ece5]" />
              <div className="h-12 max-w-2xl animate-pulse rounded bg-[#e8ece5]" />
              <div className="h-64 animate-pulse rounded-xl bg-[#e8ece5]" />
              <div className="space-y-2"><div className="h-4 animate-pulse rounded bg-[#e8ece5]" /><div className="h-4 w-4/5 animate-pulse rounded bg-[#e8ece5]" /></div>
            </div>
          ) : isError || !post ? (
            <div className="mt-10 rounded-xl border border-[#e6d7c8] bg-[#fbf5ed] px-6 py-12 text-center" role="alert" data-testid="error-blog-article">
              <p className="blog-font-display text-2xl text-[#493f32]">{isError ? "Impossible de charger cet article." : "Cet article est introuvable."}</p>
              <p className="mt-2 text-sm text-[#766c5e]">{isError ? "Le contenu n’a pas pu être récupéré." : "Il a peut-être été déplacé ou n’est plus publié."}</p>
              {isError && <button type="button" onClick={() => refetch()} disabled={isFetching} className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#294c39] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1e3e2d] disabled:opacity-60" data-testid="button-article-retry"><RefreshCw className="h-4 w-4" /> Réessayer</button>}
              <div><Link href="/blog" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#245b43] underline underline-offset-4" data-testid="link-article-browse">Parcourir le journal <ArrowUpRight className="h-4 w-4" /></Link></div>
            </div>
          ) : (
            <article className="mx-auto mt-8 max-w-[760px]" data-testid={`article-blog-post-${post.id}`}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold uppercase tracking-[0.13em] text-[#557463]">
                <span className="rounded-full bg-[#edf4ed] px-3 py-1.5" data-testid="text-article-category">{categoryLabel(post.category)}</span>
                {dateLabel && <time dateTime={post.publishedAt || post.createdAt} className="font-medium normal-case tracking-normal text-[#7c877d]" data-testid="text-article-date">{dateLabel}</time>}
              </div>
              <h1 className="blog-font-display mt-5 max-w-[720px] text-[2.45rem] leading-[1.05] text-[#253d30] sm:text-[3.35rem]" data-testid="text-article-title">{post.title}</h1>
              <p className="mt-5 max-w-[680px] text-[16px] leading-7 text-[#647267] sm:text-[17px]" data-testid="text-article-excerpt">{post.excerpt}</p>
              {imageUrl && <img src={imageUrl} alt={post.coverImageAlt || post.title} width={1200} height={675} loading="lazy" className="mt-8 aspect-video max-h-[440px] w-full rounded-xl border border-[#e3e8df] object-cover" data-testid="img-article-cover" />}
              <div className="mt-9 border-t border-[#e7ebe4] pt-7">
                <div className="blog-article-content max-w-[680px] break-words text-[15px] leading-[1.9] text-[#46564b]" data-testid="text-article-content" dangerouslySetInnerHTML={{ __html: post.content }} />
              </div>
              <div className="mt-12 border-t border-[#e7ebe4] pt-6">
                <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-semibold text-[#245b43] hover:text-[#123e2d]" data-testid="link-article-end-back"><ArrowLeft className="h-4 w-4" /> Retour au journal</Link>
              </div>
            </article>
          )}
        </div>
      </main>
      <footer className="border-t border-[#e5e9e2] bg-[#f7f8f3]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-7 text-xs text-[#718075] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Link href="/" className="font-semibold tracking-wide text-[#244435]" data-testid="link-article-footer-home">Cocci — la RSE, pas à pas</Link>
          <div className="flex gap-5"><Link href="/blog" className="hover:text-[#244435]" data-testid="link-article-footer-journal">Le journal</Link><Link href="/legal" className="hover:text-[#244435]" data-testid="link-article-footer-legal">Mentions légales</Link></div>
        </div>
      </footer>
    </div>
  );
}
