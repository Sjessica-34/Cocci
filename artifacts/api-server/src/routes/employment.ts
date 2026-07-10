import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import {
  db,
  exercisesTable,
  employmentWorkforceTable,
  employmentDiversityTable,
  employmentTrainingTable,
  employmentCustomKpisTable,
  insertEmploymentWorkforceSchema,
  insertEmploymentDiversitySchema,
  insertEmploymentTrainingSchema,
  insertEmploymentCustomKpiSchema,
  type EmploymentWorkforce,
  type EmploymentDiversity,
  type EmploymentTraining,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOrgMembership, requireExerciseScope, requireWritableExerciseScope } from "../middlewares/exerciseScope";
import { scopeToExercise, withExerciseValues } from "../lib/exercise";
import {
  buildVariableMap,
  listFormulaVariables,
  evaluateFormula,
  computeStandardIndicators,
  FormulaEvaluationError,
} from "../lib/employmentIndicators";

const router = Router();

async function loadWorkforce(req: Parameters<typeof scopeToExercise>[1]): Promise<EmploymentWorkforce | null> {
  const [row] = await db.select().from(employmentWorkforceTable).where(scopeToExercise(employmentWorkforceTable, req)).limit(1);
  return row ?? null;
}
async function loadDiversity(req: Parameters<typeof scopeToExercise>[1]): Promise<EmploymentDiversity | null> {
  const [row] = await db.select().from(employmentDiversityTable).where(scopeToExercise(employmentDiversityTable, req)).limit(1);
  return row ?? null;
}
async function loadTraining(req: Parameters<typeof scopeToExercise>[1]): Promise<EmploymentTraining | null> {
  const [row] = await db.select().from(employmentTrainingTable).where(scopeToExercise(employmentTrainingTable, req)).limit(1);
  return row ?? null;
}

function computeKpiValue(
  kpi: { mode: string; value: number | null; formula: string | null },
  variables: Record<string, number | null>,
): number | null {
  if (kpi.mode === "value") return kpi.value ?? null;
  if (!kpi.formula) return null;
  try {
    return evaluateFormula(kpi.formula, variables);
  } catch {
    return null;
  }
}

async function loadCustomKpisWithComputedValue(orgId: number, exerciseId: number) {
  const [kpis, workforce, diversity, training] = await Promise.all([
    db
      .select()
      .from(employmentCustomKpisTable)
      .where(and(eq(employmentCustomKpisTable.organizationId, orgId), eq(employmentCustomKpisTable.exerciseId, exerciseId)))
      .orderBy(employmentCustomKpisTable.sortOrder, employmentCustomKpisTable.id),
    db.select().from(employmentWorkforceTable).where(and(eq(employmentWorkforceTable.organizationId, orgId), eq(employmentWorkforceTable.exerciseId, exerciseId))).limit(1),
    db.select().from(employmentDiversityTable).where(and(eq(employmentDiversityTable.organizationId, orgId), eq(employmentDiversityTable.exerciseId, exerciseId))).limit(1),
    db.select().from(employmentTrainingTable).where(and(eq(employmentTrainingTable.organizationId, orgId), eq(employmentTrainingTable.exerciseId, exerciseId))).limit(1),
  ]);
  const variables = buildVariableMap(workforce[0] ?? null, diversity[0] ?? null, training[0] ?? null);
  return kpis.map((k) => ({ ...k, computedValue: computeKpiValue(k, variables) }));
}

// ─── EFFECTIFS ────────────────────────────────────────────────────────────
router.get("/organizations/:orgId/employment/workforce", requireAuth, requireOrgMembership, requireExerciseScope, async (req, res) => {
  const data = await loadWorkforce(req);
  res.json({ data });
});

router.put("/organizations/:orgId/employment/workforce", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const parsed = insertEmploymentWorkforceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }
  const payload = withExerciseValues(req, { ...parsed.data, updatedAt: new Date() });
  const existing = await loadWorkforce(req);
  if (existing) {
    await db.update(employmentWorkforceTable).set(payload).where(eq(employmentWorkforceTable.id, existing.id));
  } else {
    await db.insert(employmentWorkforceTable).values(payload);
  }
  res.json(await loadWorkforce(req));
});

// ─── DIVERSITÉ & INCLUSION ────────────────────────────────────────────────
router.get("/organizations/:orgId/employment/diversity", requireAuth, requireOrgMembership, requireExerciseScope, async (req, res) => {
  const data = await loadDiversity(req);
  res.json({ data });
});

router.put("/organizations/:orgId/employment/diversity", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const parsed = insertEmploymentDiversitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }
  const payload = withExerciseValues(req, { ...parsed.data, updatedAt: new Date() });
  const existing = await loadDiversity(req);
  if (existing) {
    await db.update(employmentDiversityTable).set(payload).where(eq(employmentDiversityTable.id, existing.id));
  } else {
    await db.insert(employmentDiversityTable).values(payload);
  }
  res.json(await loadDiversity(req));
});

// ─── FORMATION & DÉVELOPPEMENT ────────────────────────────────────────────
router.get("/organizations/:orgId/employment/training", requireAuth, requireOrgMembership, requireExerciseScope, async (req, res) => {
  const data = await loadTraining(req);
  res.json({ data });
});

router.put("/organizations/:orgId/employment/training", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const parsed = insertEmploymentTrainingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }
  const payload = withExerciseValues(req, { ...parsed.data, updatedAt: new Date() });
  const existing = await loadTraining(req);
  if (existing) {
    await db.update(employmentTrainingTable).set(payload).where(eq(employmentTrainingTable.id, existing.id));
  } else {
    await db.insert(employmentTrainingTable).values(payload);
  }
  res.json(await loadTraining(req));
});

// ─── KPI PERSONNALISÉS ────────────────────────────────────────────────────
router.get("/organizations/:orgId/employment/kpis", requireAuth, requireOrgMembership, requireExerciseScope, async (req, res) => {
  const items = await loadCustomKpisWithComputedValue(req.orgId!, req.exercise!.id);
  res.json({ items });
});

router.post("/organizations/:orgId/employment/kpis", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const parsed = insertEmploymentCustomKpiSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }
  if (parsed.data.mode === "formula" && parsed.data.formula) {
    const variables = buildVariableMap(await loadWorkforce(req), await loadDiversity(req), await loadTraining(req));
    try {
      evaluateFormula(parsed.data.formula, variables);
    } catch (err) {
      if (err instanceof FormulaEvaluationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      throw err;
    }
  }
  const payload = withExerciseValues(req, parsed.data);
  const [inserted] = await db.insert(employmentCustomKpisTable).values(payload).returning();
  const variables = buildVariableMap(await loadWorkforce(req), await loadDiversity(req), await loadTraining(req));
  res.status(201).json({ ...inserted, computedValue: computeKpiValue(inserted, variables) });
});

router.patch("/organizations/:orgId/employment/kpis/:id", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const parsed = insertEmploymentCustomKpiSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }
  if (parsed.data.mode === "formula" && parsed.data.formula) {
    const variables = buildVariableMap(await loadWorkforce(req), await loadDiversity(req), await loadTraining(req));
    try {
      evaluateFormula(parsed.data.formula, variables);
    } catch (err) {
      if (err instanceof FormulaEvaluationError) {
        res.status(400).json({ error: err.message });
        return;
      }
      throw err;
    }
  }
  const [existing] = await db.select().from(employmentCustomKpisTable).where(scopeToExercise(employmentCustomKpisTable, req, eq(employmentCustomKpisTable.id, id))).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await db.update(employmentCustomKpisTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(employmentCustomKpisTable.id, id));
  const [updated] = await db.select().from(employmentCustomKpisTable).where(eq(employmentCustomKpisTable.id, id)).limit(1);
  const variables = buildVariableMap(await loadWorkforce(req), await loadDiversity(req), await loadTraining(req));
  res.json({ ...updated, computedValue: computeKpiValue(updated, variables) });
});

router.delete("/organizations/:orgId/employment/kpis/:id", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  const [existing] = await db.select({ id: employmentCustomKpisTable.id }).from(employmentCustomKpisTable).where(scopeToExercise(employmentCustomKpisTable, req, eq(employmentCustomKpisTable.id, id))).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  await db.delete(employmentCustomKpisTable).where(eq(employmentCustomKpisTable.id, id));
  res.status(204).end();
});

// ─── VARIABLES DE FORMULE ─────────────────────────────────────────────────
router.get("/organizations/:orgId/employment/formula-variables", requireAuth, requireOrgMembership, requireExerciseScope, async (req, res) => {
  const [workforce, diversity, training] = await Promise.all([loadWorkforce(req), loadDiversity(req), loadTraining(req)]);
  res.json({ items: listFormulaVariables(workforce, diversity, training) });
});

// ─── RÉSULTATS / SYNTHÈSE ─────────────────────────────────────────────────
router.get("/organizations/:orgId/employment/results", requireAuth, requireOrgMembership, requireExerciseScope, async (req, res) => {
  const orgId = req.orgId!;
  const exercise = req.exercise!;

  const [workforce, diversity, training, customKpis] = await Promise.all([
    loadWorkforce(req),
    loadDiversity(req),
    loadTraining(req),
    loadCustomKpisWithComputedValue(orgId, exercise.id),
  ]);

  const [previousExercise] = await db
    .select()
    .from(exercisesTable)
    .where(and(eq(exercisesTable.organizationId, orgId), eq(exercisesTable.year, exercise.year - 1)))
    .orderBy(desc(exercisesTable.year))
    .limit(1);

  let previousData: { workforce: EmploymentWorkforce | null; diversity: EmploymentDiversity | null; training: EmploymentTraining | null } | null = null;
  if (previousExercise) {
    const [pw, pd, pt] = await Promise.all([
      db.select().from(employmentWorkforceTable).where(and(eq(employmentWorkforceTable.organizationId, orgId), eq(employmentWorkforceTable.exerciseId, previousExercise.id))).limit(1),
      db.select().from(employmentDiversityTable).where(and(eq(employmentDiversityTable.organizationId, orgId), eq(employmentDiversityTable.exerciseId, previousExercise.id))).limit(1),
      db.select().from(employmentTrainingTable).where(and(eq(employmentTrainingTable.organizationId, orgId), eq(employmentTrainingTable.exerciseId, previousExercise.id))).limit(1),
    ]);
    previousData = { workforce: pw[0] ?? null, diversity: pd[0] ?? null, training: pt[0] ?? null };
  }

  const indicators = computeStandardIndicators({ workforce, diversity, training }, previousData);

  const strengths = indicators.filter((i) => i.trend === "up" && !["nb_departs"].includes(i.code));
  const watchpoints = indicators.filter((i) => (i.trend === "down" && !["nb_departs"].includes(i.code)) || (i.code === "nb_departs" && i.trend === "up"));
  const increasing = indicators.filter((i) => i.trend === "up");
  const decreasing = indicators.filter((i) => i.trend === "down");
  const isNew = indicators.filter((i) => i.trend === "new");

  res.json({ workforce, diversity, training, customKpis, indicators, strengths, watchpoints, increasing, decreasing, isNew });
});

export default router;
