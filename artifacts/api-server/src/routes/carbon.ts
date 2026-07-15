import { Router } from "express";
import { db, carbonBilansTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOrgMembership, requireExerciseScope, requireWritableExerciseScope } from "../middlewares/exerciseScope";
import { scopeToExercise, withExerciseValues } from "../lib/exercise";
import { getSubsidiaryExercises, sumNullable } from "../lib/consolidation";

const router = Router();

function numOrNull(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : String(n);
}

function serialize(b: typeof carbonBilansTable.$inferSelect) {
  const toNum = (v: string | null | undefined) => (v != null ? Number(v) : null);
  return {
    id: b.id,
    organizationId: b.organizationId,
    year: b.year,
    mode: b.mode,
    status: b.status,
    methodology: b.methodology,
    scope: b.scope,
    energie1: toNum(b.energie1),
    energie2: toNum(b.energie2),
    horsEnergie1: toNum(b.horsEnergie1),
    horsEnergie2: toNum(b.horsEnergie2),
    intrantsBiens: toNum(b.intrantsBiens),
    intrantsServices: toNum(b.intrantsServices),
    futursEmballages: toNum(b.futursEmballages),
    fret: toNum(b.fret),
    deplacements: toNum(b.deplacements),
    dechetsDirects: toNum(b.dechetsDirects),
    immobilisations: toNum(b.immobilisations),
    utilisation: toNum(b.utilisation),
    finDeVie: toNum(b.finDeVie),
    estEmployeeCount: b.estEmployeeCount,
    estOfficeSqm: b.estOfficeSqm,
    estSubsidiaryCount: b.estSubsidiaryCount,
    estHeatingType: b.estHeatingType,
    estElecKwhYear: toNum(b.estElecKwhYear),
    estVehicleCount: b.estVehicleCount,
    estVehicleFuelType: b.estVehicleFuelType,
    estTrainKmYear: toNum(b.estTrainKmYear),
    estPlaneKmYear: toNum(b.estPlaneKmYear),
    estBuysGoodsKeur: toNum(b.estBuysGoodsKeur),
    estBuysServicesKeur: toNum(b.estBuysServicesKeur),
    estWasteTons: toNum(b.estWasteTons),
    estFreightTkm: toNum(b.estFreightTkm),
    utilProductType: b.utilProductType,
    utilUnitsSold: b.utilUnitsSold,
    utilLifespanYears: toNum(b.utilLifespanYears),
    utilConsumptionPerYear: toNum(b.utilConsumptionPerYear),
    utilUnit: b.utilUnit,
    utilCountry: b.utilCountry,
    utilCustomFactor: toNum(b.utilCustomFactor),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

type SerializedBilan = ReturnType<typeof serialize>;

// SUM strategy: add all numeric fields across subsidiaries.
function consolidateBilans(bilans: SerializedBilan[]): SerializedBilan {
  const s = (f: keyof SerializedBilan) =>
    sumNullable(bilans.map((b) => b[f] as number | null));
  const first = bilans[0]!;
  return {
    id: first.id,
    organizationId: first.organizationId,
    year: first.year,
    mode: "saisie",
    status: "consolidated",
    methodology: null,
    scope: null,
    energie1: s("energie1"),
    energie2: s("energie2"),
    horsEnergie1: s("horsEnergie1"),
    horsEnergie2: s("horsEnergie2"),
    intrantsBiens: s("intrantsBiens"),
    intrantsServices: s("intrantsServices"),
    futursEmballages: s("futursEmballages"),
    fret: s("fret"),
    deplacements: s("deplacements"),
    dechetsDirects: s("dechetsDirects"),
    immobilisations: s("immobilisations"),
    utilisation: s("utilisation"),
    finDeVie: s("finDeVie"),
    estEmployeeCount: s("estEmployeeCount"),
    estOfficeSqm: s("estOfficeSqm"),
    estSubsidiaryCount: s("estSubsidiaryCount"),
    estHeatingType: null,
    estElecKwhYear: s("estElecKwhYear"),
    estVehicleCount: s("estVehicleCount"),
    estVehicleFuelType: null,
    estTrainKmYear: s("estTrainKmYear"),
    estPlaneKmYear: s("estPlaneKmYear"),
    estBuysGoodsKeur: s("estBuysGoodsKeur"),
    estBuysServicesKeur: s("estBuysServicesKeur"),
    estWasteTons: s("estWasteTons"),
    estFreightTkm: s("estFreightTkm"),
    utilProductType: null,
    utilUnitsSold: s("utilUnitsSold"),
    utilLifespanYears: s("utilLifespanYears"),
    utilConsumptionPerYear: s("utilConsumptionPerYear"),
    utilUnit: null,
    utilCountry: null,
    utilCustomFactor: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// GET /organizations/:orgId/carbon
router.get("/organizations/:orgId/carbon", requireAuth, requireOrgMembership, requireExerciseScope, async (req, res): Promise<void> => {
  const orgId = req.orgId!;
  const exercise = req.exercise!;

  // Consolidation: group with subsidiaries → SUM of all subsidiary bilans
  const subExercises = await getSubsidiaryExercises(orgId, exercise.year);
  if (subExercises.length > 0) {
    const bilans = (
      await Promise.all(
        subExercises.map(({ orgId: subId, exerciseId }) =>
          db
            .select()
            .from(carbonBilansTable)
            .where(and(eq(carbonBilansTable.organizationId, subId), eq(carbonBilansTable.exerciseId, exerciseId)))
            .limit(1)
            .then((rows) => (rows[0] ? serialize(rows[0]) : null)),
        ),
      )
    ).filter((b): b is SerializedBilan => b !== null);

    if (bilans.length === 0) {
      res.status(404).json({ error: "No bilan yet" });
      return;
    }
    res.json(consolidateBilans(bilans));
    return;
  }

  // Normal single-org path
  const [bilan] = await db
    .select()
    .from(carbonBilansTable)
    .where(scopeToExercise(carbonBilansTable, req))
    .orderBy(carbonBilansTable.updatedAt)
    .limit(1);

  if (!bilan) { res.status(404).json({ error: "No bilan yet" }); return; }
  res.json(serialize(bilan));
});

// PUT /organizations/:orgId/carbon
router.put("/organizations/:orgId/carbon", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;

  const payload = withExerciseValues(req, {
    year: Number(body.year) || new Date().getFullYear(),
    mode: String(body.mode ?? "saisie"),
    status: String(body.status ?? "draft"),
    methodology: (body.methodology as string) ?? null,
    scope: (body.scope as string) ?? null,
    energie1: numOrNull(body.energie1),
    energie2: numOrNull(body.energie2),
    horsEnergie1: numOrNull(body.horsEnergie1),
    horsEnergie2: numOrNull(body.horsEnergie2),
    intrantsBiens: numOrNull(body.intrantsBiens),
    intrantsServices: numOrNull(body.intrantsServices),
    futursEmballages: numOrNull(body.futursEmballages),
    fret: numOrNull(body.fret),
    deplacements: numOrNull(body.deplacements),
    dechetsDirects: numOrNull(body.dechetsDirects),
    immobilisations: numOrNull(body.immobilisations),
    utilisation: numOrNull(body.utilisation),
    finDeVie: numOrNull(body.finDeVie),
    estEmployeeCount: body.estEmployeeCount != null ? Number(body.estEmployeeCount) : null,
    estOfficeSqm: body.estOfficeSqm != null ? Number(body.estOfficeSqm) : null,
    estSubsidiaryCount: body.estSubsidiaryCount != null ? Number(body.estSubsidiaryCount) : null,
    estHeatingType: (body.estHeatingType as string) ?? null,
    estElecKwhYear: numOrNull(body.estElecKwhYear),
    estVehicleCount: body.estVehicleCount != null ? Number(body.estVehicleCount) : null,
    estVehicleFuelType: (body.estVehicleFuelType as string) ?? null,
    estTrainKmYear: numOrNull(body.estTrainKmYear),
    estPlaneKmYear: numOrNull(body.estPlaneKmYear),
    estBuysGoodsKeur: numOrNull(body.estBuysGoodsKeur),
    estBuysServicesKeur: numOrNull(body.estBuysServicesKeur),
    estWasteTons: numOrNull(body.estWasteTons),
    estFreightTkm: numOrNull(body.estFreightTkm),
    utilProductType: (body.utilProductType as string) ?? null,
    utilUnitsSold: body.utilUnitsSold != null ? Number(body.utilUnitsSold) : null,
    utilLifespanYears: numOrNull(body.utilLifespanYears),
    utilConsumptionPerYear: numOrNull(body.utilConsumptionPerYear),
    utilUnit: (body.utilUnit as string) ?? null,
    utilCountry: (body.utilCountry as string) ?? null,
    utilCustomFactor: numOrNull(body.utilCustomFactor),
    updatedAt: new Date(),
  });

  const [existing] = await db
    .select({ id: carbonBilansTable.id })
    .from(carbonBilansTable)
    .where(scopeToExercise(carbonBilansTable, req))
    .limit(1);

  let bilan;
  if (existing) {
    [bilan] = await db
      .update(carbonBilansTable)
      .set(payload)
      .where(eq(carbonBilansTable.id, existing.id))
      .returning();
  } else {
    [bilan] = await db.insert(carbonBilansTable).values(payload).returning();
  }

  res.json(serialize(bilan!));
});

// DELETE /organizations/:orgId/carbon
router.delete("/organizations/:orgId/carbon", requireAuth, requireOrgMembership, requireWritableExerciseScope, async (req, res): Promise<void> => {
  const deleted = await db
    .delete(carbonBilansTable)
    .where(scopeToExercise(carbonBilansTable, req))
    .returning();

  if (!deleted.length) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).end();
});

export default router;
