import { AppLayout } from "@/components/layout";
import { useListOrganizations } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardBody } from "@/components/dashboard/DashboardBody";
import { useAdminViewOrg } from "@/hooks/useAdminView";

export function Dashboard() {
  const { user }  = useUser();
  const adminViewOrgId = useAdminViewOrg();
  const { data: orgs, isLoading } = useListOrganizations(
    adminViewOrgId ? { viewAs: adminViewOrgId } : undefined,
  );

  const greeting = user?.firstName ? `Bonjour, ${user.firstName} 👋` : "Bienvenue 👋";
  const rootOrg  = orgs?.find(o => !o.parentId) ?? null;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
          {rootOrg && (
            <p className="text-muted-foreground mt-0.5 text-sm">
              {rootOrg.name}
              {rootOrg.sector ? ` · ${rootOrg.sector}` : ""}
            </p>
          )}
        </div>

        {isLoading || !rootOrg ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
            </div>
          </div>
        ) : (
          <DashboardBody orgId={rootOrg.id} />
        )}
      </div>
    </AppLayout>
  );
}
