import { AppLayout } from "@/components/layout";
import { useListOrganizations } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Activity, Users, Target, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export function Dashboard() {
  const { data: orgs, isLoading } = useListOrganizations();

  const activeOrgs = orgs?.length || 0;
  const mockCompletion = activeOrgs > 0 ? 42 : 0;
  const mockMembers = activeOrgs * 3;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your RSE portfolio and progress.</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeOrgs}</div>
                  <p className="text-xs text-muted-foreground mt-1">Active entities managed</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockMembers}</div>
                  <p className="text-xs text-muted-foreground mt-1">Across all organizations</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Global Progress</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockCompletion}%</div>
                  <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                    <div className="bg-primary h-1.5 rounded-full" style={{ width: `${mockCompletion}%` }} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest updates across your entities</CardDescription>
                </CardHeader>
                <CardContent>
                  {activeOrgs === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No activity yet. Create an organization to get started.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Activity className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">Carbon footprint module activated</p>
                          <p className="text-xs text-muted-foreground truncate">{orgs?.[0]?.name}</p>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">2h ago</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="col-span-1">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Your Organizations</CardTitle>
                    <CardDescription>Quick access to your entities</CardDescription>
                  </div>
                  <Link href="/organizations">
                    <Button variant="ghost" size="sm" className="h-8 text-xs">View all</Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {activeOrgs === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground mb-4">You don't belong to any organizations yet.</p>
                      <Link href="/organizations/new">
                        <Button size="sm">Create Organization</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orgs?.slice(0, 4).map((org) => (
                        <div key={org.id} className="flex items-center justify-between p-3 rounded-md border border-border bg-muted/10 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                              {org.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{org.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{org.sector || "No sector"}</p>
                            </div>
                          </div>
                          <Link href={`/organizations/${org.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <ArrowUpRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
