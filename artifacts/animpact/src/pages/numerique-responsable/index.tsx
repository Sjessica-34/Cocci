import { useState, useCallback, useRef } from "react";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { useListOrganizations, useGetNrData, useUpsertNrData } from "@workspace/api-client-react";
import type { NrDataInput } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, BookOpen, ClipboardList, BarChart2, Calculator } from "lucide-react";
import { TabDecouvrir } from "./tabs/TabDecouvrir";
import { TabEvaluation } from "./tabs/TabEvaluation";
import { TabResultats } from "./tabs/TabResultats";
import { TabCalculateur } from "./tabs/TabCalculateur";
import { computeScores } from "./data";

const TABS = [
  { value: "decouvrir",   label: "Découvrir",    icon: <BookOpen    className="h-3.5 w-3.5" /> },
  { value: "evaluation",  label: "Évaluation",   icon: <ClipboardList className="h-3.5 w-3.5" /> },
  { value: "resultats",   label: "Résultats",    icon: <BarChart2   className="h-3.5 w-3.5" /> },
  { value: "calculateur", label: "Calculateur",  icon: <Calculator  className="h-3.5 w-3.5" /> },
];

export function NumeriqueResponsable() {
  const { currentOrgId } = useCurrentOrganization();
  const { data: orgs } = useListOrganizations();
  const currentOrg = orgs?.find((o) => o.id === currentOrgId);
  const [activeTab, setActiveTab] = useState("decouvrir");

  const { data: nrData, isLoading } = useGetNrData(currentOrgId ?? 0, {
    query: {
      enabled: !!currentOrgId,
      queryKey: [`/api/organizations/${currentOrgId}/numerique-responsable`],
    },
  });

  const { mutate: upsertNr } = useUpsertNrData();

  const responsesMap: Record<string, boolean> = {};
  const commentsMap: Record<string, string> = {};
  (nrData?.responses ?? []).forEach((r) => {
    responsesMap[r.criterionId] = r.checked;
    if (r.comment) commentsMap[r.criterionId] = r.comment;
  });

  const scores = computeScores(responsesMap);

  const handleSave = useCallback(
    (input: NrDataInput) => {
      if (!currentOrgId) return;
      upsertNr({ orgId: currentOrgId, data: input });
    },
    [currentOrgId, upsertNr],
  );

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        {/* Page header */}
        <div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Numérique Responsable</h1>
              {currentOrg && (
                <p className="text-sm text-muted-foreground mt-1">{currentOrg.name}</p>
              )}
            </div>
            {!isLoading && !!currentOrgId && scores.totalPossible > 0 && (
              <div className="text-right">
                <span className="text-2xl font-bold text-foreground">{scores.globalScore}</span>
                <span className="text-sm text-muted-foreground font-medium">/500</span>
                <p className="text-xs text-muted-foreground">{scores.totalChecked}/{scores.totalPossible} critères</p>
              </div>
            )}
          </div>
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
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        )}

        {/* Main tabs */}
        {!isLoading && !!currentOrgId && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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

            <TabsContent value="decouvrir" className="mt-0">
              <TabDecouvrir
                orgId={currentOrgId}
                meta={nrData?.meta ?? { certificationLabel: "none", certificationOther: null, updatedAt: null }}
                onSave={(meta) => handleSave({ meta })}
                onStart={() => setActiveTab("evaluation")}
              />
            </TabsContent>

            <TabsContent value="evaluation" className="mt-0">
              <TabEvaluation
                orgId={currentOrgId}
                initialResponses={responsesMap}
                initialComments={commentsMap}
                onSave={(responses) => handleSave({ responses })}
              />
            </TabsContent>

            <TabsContent value="resultats" className="mt-0">
              <TabResultats
                scores={scores}
                responsesMap={responsesMap}
              />
            </TabsContent>

            <TabsContent value="calculateur" className="mt-0">
              <TabCalculateur />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
