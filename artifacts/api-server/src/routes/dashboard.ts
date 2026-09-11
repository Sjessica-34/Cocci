import { Router, type IRouter } from "express";
import { eq, and, count, isNotNull } from "drizzle-orm";
import {
  db,
  membersTable,
  exercisesTable,
  carbonBilansTable,
  carbonTravelItemsTable,
  carbonUsageItemsTable,
  bioDependenciesTable,
  stakeholdersTable,
  suppliersTable,
  labelsTable,
  organizationActionPlansTable,
  nrResponsesTable,
  diagnosticResponsesTable,
  employmentWorkforceTable,
} from "@workspace/db";
import type { CarbonBilan } from "@workspace/db";
import {
  ALL_SUBCATEGORIES,
  COMPLETENESS_THRESHOLD,
  calculateCarbonDetailTotals,
} from "@workspace/rse-referentials";
import { requireAuth } from "../middlewares/requireAuth";
import { requireMembership } from "../middlewares/requireMembership";
import { resolveExercise } from "../lib/exercise";
import { getSubsidiaryExercises, sumNullable } from "../lib/consolidation";
import {
  GetOrganizationDashboardParams,
  GetOrganizationDashboardResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ─── Existing dashboard (legacy) ─────────────────────────────────────────────

router.get(
  "/organizations/:id/dashboard",
  requireAuth,
  requireMembership(["owner", "admin", "member", "viewer"]),
  async (req, res): Promise<void> => {
    const params = GetOrganizationDashboardParams.safeParse({
      id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id),
    });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [memberCountRow] = await db
      .select({ count: count() })
      .from(membersTable)
      .where(and(eq(membersTable.organizationId, params.data.id), eq(membersTable.status, "active")));

    const memberCount = memberCountRow?.count ?? 0;

    const summary = {
      organizationId: params.data.id,
      memberCount: Number(memberCount),
      activeModules: 0,
      completionRate: 0,
      lastActivityAt: null,
    };

    res.json(GetOrganizationDashboardResponse.parse(summary));
  },
);

// ─── Helpers for KPI computation ──────────────────────────────────────────────

const CARBON_KEYS: (keyof CarbonBilan)[] = [
  "energie1",
  "energie2",
  "horsEnergie1",
  "horsEnergie2",
  "intrantsBiens",
  "intrantsServices",
  "futursEmballages",
  "fret",
  "deplacements",
  "dechetsDirects",
  "immobilisations",
  "utilisation",
  "finDeVie",
];

function carbonTotal(bilan: CarbonBilan | undefined): number | null {
  if (!bilan) return null;
  let sum = 0;
  for (const k of CARBON_KEYS) {
    const v = bilan[k];
    if (v != null) sum += Number(v);
  }
  return sum > 0 ? Math.round(sum * 100) / 100 : null;
}

function axisScore(
  responseMap: Map<string, number>,
  catId: "ENV" | "SOC" | "GOV",
): number | null {
  const subcats = ALL_SUBCATEGORIES.filter((s) => s.categoryId === catId);
  const scores: number[] = [];
  for (const sub of subcats) {
    const total = sub.questions.length;
    const answered = sub.questions.filter((q) => responseMap.has(q.id)).length;
    const completeness = total > 0 ? answered / total : 0;
    if (completeness >= COMPLETENESS_THRESHOLD) {
      const sumLevels = sub.questions.reduce((acc, q) => acc + (responseMap.get(q.id) ?? 0), 0);
      scores.push(Math.round((sumLevels / (answered * 3)) * 100));
    }
  }
  return scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;
}

function axisProgress(
  responseMap: Map<string, number>,
  catId: "ENV" | "SOC" | "GOV",
): number | null {
  const subcats = ALL_SUBCATEGORIES.filter((s) => s.categoryId === catId);
  let total = 0;
  let answered = 0;
  for (const sub of subcats) {
    total += sub.questions.length;
    answered += sub.questions.filter((q) => responseMap.has(q.id)).length;
  }
  return total > 0 ? Math.round((answered / total) * 100) : null;
}

interface KpiValues {
  carbon: number | null;
  diagEnv: number | null;
  diagSoc: number | null;
  diagGov: number | null;
  diagEnvProg: number | null;
  diagSocProg: number | null;
  diagGovProg: number | null;
  diagAnswered: number | null;
  diagTotal: number | null;
  diagEnvAnswered: number | null;
  diagEnvTotal: number | null;
  diagSocAnswered: number | null;
  diagSocTotal: number | null;
  diagGovAnswered: number | null;
  diagGovTotal: number | null;
  stakeholders: number | null;
  suppliersTotal: number | null;
  suppliersCertified: number | null;
  suppliersCertifiedPct: number | null;
  bioCount: number | null;
  actionsTotal: number | null;
  actionsDone: number | null;
  actionsRate: number | null;
  labelsObtained: number | null;
  nrScore: number | null;
  nrAnswered: number | null;
  nrTotal: number | null;
  headcount: number | null;
}

async function computeKpis(orgId: number, exerciseId: number): Promise<KpiValues> {
  const scope = (table: { organizationId: unknown; exerciseId: unknown }) =>
    and(
      eq(table.organizationId as Parameters<typeof eq>[0], orgId),
      eq(table.exerciseId as Parameters<typeof eq>[0], exerciseId),
    );

  const [
    carbonResults,
    carbonTravelResults,
    carbonUsageResults,
    bioCountResults,
    stakeCountResults,
    suppliersResults,
    actionsTotalResults,
    actionsDoneResults,
    labelsObtainedResults,
    nrResults,
    diagResults,
    workforceResults,
  ] = await Promise.all([
    db.select().from(carbonBilansTable).where(scope(carbonBilansTable)).limit(1),
    db.select().from(carbonTravelItemsTable).where(scope(carbonTravelItemsTable)),
    db.select().from(carbonUsageItemsTable).where(scope(carbonUsageItemsTable)),
    db.select({ count: count() }).from(bioDependenciesTable).where(scope(bioDependenciesTable)),
    db.select({ count: count() }).from(stakeholdersTable).where(scope(stakeholdersTable)),
    db
      .select({ certifications: suppliersTable.certifications })
      .from(suppliersTable)
      .where(scope(suppliersTable)),
    db
      .select({ count: count() })
      .from(organizationActionPlansTable)
      .where(scope(organizationActionPlansTable)),
    db
      .select({ count: count() })
      .from(organizationActionPlansTable)
      .where(
        and(
          scope(organizationActionPlansTable),
          eq(organizationActionPlansTable.isChecked, true),
        ),
      ),
    db
      .select({ count: count() })
      .from(labelsTable)
      .where(and(scope(labelsTable), isNotNull(labelsTable.year))),
    db
      .select({ checked: nrResponsesTable.checked })
      .from(nrResponsesTable)
      .where(scope(nrResponsesTable)),
    db
      .select({
        questionId: diagnosticResponsesTable.questionId,
        level: diagnosticResponsesTable.level,
      })
      .from(diagnosticResponsesTable)
      .where(scope(diagnosticResponsesTable)),
    db
      .select({ totalHeadcount: employmentWorkforceTable.totalHeadcount })
      .from(employmentWorkforceTable)
      .where(scope(employmentWorkforceTable))
      .limit(1),
  ]);

  // Carbon
  const carbonDetails = calculateCarbonDetailTotals(
    carbonResults[0] ?? {},
    carbonTravelResults.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      emissionFactor: item.emissionFactor == null ? null : Number(item.emissionFactor),
      emissions: item.emissions == null ? null : Number(item.emissions),
      scope: item.scope as "1" | "2" | "3",
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    carbonUsageResults.map((item) => ({
      ...item,
      lifespanYears: Number(item.lifespanYears),
      consumptionPerYear: item.consumptionPerYear == null ? null : Number(item.consumptionPerYear),
      emissionFactor: item.emissionFactor == null ? null : Number(item.emissionFactor),
      emissions: item.emissions == null ? null : Number(item.emissions),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
  );
  const carbon = carbonResults[0] ? Math.round(carbonDetails.globalTotal * 100) / 100 : null;

  // Biodiversité
  const rawBioCount = Number(bioCountResults[0]?.count ?? 0);
  const bioCount = rawBioCount > 0 ? rawBioCount : null;

  // Parties prenantes
  const rawStake = Number(stakeCountResults[0]?.count ?? 0);
  const stakeholders = rawStake > 0 ? rawStake : null;

  // Fournisseurs
  const suppliersTotal = suppliersResults.length > 0 ? suppliersResults.length : null;
  const suppliersCertifiedCount = suppliersResults.filter((s) => !!s.certifications).length;
  const suppliersCertified = suppliersCertifiedCount > 0 ? suppliersCertifiedCount : null;
  const suppliersCertifiedPct =
    suppliersTotal != null && suppliersTotal > 0
      ? Math.round((suppliersCertifiedCount / suppliersTotal) * 100)
      : null;

  // Actions
  const rawActionsTotal = Number(actionsTotalResults[0]?.count ?? 0);
  const actionsTotal = rawActionsTotal > 0 ? rawActionsTotal : null;
  const actionsDoneCount = Number(actionsDoneResults[0]?.count ?? 0);
  const actionsDone = actionsDoneCount > 0 ? actionsDoneCount : null;
  const actionsRate =
    actionsTotal != null && actionsTotal > 0
      ? Math.round((actionsDoneCount / actionsTotal) * 100)
      : null;

  // Labels
  const rawLabels = Number(labelsObtainedResults[0]?.count ?? 0);
  const labelsObtained = rawLabels > 0 ? rawLabels : null;

  // Numérique responsable
  const nrTotalCount = nrResults.length;
  const nrChecked = nrResults.filter((r) => r.checked).length;
  const nrScore = nrTotalCount > 0 ? Math.round((nrChecked / nrTotalCount) * 100) : null;
  const nrAnswered = nrChecked > 0 ? nrChecked : null;
  const nrTotal = nrTotalCount > 0 ? nrTotalCount : null;

  // Diagnostic
  const responseMap = new Map<string, number>(
    diagResults.map((r) => [r.questionId, r.level]),
  );
  const diagEnv = axisScore(responseMap, "ENV");
  const diagSoc = axisScore(responseMap, "SOC");
  const diagGov = axisScore(responseMap, "GOV");
  const diagEnvProg = axisProgress(responseMap, "ENV");
  const diagSocProg = axisProgress(responseMap, "SOC");
  const diagGovProg = axisProgress(responseMap, "GOV");

  // Diagnostic completion counts per axis
  function axisQuestionCounts(catId: "ENV" | "SOC" | "GOV") {
    const subcats = ALL_SUBCATEGORIES.filter((s) => s.categoryId === catId);
    const total = subcats.reduce((acc, s) => acc + s.questions.length, 0);
    const answered = subcats.reduce(
      (acc, s) => acc + s.questions.filter((q) => responseMap.has(q.id)).length,
      0,
    );
    return { answered, total };
  }

  const envCounts = axisQuestionCounts("ENV");
  const socCounts = axisQuestionCounts("SOC");
  const govCounts = axisQuestionCounts("GOV");
  const diagAnswered = envCounts.answered + socCounts.answered + govCounts.answered;
  const diagTotalQ  = envCounts.total + socCounts.total + govCounts.total;

  // Capital humain
  const headcount = workforceResults[0]?.totalHeadcount ?? null;

  return {
    carbon,
    diagEnv,
    diagSoc,
    diagGov,
    diagEnvProg,
    diagSocProg,
    diagGovProg,
    diagAnswered: diagAnswered > 0 ? diagAnswered : null,
    diagTotal: diagTotalQ > 0 ? diagTotalQ : null,
    diagEnvAnswered: envCounts.answered > 0 ? envCounts.answered : null,
    diagEnvTotal: envCounts.total > 0 ? envCounts.total : null,
    diagSocAnswered: socCounts.answered > 0 ? socCounts.answered : null,
    diagSocTotal: socCounts.total > 0 ? socCounts.total : null,
    diagGovAnswered: govCounts.answered > 0 ? govCounts.answered : null,
    diagGovTotal: govCounts.total > 0 ? govCounts.total : null,
    stakeholders,
    suppliersTotal,
    suppliersCertified,
    suppliersCertifiedPct,
    bioCount,
    actionsTotal,
    actionsDone,
    actionsRate,
    labelsObtained,
    nrScore,
    nrAnswered,
    nrTotal,
    headcount,
  };
}

function ind(
  key: string,
  label: string,
  unit: string | null,
  current: number | null,
  previous: number | null,
) {
  return { key, label, unit, current, previous };
}

function buildSummaryResponse(
  currentYear: number,
  previousYear: number | null,
  curr: KpiValues,
  prev: KpiValues | null,
) {
  const p = prev;

  return {
    currentYear,
    previousYear,
    modules: [
      {
        key: "carbon",
        indicators: [
          ind("totalEmissions", "Émissions totales", "tCO₂e", curr.carbon, p?.carbon ?? null),
        ],
      },
      {
        key: "diagnostic",
        indicators: [
          ind("envScore", "Score Environnement", "%", curr.diagEnv, p?.diagEnv ?? null),
          ind("socScore", "Score Social", "%", curr.diagSoc, p?.diagSoc ?? null),
          ind("govScore", "Score Gouvernance", "%", curr.diagGov, p?.diagGov ?? null),
          ind("envProgress", "Progression Environnement", "%", curr.diagEnvProg, p?.diagEnvProg ?? null),
          ind("socProgress", "Progression Social", "%", curr.diagSocProg, p?.diagSocProg ?? null),
          ind("govProgress", "Progression Gouvernance", "%", curr.diagGovProg, p?.diagGovProg ?? null),
          ind("answeredQuestions", "Questions renseignées", null, curr.diagAnswered, p?.diagAnswered ?? null),
          ind("totalQuestions", "Questions totales", null, curr.diagTotal, p?.diagTotal ?? null),
          ind("envAnswered", "Questions ENV renseignées", null, curr.diagEnvAnswered, p?.diagEnvAnswered ?? null),
          ind("envTotal", "Questions ENV totales", null, curr.diagEnvTotal, p?.diagEnvTotal ?? null),
          ind("socAnswered", "Questions SOC renseignées", null, curr.diagSocAnswered, p?.diagSocAnswered ?? null),
          ind("socTotal", "Questions SOC totales", null, curr.diagSocTotal, p?.diagSocTotal ?? null),
          ind("govAnswered", "Questions GOV renseignées", null, curr.diagGovAnswered, p?.diagGovAnswered ?? null),
          ind("govTotal", "Questions GOV totales", null, curr.diagGovTotal, p?.diagGovTotal ?? null),
        ],
      },
      {
        key: "stakeholders",
        indicators: [
          ind("count", "Parties prenantes", null, curr.stakeholders, p?.stakeholders ?? null),
        ],
      },
      {
        key: "suppliers",
        indicators: [
          ind("total", "Fournisseurs", null, curr.suppliersTotal, p?.suppliersTotal ?? null),
          ind("certifiedCount", "Fournisseurs certifiés", null, curr.suppliersCertified, p?.suppliersCertified ?? null),
          ind("certifiedPct", "Part certifiée", "%", curr.suppliersCertifiedPct, p?.suppliersCertifiedPct ?? null),
        ],
      },
      {
        key: "bio",
        indicators: [
          ind("dependencyCount", "Dépendances biodiversité", null, curr.bioCount, p?.bioCount ?? null),
        ],
      },
      {
        key: "actions",
        indicators: [
          ind("total", "Actions planifiées", null, curr.actionsTotal, p?.actionsTotal ?? null),
          ind("done", "Actions réalisées", null, curr.actionsDone, p?.actionsDone ?? null),
          ind("completionRate", "Taux de réalisation", "%", curr.actionsRate, p?.actionsRate ?? null),
        ],
      },
      {
        key: "labels",
        indicators: [
          ind("obtained", "Labels obtenus", null, curr.labelsObtained, p?.labelsObtained ?? null),
        ],
      },
      {
        key: "nr",
        indicators: [
          ind("score", "Score Numérique Responsable", "%", curr.nrScore, p?.nrScore ?? null),
          ind("answered", "Critères NR cochés", null, curr.nrAnswered, p?.nrAnswered ?? null),
          ind("total", "Critères NR totaux", null, curr.nrTotal, p?.nrTotal ?? null),
        ],
      },
      {
        key: "employment",
        indicators: [
          ind("headcount", "Effectif total", null, curr.headcount, p?.headcount ?? null),
        ],
      },
    ],
  };
}

// ─── Group KPI aggregation ────────────────────────────────────────────────────

function avgNullable(values: (number | null)[]): number | null {
  const defined = values.filter((v): v is number => v != null);
  return defined.length > 0
    ? Math.round(defined.reduce((a, b) => a + b, 0) / defined.length)
    : null;
}

/**
 * Merges KpiValues from multiple subsidiaries into a single consolidated view.
 * - Counts and absolute values: SUM across subsidiaries.
 * - Percentage scores (diagnostic, NR): average of non-null subsidiary values.
 * - Derived percentages (certifiedPct, actionsRate): recomputed from summed numerators/denominators.
 */
function mergeGroupKpis(list: KpiValues[]): KpiValues {
  if (list.length === 0) {
    return {
      carbon: null, diagEnv: null, diagSoc: null, diagGov: null,
      diagEnvProg: null, diagSocProg: null, diagGovProg: null,
      diagAnswered: null, diagTotal: null,
      diagEnvAnswered: null, diagEnvTotal: null,
      diagSocAnswered: null, diagSocTotal: null,
      diagGovAnswered: null, diagGovTotal: null,
      stakeholders: null, suppliersTotal: null, suppliersCertified: null,
      suppliersCertifiedPct: null, bioCount: null, actionsTotal: null,
      actionsDone: null, actionsRate: null, labelsObtained: null,
      nrScore: null, nrAnswered: null, nrTotal: null, headcount: null,
    };
  }

  const s = (fn: (k: KpiValues) => number | null) => sumNullable(list.map(fn));
  const a = (fn: (k: KpiValues) => number | null) => avgNullable(list.map(fn));

  const suppliersTotal = s((k) => k.suppliersTotal);
  const suppliersCertified = s((k) => k.suppliersCertified);
  const suppliersCertifiedPct =
    suppliersTotal != null && suppliersTotal > 0
      ? Math.round(((suppliersCertified ?? 0) / suppliersTotal) * 100)
      : null;

  const actionsTotal = s((k) => k.actionsTotal);
  const actionsDone = s((k) => k.actionsDone);
  const actionsRate =
    actionsTotal != null && actionsTotal > 0
      ? Math.round(((actionsDone ?? 0) / actionsTotal) * 100)
      : null;

  const nrAnswered = s((k) => k.nrAnswered);
  const nrTotal = s((k) => k.nrTotal);
  const nrScore =
    nrTotal != null && nrTotal > 0
      ? Math.round(((nrAnswered ?? 0) / nrTotal) * 100)
      : a((k) => k.nrScore);

  return {
    carbon: s((k) => k.carbon),
    diagEnv: a((k) => k.diagEnv),
    diagSoc: a((k) => k.diagSoc),
    diagGov: a((k) => k.diagGov),
    diagEnvProg: a((k) => k.diagEnvProg),
    diagSocProg: a((k) => k.diagSocProg),
    diagGovProg: a((k) => k.diagGovProg),
    diagAnswered: s((k) => k.diagAnswered),
    diagTotal: s((k) => k.diagTotal),
    diagEnvAnswered: s((k) => k.diagEnvAnswered),
    diagEnvTotal: s((k) => k.diagEnvTotal),
    diagSocAnswered: s((k) => k.diagSocAnswered),
    diagSocTotal: s((k) => k.diagSocTotal),
    diagGovAnswered: s((k) => k.diagGovAnswered),
    diagGovTotal: s((k) => k.diagGovTotal),
    stakeholders: s((k) => k.stakeholders),
    suppliersTotal,
    suppliersCertified,
    suppliersCertifiedPct,
    bioCount: s((k) => k.bioCount),
    actionsTotal,
    actionsDone,
    actionsRate,
    labelsObtained: s((k) => k.labelsObtained),
    nrScore,
    nrAnswered,
    nrTotal,
    headcount: s((k) => k.headcount),
  };
}

// ─── GET /organizations/:id/dashboard/summary ─────────────────────────────────

router.get(
  "/organizations/:id/dashboard/summary",
  requireAuth,
  requireMembership(["owner", "admin", "member", "viewer"]),
  async (req, res): Promise<void> => {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const orgId = Number(rawId);
    if (!rawId || Number.isNaN(orgId) || orgId <= 0) {
      res.status(400).json({ error: "Invalid organization id" });
      return;
    }

    // Résoudre exercice courant
    const currentExercise = await resolveExercise(orgId, req);
    if (!currentExercise) {
      res.status(400).json({ error: "Exercise not found" });
      return;
    }

    const currentYear = currentExercise.year;
    const prevYear = currentYear - 1;

    // Vérifier si c'est un groupe (a des filiales pour l'année courante)
    const [subCurrentExercises, subPrevExercises] = await Promise.all([
      getSubsidiaryExercises(orgId, currentYear),
      getSubsidiaryExercises(orgId, prevYear),
    ]);

    const isGroup = subCurrentExercises.length > 0;

    let currKpis: KpiValues;
    let prevKpis: KpiValues | null = null;
    let resolvedPrevYear: number | null = null;

    if (isGroup) {
      // Groupe : agréger les données de chaque filiale
      const [subCurrKpisList, subPrevKpisList] = await Promise.all([
        Promise.all(
          subCurrentExercises.map(({ orgId: subId, exerciseId }) =>
            computeKpis(subId, exerciseId),
          ),
        ),
        subPrevExercises.length > 0
          ? Promise.all(
              subPrevExercises.map(({ orgId: subId, exerciseId }) =>
                computeKpis(subId, exerciseId),
              ),
            )
          : Promise.resolve(null),
      ]);

      currKpis = mergeGroupKpis(subCurrKpisList);

      if (subPrevKpisList) {
        prevKpis = mergeGroupKpis(subPrevKpisList);
        resolvedPrevYear = prevYear;
      }
    } else {
      // Org standalone ou filiale : données propres uniquement
      const [prevExercise] = await db
        .select()
        .from(exercisesTable)
        .where(
          and(
            eq(exercisesTable.organizationId, orgId),
            eq(exercisesTable.year, prevYear),
          ),
        )
        .limit(1);

      [currKpis, prevKpis] = await Promise.all([
        computeKpis(orgId, currentExercise.id),
        prevExercise ? computeKpis(orgId, prevExercise.id) : Promise.resolve(null),
      ]);

      resolvedPrevYear = prevExercise?.year ?? null;
    }

    res.json(buildSummaryResponse(currentYear, resolvedPrevYear, currKpis, prevKpis));
  },
);

export default router;
