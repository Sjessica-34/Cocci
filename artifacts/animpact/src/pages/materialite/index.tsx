import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { useListOrganizations, useGetIssues } from "@workspace/api-client-react";
import type { IssueRatedItem } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, BookOpen, Library, BarChart2, Sparkles } from "lucide-react";
import { TabGuide } from "./tabs/TabGuide";
import { TabBibliotheque } from "./tabs/TabBibliotheque";
import { TabMatriceViz } from "./tabs/TabMatrice";
import { TabSynthese } from "./tabs/TabSynthese";

const TABS = [
  { value: "guide", label: "Guide", icon: <BookOpen className="h-3.5 w-3.5" /> },
  { value: "bibliotheque", label: "Bibliothèque", icon: <Library className="h-3.5 w-3.5" /> },
  { value: "matrice", label: "Matrice", icon: <BarChart2 className="h-3.5 w-3.5" /> },
  { value: "synthese", label: "Synthèse", icon: <Sparkles className="h-3.5 w-3.5" /> },
];

function computeTop12(items: IssueRatedItem[]): Set<string> {
  const rated = items
    .filter((i) => i.stakeholderScore != null && i.companyScore != null)
    .map((i) => ({
      key: i.key,
      avg: (i.stakeholderScore! + i.companyScore!) / 2,
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 12);
  return new Set(rated.map((r) => r.key));
}

export function Materialite() {
  const { currentOrgId } = useCurrentOrganization();
  const { data: orgs } = useListOrganizations();
  const currentOrg = orgs?.find((o) => o.id === currentOrgId);

  const { data, isLoading } = useGetIssues(currentOrgId ?? 0, {
    query: {
      enabled: !!currentOrgId,
      queryKey: [`/api/organizations/${currentOrgId}/issues`],
    },
  });

  const items = data?.items ?? [];
  const ratedCount = items.filter((i) => i.stakeholderScore != null && i.companyScore != null).length;
  const top12Keys = computeTop12(items);

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Matrice de matérialité</h1>
            {currentOrg && (
              <p className="text-sm text-muted-foreground mt-1">{currentOrg.name}</p>
            )}
          </div>
          {!isLoading && !!currentOrgId && ratedCount > 0 && (
            <div className="text-right">
              <span className="text-2xl font-bold text-foreground">{ratedCount}</span>
              <p className="text-xs text-muted-foreground">enjeu{ratedCount !== 1 ? "x" : ""} noté{ratedCount !== 1 ? "s" : ""}</p>
            </div>
          )}
        </div>

        {/* No org */}
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

        {/* Loading */}
        {isLoading && currentOrgId && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Main content */}
        {!isLoading && !!currentOrgId && (
          <Tabs defaultValue="guide" className="space-y-6">
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

            <TabsContent value="guide" className="mt-0">
              <TabGuide />
            </TabsContent>

            <TabsContent value="bibliotheque" className="mt-0">
              <TabBibliotheque orgId={currentOrgId} />
            </TabsContent>

            <TabsContent value="matrice" className="mt-0">
              <TabMatriceViz items={items} top12Keys={top12Keys} />
            </TabsContent>

            <TabsContent value="synthese" className="mt-0">
              <TabSynthese orgId={currentOrgId} items={items} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
