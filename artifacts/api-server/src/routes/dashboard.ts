import { Router, type IRouter } from "express";
import { eq, and, count, isNotNull } from "drizzle-orm";
import {
  db,
  membersTable,
  exercisesTable,
  carbonBilansTable,
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
} from "@workspace/rse-referentials";
import { requireAuth } from "../middlewares/requireAuth";
import { requireMembership } from "../middlewares/requireMembership";
import { resolveExercise } from "../lib/exercise";
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
  const carbon = carbonTotal(carbonResults[0]);

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
  const nrTotal = nrResults.length;
  const nrChecked = nrResults.filter((r) => r.checked).length;
  const nrScore = nrTotal > 0 ? Math.round((nrChecked / nrTotal) * 100) : null;

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

    // Trouver l'exercice N-1 : le plus récent avec year < currentYear, même org
    const [prevExercise] = await db
      .select()
      .from(exercisesTable)
      .where(
        and(
          eq(exercisesTable.organizationId, orgId),
          eq(exercisesTable.year, currentExercise.year - 1),
        ),
      )
      .limit(1);

    // Calculer les KPIs courants + N-1 en parallèle
    const [currKpis, prevKpis] = await Promise.all([
      computeKpis(orgId, currentExercise.id),
      prevExercise ? computeKpis(orgId, prevExercise.id) : Promise.resolve(null),
    ]);

    const response = buildSummaryResponse(
      currentExercise.year,
      prevExercise?.year ?? null,
      currKpis,
      prevKpis,
    );

    res.json(response);
  },
);

export default router;
