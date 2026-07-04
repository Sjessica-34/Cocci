import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "./layout";
import {
  useListAdminOrganizations,
  getListAdminOrganizationsQueryKey,
  useListAdminOrgMembers,
  getListAdminOrgMembersQueryKey,
  useListAdminOrgResources,
  getListAdminOrgResourcesQueryKey,
  useCreateAdminResource,
  useUpdateAdminResource,
  useDeleteAdminResource,
  usePublishAdminResource,
} from "@workspace/api-client-react";
import type { Resource } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  ArrowLeft,
  Building2,
  Users,
  CreditCard,
  Activity,
  Clock,
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  FileText,
  Link as LinkIcon,
  Shield,
} from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  member: "Membre",
  viewer: "Lecteur",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-primary/10 text-primary border-primary/20",
  admin: "bg-blue-50 text-blue-700 border-blue-200",
  member: "bg-green-50 text-green-700 border-green-200",
  viewer: "bg-muted text-muted-foreground border-border",
};

const DOC_TYPES = ["PDF", "Word", "Excel", "Vidéo", "Lien", "Autre"] as const;

const DOC_TYPE_COLORS: Record<string, string> = {
  PDF: "bg-red-50 text-red-700 border-red-200",
  Word: "bg-blue-50 text-blue-700 border-blue-200",
  Excel: "bg-green-50 text-green-700 border-green-200",
  Vidéo: "bg-violet-50 text-violet-700 border-violet-200",
  Lien: "bg-amber-50 text-amber-700 border-amber-200",
  Autre: "bg-muted text-muted-foreground border-border",
};

type ResourceForm = {
  title: string;
  description: string;
  category: string;
  documentType: string;
  fileUrl: string;
  imageUrl: string;
};

const EMPTY_FORM: ResourceForm = {
  title: "",
  description: "",
  category: "",
  documentType: "",
  fileUrl: "",
  imageUrl: "",
};

function ResourceDialog({
  orgId,
  resource,
  open,
  onClose,
}: {
  orgId: number;
  resource: Resource | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ResourceForm>(
    resource
      ? {
          title: resource.title,
          description: resource.description ?? "",
          category: resource.category ?? "",
          documentType: resource.documentType ?? "",
          fileUrl: resource.fileUrl ?? "",
          imageUrl: resource.imageUrl ?? "",
        }
      : EMPTY_FORM,
  );

  const createResource = useCreateAdminResource();
  const updateResource = useUpdateAdminResource();
  const isEditing = !!resource;
  const isPending = createResource.isPending || updateResource.isPending;

  function handleClose() {
    setForm(EMPTY_FORM);
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;

    const data = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      category: form.category.trim() || undefined,
      documentType: form.documentType || undefined,
      fileUrl: form.fileUrl.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
    };

    const onSuccess = () => {
      toast({ title: isEditing ? "Document modifié." : "Document ajouté." });
      queryClient.invalidateQueries({ queryKey: getListAdminOrgResourcesQueryKey(orgId) });
      handleClose();
    };
    const onError = () => {
      toast({ variant: "destructive", title: "Une erreur est survenue." });
    };

    if (isEditing) {
      updateResource.mutate({ id: resource.id, data }, { onSuccess, onError });
    } else {
      createResource.mutate({ orgId, data }, { onSuccess, onError });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifier le document" : "Ajouter un document"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Titre <span className="text-destructive">*</span></Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ex. : Guide RSE 2024"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Description du document…"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="category">Catégorie</Label>
              <Input
                id="category"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="Ex. : RSE, Juridique…"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Type de document</Label>
              <Select
                value={form.documentType}
                onValueChange={(v) => setForm((f) => ({ ...f, documentType: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir…" />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fileUrl">URL de la pièce jointe</Label>
            <Input
              id="fileUrl"
              value={form.fileUrl}
              onChange={(e) => setForm((f) => ({ ...f, fileUrl: e.target.value }))}
              placeholder="https://…"
              type="url"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="imageUrl">URL de l'image d'illustration (facultatif)</Label>
            <Input
              id="imageUrl"
              value={form.imageUrl}
              onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
              placeholder="https://…"
              type="url"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || !form.title.trim()}>
              {isPending ? "Enregistrement…" : isEditing ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResourcesTab({ orgId }: { orgId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  const { data: resources, isLoading } = useListAdminOrgResources(orgId, {
    query: { queryKey: getListAdminOrgResourcesQueryKey(orgId) },
  });

  const deleteResource = useDeleteAdminResource();
  const publishResource = usePublishAdminResource();

  function handleEdit(resource: Resource) {
    setEditingResource(resource);
    setDialogOpen(true);
  }

  function handleAddNew() {
    setEditingResource(null);
    setDialogOpen(true);
  }

  function handleDialogClose() {
    setDialogOpen(false);
    setEditingResource(null);
  }

  function handleDelete(id: number) {
    deleteResource.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Document supprimé." });
          queryClient.invalidateQueries({ queryKey: getListAdminOrgResourcesQueryKey(orgId) });
        },
        onError: () => toast({ variant: "destructive", title: "Erreur lors de la suppression." }),
      },
    );
  }

  function handleTogglePublish(resource: Resource) {
    publishResource.mutate(
      { id: resource.id, data: { isPublished: !resource.isPublished } },
      {
        onSuccess: () => {
          toast({ title: resource.isPublished ? "Document dépublié." : "Document publié." });
          queryClient.invalidateQueries({ queryKey: getListAdminOrgResourcesQueryKey(orgId) });
        },
        onError: () => toast({ variant: "destructive", title: "Erreur lors de la mise à jour." }),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {resources?.length ?? 0} document{(resources?.length ?? 0) > 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un document
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : !resources?.length ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
          <BookOpen className="mx-auto h-10 w-10 opacity-30 mb-3" />
          <p className="text-sm font-medium">Aucun document pour l'instant</p>
          <p className="text-xs mt-1">Cliquez sur "Ajouter un document" pour commencer.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {resources.map((resource) => (
            <Card key={resource.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {resource.imageUrl ? (
                    <img
                      src={resource.imageUrl}
                      alt=""
                      className="h-14 w-14 rounded-md object-cover shrink-0 border border-border"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground truncate">{resource.title}</p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 h-4 ${resource.isPublished ? "bg-green-50 text-green-700 border-green-200" : "bg-muted text-muted-foreground border-border"}`}
                      >
                        {resource.isPublished ? "Publié" : "Brouillon"}
                      </Badge>
                    </div>
                    {resource.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{resource.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {resource.category && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                          {resource.category}
                        </Badge>
                      )}
                      {resource.documentType && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 h-4 ${DOC_TYPE_COLORS[resource.documentType] ?? ""}`}
                        >
                          {resource.documentType}
                        </Badge>
                      )}
                      {resource.fileUrl && (
                        <a
                          href={resource.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                        >
                          <LinkIcon className="h-3 w-3" />
                          Lien
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title={resource.isPublished ? "Dépublier" : "Publier"}
                      onClick={() => handleTogglePublish(resource)}
                    >
                      {resource.isPublished ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Modifier"
                      onClick={() => handleEdit(resource)}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Supprimer">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            « {resource.title} » sera définitivement supprimé. Cette action est irréversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDelete(resource.id)}
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ResourceDialog
        orgId={orgId}
        resource={editingResource}
        open={dialogOpen}
        onClose={handleDialogClose}
      />
    </div>
  );
}

function MembersTab({ orgId }: { orgId: number }) {
  const { data: members, isLoading } = useListAdminOrgMembers(orgId, {
    query: { queryKey: getListAdminOrgMembersQueryKey(orgId) },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  if (!members?.length) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Users className="mx-auto h-10 w-10 opacity-30 mb-3" />
        <p className="text-sm">Aucun membre dans cette organisation.</p>
      </div>
    );
  }

  return (
    <Card>
      <div className="divide-y divide-border">
        {members.map((m) => {
          const displayName = [m.user.firstName, m.user.lastName].filter(Boolean).join(" ") || m.user.email;
          return (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={m.user.avatarUrl || ""} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate flex items-center gap-1.5">
                  {displayName}
                  {m.user.isSuperAdmin && <Shield className="h-3 w-3 text-destructive shrink-0" />}
                </p>
                <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
              </div>
              <Badge variant="outline" className={`text-xs shrink-0 ${ROLE_COLORS[m.role] ?? ""}`}>
                {ROLE_LABELS[m.role] ?? m.role}
              </Badge>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function PlaceholderTab({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-lg">
      <Icon className="mx-auto h-10 w-10 opacity-30 mb-3" />
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs mt-1 text-muted-foreground/60">Ce module sera disponible prochainement.</p>
    </div>
  );
}

const SIZE_COLORS: Record<string, string> = {
  TPE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PME: "bg-blue-50 text-blue-700 border-blue-200",
  ETI: "bg-violet-50 text-violet-700 border-violet-200",
  GE: "bg-orange-50 text-orange-700 border-orange-200",
};

export function AdminOrganizationDetail() {
  const { id } = useParams<{ id: string }>();
  const orgId = Number(id);

  const { data: orgs, isLoading: orgsLoading } = useListAdminOrganizations({
    query: { queryKey: getListAdminOrganizationsQueryKey() },
  });

  const org = orgs?.find((o) => o.id === orgId);

  if (orgsLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!org) {
    return (
      <AdminLayout>
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="mx-auto h-10 w-10 opacity-30 mb-3" />
          <p className="text-sm">Organisation introuvable.</p>
          <Link href="/admin/organizations">
            <Button variant="outline" size="sm" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux organisations
            </Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Link href="/admin/organizations">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 mt-0.5">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{org.name}</h1>
              {org.size && (
                <Badge variant="outline" className={`${SIZE_COLORS[org.size] ?? ""}`}>
                  {org.size}
                </Badge>
              )}
            </div>
            {org.sector && (
              <p className="text-muted-foreground text-sm mt-0.5">{org.sector}</p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="informations">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="informations" className="gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Informations</span>
            </TabsTrigger>
            <TabsTrigger value="utilisateurs" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Utilisateurs</span>
            </TabsTrigger>
            <TabsTrigger value="abonnement" className="gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Abonnement</span>
            </TabsTrigger>
            <TabsTrigger value="statut" className="gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Statut</span>
            </TabsTrigger>
            <TabsTrigger value="historique" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Historique</span>
            </TabsTrigger>
            <TabsTrigger value="ressources" className="gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ressources</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="informations">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Nom commercial</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-semibold">{org.name}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Raison sociale</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{org.legalName ?? "—"}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">SIRET</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-mono">{org.siret ?? "—"}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Secteur d'activité</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{org.sector ?? "—"}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Taille</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {org.size ? (
                      <Badge variant="outline" className={SIZE_COLORS[org.size] ?? ""}>{org.size}</Badge>
                    ) : (
                      <p className="text-sm text-muted-foreground">—</p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Membres</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-semibold">{org.memberCount}</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="utilisateurs">
              <MembersTab orgId={orgId} />
            </TabsContent>

            <TabsContent value="abonnement">
              <PlaceholderTab icon={CreditCard} label="Gestion des abonnements" />
            </TabsContent>

            <TabsContent value="statut">
              <PlaceholderTab icon={Activity} label="Statut du compte" />
            </TabsContent>

            <TabsContent value="historique">
              <PlaceholderTab icon={Clock} label="Historique des actions" />
            </TabsContent>

            <TabsContent value="ressources">
              <ResourcesTab orgId={orgId} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
