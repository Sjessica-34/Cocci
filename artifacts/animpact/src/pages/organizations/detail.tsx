import { AppLayout } from "@/components/layout";
import { useGetOrganization } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Settings, Users, BarChart3, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function OrganizationDetail() {
  const { id } = useParams();
  const orgId = Number(id);
  
  const { data: org, isLoading, error } = useGetOrganization(orgId, {
    query: { enabled: !!orgId }
  });

  if (error) {
    return (
      <AppLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load organization details.</AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/organizations">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            {isLoading ? (
              <Skeleton className="h-8 w-48" />
            ) : (
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{org?.name}</h1>
                <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
                  <span className="uppercase tracking-wider text-xs font-semibold">{org?.size || "SIZE UNKNOWN"}</span>
                  <span>•</span>
                  <span>{org?.sector || "Sector unspecified"}</span>
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/organizations/${orgId}/members`}>
              <Button variant="outline" size="sm">
                <Users className="mr-2 h-4 w-4" /> Members
              </Button>
            </Link>
            <Link href={`/organizations/${orgId}/settings`}>
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" /> Settings
              </Button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" /> RSE Completion
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">0%</div>
                  <div className="w-full bg-muted rounded-full h-2 mt-3">
                    <div className="bg-primary h-2 rounded-full w-0" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">No modules active yet.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" /> Active Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">--</div>
                  <Link href={`/organizations/${orgId}/members`}>
                    <Button variant="link" className="px-0 h-auto text-xs mt-2 text-primary">Manage team →</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Company Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Legal Name</span>
                    <span className="font-medium text-right">{org?.legalName || "-"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">SIRET</span>
                    <span className="font-medium text-right font-mono">{org?.siret || "-"}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-8 border-dashed bg-muted/10">
              <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">Reporting Modules</h3>
                <p className="text-muted-foreground max-w-sm mt-2 mb-6">
                  Select and activate RSE reporting modules for this organization to begin tracking data.
                </p>
                <Button disabled>Activate Modules (Coming Soon)</Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
