import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout";
import { OrgSubNav } from "@/components/shared/OrgSubNav";
import {
  useListMembers,
  useInviteMember,
  useUpdateMember,
  useRemoveMember,
  getListMembersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
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
import { useToast } from "@/hooks/use-toast";
import { Users, Loader2, Mail, Shield, Trash2 } from "lucide-react";
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

export function OrganizationMembers() {
  const { id } = useParams();
  const orgId = Number(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: clerkUser } = useUser();

  useEffect(() => {
    if (orgId > 0) setCurrentOrg(orgId);
    return () => setCurrentOrg(null);
  }, [orgId]);

  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "invited" | "suspended">("all");

  const { data: members, isLoading } = useListMembers(orgId, {
    query: { enabled: !!orgId, queryKey: getListMembersQueryKey(orgId) },
  });

  const inviteMember = useInviteMember();
  const updateMember = useUpdateMember();
  const removeMember = useRemoveMember();

  const form = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "member" },
  });

  const myMembership = members?.find((m) => m.user?.clerkId === clerkUser?.id);
  const canManage = myMembership?.role === "owner" || myMembership?.role === "admin";

  const filteredMembers = members?.filter(
    (m) => statusFilter === "all" || m.status === statusFilter,
  );

  function onInvite(values: z.infer<typeof inviteSchema>) {
    inviteMember.mutate(
      { id: orgId, data: values },
      {
        onSuccess: () => {
          toast({ title: "Invitation envoyée", description: `${values.email} a été invité(e) en tant que ${ROLE_LABELS[values.role]}.` });
          form.reset();
          queryClient.invalidateQueries({ queryKey: getListMembersQueryKey(orgId) });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Échec de l'invitation", description: "Vérifiez l'adresse e-mail et réessayez." });
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestion des membres</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Invitez des collaborateurs et gérez les niveaux d'accès.
          </p>
        </div>

        <OrgSubNav orgId={orgId} />

        {/* Invite form — visible only for owners/admins */}
        {canManage && (
          <Card>
            <CardHeader className="pb-4 border-b border-border">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" /> Inviter un membre
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onInvite)}
                  className="flex flex-col sm:flex-row gap-3 items-start"
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="flex-1 w-full">
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
                      <FormItem className="w-full sm:w-44 shrink-0">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Rôle" />
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
                  <Button type="submit" disabled={inviteMember.isPending} className="w-full sm:w-auto">
                    {inviteMember.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Envoyer l'invitation
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Members list */}
        <Card>
          <CardHeader className="border-b border-border pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Membres ({members?.length ?? 0})
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
                  const displayName =
                    [member.user?.firstName, member.user?.lastName].filter(Boolean).join(" ") ||
                    member.user?.email ||
                    "—";

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
                          <AvatarImage src={member.user?.avatarUrl || ""} />
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
                          <p className="text-xs text-muted-foreground truncate">{member.user?.email}</p>
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
      </div>
    </AppLayout>
  );
}
