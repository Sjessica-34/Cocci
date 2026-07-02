import { AppLayout } from "@/components/layout";
import { useListOrganizations } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, Target, ArrowUpRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

const SIZE_COLORS: Record<string, string> = {
  TPE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PME: "bg-blue-50 text-blue-700 border-blue-200",
  ETI: "bg-violet-50 text-violet-700 border-violet-200",
  GE: "bg-orange-50 text-orange-700 border-orange-200",
};

export function Dashboard() {
  const { user } = useUser();
  const { data: orgs, isLoading } = useListOrganizations();

  const orgCount = orgs?.length ?? 0;
  const greeting = user?.firstName ? `Bonjour, ${user.firstName}` : "Bienvenue";

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{greeting} 👋</h1>
          <p className="text-muted-foreground mt-1">
            Voici un aperçu de votre portefeuille RSE.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Organisations
                  </CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{orgCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {orgCount === 0
                      ? "Aucune entité gérée"
                      : `${orgCount} entité${orgCount > 1 ? "s" : ""} gérée${orgCount > 1 ? "s" : ""}`}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Modules actifs
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Modules RSE disponibles prochainement
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avancement global
                  </CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0%</div>
                  <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                    <div className="bg-primary h-1.5 rounded-full w-0" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Aucun module complété
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Orgs list */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Mes organisations</CardTitle>
                  <CardDescription>Accès rapide à vos entités</CardDescription>
                </div>
                <Link href="/organizations">
                  <Button variant="ghost" size="sm" className="h-8 text-xs gap-1">
                    Voir tout <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {orgCount === 0 ? (
                  <div className="text-center py-8">
                    <Building2 className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Vous n'avez pas encore d'organisation.
                    </p>
                    <Link href="/organizations/new">
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Créer une organisation
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {orgs?.map((org) => (
                      <Link key={org.id} href={`/organizations/${org.id}`}>
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors cursor-pointer group">
                          <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                            {org.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                              {org.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {org.sector || "Secteur non renseigné"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {org.size && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 h-5 ${SIZE_COLORS[org.size] ?? ""}`}
                              >
                                {org.size}
                              </Badge>
                            )}
                            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      </Link>
                    ))}
                    {orgCount < 6 && (
                      <Link href="/organizations/new">
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border hover:bg-muted/20 transition-colors cursor-pointer group h-full min-h-[64px]">
                          <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                            <Plus className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                          </div>
                          <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                            Ajouter une organisation
                          </p>
                        </div>
                      </Link>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
