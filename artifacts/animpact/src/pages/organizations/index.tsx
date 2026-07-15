import { AppLayout } from "@/components/layout";
import { useListOrganizations } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Building2, Network, ArrowUpRight, Users, Settings } from "lucide-react";

const SIZE_COLORS: Record<string, string> = {
  TPE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PME: "bg-blue-50 text-blue-700 border-blue-200",
  ETI: "bg-violet-50 text-violet-700 border-violet-200",
  GE: "bg-orange-50 text-orange-700 border-orange-200",
};

export function OrganizationsList() {
  const { data: orgs, isLoading } = useListOrganizations();

  const rootOrg = orgs?.find((o) => !o.parentId) ?? null;
  const subsidiaries = orgs?.filter((o) => rootOrg && o.parentId === rootOrg.id) ?? [];
  const isGroup = rootOrg?.type === "groupe";

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {isGroup ? "Mon groupe" : "Mon entreprise"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isGroup
                ? "Vue d'ensemble de votre groupe et de ses filiales."
                : "Informations et gestion de votre entreprise."}
            </p>
          </div>
          {rootOrg && (
            <Link href={`/organizations/${rootOrg.id}/settings`}>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Paramètres
              </Button>
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !rootOrg ? (
          <div className="text-center py-20 border border-dashed rounded-lg bg-muted/5">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">Aucune organisation</h3>
            <p className="text-muted-foreground mt-2">
              Complétez l'onboarding pour configurer votre espace.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Root org card */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xl shrink-0">
                      {isGroup ? (
                        <Network className="h-5 w-5" />
                      ) : (
                        rootOrg.name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-xl">{rootOrg.name}</CardTitle>
                        <Badge variant="outline" className="text-xs font-normal">
                          {isGroup ? "Groupe" : "Entreprise"}
                        </Badge>
                        {rootOrg.size && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${SIZE_COLORS[rootOrg.size] ?? ""}`}
                          >
                            {rootOrg.size}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-0.5">
                        {rootOrg.sector ?? "Secteur non renseigné"}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link href={`/organizations/${rootOrg.id}/members`}>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        Membres
                      </Button>
                    </Link>
                    <Link href={`/organizations/${rootOrg.id}`}>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        Détails <ArrowUpRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>

              {rootOrg.legalName || rootOrg.siret ? (
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-t border-border pt-4">
                    {rootOrg.legalName && (
                      <span>Raison sociale : <span className="text-foreground font-medium">{rootOrg.legalName}</span></span>
                    )}
                    {rootOrg.siret && (
                      <span>SIRET : <span className="text-foreground font-medium">{rootOrg.siret}</span></span>
                    )}
                  </div>
                </CardContent>
              ) : null}
            </Card>

            {/* Subsidiaries (group only) */}
            {isGroup && (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Filiales ({subsidiaries.length})
                </h2>
                {subsidiaries.length === 0 ? (
                  <div className="text-center py-10 border border-dashed rounded-lg bg-muted/5">
                    <Building2 className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Aucune filiale. Utilisez le menu en haut à gauche pour en ajouter une.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subsidiaries.map((sub) => (
                      <Card key={sub.id} className="group hover:shadow-md transition-all duration-200">
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 rounded bg-muted flex items-center justify-center text-muted-foreground font-bold shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                              {sub.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <CardTitle className="text-base truncate group-hover:text-primary transition-colors">
                                {sub.name}
                              </CardTitle>
                              <CardDescription className="truncate">
                                {sub.sector ?? "Secteur non renseigné"}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex gap-2 border-t border-border pt-3">
                            <Link href={`/organizations/${sub.id}`} className="flex-1">
                              <Button variant="secondary" className="w-full text-xs h-8">
                                Ouvrir <ArrowUpRight className="ml-1.5 h-3 w-3" />
                              </Button>
                            </Link>
                            <Link href={`/organizations/${sub.id}/members`}>
                              <Button variant="outline" className="text-xs h-8 px-3">
                                <Users className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
