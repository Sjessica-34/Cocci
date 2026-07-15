import { useModuleContext } from "@/hooks/useModuleContext";
import { useListOrganizations, useListStakeholders } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { GroupModuleBanner } from "@/components/GroupModuleBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, PenLine, Map, BarChart2, FileText, AlertCircle } from "lucide-react";
import { DocumentUploader } from "@/components/DocumentUploader";
import { TabTutorial } from "./tabs/TabTutorial";
import { TabSaisie } from "./tabs/TabSaisie";
import { TabCartographie } from "./tabs/TabCartographie";
import { TabMatrice } from "./tabs/TabMatrice";
import { TabSynthese } from "./tabs/TabSynthese";

const TABS = [
  { value: "tutorial",    label: "Guide",              icon: <BookOpen  className="h-3.5 w-3.5" /> },
  { value: "saisie",      label: "Saisie",             icon: <PenLine   className="h-3.5 w-3.5" /> },
  { value: "cartographie",label: "Cartographie",        icon: <Map       className="h-3.5 w-3.5" /> },
  { value: "matrice",     label: "Matrice d'influence", icon: <BarChart2 className="h-3.5 w-3.5" /> },
  { value: "synthese",    label: "Synthèse",            icon: <FileText  className="h-3.5 w-3.5" /> },
];

export function PartiesPrenantes() {
  const { effectiveOrgId, isReadOnly, showGroupBanner } = useModuleContext("group");
  const { data: orgs } = useListOrganizations();
  const currentOrg = orgs?.find((o) => o.id === effectiveOrgId);

  const { data: stakeholders = [], isLoading } = useListStakeholders(effectiveOrgId ?? 0, {
    query: {
      enabled: !!effectiveOrgId,
      queryKey: [`/api/organizations/${effectiveOrgId}/stakeholders`],
    },
  });

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        {showGroupBanner && <GroupModuleBanner />}

        {/* Page header */}
        <div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Mes parties prenantes</h1>
              {currentOrg && (
                <p className="text-sm text-muted-foreground mt-1">{currentOrg.name}</p>
              )}
            </div>
            {!isLoading && !!effectiveOrgId && (
              <div className="text-right">
                <span className="text-2xl font-bold text-foreground">{stakeholders.length}</span>
                <p className="text-xs text-muted-foreground">
                  identifiée{stakeholders.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* No org selected */}
        {!effectiveOrgId && (
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
        {isLoading && effectiveOrgId && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Document import */}
        {!isLoading && !!effectiveOrgId && (
          <DocumentUploader
            orgId={effectiveOrgId}
            category="parties-prenantes"
            question="Avez-vous déjà une cartographie de vos parties prenantes à importer ?"
          />
        )}

        {/* Main content — tabs navigation reste interactive, content inert en lecture seule */}
        {!isLoading && !!effectiveOrgId && (
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

            {/* @ts-expect-error -- `inert` est un attribut HTML5 valide, pas encore dans les types JSX React */}
            <div inert={isReadOnly ? "" : undefined} className={isReadOnly ? "opacity-70" : ""}>
              <TabsContent value="tutorial" className="mt-0">
                <TabTutorial />
              </TabsContent>
              <TabsContent value="saisie" className="mt-0">
                <TabSaisie orgId={effectiveOrgId} stakeholders={stakeholders} />
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
            </div>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
