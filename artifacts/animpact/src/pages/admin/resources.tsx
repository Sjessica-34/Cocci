import { useState } from "react";
import { AdminLayout } from "./layout";
import {
  useListAdminGlobalResources,
  getListAdminGlobalResourcesQueryKey,
  useCreateAdminGlobalResource,
  useUpdateAdminResource,
  useDeleteAdminResource,
  usePublishAdminResource,
} from "@workspace/api-client-react";
import type { Resource } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  FileText,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Globe,
  BookOpen,
  Search,
  Video,
  Link2,
  File,
  Upload,
} from "lucide-react";
import { useStorageUpload } from "@/hooks/useStorageUpload";
import { cn } from "@/lib/utils";

const DOC_TYPE_OPTIONS = [
  { value: "PDF", label: "PDF" },
  { value: "Word", label: "Word" },
  { value: "Excel", label: "Excel" },
  { value: "Vidéo", label: "Vidéo" },
  { value: "Lien", label: "Lien" },
  { value: "Autre", label: "Autre" },
];

const CATEGORY_OPTIONS = [
  { value: "Guide", label: "Guide" },
  { value: "Formation", label: "Formation" },
  { value: "Modèle", label: "Modèle" },
  { value: "Réglementation", label: "Réglementation" },
  { value: "Étude de cas", label: "Étude de cas" },
  { value: "Autre", label: "Autre" },
];

function docTypeIcon(type: string | null | undefined) {
  switch (type) {
    case "Vidéo": return <Video className="h-5 w-5 text-rose-500" />;
    case "Lien": return <Link2 className="h-5 w-5 text-blue-500" />;
    case "PDF": return <FileText className="h-5 w-5 text-orange-500" />;
    default: return <File className="h-5 w-5 text-muted-foreground" />;
  }
}

function docTypeBadgeClass(type: string | null | undefined) {
  switch (type) {
    case "PDF": return "bg-orange-50 text-orange-700 border-orange-200";
    case "Word": return "bg-blue-50 text-blue-700 border-blue-200";
    case "Excel": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Vidéo": return "bg-rose-50 text-rose-700 border-rose-200";
    case "Lien": return "bg-sky-50 text-sky-700 border-sky-200";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

interface ResourceDialogProps {
  open: boolean;
  onClose: () => void;
  resource?: Resource | null;
}

function ResourceDialog({ open, onClose, resource }: ResourceDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createResource = useCreateAdminGlobalResource();
  const updateResource = useUpdateAdminResource();

  const isEdit = !!resource;

  const [form, setForm] = useState({
    title: resource?.title ?? "",
    description: resource?.description ?? "",
    category: resource?.category ?? "",
    documentType: resource?.documentType ?? "",
    fileUrl: resource?.fileUrl ?? "",
    imageUrl: resource?.imageUrl ?? "",
    isPublished: resource?.isPublished ?? true,
  });

  // Reset form when dialog opens with different resource
  const [lastResourceId, setLastResourceId] = useState<number | null | undefined>(resource?.id);
  if (resource?.id !== lastResourceId) {
    setLastResourceId(resource?.id ?? null);
    setForm({
      title: resource?.title ?? "",
      description: resource?.description ?? "",
      category: resource?.category ?? "",
      documentType: resource?.documentType ?? "",
      fileUrl: resource?.fileUrl ?? "",
      imageUrl: resource?.imageUrl ?? "",
      isPublished: resource?.isPublished ?? true,
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;

    const data = {
      title: form.title.trim(),
      description: form.description || undefined,
      category: form.category || undefined,
      documentType: form.documentType || undefined,
      fileUrl: form.fileUrl || undefined,
      imageUrl: form.imageUrl || undefined,
      isPublished: form.isPublished,
    };

    if (isEdit && resource) {
      updateResource.mutate({ id: resource.id, data }, {
        onSuccess: () => {
          toast({ title: "Ressource mise à jour." });
          queryClient.invalidateQueries({ queryKey: getListAdminGlobalResourcesQueryKey() });
          onClose();
        },
      });
    } else {
      createResource.mutate({ data }, {
        onSuccess: () => {
          toast({ title: "Ressource créée." });
          queryClient.invalidateQueries({ queryKey: getListAdminGlobalResourcesQueryKey() });
          onClose();
        },
      });
    }
  }

  const isPending = createResource.isPending || updateResource.isPending;

  const { uploadFile, isUploading, progress } = useStorageUpload({
    onSuccess: (res) => {
      setForm((f) => ({ ...f, fileUrl: res.fileUrl }));
      toast({ title: "Fichier téléversé." });
    },
    onError: () => toast({ title: "Échec du téléversement.", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier la ressource" : "Ajouter une ressource globale"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="title">Titre <span className="text-destructive">*</span></Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Nom du document ou de la vidéo"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.documentType} onValueChange={(v) => setForm((f) => ({ ...f, documentType: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Catégorie</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fileUrl">Fichier</Label>
            <div className="flex gap-2">
              <Input
                id="fileUrl"
                value={form.fileUrl}
                onChange={(e) => setForm((f) => ({ ...f, fileUrl: e.target.value }))}
                placeholder="Coller une URL ou téléverser ci-dessous"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 relative overflow-hidden gap-1.5"
                disabled={isUploading}
              >
                <Upload className="h-4 w-4" />
                {isUploading ? `${progress}%` : "Téléverser"}
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
                  disabled={isUploading}
                />
              </Button>
            </div>
            {isUploading && (
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all rounded-full" style={{ width: `${progress}%` }} />
              </div>
            )}
            {form.fileUrl && !isUploading && (
              <p className="text-xs text-muted-foreground truncate">{form.fileUrl}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Décrivez brièvement le contenu..."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublished"
              checked={form.isPublished}
              onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <Label htmlFor="isPublished" className="cursor-pointer text-sm font-normal">
              Visible par les clients dès la création
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={isPending || isUploading || !form.title.trim()}>
              {isPending ? "Enregistrement..." : isEdit ? "Enregistrer" : "Créer la ressource"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminResources() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  const { data: resources, isLoading } = useListAdminGlobalResources({
    query: { queryKey: getListAdminGlobalResourcesQueryKey() },
  });

  const deleteResource = useDeleteAdminResource();
  const publishResource = usePublishAdminResource();

  const filtered = (resources ?? []).filter((r) =>
    !search ||
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.description?.toLowerCase().includes(search.toLowerCase()) ||
    r.category?.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditingResource(null);
    setDialogOpen(true);
  }

  function openEdit(r: Resource) {
    setEditingResource(r);
    setDialogOpen(true);
  }

  function handlePublish(r: Resource) {
    publishResource.mutate(
      { id: r.id, data: { isPublished: !r.isPublished } },
      {
        onSuccess: () => {
          toast({ title: r.isPublished ? "Ressource dépubliée." : "Ressource publiée." });
          queryClient.invalidateQueries({ queryKey: getListAdminGlobalResourcesQueryKey() });
        },
      }
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Globe className="h-4 w-4 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Bibliothèque globale</h1>
            </div>
            <p className="text-muted-foreground text-sm mt-1.5 ml-11">
              Documents et vidéos publiés ici sont visibles par tous les clients de la plateforme.
            </p>
          </div>
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une ressource
          </Button>
        </div>

        {/* Stats */}
        {!isLoading && resources && (
          <div className="flex items-center gap-6 text-sm text-muted-foreground border-b border-border/50 pb-4">
            <span><span className="font-semibold text-foreground">{resources.length}</span> ressource{resources.length !== 1 ? "s" : ""} au total</span>
            <span><span className="font-semibold text-emerald-600">{resources.filter((r) => r.isPublished).length}</span> publiée{resources.filter((r) => r.isPublished).length !== 1 ? "s" : ""}</span>
            <span><span className="font-semibold text-amber-600">{resources.filter((r) => !r.isPublished).length}</span> brouillon{resources.filter((r) => !r.isPublished).length !== 1 ? "s" : ""}</span>
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white dark:bg-black"
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl bg-muted/10">
            <BookOpen className="mx-auto h-12 w-12 opacity-20 mb-4" />
            <p className="text-sm font-medium">
              {search ? "Aucune ressource ne correspond à cette recherche." : "Aucune ressource globale pour l'instant."}
            </p>
            {!search && (
              <Button variant="outline" size="sm" className="mt-4" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Créer la première ressource
              </Button>
            )}
          </div>
        ) : (
          <Card className="overflow-hidden border-border/50">
            <div className="divide-y divide-border/50">
              {filtered.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start gap-4 p-4 hover:bg-muted/20 transition-colors group"
                >
                  {/* Icon */}
                  <div className="h-11 w-11 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    {docTypeIcon(r.documentType)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{r.title}</p>
                      {r.documentType && (
                        <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5 py-0 font-medium", docTypeBadgeClass(r.documentType))}>
                          {r.documentType}
                        </Badge>
                      )}
                      {r.category && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 font-medium bg-muted/50">
                          {r.category}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] h-4 px-1.5 py-0 font-medium",
                          r.isPublished
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        )}
                      >
                        {r.isPublished ? "Publié" : "Brouillon"}
                      </Badge>
                    </div>
                    {r.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{r.description}</p>
                    )}
                    {r.fileUrl && (
                      <a
                        href={r.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline mt-0.5 inline-block truncate max-w-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {r.fileUrl}
                      </a>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("h-8 w-8", r.isPublished ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" : "text-muted-foreground")}
                      title={r.isPublished ? "Dépublier" : "Publier"}
                      onClick={() => handlePublish(r)}
                      disabled={publishResource.isPending}
                    >
                      {r.isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      title="Modifier"
                      onClick={() => openEdit(r)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer cette ressource ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{r.title}" sera retiré de la bibliothèque globale et disparaîtra chez tous les clients.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                              deleteResource.mutate(
                                { id: r.id },
                                {
                                  onSuccess: () => {
                                    toast({ title: "Ressource supprimée." });
                                    queryClient.invalidateQueries({ queryKey: getListAdminGlobalResourcesQueryKey() });
                                  },
                                }
                              );
                            }}
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <ResourceDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        resource={editingResource}
      />
    </AdminLayout>
  );
}
