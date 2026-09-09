import { useState, useMemo, useEffect } from "react";
import { useModuleContext } from "@/hooks/useModuleContext";
import { useListBarometreCampaigns, getListBarometreCampaignsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, ClipboardList, FileQuestion, BarChart2, Sparkles } from "lucide-react";
import { TabCampagnes } from "./tabs/TabCampagnes";
import { TabQuestionnaire } from "./tabs/TabQuestionnaire";
import { TabResultats } from "./tabs/TabResultats";
import { TabSynthese } from "./tabs/TabSynthese";

const TABS = [
  { value: "campagnes",     label: "Campagnes",     icon: <ClipboardList className="h-3.5 w-3.5" /> },
  { value: "questionnaire", label: "Questionnaire", icon: <FileQuestion  className="h-3.5 w-3.5" /> },
  { value: "resultats",     label: "Résultats",     icon: <BarChart2     className="h-3.5 w-3.5" /> },
  { value: "synthese",      label: "Synthèse",      icon: <Sparkles      className="h-3.5 w-3.5" /> },
];

export function BarometreSocial() {
  const { effectiveOrgId } = useModuleContext("subsidiary");
  const [activeTab, setActiveTab] = useState("campagnes");
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const campaignListQueryKey = useMemo(
    () => getListBarometreCampaignsQueryKey(effectiveOrgId ?? 0),
    [effectiveOrgId],
  );

  const { data: campaignsData, isLoading } = useListBarometreCampaigns(effectiveOrgId ?? 0, {
    query: {
      enabled: !!effectiveOrgId,
      queryKey: campaignListQueryKey,
      // Les réponses sont envoyées depuis la page publique, dans un autre
      // contexte navigateur : ne pas conserver le compteur pendant 5 minutes.
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchInterval: activeTab === "campagnes" ? 15_000 : false,
    },
  });
  const campaigns = campaignsData?.items ?? [];

  useEffect(() => {
    if (activeTab !== "campagnes" || !effectiveOrgId) return;
    void queryClient.invalidateQueries({ queryKey: campaignListQueryKey });
  }, [activeTab, campaignListQueryKey, effectiveOrgId, queryClient]);

  useEffect(() => {
    if (selectedCampaignId != null && campaigns.some((c) => c.id === selectedCampaignId)) return;
    setSelectedCampaignId(campaigns[0]?.id ?? null);
  }, [campaigns, selectedCampaignId]);

  const selectedCampaign = useMemo(
    () => campaigns.find((c) => c.id === selectedCampaignId) ?? null,
    [campaigns, selectedCampaignId],
  );

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        <div>
          <h1 className="text-2xl font-bold text-foreground">😊 Baromètre Social</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Mesurez le climat social de votre entreprise via des campagnes de questionnaires anonymes.
          </p>
        </div>

        <>
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

            {!!effectiveOrgId && (
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

                <TabsContent value="campagnes" className="mt-0">
                  <TabCampagnes
                    orgId={effectiveOrgId}
                    campaigns={campaigns}
                    isLoading={isLoading}
                    selectedCampaignId={selectedCampaignId}
                    onSelectCampaign={(id) => {
                      setSelectedCampaignId(id);
                      setActiveTab("questionnaire");
                    }}
                    onCampaignCreated={(id) => {
                      setSelectedCampaignId(id);
                    }}
                  />
                </TabsContent>

                <TabsContent value="questionnaire" className="mt-0">
                  <TabQuestionnaire orgId={effectiveOrgId} campaign={selectedCampaign} />
                </TabsContent>

                <TabsContent value="resultats" className="mt-0">
                  <TabResultats orgId={effectiveOrgId} campaign={selectedCampaign} />
                </TabsContent>

                <TabsContent value="synthese" className="mt-0">
                  <TabSynthese orgId={effectiveOrgId} campaign={selectedCampaign} />
                </TabsContent>
              </Tabs>
            )}
        </>
      </div>
    </AppLayout>
  );
}
