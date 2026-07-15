import { AppLayout } from "@/components/layout";
import { useListOrganizations } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Network, Users, Target, Settings, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";

const SIZE_LABELS: Record<string, string> = {
  TPE: "TPE",
  PME: "PME",
  ETI: "ETI",
  GE: "Grande entreprise",
};

const SIZE_COLORS: Record<string, string> = {
  TPE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PME: "bg-blue-50 text-blue-700 border-blue-200",
  ETI: "bg-violet-50 text-violet-700 border-violet-200",
  GE: "bg-orange-50 text-orange-700 border-orange-200",
};

export function Dashboard() {
  const { user } = useUser();
  const { currentOrgId } = useCurrentOrganization();
  const { data: orgs, isLoading } = useListOrganizations();

  const greeting = user?.firstName ? `Bonjour, ${user.firstName}` : "Bienvenue";

  const rootOrg = orgs?.find((o) => !o.parentId) ?? null;
  const subsidiaries = orgs?.filter((o) => rootOrg && o.parentId === rootOrg.id) ?? [];
  const isGroup = rootOrg?.type === "groupe";

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{greeting} 👋</h1>
          <p className="text-muted-foreground mt-1">
            Voici un aperçu de votre espace RSE.
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
                    {isGroup ? "Structure" : "Entreprise"}
                  </CardTitle>
                  {isGroup ? (
                    <Network className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold truncate">{rootOrg?.name ?? "—"}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isGroup
                      ? `${subsidiaries.length} filiale${subsidiaries.length > 1 ? "s" : ""}`
                      : rootOrg?.sector ?? "Secteur non renseigné"}
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

            {/* Current entity card */}
            {rootOrg && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{isGroup ? "Mon groupe" : "Mon entreprise"}</CardTitle>
                  </div>
                  <Link href={`/organizations/${rootOrg.id}/settings`}>
                    <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5">
                      <Settings className="h-3.5 w-3.5" />
                      Paramètres
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-muted/20">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
                      {rootOrg.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-base font-semibold truncate">{rootOrg.name}</p>
                        {rootOrg.size && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 h-5 ${SIZE_COLORS[rootOrg.size] ?? ""}`}
                          >
                            {SIZE_LABELS[rootOrg.size] ?? rootOrg.size}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {rootOrg.sector ?? "Secteur non renseigné"}
                      </p>
                      {rootOrg.legalName && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5">{rootOrg.legalName}</p>
                      )}
                    </div>
                    <Link href={`/organizations/${rootOrg.id}`}>
                      <Button variant="outline" size="sm" className="shrink-0 gap-1.5 text-xs">
                        Détails <ArrowUpRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>

                  {/* Subsidiaries (groups only) */}
                  {isGroup && subsidiaries.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        Filiales ({subsidiaries.length})
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {subsidiaries.map((sub) => (
                          <Link key={sub.id} href={`/organizations/${sub.id}`}>
                            <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors cursor-pointer group">
                              <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-muted-foreground font-semibold text-sm shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                {sub.name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                  {sub.name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {sub.sector ?? "Secteur non renseigné"}
                                </p>
                              </div>
                              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
