import { AppLayout } from "@/components/layout";
import { useListOrganizations } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, ArrowUpRight, Users } from "lucide-react";

const SIZE_COLORS: Record<string, string> = {
  TPE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PME: "bg-blue-50 text-blue-700 border-blue-200",
  ETI: "bg-violet-50 text-violet-700 border-violet-200",
  GE: "bg-orange-50 text-orange-700 border-orange-200",
};

export function OrganizationsList() {
  const { data: orgs, isLoading } = useListOrganizations();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Mes organisations</h1>
            <p className="text-muted-foreground mt-1">Gérez vos entités et filiales.</p>
          </div>
          <Link href="/organizations/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle organisation
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : !orgs?.length ? (
          <div className="text-center py-20 border border-dashed rounded-lg bg-muted/5">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">Aucune organisation</h3>
            <p className="text-muted-foreground mt-2 mb-6">
              Créez votre première organisation pour commencer à gérer vos données RSE.
            </p>
            <Link href="/organizations/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Créer une organisation
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orgs.map((org) => (
              <Card key={org.id} className="group hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                        {org.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors truncate">
                          <Link href={`/organizations/${org.id}`}>{org.name}</Link>
                        </CardTitle>
                        <CardDescription className="truncate">
                          {org.sector || "Secteur non renseigné"}
                        </CardDescription>
                      </div>
                    </div>
                    {org.size && (
                      <Badge
                        variant="outline"
                        className={`text-xs shrink-0 ml-2 ${SIZE_COLORS[org.size] ?? ""}`}
                      >
                        {org.size}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="pt-3 border-t border-border">
                    {org.legalName && (
                      <p className="text-xs text-muted-foreground mb-3 truncate">
                        {org.legalName}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Link href={`/organizations/${org.id}`} className="flex-1">
                        <Button variant="secondary" className="w-full text-xs h-8">
                          Tableau de bord <ArrowUpRight className="ml-1.5 h-3 w-3" />
                        </Button>
                      </Link>
                      <Link href={`/organizations/${org.id}/members`}>
                        <Button variant="outline" className="text-xs h-8 px-3">
                          <Users className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Carte d'ajout */}
            <Link href="/organizations/new">
              <Card className="group hover:shadow-md transition-all duration-200 border-dashed cursor-pointer h-full min-h-[180px] flex items-center justify-center">
                <CardContent className="flex flex-col items-center justify-center text-center p-8 gap-3">
                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors font-medium">
                    Ajouter une organisation
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
