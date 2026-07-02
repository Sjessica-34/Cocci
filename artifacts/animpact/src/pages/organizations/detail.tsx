import { useEffect } from "react";
import { AppLayout } from "@/components/layout";
import { OrgSubNav } from "@/components/shared/OrgSubNav";
import {
  useGetOrganization,
  useGetOrganizationDashboard,
  getGetOrganizationQueryKey,
  getGetOrganizationDashboardQueryKey,
} from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  BarChart3,
  Users,
  Building2,
  Hash,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { setCurrentOrg } from "@/hooks/useCurrentOrganization";

const SIZE_LABELS: Record<string, string> = {
  TPE: "TPE (< 10 salariés)",
  PME: "PME (10–249 salariés)",
  ETI: "ETI (250–4 999 salariés)",
  GE: "GE (5 000+ salariés)",
};

export function OrganizationDetail() {
  const { id } = useParams();
  const orgId = Number(id);

  useEffect(() => {
    if (orgId > 0) setCurrentOrg(orgId);
    return () => setCurrentOrg(null);
  }, [orgId]);

  const { data: org, isLoading: orgLoading, error } = useGetOrganization(orgId, {
    query: { enabled: !!orgId, queryKey: getGetOrganizationQueryKey(orgId) },
  });

  const { data: dashboard, isLoading: dashLoading } = useGetOrganizationDashboard(orgId, {
    query: { enabled: !!orgId, queryKey: getGetOrganizationDashboardQueryKey(orgId) },
  });

  if (error) {
    return (
      <AppLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>Impossible de charger les détails de l'organisation.</AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  const isLoading = orgLoading || dashLoading;

  return (
    <AppLayout>
      <div className="space-y-1">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/organizations">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          {isLoading ? (
            <Skeleton className="h-8 w-56" />
          ) : (
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
                  {org?.name}
                </h1>
                {org?.size && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {org.size}
                  </Badge>
                )}
              </div>
              {org?.sector && (
                <p className="text-sm text-muted-foreground mt-0.5">{org.sector}</p>
              )}
            </div>
          )}
        </div>

        {/* Sub-navigation */}
        <OrgSubNav orgId={orgId} />

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" /> Avancement RSE
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {dashboard?.completionRate ?? 0}%
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 mt-3">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all"
                      style={{ width: `${dashboard?.completionRate ?? 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {dashboard?.activeModules ?? 0} module
                    {(dashboard?.activeModules ?? 0) !== 1 ? "s" : ""} actif
                    {(dashboard?.activeModules ?? 0) !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" /> Membres actifs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {dashboard?.memberCount ?? "--"}
                  </div>
                  <Link href={`/organizations/${orgId}/members`}>
                    <Button variant="link" className="px-0 h-auto text-xs mt-2 text-primary">
                      Gérer l'équipe →
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Profil entreprise
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {org?.legalName && (
                    <div className="flex items-start gap-2 text-sm">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <span className="text-foreground">{org.legalName}</span>
                    </div>
                  )}
                  {org?.siret && (
                    <div className="flex items-start gap-2 text-sm">
                      <Hash className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <span className="font-mono text-foreground">{org.siret}</span>
                    </div>
                  )}
                  {org?.size && (
                    <div className="flex items-start gap-2 text-sm">
                      <Users className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <span className="text-foreground">{SIZE_LABELS[org.size] ?? org.size}</span>
                    </div>
                  )}
                  {!org?.legalName && !org?.siret && !org?.size && (
                    <Link href={`/organizations/${orgId}/settings`}>
                      <Button variant="link" className="px-0 h-auto text-xs text-muted-foreground">
                        Compléter le profil →
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Modules RSE placeholder */}
            <Card className="mt-4 border-dashed bg-muted/10">
              <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">Modules RSE</h3>
                <p className="text-muted-foreground max-w-sm mt-2 mb-6 text-sm">
                  Les modules RSE (Diagnostic, Matérialité, Bilan carbone…) seront disponibles ici.
                </p>
                <Button disabled variant="outline">
                  Disponible prochainement
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
