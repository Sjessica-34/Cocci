import { useEffect, useRef, useState } from "react";
import { AppLayout } from "@/components/layout";
import { OrgSubNav } from "@/components/shared/OrgSubNav";
import { GroupModuleBanner } from "@/components/GroupModuleBanner";
import {
  useListMembers,
  useListOrganizations,
  useInviteMember,
  useUpdateMember,
  useRemoveMember,
  getListMembersQueryKey,
  customFetch,
} from "@workspace/api-client-react";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useUser } from "@clerk/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Loader2, Mail, Shield, Trash2, UserPlus, CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { setCurrentOrg } from "@/hooks/useCurrentOrganization";
import { cn } from "@/lib/utils";

const inviteSchema = z.object({
  email: z.string().email("Adresse e-mail invalide"),
  role: z.enum(["admin", "member", "viewer"]),
});

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

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  invited: "bg-yellow-50 text-yellow-700 border-yellow-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  invited: "En attente",
  suspended: "Suspendu",
};

/** Réponse brute de GET /organizations/:orgId/subscription */
type SubscriptionData = {
  subscription: {
    max_users: number | null;
    override_max_users: number | null;
  } | null;
};

export function OrganizationMembers() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const orgId = Number(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: clerkUser } = useUser();
  const { isSuperAdmin } = useIsSuperAdmin();

  // Dialogs
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Capture the navigation context BEFORE setCurrentOrg fires in the effect below.
  const { currentOrgId: navOrgId } = useCurrentOrganization();
  const navOrgAtMountRef = useRef(navOrgId);
  const { data: allOrgs = [] } = useListOrganizations();
  const rootOrg = allOrgs.find((o) => !o.parentId);
  const isAdminReadOnly = allOrgs.some(
    (o) => o.parentId === rootOrg?.id && o.id === navOrgAtMountRef.current,
  );

  useEffect(() => {
    if (orgId > 0) setCurrentOrg(orgId);
    return () => setCurrentOrg(null);
  }, [orgId]);

  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "invited" | "suspended">("all");

  const { data: members, isLoading } = useListMembers(orgId, {
    query: { enabled: !!orgId, queryKey: getListMembersQueryKey(orgId) },
  });

  // ── Abonnement — limite d'utilisateurs ──────────────────────────────────────
  // Utilise le même customFetch que les autres hooks générés (auth + BASE_URL inclus).
  const { data: subData } = useQuery<SubscriptionData | null>({
    queryKey: ["/api/organizations", orgId, "subscription"],
    queryFn: () =>
      customFetch<SubscriptionData>(`/organizations/${orgId}/subscription`),
    enabled: !!orgId,
  });

  const inviteMember = useInviteMember();
  const updateMember = useUpdateMember();
  const removeMember = useRemoveMember();

  const form = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "member" },
  });

  const myMembership = members?.find((m) => m.user?.clerkId === clerkUser?.id);
  const canManage = isSuperAdmin || myMembership?.role === "owner" || myMembership?.role === "admin";

  // Limite effective : override > max_users > défaut produit (1 utilisateur inclus par abonnement).
  const sub = subData?.subscription ?? null;
  const effectiveMaxUsers: number =
    sub?.override_max_users ?? sub?.max_users ?? 1;

  // Membres actifs ou en attente (les suspendus ne comptent pas dans le quota).
  const billableMembers = members?.filter((m) => m.status !== "suspended") ?? [];
  const isAtLimit = effectiveMaxUsers !== null && billableMembers.length >= effectiveMaxUsers;

  const filteredMembers = members?.filter(
    (m) => statusFilter === "all" || m.status === statusFilter,
  );

  // ── Handlers ────────────────────────────────────────────────────────────────

  /** Clique sur "Inviter un collaborateur" — redirige selon la limite. */
  function handleInviteClick() {
    if (isAtLimit) {
      setShowUpgradeModal(true);
    } else {
      form.reset();
      setShowInviteDialog(true);
    }
  }

  function onInvite(values: z.infer<typeof inviteSchema>) {
    inviteMember.mutate(
      { id: orgId, data: values },
      {
        onSuccess: () => {
          toast({
            title: "Invitation envoyée",
            description: `${values.email} a été invité(e) en tant que ${ROLE_LABELS[values.role]}.`,
          });
          form.reset();
          setShowInviteDialog(false);
          queryClient.invalidateQueries({ queryKey: getListMembersQueryKey(orgId) });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Échec de l'invitation",
            description: "Vérifiez l'adresse e-mail et réessayez.",
          });
        },
      },
    );
  }

  function handleRoleChange(memberId: number, newRole: "admin" | "member" | "viewer") {
    updateMember.mutate(
      { id: orgId, memberId, data: { role: newRole } },
      {
        onSuccess: () => {
          toast({ title: "Rôle mis à jour" });
          queryClient.invalidateQueries({ queryKey: getListMembersQueryKey(orgId) });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Erreur lors de la mise à jour du rôle" });
        },
      },
    );
  }

  function handleRemove(memberId: number, name: string) {
    removeMember.mutate(
      { id: orgId, memberId },
      {
        onSuccess: () => {
          toast({ title: "Membre retiré", description: `${name} a été retiré de l'organisation.` });
          queryClient.invalidateQueries({ queryKey: getListMembersQueryKey(orgId) });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Erreur lors de la suppression" });
        },
      },
    );
  }

  return (
    <AppLayout>
      <div className="space-y-1">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestion des membres</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Invitez des collaborateurs et gérez les niveaux d'accès.
            </p>
          </div>

          {/* Bouton "Inviter un collaborateur" — owners/admins uniquement */}
          {canManage && (
            <Button onClick={handleInviteClick} className="gap-2 shrink-0">
              <UserPlus className="h-4 w-4" />
              Inviter un collaborateur
            </Button>
          )}
        </div>

        {isAdminReadOnly && <GroupModuleBanner />}

        <OrgSubNav orgId={orgId} />

        {/* @ts-expect-error -- `inert` est un attribut HTML5 valide, pas encore dans les types JSX React */}
        <div inert={isAdminReadOnly ? "" : undefined} className={isAdminReadOnly ? "opacity-70" : ""}>

        {/* Members list */}
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Membres ({members?.length ?? 0})
                  {effectiveMaxUsers !== null && (
                    <span className="text-sm font-normal text-muted-foreground">
                      / {effectiveMaxUsers} inclus
                    </span>
                  )}
                </CardTitle>
                <CardDescription>Accès et rôles au sein de l'organisation.</CardDescription>
              </div>
              {/* Status filter */}
              <div className="flex gap-1">
                {(["all", "active", "invited", "suspended"] as const).map((s) => (
                  <Button
                    key={s}
                    variant={statusFilter === s ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setStatusFilter(s)}
                  >
                    {s === "all" ? "Tous" : STATUS_LABELS[s]}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredMembers?.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                Aucun membre trouvé.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredMembers?.map((member) => {
                  const isMe = member.user?.clerkId === clerkUser?.id;
                  const isOwner = member.role === "owner";
                  const realEmail = member.user?.email?.endsWith("@pending.local")
                    ? null
                    : member.user?.email;
                  const displayName =
                    [member.user?.firstName, member.user?.lastName].filter(Boolean).join(" ") ||
                    realEmail ||
                    "Utilisateur";

                  return (
                    <div
                      key={member.id}
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4",
                        isMe && "bg-muted/20",
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9 border border-border shrink-0">
                          <AvatarImage src={member.user?.avatarUrl || ""} alt="" />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground flex items-center gap-1.5 flex-wrap">
                            <span className="truncate">{displayName}</span>
                            {isMe && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                                Vous
                              </Badge>
                            )}
                          </p>
                          {realEmail && (
                            <p className="text-xs text-muted-foreground truncate">{realEmail}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Status badge */}
                        <Badge
                          variant="outline"
                          className={cn("text-xs", STATUS_COLORS[member.status ?? "active"])}
                        >
                          {STATUS_LABELS[member.status ?? "active"]}
                        </Badge>

                        {/* Role */}
                        {isOwner ? (
                          <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border", ROLE_COLORS.owner)}>
                            <Shield className="h-3 w-3" />
                            {ROLE_LABELS.owner}
                          </div>
                        ) : canManage ? (
                          <Select
                            defaultValue={member.role}
                            onValueChange={(val) =>
                              handleRoleChange(member.id, val as "admin" | "member" | "viewer")
                            }
                            disabled={updateMember.isPending}
                          >
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrateur</SelectItem>
                              <SelectItem value="member">Membre</SelectItem>
                              <SelectItem value="viewer">Lecteur</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            variant="outline"
                            className={cn("text-xs", ROLE_COLORS[member.role ?? "member"])}
                          >
                            {ROLE_LABELS[member.role ?? "member"]}
                          </Badge>
                        )}

                        {/* Remove — owner/admin can remove non-owners who are not themselves */}
                        {canManage && !isOwner && !isMe && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                disabled={removeMember.isPending}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Retirer ce membre ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  <strong>{displayName}</strong> perdra immédiatement l'accès à cette
                                  organisation. Cette action est irréversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleRemove(member.id, displayName)}
                                >
                                  Retirer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        </div>{/* /inert */}
      </div>

      {/* ── Dialog : formulaire d'invitation ──────────────────────────────────── */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Inviter un collaborateur
            </DialogTitle>
            <DialogDescription>
              Envoyez une invitation par e-mail pour rejoindre cette organisation.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onInvite)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse e-mail</FormLabel>
                    <FormControl>
                      <Input placeholder="collaborateur@entreprise.fr" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rôle</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir un rôle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Administrateur</SelectItem>
                        <SelectItem value="member">Membre</SelectItem>
                        <SelectItem value="viewer">Lecteur</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowInviteDialog(false)}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={inviteMember.isPending}>
                  {inviteMember.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Envoyer l'invitation
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Modal : limite d'utilisateurs atteinte ────────────────────────────── */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Limite d'utilisateurs atteinte
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <p className="text-sm text-muted-foreground">
              Votre abonnement inclut actuellement{" "}
              <strong>
                {effectiveMaxUsers}{" "}
                {effectiveMaxUsers === 1 ? "utilisateur" : "utilisateurs"}
              </strong>
              .
            </p>
            <p className="text-sm text-muted-foreground">
              Pour inviter un collaborateur, vous devez ajouter un utilisateur
              supplémentaire à votre abonnement.
            </p>
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                Tarif : 3 € TTC / mois par utilisateur supplémentaire.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              className="w-full"
              onClick={() => {
                setShowUpgradeModal(false);
                setLocation("/abonnement");
              }}
            >
              Ajouter un utilisateur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
