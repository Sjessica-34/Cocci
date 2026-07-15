import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useModuleContext } from "@/hooks/useModuleContext";
import {
  useListOrganizations,
  useGetNrData,
  useUpsertNrData,
  useListLabels,
  useCreateLabel,
  getGetNrDataQueryKey,
  getListLabelsQueryKey,
} from "@workspace/api-client-react";
import type { NrDataInput, NrMeta } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { GroupModuleBanner } from "@/components/GroupModuleBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, BookOpen, ClipboardList, BarChart2, Calculator } from "lucide-react";
import { TabDecouvrir } from "./tabs/TabDecouvrir";
import { TabEvaluation } from "./tabs/TabEvaluation";
import { TabResultats } from "./tabs/TabResultats";
import { TabCalculateur } from "./tabs/TabCalculateur";
import { computeScores } from "./data";

const TABS = [
  { value: "decouvrir",   label: "Découvrir",   icon: <BookOpen      className="h-3.5 w-3.5" /> },
  { value: "evaluation",  label: "Évaluation",  icon: <ClipboardList className="h-3.5 w-3.5" /> },
  { value: "resultats",   label: "Résultats",   icon: <BarChart2     className="h-3.5 w-3.5" /> },
  { value: "calculateur", label: "Calculateur", icon: <Calculator    className="h-3.5 w-3.5" /> },
];

const CERT_TO_LABEL: Record<string, { name: string; holder: string }> = {
  inr: { name: "Label Numérique Responsable (INR)", holder: "Institut du Numérique Responsable" },
  nr1: { name: "NR Niveau 1",                       holder: "Institut du Numérique Responsable" },
  nr2: { name: "NR Niveau 2",                       holder: "Institut du Numérique Responsable" },
};

export function NumeriqueResponsable() {
  const { effectiveOrgId, isReadOnly, showGroupBanner } = useModuleContext("group");
  const { data: orgs }  = useListOrganizations();
  const currentOrg      = orgs?.find((o) => o.id === effectiveOrgId);
  const queryClient     = useQueryClient();

  const [activeTab, setActiveTab] = useState("decouvrir");

  const { data: nrData, isLoading } = useGetNrData(effectiveOrgId ?? 0, {
    query: {
      enabled: !!effectiveOrgId,
      queryKey: [`/api/organizations/${effectiveOrgId}/numerique-responsable`],
    },
  });

  const [responses, setResponses] = useState<Record<string, boolean>>({});
  const [comments,  setComments]  = useState<Record<string, string>>({});

  useEffect(() => {
    if (!nrData) return;
    const r: Record<string, boolean> = {};
    const c: Record<string, string>  = {};
    for (const item of nrData.responses) {
      r[item.criterionId] = item.checked;
      if (item.comment) c[item.criterionId] = item.comment;
    }
    setResponses(r);
    setComments(c);
  }, [nrData]);

  const { data: labelsData } = useListLabels(effectiveOrgId ?? 0, {
    query: {
      enabled: !!effectiveOrgId,
      queryKey: getListLabelsQueryKey(effectiveOrgId ?? 0),
    },
  });
  const { mutateAsync: createLabelAsync } = useCreateLabel();

  const { mutate: upsertNr } = useUpsertNrData({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetNrDataQueryKey(effectiveOrgId ?? 0),
        });
      },
    },
  });

  const syncCertToLabel = useCallback(
    async (cert: string) => {
      if (!effectiveOrgId || !cert || cert === "none" || cert === "other") return;
      const mapping = CERT_TO_LABEL[cert];
      if (!mapping) return;
      const existing = labelsData?.items ?? [];
      if (existing.some((l) => l.name === mapping.name)) return;
      await createLabelAsync({
        orgId: effectiveOrgId,
        data: { name: mapping.name, holder: mapping.holder, logoUrl: null, year: null, score: null, documentIds: [] },
      });
      queryClient.invalidateQueries({ queryKey: getListLabelsQueryKey(effectiveOrgId) });
    },
    [effectiveOrgId, labelsData, createLabelAsync, queryClient],
  );

  const handleSave = useCallback(
    (input: NrDataInput) => {
      if (!effectiveOrgId) return;
      upsertNr({ orgId: effectiveOrgId, data: input });
      if (input.meta?.certificationLabel) {
        syncCertToLabel(input.meta.certificationLabel);
      }
    },
    [effectiveOrgId, upsertNr, syncCertToLabel],
  );

  const handleResponseChange = useCallback((criterionId: string, checked: boolean) => {
    setResponses((prev) => ({ ...prev, [criterionId]: checked }));
  }, []);

  const handleCommentChange = useCallback((criterionId: string, comment: string) => {
    setComments((prev) => ({ ...prev, [criterionId]: comment }));
  }, []);

  const handleSaveEvaluation = useCallback(() => {
    const items = Object.entries(responses).map(([criterionId, checked]) => ({
      criterionId,
      checked,
      comment: comments[criterionId] ?? null,
    }));
    handleSave({ responses: items });
  }, [responses, comments, handleSave]);

  const scores = computeScores(responses);

  const meta: NrMeta = nrData?.meta ?? {
    certificationLabel: "none",
    certificationOther: null,
    updatedAt: null,
  };

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        {showGroupBanner && <GroupModuleBanner />}

        {/* En-tête */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Numérique Responsable</h1>
            {currentOrg && (
              <p className="text-sm text-muted-foreground mt-1">{currentOrg.name}</p>
            )}
          </div>
          {!isLoading && !!effectiveOrgId && scores.totalPossible > 0 && (
            <div className="text-right">
              <span className="text-2xl font-bold text-foreground">{scores.globalScore}</span>
              <span className="text-sm text-muted-foreground font-medium">/500</span>
              <p className="text-xs text-muted-foreground">
                {scores.totalChecked}/{scores.totalPossible} critères
              </p>
            </div>
          )}
        </div>

        {/* Aucune organisation */}
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

        {/* Chargement */}
        {isLoading && effectiveOrgId && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Onglets */}
        {!isLoading && !!effectiveOrgId && (
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

            {/* @ts-expect-error -- `inert` est un attribut HTML5 valide, pas encore dans les types JSX React */}
            <div inert={isReadOnly ? "" : undefined} className={isReadOnly ? "opacity-70" : ""}>
              <TabsContent value="decouvrir" className="mt-0">
                <TabDecouvrir
                  orgId={effectiveOrgId}
                  meta={meta}
                  onSave={(m) => handleSave({ meta: m })}
                  onStart={() => setActiveTab("evaluation")}
                />
              </TabsContent>

              <TabsContent value="evaluation" className="mt-0">
                <TabEvaluation
                  orgId={effectiveOrgId}
                  responses={responses}
                  comments={comments}
                  onResponseChange={handleResponseChange}
                  onCommentChange={handleCommentChange}
                  onSave={handleSaveEvaluation}
                />
              </TabsContent>

              <TabsContent value="resultats" className="mt-0">
                <TabResultats scores={scores} responsesMap={responses} />
              </TabsContent>

              <TabsContent value="calculateur" className="mt-0">
                <TabCalculateur />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
