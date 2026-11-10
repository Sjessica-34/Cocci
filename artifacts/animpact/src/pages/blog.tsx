import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, BookOpen, RefreshCw } from "lucide-react";
import {
  getListPublishedBlogPostsQueryKey,
  useListPublishedBlogPosts,
} from "@workspace/api-client-react";
import type { BlogPost, BlogPostCategory } from "@workspace/api-client-react";

function setPageMetadata(title: string, description: string, canonicalPath: string) {
  document.title = title;
  const ensureMeta = (selector: string, key: string, value: string) => {
    let element = document.head.querySelector<HTMLMetaElement>(selector);
    if (!element) {
      element = document.createElement("meta");
      element.setAttribute(selector.includes("property") ? "property" : "name", key);
      document.head.appendChild(element);
    }
    element.content = value;
  };
  ensureMeta('meta[name="description"]', "description", description);
  ensureMeta('meta[property="og:title"]', "og:title", title);
  ensureMeta('meta[property="og:description"]', "og:description", description);
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = `${window.location.origin}${canonicalPath}`;
}

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

function postDate(post: BlogPost) {
  const date = post.publishedAt || post.createdAt;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? null
    : new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(parsed);
}

function PublicBlogHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#e8ece6] bg-[#fbfcf8]/95 backdrop-blur">
      <div className="mx-auto flex min-h-[66px] max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" aria-label="Cocci, accueil" className="shrink-0" data-testid="link-cocci-home">
          <img src={`${import.meta.env.BASE_URL}logo-dark.png`} alt="Cocci" className="h-7 w-auto" />
        </Link>
        <nav aria-label="Navigation du site" className="flex items-center gap-5 text-sm">
          <Link href="/" className="hidden text-[#58665b] transition-colors hover:text-[#163028] sm:inline" data-testid="link-site-home">La plateforme</Link>
          <Link href="/blog" className="font-semibold text-[#176347]" aria-current="page" data-testid="link-blog-home">Le journal</Link>
          <Link href="/sign-in" className="rounded-md border border-[#dbe4da] px-3 py-2 font-medium text-[#33453b] transition-colors hover:bg-[#f0f5ee]" data-testid="link-blog-signin">Se connecter</Link>
        </nav>
      </div>
    </header>
  );
}

function PublicBlogFooter() {
  return (
    <footer className="border-t border-[#e5e9e2] bg-[#f7f8f3]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-7 text-xs text-[#718075] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <Link href="/" className="font-semibold tracking-wide text-[#244435]" data-testid="link-blog-footer-home">Cocci — la RSE, pas à pas</Link>
        <div className="flex items-center gap-5">
          <Link href="/blog" className="hover:text-[#244435]" data-testid="link-blog-footer-journal">Le journal</Link>
          <Link href="/legal" className="hover:text-[#244435]" data-testid="link-blog-footer-legal">Mentions légales</Link>
        </div>
      </div>
    </footer>
  );
}

function BlogPostCard({ post }: { post: BlogPost }) {
  const imageUrl = safeImageUrl(post.coverImageUrl);
  const date = postDate(post);
  return (
    <article className="group grid overflow-hidden rounded-xl border border-[#e5e8df] bg-[#fffefa] transition-colors hover:border-[#b8cbbb] sm:grid-cols-[minmax(190px,0.78fr)_1.22fr]" data-testid={`card-blog-post-${post.id}`}>
      <Link href={`/blog/${encodeURIComponent(post.slug)}`} aria-label={`Lire : ${post.title}`} className="block min-h-[170px] overflow-hidden bg-[#e8eee4] sm:min-h-[220px]" data-testid={`link-blog-post-${post.id}`}>
        {imageUrl ? (
          <img src={imageUrl} alt="" loading="lazy" className="h-full min-h-[170px] w-full object-cover transition-transform duration-500 group-hover:scale-[1.025] sm:min-h-[220px]" />
        ) : (
          <div className="flex h-full min-h-[170px] items-end bg-[linear-gradient(135deg,#dce9dc_0%,#edf0df_55%,#f3e7d6_100%)] p-5 sm:min-h-[220px]" aria-hidden="true">
            <span className="blog-font-display text-4xl text-[#62806b]/70">Cocci</span>
          </div>
        )}
      </Link>
      <div className="flex flex-col items-start p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#527565]">
          <span className="rounded-full bg-[#edf4ed] px-2.5 py-1" data-testid={`text-blog-category-${post.id}`}>{categoryLabel(post.category)}</span>
          {date && <time dateTime={post.publishedAt || post.createdAt} className="tracking-normal text-[#7c877d]">{date}</time>}
        </div>
        <Link href={`/blog/${encodeURIComponent(post.slug)}`} className="mt-4 text-left" data-testid={`link-blog-title-${post.id}`}>
          <h2 className="blog-font-display text-[1.6rem] leading-[1.13] text-[#263b30] transition-colors group-hover:text-[#176347] sm:text-[1.85rem]">{post.title}</h2>
        </Link>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#667269]" data-testid={`text-blog-excerpt-${post.id}`}>{post.excerpt}</p>
        <Link href={`/blog/${encodeURIComponent(post.slug)}`} className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-[#245b43] hover:text-[#113b2b]" data-testid={`link-blog-read-${post.id}`}>
          Lire l’article <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

export function BlogIndex() {
  const [category, setCategory] = useState<"all" | BlogPostCategory>("all");
  const { data: posts, isLoading, isError, refetch, isFetching } = useListPublishedBlogPosts(undefined, {
    query: { queryKey: getListPublishedBlogPostsQueryKey() },
  });

  useEffect(() => {
    setPageMetadata(
      "Le journal Cocci — Conseils RSE et nouvelles",
      "Des repères pratiques pour faire avancer votre démarche RSE, et les nouvelles de l’équipe Cocci.",
      "/blog",
    );
  }, []);

  const filteredPosts = useMemo(
    () => (posts ?? []).filter((post) => category === "all" || post.category === category),
    [posts, category],
  );

  return (
    <div className="blog-font-body flex min-h-[100dvh] flex-col bg-[#fbfcf8] text-[#29382f]">
      <PublicBlogHeader />
      <main className="flex-1">
        <section className="border-b border-[#e8ece5] bg-[#f2f5ed]">
          <div className="mx-auto max-w-6xl px-5 pb-10 pt-10 sm:px-8 sm:pb-12 sm:pt-14">
            <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-[#637267] hover:text-[#245b43]" data-testid="link-blog-back-home">
              <ArrowLeft className="h-3.5 w-3.5" /> Retour à Cocci
            </Link>
            <div className="mt-8 grid items-end gap-6 md:grid-cols-[1fr_auto]">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.19em] text-[#527565]">Le journal Cocci</p>
                <h1 className="blog-font-display mt-3 text-[2.5rem] leading-[1.04] text-[#253d30] sm:text-[3.25rem]">Faire avancer la RSE,<br className="hidden sm:block" /> concrètement.</h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-[#67746a] sm:text-[15px]">Des conseils utiles pour les petites et moyennes entreprises, et la vie de Cocci au fil du chemin.</p>
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer les articles">
                {[
                  { value: "all" as const, label: "Tout le journal" },
                  { value: "rse_advice" as const, label: "Conseils RSE" },
                  { value: "cocci_news" as const, label: "Nouvelles de Cocci" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setCategory(item.value)}
                    aria-pressed={category === item.value}
                    data-testid={`button-blog-filter-${item.value}`}
                    className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#317454] focus-visible:ring-offset-2 ${category === item.value ? "border-[#234b39] bg-[#234b39] text-white" : "border-[#d8e1d7] bg-[#fbfcf8] text-[#53675a] hover:border-[#9cb8a1]"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-12">
          <div className="mb-5 flex items-center gap-2 text-xs text-[#778378]">
            <BookOpen className="h-4 w-4 text-[#527565]" />
            <span data-testid="text-blog-results-count">{isLoading ? "Chargement du journal" : `${filteredPosts.length} ${filteredPosts.length > 1 ? "publications" : "publication"}`}</span>
          </div>
          {isLoading ? (
            <div className="grid gap-4" aria-label="Chargement des articles" data-testid="loading-blog-posts">
              {[0, 1, 2].map((key) => <div key={key} className="h-56 animate-pulse rounded-xl border border-[#e6e9e1] bg-[#f0f2ec]" />)}
            </div>
          ) : isError ? (
            <div role="alert" className="rounded-xl border border-[#e6d7c8] bg-[#fbf5ed] px-6 py-10 text-center" data-testid="error-blog-posts">
              <p className="blog-font-display text-2xl text-[#493f32]">Le journal ne répond pas pour le moment.</p>
              <p className="mt-2 text-sm text-[#766c5e]">Réessayez dans un instant.</p>
              <button type="button" onClick={() => refetch()} disabled={isFetching} className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#294c39] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1e3e2d] disabled:opacity-60" data-testid="button-blog-retry">
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Réessayer
              </button>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d8e0d5] bg-[#f8f9f4] px-6 py-14 text-center" data-testid="empty-blog-posts">
              <BookOpen className="mx-auto h-7 w-7 text-[#91a596]" />
              <p className="blog-font-display mt-4 text-2xl text-[#3a5142]">{posts?.length ? "Aucune publication dans cette rubrique." : "Le journal prend forme."}</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#748076]">{posts?.length ? "Choisissez une autre rubrique pour parcourir les publications." : "Les articles de Cocci apparaîtront ici dès leur publication."}</p>
              {posts?.length ? <button type="button" onClick={() => setCategory("all")} className="mt-5 text-sm font-semibold text-[#245b43] underline underline-offset-4" data-testid="button-blog-clear-filter">Voir tout le journal</button> : null}
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredPosts.map((post) => <BlogPostCard key={post.id} post={post} />)}
            </div>
          )}
        </section>
      </main>
      <PublicBlogFooter />
    </div>
  );
}
