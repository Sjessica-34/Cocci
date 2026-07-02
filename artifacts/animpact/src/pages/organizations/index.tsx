import { AppLayout } from "@/components/layout";
import { useListOrganizations } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Plus, ArrowUpRight, BarChart3, Users } from "lucide-react";

export function OrganizationsList() {
  const { data: orgs, isLoading } = useListOrganizations();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Organizations</h1>
            <p className="text-muted-foreground mt-1">Manage your active entities and subsidiaries.</p>
          </div>
          <Link href="/organizations/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Organization
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
            <h3 className="text-lg font-medium">No organizations found</h3>
            <p className="text-muted-foreground mt-2 mb-6">Create your first organization to start managing RSE data.</p>
            <Link href="/organizations/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Organization
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orgs.map((org) => (
              <Card key={org.id} className="group hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                        {org.name.charAt(0)}
                      </div>
                      <div>
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                          <Link href={`/organizations/${org.id}`}>{org.name}</Link>
                        </CardTitle>
                        <CardDescription>{org.sector || "Unspecified sector"}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                        <Users className="h-3 w-3" /> Members
                      </span>
                      <span className="font-medium text-sm">--</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                        <BarChart3 className="h-3 w-3" /> Size
                      </span>
                      <span className="font-medium text-sm">{org.size || "Unknown"}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Link href={`/organizations/${org.id}`} className="flex-1">
                      <Button variant="secondary" className="w-full text-xs h-8">
                        View Dashboard <ArrowUpRight className="ml-1.5 h-3 w-3" />
                      </Button>
                    </Link>
                    <Link href={`/organizations/${org.id}/settings`}>
                      <Button variant="outline" className="text-xs h-8 px-3">
                        Settings
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
