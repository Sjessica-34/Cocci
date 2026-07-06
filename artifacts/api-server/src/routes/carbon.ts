import { Router } from "express";
import { db, membersTable, carbonBilansTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/auth";

const router = Router();

function parseId(raw: string | string[]): number {
  return Number(Array.isArray(raw) ? raw[0] : raw);
}

async function verifyMembership(clerkUserId: string, orgId: number): Promise<number | null> {
  const user = await getOrCreateUser(clerkUserId);
  const [membership] = await db
    .select({ id: membersTable.id })
    .from(membersTable)
    .where(and(eq(membersTable.organizationId, orgId), eq(membersTable.userId, user.id)))
    .limit(1);
  return membership ? user.id : null;
}

function numOrNull(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : String(n);
}

// GET /organizations/:orgId/carbon
router.get("/organizations/:orgId/carbon", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid organization id" }); return; }
  const userId = await verifyMembership(req.clerkUserId!, orgId);
  if (!userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const [bilan] = await db
    .select()
    .from(carbonBilansTable)
    .where(eq(carbonBilansTable.organizationId, orgId))
    .orderBy(carbonBilansTable.updatedAt)
    .limit(1);

  if (!bilan) { res.status(404).json({ error: "No bilan yet" }); return; }

  res.json(serialize(bilan));
});

// PUT /organizations/:orgId/carbon
router.put("/organizations/:orgId/carbon", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid organization id" }); return; }
  const userId = await verifyMembership(req.clerkUserId!, orgId);
  if (!userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const body = req.body as Record<string, unknown>;

  const payload = {
    organizationId: orgId,
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
  };

  const [existing] = await db
    .select({ id: carbonBilansTable.id })
    .from(carbonBilansTable)
    .where(eq(carbonBilansTable.organizationId, orgId))
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
router.delete("/organizations/:orgId/carbon", requireAuth, async (req, res): Promise<void> => {
  const orgId = parseId(req.params.orgId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid organization id" }); return; }
  const userId = await verifyMembership(req.clerkUserId!, orgId);
  if (!userId) { res.status(403).json({ error: "Forbidden" }); return; }

  const deleted = await db
    .delete(carbonBilansTable)
    .where(eq(carbonBilansTable.organizationId, orgId))
    .returning();

  if (!deleted.length) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).end();
});

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

export default router;
