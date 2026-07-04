import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { useListOrganizations, useListStakeholders } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, PenLine, Map, BarChart2, FileText, AlertCircle } from "lucide-react";
import { TabTutorial } from "./tabs/TabTutorial";
import { TabSaisie } from "./tabs/TabSaisie";
import { TabCartographie } from "./tabs/TabCartographie";
import { TabMatrice } from "./tabs/TabMatrice";
import { TabSynthese } from "./tabs/TabSynthese";

const TABS = [
  { value: "tutorial", label: "Guide", icon: <BookOpen className="h-3.5 w-3.5" /> },
  { value: "saisie", label: "Saisie", icon: <PenLine className="h-3.5 w-3.5" /> },
  { value: "cartographie", label: "Cartographie", icon: <Map className="h-3.5 w-3.5" /> },
  { value: "matrice", label: "Matrice d'influence", icon: <BarChart2 className="h-3.5 w-3.5" /> },
  { value: "synthese", label: "Synthèse", icon: <FileText className="h-3.5 w-3.5" /> },
];

export function PartiesPrenantes() {
  const { currentOrgId } = useCurrentOrganization();
  const { data: orgs } = useListOrganizations();
  const currentOrg = orgs?.find((o) => o.id === currentOrgId);

  const { data: stakeholders = [], isLoading } = useListStakeholders(currentOrgId ?? 0, {
    query: { enabled: !!currentOrgId, queryKey: [`/api/organizations/${currentOrgId}/stakeholders`] },
  });

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        {/* Page header */}
        <div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Mes parties prenantes</h1>
              {currentOrg && (
                <p className="text-sm text-muted-foreground mt-1">{currentOrg.name}</p>
              )}
            </div>
            {!isLoading && !!currentOrgId && (
              <div className="text-right">
                <span className="text-2xl font-bold text-foreground">{stakeholders.length}</span>
                <p className="text-xs text-muted-foreground">identifiée{stakeholders.length !== 1 ? "s" : ""}</p>
              </div>
            )}
          </div>
        </div>

        {/* No org selected */}
        {!currentOrgId && (
          <div className="flex items-center gap-3 p-5 rounded-xl border border-amber-200 bg-amber-50">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Aucune organisation sélectionnée</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Sélectionnez une organisation dans la barre latérale pour accéder à ce module.
              </p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && currentOrgId && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Main content */}
        {!isLoading && !!currentOrgId && (
          <Tabs defaultValue="saisie" className="space-y-6">
            <TabsList className="flex flex-wrap gap-1 h-auto p-1 w-full sm:w-auto">
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5"
                >
                  {tab.icon}
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="tutorial" className="mt-0">
              <TabTutorial />
            </TabsContent>

            <TabsContent value="saisie" className="mt-0">
              <TabSaisie orgId={currentOrgId} stakeholders={stakeholders} />
            </TabsContent>

            <TabsContent value="cartographie" className="mt-0">
              <TabCartographie stakeholders={stakeholders} />
            </TabsContent>

            <TabsContent value="matrice" className="mt-0">
              <TabMatrice stakeholders={stakeholders} />
            </TabsContent>

            <TabsContent value="synthese" className="mt-0">
              <TabSynthese stakeholders={stakeholders} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
