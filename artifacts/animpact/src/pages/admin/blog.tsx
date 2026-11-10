import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  BookOpen,
  Eye,
  EyeOff,
  FilePlus2,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  getGetPublishedBlogPostQueryKey,
  getListAdminBlogPostsQueryKey,
  getListPublishedBlogPostsQueryKey,
  useCreateAdminBlogPost,
  useDeleteAdminBlogPost,
  useGetAdminBlogSyncSettings,
  useListAdminBlogPosts,
  useRunAdminBlogSync,
  useSetAdminBlogPostPublished,
  useUpdateAdminBlogSyncSettings,
  useUpdateAdminBlogPost,
} from "@workspace/api-client-react";
import type { BlogPost, BlogPostCategory, BlogPostInput } from "@workspace/api-client-react";
import { AdminLayout } from "./layout";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type BlogForm = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: BlogPostCategory;
  coverImageUrl: string;
  coverImageAlt: string;
  keywords: string;
  language: string;
  seoTitle: string;
  metaDescription: string;
};

const emptyForm: BlogForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  category: "rse_advice",
  coverImageUrl: "",
  coverImageAlt: "",
  keywords: "",
  language: "fr",
  seoTitle: "",
  metaDescription: "",
};

function postDate(post: BlogPost) {
  const date = new Date(post.updatedAt || post.createdAt);
  return Number.isNaN(date.getTime())
    ? "Date inconnue"
    : new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function errorText(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Une erreur est survenue. Vérifiez les champs puis réessayez.";
}

function categoryName(category: BlogPostCategory) {
  return category === "rse_advice" ? "Conseils RSE" : "Nouvelles de Cocci";
}

export function AdminBlog() {
  const queryClient = useQueryClient();
  const { data: posts, isLoading, isError, refetch, isFetching } = useListAdminBlogPosts({
    query: { queryKey: getListAdminBlogPostsQueryKey() },
  });
  const createPost = useCreateAdminBlogPost();
  const updatePost = useUpdateAdminBlogPost();
  const deletePost = useDeleteAdminBlogPost();
  const setPostPublished = useSetAdminBlogPostPublished();
  const syncSettings = useGetAdminBlogSyncSettings();
  const updateSyncSettings = useUpdateAdminBlogSyncSettings();
  const runSync = useRunAdminBlogSync();
  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const form = useForm<BlogForm>({ defaultValues: emptyForm, mode: "onSubmit" });
  const { control, handleSubmit: submitForm, reset, watch } = form;
  const titleValue = watch("title") ?? "";
  const slugValue = watch("slug") ?? "";
  const excerptValue = watch("excerpt") ?? "";
  const contentValue = watch("content") ?? "";
  const editorRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const editorWasOpenRef = useRef(false);

  const filteredPosts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("fr");
    return (posts ?? []).filter((post) =>
      !normalizedSearch
      || post.title.toLocaleLowerCase("fr").includes(normalizedSearch)
      || post.slug.toLocaleLowerCase("fr").includes(normalizedSearch)
      || post.excerpt.toLocaleLowerCase("fr").includes(normalizedSearch),
    );
  }, [posts, search]);

  const publishedCount = (posts ?? []).filter((post) => post.isPublished).length;
  const draftCount = (posts ?? []).length - publishedCount;
  const isSaving = createPost.isPending || updatePost.isPending;

  useEffect(() => {
    if (!editorOpen) {
      if (editorWasOpenRef.current) openerRef.current?.focus();
      editorWasOpenRef.current = false;
      return;
    }
    editorWasOpenRef.current = true;
    reset(editingPost ? {
      title: editingPost.title,
      slug: editingPost.slug,
      excerpt: editingPost.excerpt,
      content: editingPost.content,
      category: editingPost.category,
      coverImageUrl: editingPost.coverImageUrl ?? "",
      coverImageAlt: editingPost.coverImageAlt ?? "",
      keywords: editingPost.keywords?.join(", ") ?? "",
      language: editingPost.language ?? "fr",
      seoTitle: editingPost.seoTitle ?? "",
      metaDescription: editingPost.metaDescription ?? "",
    } : emptyForm);
    setFormError("");
  }, [editorOpen, editingPost, reset]);

  useEffect(() => {
    if (!editorOpen) return;
    const dialog = editorRef.current;
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    dialog?.querySelector<HTMLElement>(focusableSelector)?.focus();
    function containKeyboardFocus(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSaving) {
        event.preventDefault();
        setEditorOpen(false);
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", containKeyboardFocus);
    return () => document.removeEventListener("keydown", containKeyboardFocus);
  }, [editorOpen, isSaving]);

  function invalidateBlogQueries(slugs: Array<string | null | undefined>) {
    void queryClient.invalidateQueries({ queryKey: getListAdminBlogPostsQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getListPublishedBlogPostsQueryKey() });
    for (const slug of new Set(slugs.filter((value): value is string => Boolean(value)))) {
      void queryClient.invalidateQueries({ queryKey: getGetPublishedBlogPostQueryKey(slug) });
    }
  }

  function openCreate() {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setEditingPost(null);
    setFormError("");
    setNotice("");
    setEditorOpen(true);
  }

  function openEdit(post: BlogPost) {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setEditingPost(post);
    setFormError("");
    setNotice("");
    setEditorOpen(true);
  }

  function handleSave(values: BlogForm) {
    setFormError("");
    setNotice("");
    const input: BlogPostInput = {
      title: values.title.trim(),
      slug: values.slug.trim(),
      excerpt: values.excerpt.trim(),
      content: values.content,
      category: values.category,
      coverImageUrl: values.coverImageUrl.trim() || null,
      coverImageAlt: values.coverImageAlt.trim(),
      keywords: values.keywords.split(",").map((item) => item.trim()).filter(Boolean),
      language: values.language.trim() || "fr",
      seoTitle: values.seoTitle.trim() || null,
      metaDescription: values.metaDescription.trim() || null,
    };
    if (!input.title || !input.slug || !input.content.trim()) {
      setFormError("Le titre, le slug et le contenu sont obligatoires.");
      return;
    }
    if (editingPost) {
      updatePost.mutate({ id: editingPost.id, data: input }, {
        onSuccess: (updated) => {
          invalidateBlogQueries([editingPost.slug, updated.slug]);
          setNotice("La publication a été mise à jour.");
          setEditorOpen(false);
        },
        onError: (error) => setFormError(errorText(error)),
      });
    } else {
      createPost.mutate({ data: input }, {
        onSuccess: (created) => {
          invalidateBlogQueries([created.slug]);
          setNotice("La publication a été créée en brouillon.");
          setEditorOpen(false);
        },
        onError: (error) => setFormError(errorText(error)),
      });
    }
  }

  function handlePublish(post: BlogPost) {
    setNotice("");
    setPostPublished.mutate({ id: post.id, data: { isPublished: !post.isPublished } }, {
      onSuccess: (updated) => {
        invalidateBlogQueries([post.slug, updated.slug]);
        setNotice(updated.isPublished ? "La publication est en ligne." : "La publication a été dépubliée.");
      },
      onError: (error) => setNotice(`Échec de la mise à jour : ${errorText(error)}`),
    });
  }

  function handleDelete(post: BlogPost) {
    const confirmed = window.confirm(`Supprimer « ${post.title} » ? Cette action est définitive.`);
    if (!confirmed) return;
    setNotice("");
    deletePost.mutate({ id: post.id }, {
      onSuccess: () => {
        invalidateBlogQueries([post.slug]);
        setNotice("La publication a été supprimée.");
      },
      onError: (error) => setNotice(`Échec de la suppression : ${errorText(error)}`),
    });
  }

  function handleSyncToggle() {
    const enabled = !syncSettings.data?.visiaSyncEnabled;
    updateSyncSettings.mutate({ data: { visiaSyncEnabled: enabled } }, {
      onSuccess: () => {
        setNotice(enabled ? "La synchronisation Visia est activée." : "La synchronisation Visia est désactivée.");
        void queryClient.invalidateQueries({ queryKey: syncSettings.queryKey });
      },
      onError: (error) => setNotice(`Impossible de modifier le réglage : ${errorText(error)}`),
    });
  }

  function handleSyncNow() {
    runSync.mutate(undefined, {
      onSuccess: (result) => {
        setNotice(`Synchronisation terminée : ${result.imported} ajouté(s), ${result.updated} mis à jour, ${result.skipped} ignoré(s).`);
        void queryClient.invalidateQueries({ queryKey: getListAdminBlogPostsQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getListPublishedBlogPostsQueryKey() });
        void queryClient.invalidateQueries({ queryKey: syncSettings.queryKey });
      },
      onError: (error) => {
        setNotice(`Échec de la synchronisation : ${errorText(error)}`);
        void queryClient.invalidateQueries({ queryKey: syncSettings.queryKey });
      },
    });
  }

  return (
    <AdminLayout>
      <div className="space-y-6 pb-10" data-testid="admin-blog-page">
        <header className="flex flex-col justify-between gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Éditorial</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Journal Cocci</h1>
            <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">Rédigez, relisez et publiez les conseils RSE et les actualités de Cocci.</p>
          </div>
          <button type="button" onClick={openCreate} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" data-testid="button-create-blog-post">
            <FilePlus2 className="h-4 w-4" /> Nouvelle publication
          </button>
        </header>

        {notice && <div role="status" className="rounded-md border border-[#c9dfcf] bg-[#edf6ef] px-4 py-3 text-sm text-[#285a3e]" data-testid="status-blog-notice">{notice}</div>}

        <section className="rounded-lg border border-border/70 bg-card p-4 sm:p-5" aria-labelledby="blog-sync-heading" data-testid="blog-visia-sync">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 id="blog-sync-heading" className="text-sm font-semibold text-foreground">Import Visia</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Les articles sont copiés dans Cocci et restent disponibles si le flux est arrêté.
                Une modification manuelle protège l’article des imports suivants.
              </p>
              {syncSettings.data?.lastSyncAt && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Dernière synchronisation : {postDate({ updatedAt: syncSettings.data.lastSyncAt, createdAt: syncSettings.data.lastSyncAt } as BlogPost)}
                </p>
              )}
              {syncSettings.data?.lastSyncError && (
                <p className="mt-2 text-xs text-destructive" role="alert">Dernière erreur : {syncSettings.data.lastSyncError}</p>
              )}
              {!syncSettings.data?.rightsConfirmed && (
                <p className="mt-2 text-xs text-amber-700" role="status">
                  Import désactivé : confirme les droits de réutilisation Visia avant de configurer VISIA_CONTENT_REUSE_CONFIRMED.
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSyncToggle}
                disabled={updateSyncSettings.isPending || !syncSettings.data?.rightsConfirmed}
                className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="button-toggle-visia-sync"
              >
                {syncSettings.data?.visiaSyncEnabled ? "Désactiver l’import" : "Activer l’import"}
              </button>
              <button
                type="button"
                onClick={handleSyncNow}
                disabled={runSync.isPending || !syncSettings.data?.visiaSyncEnabled}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="button-sync-visia"
              >
                <RefreshCw className={`h-4 w-4 ${runSync.isPending ? "animate-spin" : ""}`} />
                Synchroniser maintenant
              </button>
            </div>
          </div>
        </section>

        {!isLoading && !isError && posts && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border/50 pb-4 text-sm text-muted-foreground" data-testid="blog-admin-stats">
            <span><strong className="font-semibold text-foreground">{posts.length}</strong> publication{posts.length !== 1 ? "s" : ""}</span>
            <span><strong className="font-semibold text-[#347653]">{publishedCount}</strong> en ligne</span>
            <span><strong className="font-semibold text-[#9a7240]">{draftCount}</strong> brouillon{draftCount !== 1 ? "s" : ""}</span>
          </div>
        )}

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un titre, un slug…"
            aria-label="Rechercher une publication"
            className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="input-search-blog-posts"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3" aria-label="Chargement des publications" data-testid="loading-admin-blog">
            {[0, 1, 2].map((index) => <div key={index} className="h-[106px] animate-pulse rounded-lg border border-border/50 bg-card" />)}
          </div>
        ) : isError ? (
          <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 px-6 py-12 text-center" data-testid="error-admin-blog">
            <p className="text-sm font-medium text-foreground">Impossible de charger les publications.</p>
            <p className="mt-1 text-sm text-muted-foreground">Vérifiez votre connexion et réessayez.</p>
            <button type="button" onClick={() => refetch()} disabled={isFetching} className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60" data-testid="button-retry-admin-blog">
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Réessayer
            </button>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/60 px-6 py-14 text-center" data-testid="empty-admin-blog">
            <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-4 text-sm font-semibold text-foreground">{posts?.length ? "Aucun résultat pour cette recherche." : "Aucune publication pour l’instant."}</p>
            <p className="mt-1 text-sm text-muted-foreground">{posts?.length ? "Essayez un autre terme." : "Les brouillons et articles publiés apparaîtront ici."}</p>
            {!posts?.length && <button type="button" onClick={openCreate} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline" data-testid="button-create-first-blog-post"><FilePlus2 className="h-4 w-4" /> Créer une publication</button>}
          </div>
        ) : (
          <section className="overflow-hidden rounded-lg border border-border/70 bg-card" aria-label="Publications" data-testid="list-admin-blog-posts">
            <div className="divide-y divide-border/60">
              {filteredPosts.map((post) => (
                <article key={post.id} className="flex flex-col gap-4 p-4 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:px-5" data-testid={`row-admin-blog-post-${post.id}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-sm font-semibold text-foreground" data-testid={`text-admin-blog-title-${post.id}`}>{post.title}</h2>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${post.isPublished ? "bg-[#e8f3eb] text-[#286341]" : "bg-[#f6f0e5] text-[#8b6934]"}`} data-testid={`status-admin-blog-${post.id}`}>{post.isPublished ? "En ligne" : "Brouillon"}</span>
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground" data-testid={`text-admin-blog-category-${post.id}`}>{categoryName(post.category)}</span>
                    </div>
                    <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground" data-testid={`text-admin-blog-slug-${post.id}`}>/blog/{post.slug}</p>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{post.excerpt || "Aucun extrait"}</p>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">Mis à jour le {postDate(post)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                    <button type="button" onClick={() => handlePublish(post)} disabled={setPostPublished.isPending} aria-label={post.isPublished ? `Dépublier ${post.title}` : `Publier ${post.title}`} title={post.isPublished ? "Dépublier" : "Publier"} className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold text-[#347653] hover:bg-[#edf5ef] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid={`button-toggle-publish-${post.id}`}>
                      {post.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span>{post.isPublished ? "Dépublier" : "Publier"}</span>
                    </button>
                    <button type="button" onClick={() => openEdit(post)} className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid={`button-edit-blog-post-${post.id}`}>
                      <Pencil className="h-4 w-4" /> Modifier
                    </button>
                    <button type="button" onClick={() => handleDelete(post)} disabled={deletePost.isPending} className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid={`button-delete-blog-post-${post.id}`}>
                      <Trash2 className="h-4 w-4" /> Supprimer
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {editorOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#17251d]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) setEditorOpen(false); }} data-testid="dialog-blog-editor">
            <section ref={editorRef} role="dialog" aria-modal="true" aria-labelledby="blog-editor-title" className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-xl border border-border bg-background shadow-xl sm:rounded-xl">
              <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-background px-5 py-4 sm:px-6">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Édition éditoriale</p>
                  <h2 id="blog-editor-title" className="mt-1 text-lg font-semibold text-foreground">{editingPost ? "Modifier la publication" : "Nouvelle publication"}</h2>
                </div>
                <button type="button" onClick={() => setEditorOpen(false)} disabled={isSaving} aria-label="Fermer l’éditeur" className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="button-close-blog-editor"><X className="h-4 w-4" /></button>
              </header>
              <Form {...form}>
                <form onSubmit={submitForm(handleSave)} className="space-y-4 px-5 py-5 sm:px-6">
                  {formError && <div role="alert" className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-destructive" data-testid="error-blog-editor">{formError}</div>}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={control}
                      name="title"
                      rules={{
                        required: "Le titre est obligatoire.",
                        validate: (value) => Boolean(value.trim()) || "Le titre est obligatoire.",
                        maxLength: { value: 180, message: "Le titre ne peut pas dépasser 180 caractères." },
                      }}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5 sm:col-span-2">
                          <FormLabel className="text-xs font-semibold text-foreground">Titre <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <input {...field} required maxLength={180} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="input-blog-title" />
                          </FormControl>
                          <FormDescription className="sr-only">Titre de la publication, 180 caractères maximum.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="slug"
                      rules={{
                        required: "Le slug est obligatoire.",
                        maxLength: { value: 180, message: "Le slug ne peut pas dépasser 180 caractères." },
                        pattern: { value: /^[a-zA-Z0-9-]+$/, message: "Utilisez uniquement des lettres, chiffres et tirets." },
                      }}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-xs font-semibold text-foreground">Slug <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <input {...field} required maxLength={180} pattern="[a-zA-Z0-9-]+" title="Utilisez des lettres, chiffres et tirets." className="h-10 w-full rounded-md border border-input bg-background px-3 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="input-blog-slug" />
                          </FormControl>
                          <FormDescription className="text-[11px]">L’adresse publique sera /blog/{slugValue || "votre-slug"}.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="category"
                      rules={{ required: "Choisissez une catégorie." }}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-xs font-semibold text-foreground">Catégorie <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <select {...field} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="select-blog-category">
                              <option value="rse_advice">Conseils RSE</option>
                              <option value="cocci_news">Nouvelles de Cocci</option>
                            </select>
                          </FormControl>
                          <FormDescription className="sr-only">Choisissez les conseils RSE ou les nouvelles de Cocci.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="excerpt"
                      rules={{ maxLength: { value: 400, message: "L’extrait ne peut pas dépasser 400 caractères." } }}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5 sm:col-span-2">
                          <FormLabel className="text-xs font-semibold text-foreground">Extrait</FormLabel>
                          <FormControl>
                            <textarea {...field} rows={2} maxLength={400} className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-5 outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="textarea-blog-excerpt" />
                          </FormControl>
                          <FormDescription className="text-right text-[10px]">{excerptValue.length}/400</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="content"
                      rules={{
                        required: "Le contenu est obligatoire.",
                        validate: (value) => Boolean(value.trim()) || "Le contenu est obligatoire.",
                      }}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5 sm:col-span-2">
                          <FormLabel className="text-xs font-semibold text-foreground">Contenu HTML <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <textarea {...field} required rows={11} className="min-h-52 w-full resize-y rounded-md border border-input bg-background px-3 py-2.5 text-sm leading-6 outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="textarea-blog-content" />
                          </FormControl>
                          <FormDescription className="text-[11px]">Les éléments HTML non autorisés sont retirés automatiquement.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="coverImageUrl"
                      rules={{
                        validate: (value) => {
                          if (!value.trim()) return true;
                          try {
                            const parsed = new URL(value);
                            return parsed.protocol === "https:" || parsed.protocol === "http:" || "Utilisez une URL http ou https.";
                          } catch {
                            return "Saisissez une URL valide.";
                          }
                        },
                      }}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5 sm:col-span-2">
                          <FormLabel className="text-xs font-semibold text-foreground">URL de l’image de couverture <span className="font-normal text-muted-foreground">(facultatif)</span></FormLabel>
                          <FormControl>
                            <input {...field} type="url" placeholder="https://" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="input-blog-cover-url" />
                          </FormControl>
                          <FormDescription className="sr-only">URL facultative, en HTTP ou HTTPS.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="coverImageAlt"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5 sm:col-span-2">
                          <FormLabel className="text-xs font-semibold text-foreground">Texte alternatif de l’image</FormLabel>
                          <FormControl><input {...field} maxLength={250} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="keywords"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5 sm:col-span-2">
                          <FormLabel className="text-xs font-semibold text-foreground">Mots-clés</FormLabel>
                          <FormControl><input {...field} placeholder="RSE, biodiversité, PME" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /></FormControl>
                          <FormDescription className="text-[11px]">Séparez les mots-clés par des virgules.</FormDescription>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="language"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-xs font-semibold text-foreground">Langue</FormLabel>
                          <FormControl><input {...field} maxLength={12} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="seoTitle"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-xs font-semibold text-foreground">Titre SEO</FormLabel>
                          <FormControl><input {...field} maxLength={180} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="metaDescription"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5 sm:col-span-2">
                          <FormLabel className="text-xs font-semibold text-foreground">Description SEO</FormLabel>
                          <FormControl><textarea {...field} rows={2} maxLength={400} className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-5 outline-none focus-visible:ring-2 focus-visible:ring-ring" /></FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <footer className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
                    <button type="button" onClick={() => setEditorOpen(false)} disabled={isSaving} className="h-10 rounded-md border border-input px-4 text-sm font-medium hover:bg-muted disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="button-cancel-blog-editor">Annuler</button>
                    <button type="submit" disabled={isSaving || !titleValue.trim() || !slugValue.trim() || !contentValue.trim()} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" data-testid="button-save-blog-post">
                      {isSaving && <RefreshCw className="h-4 w-4 animate-spin" />}{isSaving ? "Enregistrement…" : editingPost ? "Enregistrer" : "Créer le brouillon"}
                    </button>
                  </footer>
                </form>
              </Form>
            </section>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
