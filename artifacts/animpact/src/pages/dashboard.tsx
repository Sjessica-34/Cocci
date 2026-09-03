import { AppLayout } from "@/components/layout";
import { useListOrganizations } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardBody } from "@/components/dashboard/DashboardBody";
import { useAdminViewOrg } from "@/hooks/useAdminView";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";

export function Dashboard() {
  const { user }  = useUser();
  const adminViewOrgId = useAdminViewOrg();
  const { currentOrgId } = useCurrentOrganization();
  const { data: orgs, isLoading } = useListOrganizations(
    adminViewOrgId ? { viewAs: adminViewOrgId } : undefined,
  );

  const greeting = user?.firstName ? `Bonjour, ${user.firstName} 👋` : "Bienvenue 👋";
  const rootOrg  = orgs?.find(o => !o.parentId) ?? null;
  const activeOrg = orgs?.find(o => o.id === currentOrgId) ?? rootOrg;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
          {activeOrg && (
            <p className="text-muted-foreground mt-0.5 text-sm">
              {activeOrg.name}
              {activeOrg.sector ? ` · ${activeOrg.sector}` : ""}
            </p>
          )}
        </div>

        {isLoading || !activeOrg ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
            </div>
          </div>
        ) : (
          <DashboardBody key={activeOrg.id} orgId={activeOrg.id} />
        )}
      </div>
    </AppLayout>
  );
}
