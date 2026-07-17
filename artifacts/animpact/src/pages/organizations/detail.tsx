import { useEffect } from "react";
import { AppLayout } from "@/components/layout";
import { OrgSubNav } from "@/components/shared/OrgSubNav";
import {
  useGetOrganization,
  getGetOrganizationQueryKey,
} from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { setCurrentOrg } from "@/hooks/useCurrentOrganization";
import { DashboardBody } from "@/components/dashboard/DashboardBody";

const SIZE_LABELS: Record<string, string> = {
  TPE: "TPE",
  PME: "PME",
  ETI: "ETI",
  GE:  "GE",
};

export function OrganizationDetail() {
  const { id } = useParams();
  const orgId  = Number(id);

  useEffect(() => {
    if (orgId > 0) setCurrentOrg(orgId);
    return () => setCurrentOrg(null);
  }, [orgId]);

  const { data: org, isLoading, error } = useGetOrganization(orgId, {
    query: { enabled: !!orgId, queryKey: getGetOrganizationQueryKey(orgId) },
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

  return (
    <AppLayout>
      <div className="space-y-1">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
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
                <h1 className="text-2xl font-bold tracking-tight truncate">{org?.name}</h1>
                {org?.size && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {SIZE_LABELS[org.size] ?? org.size}
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

        {/* Dashboard */}
        <div className="pt-4">
          {isLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
              </div>
            </div>
          ) : (
            <DashboardBody orgId={orgId} />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
