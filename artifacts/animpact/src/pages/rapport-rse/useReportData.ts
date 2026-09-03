/**
 * Hook central : charge en parallèle toutes les données des modules Cocci
 * nécessaires à la génération du rapport illustré.
 */
import {
  useGetReportDraft,
  useGetDiagnosticScores,
  useGetCarbonBilan,
  useGetCaptationCarbone,
  useListBioDependencies,
  useListBioIssues,
  useGetIssues,
  useGetIssueAnalysis,
  useListStakeholders,
  useListLabels,
  useListActionPlan,
  useGetImpactScoreResult,
  useGetEmploymentWorkforce,
  useGetEmploymentDiversity,
  useGetEmploymentTraining,
  useListBarometreCampaigns,
  useGetBarometreSynthese,
  useGetNrData,
  useListOrganizations,
  useListSuppliers,
  useListResponsiblePurchases,
  useListPlanSlots,
  useListBioConnections,
} from "@workspace/api-client-react";

// Helper pour passer `enabled` sans avoir à importer les queryKey functions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const q = (en: boolean) => ({ query: { enabled: en } }) as any;

export function useReportData(orgId: number | null) {
  const enabled = !!orgId;
  const id = orgId ?? 0;

  const draft        = useGetReportDraft(id, q(enabled));
  const diagScores   = useGetDiagnosticScores(id, q(enabled));
  const carbon       = useGetCarbonBilan(id, q(enabled));
  const captation    = useGetCaptationCarbone(id, q(enabled));
  const bioDeps      = useListBioDependencies(id, q(enabled));
  const issues       = useGetIssues(id, q(enabled));
  const issueAI      = useGetIssueAnalysis(id, q(enabled));
  const stakeholders = useListStakeholders(id, q(enabled));
  const labels       = useListLabels(id, q(enabled));
  const actions      = useListActionPlan(id, q(enabled));
  const impactScore  = useGetImpactScoreResult(id, q(enabled));
  const workforce    = useGetEmploymentWorkforce(id, q(enabled));
  const diversity    = useGetEmploymentDiversity(id, q(enabled));
  const training     = useGetEmploymentTraining(id, q(enabled));
  const baroList     = useListBarometreCampaigns(id, q(enabled));
  const nrData       = useGetNrData(id, q(enabled));
  const orgs         = useListOrganizations(q(enabled));
  const bioIssues    = useListBioIssues(id, q(enabled));
  const suppliers    = useListSuppliers(id, q(enabled));
  const responsiblePurchases = useListResponsiblePurchases(id, q(enabled));
  const planSlots    = useListPlanSlots(id, q(enabled));
  const bioConns     = useListBioConnections(id, q(enabled));

  // Baromètre synthèse + résultats — nécessitent le premier campaign ID
  const campaignId   = baroList.data?.items?.[0]?.id ?? 0;
  const baroSynthese = useGetBarometreSynthese(id, campaignId, q(enabled && campaignId > 0));

  const isLoading =
    draft.isLoading || diagScores.isLoading || carbon.isLoading ||
    captation.isLoading || bioDeps.isLoading || issues.isLoading ||
    stakeholders.isLoading || labels.isLoading || actions.isLoading ||
    impactScore.isLoading || workforce.isLoading || nrData.isLoading ||
    responsiblePurchases.isLoading;

  return {
    isLoading,
    draft:         draft.data ?? null,
    diagScores:    (diagScores.data ?? []) as unknown[],
    carbon:        (carbon.data ?? null) as Record<string, unknown> | null,
    captation:     (captation.data ?? null) as Record<string, unknown> | null,
    bioDeps:       (bioDeps.data?.items ?? []) as unknown[],
    issues:        (issues.data?.items ?? []) as unknown[],
    issueAI:       (issueAI.data ?? null) as Record<string, unknown> | null,
    stakeholders:  (stakeholders.data ?? []) as unknown[],
    labels:        (labels.data?.items ?? []) as unknown[],
    actions:       (actions.data ?? []) as unknown[],
    impactScore:   ((impactScore.data as any)?.result ?? null) as Record<string, unknown> | null,
    workforce:     ((workforce.data as any)?.data ?? null) as Record<string, unknown> | null,
    diversity:     ((diversity.data as any)?.data ?? null) as Record<string, unknown> | null,
    training:      ((training.data as any)?.data ?? null) as Record<string, unknown> | null,
    baroCampaign:  baroList.data?.items?.[0] ?? null,
    baroSynthese:  (baroSynthese.data ?? null) as Record<string, unknown> | null,
    nrData:        (nrData.data ?? null) as Record<string, unknown> | null,
    orgs:          ((orgs.data as unknown as Array<unknown>) ?? []),
    bioIssues:     (bioIssues.data?.items ?? []) as unknown[],
    suppliers:     (suppliers.data?.items ?? []) as unknown[],
    responsiblePurchases: (responsiblePurchases.data?.items ?? []) as unknown[],
    planSlots:     ((planSlots.data ?? []) as unknown[]),
    bioConns:      (bioConns.data?.items ?? []) as unknown[],
  };
}

export type ReportData = ReturnType<typeof useReportData>;
