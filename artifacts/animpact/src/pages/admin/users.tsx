import { useState } from "react";
import { AdminLayout } from "./layout";
import {
  useListAdminUsers,
  getListAdminUsersQueryKey,
  useUpdateUserSuperAdmin,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Users, Search, Shield, ShieldOff } from "lucide-react";
import { useUser } from "@clerk/react";

export function AdminUsers() {
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: clerkUser } = useUser();

  const { data: users, isLoading } = useListAdminUsers({
    query: { queryKey: getListAdminUsersQueryKey() },
  });

  const updateSuperAdmin = useUpdateUserSuperAdmin();

  const filtered = users?.filter((u) =>
    [u.email, u.firstName, u.lastName].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  function handleToggleSuperAdmin(userId: number, currentValue: boolean, email: string) {
    updateSuperAdmin.mutate(
      { id: userId, data: { isSuperAdmin: !currentValue } },
      {
        onSuccess: () => {
          toast({
            title: !currentValue ? "Superadmin accordé" : "Superadmin retiré",
            description: `${email} a été mis à jour.`,
          });
          queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Erreur lors de la mise à jour." });
        },
      },
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Utilisateurs</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {users?.length ?? 0} compte{(users?.length ?? 0) > 1 ? "s" : ""} sur la plateforme
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par email, nom…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : !filtered?.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="mx-auto h-10 w-10 opacity-30 mb-3" />
            <p className="text-sm">Aucun utilisateur trouvé.</p>
          </div>
        ) : (
          <Card>
            <div className="divide-y divide-border">
              {filtered.map((user) => {
                const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "—";
                const isMe = user.clerkId === clerkUser?.id;
                return (
                  <div key={user.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors">
                    <Avatar className="h-9 w-9 shrink-0 border border-border">
                      <AvatarImage src={user.avatarUrl || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {(displayName === "—" ? user.email : displayName).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground flex items-center gap-2 flex-wrap">
                        {displayName}
                        {isMe && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">Vous</Badge>}
                        {user.isSuperAdmin && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-destructive/10 text-destructive border-destructive/20 flex items-center gap-1">
                            <Shield className="h-2.5 w-2.5" /> Superadmin
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="text-xs text-muted-foreground hidden sm:block">
                        {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                      {!isMe && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-8 text-xs gap-1.5 ${user.isSuperAdmin ? "text-destructive hover:text-destructive" : ""}`}
                              disabled={updateSuperAdmin.isPending}
                            >
                              {user.isSuperAdmin ? (
                                <><ShieldOff className="h-3.5 w-3.5" /> Retirer admin</>
                              ) : (
                                <><Shield className="h-3.5 w-3.5" /> Rendre admin</>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {user.isSuperAdmin ? "Retirer les droits superadmin ?" : "Accorder les droits superadmin ?"}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {user.isSuperAdmin
                                  ? `${user.email} perdra l'accès au back-office cocci.`
                                  : `${user.email} aura accès à l'ensemble du back-office cocci et pourra voir toutes les organisations et tous les utilisateurs.`}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                className={user.isSuperAdmin ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
                                onClick={() => handleToggleSuperAdmin(user.id, user.isSuperAdmin, user.email)}
                              >
                                Confirmer
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
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
