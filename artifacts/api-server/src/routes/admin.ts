import { Router } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import {
  isDevelopmentFromPublishableKey,
  isDevelopmentFromSecretKey,
  parsePublishableKey,
} from "@clerk/shared/keys";
import {
  db,
  usersTable,
  organizationsTable,
  membersTable,
  resourcesTable,
  subscriptionsTable,
  actionLibraryTable,
  exercisesTable,
  rseReportDraftsTable,
} from "@workspace/db";
import { cocciFeedbackTable, cocciRatingsTable } from "@workspace/db";
import { eq, desc, count, max, and, isNull, isNotNull, ne, sql, avg } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireSuperAdmin } from "../middlewares/requireSuperAdmin";
import { MAX_REPORT_GENERATIONS } from "@workspace/rse-referentials";

const router = Router();

// Toutes les routes admin nécessitent auth + superadmin
router.use("/admin", requireAuth, requireSuperAdmin);

// ─── Helpers ───────────────────────────────────────────────────────────────

type Sub = typeof subscriptionsTable.$inferSelect | null;
class LastActiveOwnerAdminMutationError extends Error {}

function effectiveMaxEmployees(sub: Sub): number | null {
  if (!sub) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (
    sub.overrideMaxEmployees !== null &&
    sub.overrideMaxEmployees !== undefined &&
    (!sub.overrideExpiresAt || sub.overrideExpiresAt >= today)
  ) {
    return sub.overrideMaxEmployees;
  }
  return sub.maxEmployees ?? null;
}

function computeCompliance(
  employeeCount: number | null,
  sub: Sub,
): { status: string; message: string | null; overflow: number | null } {
  if (!sub || sub.mode === "free" || sub.mode === "demo") {
    return { status: "na", message: null, overflow: null };
  }
  const max = effectiveMaxEmployees(sub);
  if (max === null) return { status: "na", message: null, overflow: null };
  if (employeeCount === null) {
    return { status: "missing", message: "Effectif non renseigné", overflow: null };
  }
  if (employeeCount > max) {
    const overflow = employeeCount - max;
    return {
      status: "overflow",
      message: `Dépassement de ${overflow} salarié${overflow > 1 ? "s" : ""}`,
      overflow,
    };
  }
  return { status: "ok", message: "Conforme", overflow: null };
}

function computeHealthScore(
  lastActivityAt: Date | null,
  sub: Sub,
  memberCount: number,
): number {
  let score = 0;

  // Subscription status (40 pts)
  if (sub) {
    if (sub.status === "active") score += 40;
    else if (sub.status === "trial") score += 30;
    else if (sub.status === "suspended") score += 0;
    else score += 10; // expired
  } else {
    score += 20;
  }

  // Dernière activité (40 pts)
  if (lastActivityAt) {
    const days = (Date.now() - lastActivityAt.getTime()) / 86400000;
    if (days <= 7) score += 40;
    else if (days <= 30) score += 30;
    else if (days <= 90) score += 15;
    else score += 5;
  }

  // Membres (20 pts)
  if (memberCount >= 5) score += 20;
  else if (memberCount >= 2) score += 15;
  else if (memberCount >= 1) score += 8;

  return Math.min(100, score);
}

type OrgRow = typeof organizationsTable.$inferSelect;

function buildAdminOrg(
  org: OrgRow,
  memberCount: number,
  sub: Sub,
  lastActivityAt: Date | null,
  hasAdmin: boolean,
) {
  const compliance = computeCompliance(org.employeeCount, sub);
  const healthScore = computeHealthScore(lastActivityAt, sub, memberCount);
  return {
    id: org.id,
    name: org.name,
    legalName: org.legalName,
    siren: org.siren,
    siret: org.siret,
    address: org.address,
    sector: org.sector,
    size: org.size,
    contactName: org.contactName,
    contactEmail: org.contactEmail,
    contactPhone: org.contactPhone,
    employeeCount: org.employeeCount,
    type: org.type,
    parentId: org.parentId,
    groupMode: org.groupMode,
    memberCount,
    lastActivityAt: lastActivityAt?.toISOString() ?? null,
    createdAt: org.createdAt.toISOString(),
    subscription: sub ? mapSub(sub) : null,
    compliance,
    healthScore,
  };
}

function mapSub(sub: typeof subscriptionsTable.$inferSelect) {
  return {
    id: sub.id,
    organizationId: sub.organizationId,
    mode: sub.mode,
    status: sub.status,
    offerName: sub.offerName,
    maxEmployees: sub.maxEmployees,
    maxUsers: sub.maxUsers,
    startAt: sub.startAt,
    endAt: sub.endAt,
    trialStartAt: sub.trialStartAt,
    trialEndAt: sub.trialEndAt,
    autoRenew: sub.autoRenew,
    stripeSubscriptionId: sub.stripeSubscriptionId,
    stripeCustomerId: sub.stripeCustomerId,
    modules: sub.modules,
    notes: sub.notes,
    overrideMaxEmployees: sub.overrideMaxEmployees,
    overrideMaxUsers: sub.overrideMaxUsers,
    overrideNote: sub.overrideNote,
    overrideExpiresAt: sub.overrideExpiresAt,
    createdAt: sub.createdAt.toISOString(),
    updatedAt: sub.updatedAt.toISOString(),
  };
}

function computeAlerts(
  org: OrgRow,
  sub: Sub,
  memberCount: number,
  hasAdmin: boolean,
) {
  const alerts: {
    organizationId: number;
    organizationName: string;
    type: string;
    severity: string;
    message: string;
    detail: string | null;
  }[] = [];

  if (sub?.status === "expired") {
    alerts.push({
      organizationId: org.id,
      organizationName: org.name,
      type: "expired_subscription",
      severity: "critical",
      message: "Abonnement expiré",
      detail: sub.endAt ? `Depuis le ${new Date(sub.endAt).toLocaleDateString("fr-FR")}` : null,
    });
  }

  if (sub?.status === "suspended") {
    alerts.push({
      organizationId: org.id,
      organizationName: org.name,
      type: "suspended",
      severity: "warning",
      message: "Compte suspendu",
      detail: null,
    });
  }

  const compliance = computeCompliance(org.employeeCount, sub);
  if (compliance.status === "overflow") {
    alerts.push({
      organizationId: org.id,
      organizationName: org.name,
      type: "employee_overflow",
      severity: "warning",
      message: compliance.message!,
      detail: `Effectif déclaré : ${org.employeeCount} | Autorisé : ${effectiveMaxEmployees(sub)}`,
    });
  }

  if (!hasAdmin && memberCount > 0) {
    alerts.push({
      organizationId: org.id,
      organizationName: org.name,
      type: "no_admin",
      severity: "warning",
      message: "Aucun administrateur",
      detail: "Aucun membre avec rôle owner ou admin",
    });
  }

  if (!org.sector || !org.size) {
    alerts.push({
      organizationId: org.id,
      organizationName: org.name,
      type: "missing_data",
      severity: "info",
      message: "Informations manquantes",
      detail: [!org.sector && "Secteur", !org.size && "Taille"].filter(Boolean).join(", "),
    });
  }

  if (sub?.status === "trial" && sub.trialEndAt) {
    const daysLeft = Math.ceil(
      (new Date(sub.trialEndAt).getTime() - Date.now()) / 86400000,
    );
    if (daysLeft <= 7 && daysLeft >= 0) {
      alerts.push({
        organizationId: org.id,
        organizationName: org.name,
        type: "trial_expiring",
        severity: "warning",
        message: `Essai expire dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`,
        detail: `Date d'expiration : ${new Date(sub.trialEndAt).toLocaleDateString("fr-FR")}`,
      });
    }
  }

  return alerts;
}

// ─── Charge complète de toutes les orgs avec leurs données associées ──────────

async function loadAllOrgsEnriched() {
  const orgs = await db
    .select()
    .from(organizationsTable)
    .orderBy(desc(organizationsTable.createdAt));

  const [memberCounts, subs, lastLogins, adminFlags] = await Promise.all([
    // Compteur de membres par org
    db
      .select({ organizationId: membersTable.organizationId, count: count() })
      .from(membersTable)
      .groupBy(membersTable.organizationId),

    // Abonnements
    db.select().from(subscriptionsTable),

    // Dernière connexion par org (max des lastLoginAt des membres)
    db
      .select({
        organizationId: membersTable.organizationId,
        lastLoginAt: max(usersTable.lastLoginAt),
      })
      .from(membersTable)
      .innerJoin(usersTable, eq(membersTable.userId, usersTable.id))
      .groupBy(membersTable.organizationId),

    // Y a-t-il un admin/owner par org ?
    db
      .select({ organizationId: membersTable.organizationId })
      .from(membersTable)
      .where(sql`${membersTable.role} IN ('owner', 'admin')`),
  ]);

  const countMap = new Map(memberCounts.map((m) => [m.organizationId, Number(m.count)]));
  const subMap = new Map(subs.map((s) => [s.organizationId, s]));
  const loginMap = new Map(lastLogins.map((l) => [l.organizationId, l.lastLoginAt]));
  const adminSet = new Set(adminFlags.map((a) => a.organizationId));

  return orgs.map((org) => {
    const memberCount = countMap.get(org.id) ?? 0;
    const sub = subMap.get(org.id) ?? null;
    const rawLogin = loginMap.get(org.id);
    const lastActivityAt = rawLogin ? new Date(rawLogin) : org.lastActivityAt;
    const hasAdmin = adminSet.has(org.id);
    return { org, memberCount, sub, lastActivityAt, hasAdmin };
  });
}

// ─── GET /admin/stats ─────────────────────────────────────────────────────────
router.get("/admin/stats", async (req, res) => {
  const [orgCount, userCount, memberCount] = await Promise.all([
    db.select({ count: count() }).from(organizationsTable),
    db.select({ count: count() }).from(usersTable),
    db.select({ count: count() }).from(membersTable),
  ]);

  const [activeSubs, trialSubs, suspendedSubs, groups, subsidiaries] = await Promise.all([
    db.select({ count: count() }).from(subscriptionsTable).where(eq(subscriptionsTable.status, "active")),
    db.select({ count: count() }).from(subscriptionsTable).where(eq(subscriptionsTable.status, "trial")),
    db.select({ count: count() }).from(subscriptionsTable).where(eq(subscriptionsTable.status, "suspended")),
    db.select({ count: count() }).from(organizationsTable).where(eq(organizationsTable.type, "groupe")),
    db.select({ count: count() }).from(organizationsTable).where(isNotNull(organizationsTable.parentId)),
  ]);

  // Orgs sans abonnement comptent comme actives (mode free implicite)
  const activeCount = Number(activeSubs[0].count);
  const trialCount = Number(trialSubs[0].count);
  const suspendedCount = Number(suspendedSubs[0].count);

  // Alertes rapides : orgs avec abonnement expiré ou suspended
  const expiredSubs = await db
    .select({ count: count() })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.status, "expired"));
  const alertCount = Number(expiredSubs[0].count) + suspendedCount;

  res.json({
    organizationCount: Number(orgCount[0].count),
    userCount: Number(userCount[0].count),
    memberCount: Number(memberCount[0].count),
    activeCount,
    trialCount,
    suspendedCount,
    groupCount: Number(groups[0].count),
    subsidiaryCount: Number(subsidiaries[0].count),
    alertCount,
  });
});

// ─── POST /admin/organizations — créer une organisation ───────────────────────
router.post("/admin/organizations", async (req, res): Promise<void> => {
  const { name, siren, sector, size } = req.body as Record<string, unknown>;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "Le nom est requis" });
    return;
  }

  // Créer l'organisation
  const [newOrg] = await db
    .insert(organizationsTable)
    .values({
      name: name.trim(),
      siren: typeof siren === "string" && siren.trim() ? siren.trim() : null,
      sector: typeof sector === "string" && sector.trim() ? sector.trim() : null,
      size: typeof size === "string" && size.trim() ? size.trim() : null,
      type: "entreprise",
    })
    .returning();

  if (!newOrg) {
    res.status(500).json({ error: "Échec de la création" });
    return;
  }

  // Créer une souscription free par défaut
  await db
    .insert(subscriptionsTable)
    .values({
      organizationId: newOrg.id,
      mode: "free",
      status: "active",
    })
    .onConflictDoNothing();

  // Renvoyer l'organisation enrichie
  const enriched = buildAdminOrg(newOrg, 0, null, null, false);
  res.status(201).json(enriched);
});

// ─── GET /admin/organizations — liste enrichie ────────────────────────────────
router.get("/admin/organizations", async (req, res) => {
  const items = await loadAllOrgsEnriched();
  res.json(items.map(({ org, memberCount, sub, lastActivityAt, hasAdmin }) =>
    buildAdminOrg(org, memberCount, sub, lastActivityAt, hasAdmin),
  ));
});

// ─── GET /admin/organizations/:id ─────────────────────────────────────────────
router.get("/admin/organizations/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const orgId = Number(rawId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, orgId));
  if (!org) { res.status(404).json({ error: "Not found" }); return; }

  const [memberCounts, subs, lastLogins, adminFlags] = await Promise.all([
    db.select({ count: count() }).from(membersTable).where(eq(membersTable.organizationId, orgId)),
    db.select().from(subscriptionsTable).where(eq(subscriptionsTable.organizationId, orgId)),
    db
      .select({ lastLoginAt: max(usersTable.lastLoginAt) })
      .from(membersTable)
      .innerJoin(usersTable, eq(membersTable.userId, usersTable.id))
      .where(eq(membersTable.organizationId, orgId)),
    db
      .select()
      .from(membersTable)
      .where(
        and(
          eq(membersTable.organizationId, orgId),
          sql`${membersTable.role} IN ('owner', 'admin')`,
        ),
      ),
  ]);

  const memberCount = Number(memberCounts[0]?.count ?? 0);
  const sub = subs[0] ?? null;
  const rawLogin = lastLogins[0]?.lastLoginAt;
  const lastActivityAt = rawLogin ? new Date(rawLogin) : org.lastActivityAt;
  const hasAdmin = adminFlags.length > 0;

  res.json(buildAdminOrg(org, memberCount, sub, lastActivityAt, hasAdmin));
});

// ─── PATCH /admin/organizations/:id ──────────────────────────────────────────
router.patch("/admin/organizations/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const orgId = Number(rawId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const {
    name, legalName, siren, siret, address, sector, size,
    contactName, contactEmail, contactPhone, employeeCount,
  } = req.body as Record<string, unknown>;

  const updates: Partial<typeof organizationsTable.$inferInsert> = { updatedAt: new Date() };
  if (typeof name === "string") updates.name = name;
  if ("legalName" in req.body) updates.legalName = legalName as string | null;
  if ("siren" in req.body) updates.siren = siren as string | null;
  if ("siret" in req.body) updates.siret = siret as string | null;
  if ("address" in req.body) updates.address = address as string | null;
  if ("sector" in req.body) updates.sector = sector as string | null;
  if ("size" in req.body) updates.size = size as string | null;
  if ("contactName" in req.body) updates.contactName = contactName as string | null;
  if ("contactEmail" in req.body) updates.contactEmail = contactEmail as string | null;
  if ("contactPhone" in req.body) updates.contactPhone = contactPhone as string | null;
  if ("employeeCount" in req.body) updates.employeeCount = employeeCount as number | null;

  const [updated] = await db
    .update(organizationsTable)
    .set(updates)
    .where(eq(organizationsTable.id, orgId))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  // Renvoyer l'org enrichie
  const [memberCounts, subs, lastLogins, adminFlags] = await Promise.all([
    db.select({ count: count() }).from(membersTable).where(eq(membersTable.organizationId, orgId)),
    db.select().from(subscriptionsTable).where(eq(subscriptionsTable.organizationId, orgId)),
    db
      .select({ lastLoginAt: max(usersTable.lastLoginAt) })
      .from(membersTable)
      .innerJoin(usersTable, eq(membersTable.userId, usersTable.id))
      .where(eq(membersTable.organizationId, orgId)),
    db
      .select()
      .from(membersTable)
      .where(
        and(
          eq(membersTable.organizationId, orgId),
          sql`${membersTable.role} IN ('owner', 'admin')`,
        ),
      ),
  ]);

  const memberCount = Number(memberCounts[0]?.count ?? 0);
  const sub = subs[0] ?? null;
  const rawLogin = lastLogins[0]?.lastLoginAt;
  const lastActivityAt = rawLogin ? new Date(rawLogin) : updated.lastActivityAt;
  const hasAdmin = adminFlags.length > 0;

  res.json(buildAdminOrg(updated, memberCount, sub, lastActivityAt, hasAdmin));
});

// ─── GET /admin/organizations/:id/subscription ─────────────────────────────────
router.get("/admin/organizations/:id/subscription", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const orgId = Number(rawId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.organizationId, orgId));

  if (!sub) { res.status(204).end(); return; }
  res.json(mapSub(sub));
});

// ─── PUT /admin/organizations/:id/subscription ─────────────────────────────────
router.put("/admin/organizations/:id/subscription", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const orgId = Number(rawId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const b = req.body as Record<string, unknown>;

  const values: Partial<typeof subscriptionsTable.$inferInsert> & { organizationId: number } = {
    organizationId: orgId,
    updatedAt: new Date(),
  };

  const fields = [
    "mode", "status", "offerName", "maxEmployees", "maxUsers",
    "startAt", "endAt", "trialStartAt", "trialEndAt", "autoRenew",
    "stripeSubscriptionId", "stripeCustomerId", "modules", "notes",
    "overrideMaxEmployees", "overrideMaxUsers", "overrideNote", "overrideExpiresAt",
  ] as const;

  for (const field of fields) {
    if (field in b) {
      (values as Record<string, unknown>)[field] = b[field];
    }
  }

  // Upsert: insert ou update si déjà existant
  const [existing] = await db
    .select({ id: subscriptionsTable.id })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.organizationId, orgId));

  let sub: typeof subscriptionsTable.$inferSelect;
  if (existing) {
    const [updated] = await db
      .update(subscriptionsTable)
      .set(values)
      .where(eq(subscriptionsTable.organizationId, orgId))
      .returning();
    sub = updated;
  } else {
    const [created] = await db
      .insert(subscriptionsTable)
      .values({ ...values, organizationId: orgId })
      .returning();
    sub = created;
  }

  res.json(mapSub(sub));
});

// ─── QUOTAS RAPPORT RSE (superadmin) ─────────────────────────────────────────
router.get("/admin/organizations/:id/report-generations", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const orgId = Number(rawId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [org, exercises, drafts] = await Promise.all([
    db.select({ id: organizationsTable.id }).from(organizationsTable).where(eq(organizationsTable.id, orgId)).limit(1),
    db.select().from(exercisesTable).where(eq(exercisesTable.organizationId, orgId)).orderBy(desc(exercisesTable.year)),
    db.select().from(rseReportDraftsTable).where(eq(rseReportDraftsTable.organizationId, orgId)),
  ]);
  if (!org) { res.status(404).json({ error: "Not found" }); return; }

  const draftsByExercise = new Map(drafts.map((draft) => [draft.exerciseId, draft]));
  res.json(exercises.map((exercise) => {
    const draft = draftsByExercise.get(exercise.id);
    const usedGenerations = draft?.generationYear === new Date().getFullYear()
      ? (draft.generationCount ?? 0)
      : 0;
    const additionalGenerations = draft?.generationBonus ?? 0;
    return {
      exerciseId: exercise.id,
      exerciseYear: exercise.year,
      exerciseStatus: exercise.status,
      usedGenerations,
      additionalGenerations,
      maxGenerations: MAX_REPORT_GENERATIONS + additionalGenerations,
    };
  }));
});

router.post("/admin/organizations/:id/report-generations/grant", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const orgId = Number(rawId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { exerciseId, generations } = req.body as Record<string, unknown>;
  if (!Number.isInteger(exerciseId) || Number(exerciseId) <= 0 || !Number.isInteger(generations) || Number(generations) < 1 || Number(generations) > 1000) {
    res.status(400).json({ error: "exerciseId and generations (1–1000) are required" });
    return;
  }

  const [exercise] = await db
    .select({ id: exercisesTable.id, year: exercisesTable.year, status: exercisesTable.status })
    .from(exercisesTable)
    .where(and(eq(exercisesTable.id, Number(exerciseId)), eq(exercisesTable.organizationId, orgId)))
    .limit(1);
  if (!exercise) { res.status(404).json({ error: "Exercise not found" }); return; }

  // Use the same per-organization/exercise transaction lock as PDF generation.
  // Without it, a first grant could race a first generation and make the latter
  // fail its draft insert on the unique (organization, exercise) key.
  const quota = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${orgId}, ${exercise.id})`);
    const updatedAt = new Date();

    await tx
      .insert(rseReportDraftsTable)
      .values({
        organizationId: orgId,
        exerciseId: exercise.id,
        generationBonus: Number(generations),
      })
      .onConflictDoUpdate({
        target: [rseReportDraftsTable.organizationId, rseReportDraftsTable.exerciseId],
        set: {
          generationBonus: sql`${rseReportDraftsTable.generationBonus} + ${Number(generations)}`,
          updatedAt,
        },
      });

    const [draft] = await tx
      .select({
        generationCount: rseReportDraftsTable.generationCount,
        generationYear: rseReportDraftsTable.generationYear,
        generationBonus: rseReportDraftsTable.generationBonus,
      })
      .from(rseReportDraftsTable)
      .where(and(eq(rseReportDraftsTable.organizationId, orgId), eq(rseReportDraftsTable.exerciseId, exercise.id)));

    const usedGenerations = draft?.generationYear === new Date().getFullYear()
      ? (draft.generationCount ?? 0)
      : 0;
    const additionalGenerations = draft?.generationBonus ?? 0;
    return {
      exerciseId: exercise.id,
      exerciseYear: exercise.year,
      exerciseStatus: exercise.status,
      usedGenerations,
      additionalGenerations,
      maxGenerations: MAX_REPORT_GENERATIONS + additionalGenerations,
    };
  });
  res.json(quota);
});

// ─── POST /admin/organizations/:id/suspend ────────────────────────────────────
router.post("/admin/organizations/:id/suspend", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const orgId = Number(rawId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid id" }); return; }

  // Upsert subscription avec status suspended
  const [existing] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.organizationId, orgId));

  if (existing) {
    await db
      .update(subscriptionsTable)
      .set({ status: "suspended", updatedAt: new Date() })
      .where(eq(subscriptionsTable.organizationId, orgId));
  } else {
    await db
      .insert(subscriptionsTable)
      .values({ organizationId: orgId, mode: "free", status: "suspended" });
  }

  // Retourne l'org enrichie
  const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, orgId));
  if (!org) { res.status(404).json({ error: "Not found" }); return; }

  const [memberCounts, subs] = await Promise.all([
    db.select({ count: count() }).from(membersTable).where(eq(membersTable.organizationId, orgId)),
    db.select().from(subscriptionsTable).where(eq(subscriptionsTable.organizationId, orgId)),
  ]);

  res.json(buildAdminOrg(org, Number(memberCounts[0]?.count ?? 0), subs[0] ?? null, null, false));
});

// ─── POST /admin/organizations/:id/reactivate ─────────────────────────────────
router.post("/admin/organizations/:id/reactivate", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const orgId = Number(rawId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.organizationId, orgId));

  if (existing) {
    await db
      .update(subscriptionsTable)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(subscriptionsTable.organizationId, orgId));
  } else {
    await db
      .insert(subscriptionsTable)
      .values({ organizationId: orgId, mode: "free", status: "active" });
  }

  const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, orgId));
  if (!org) { res.status(404).json({ error: "Not found" }); return; }

  const [memberCounts, subs] = await Promise.all([
    db.select({ count: count() }).from(membersTable).where(eq(membersTable.organizationId, orgId)),
    db.select().from(subscriptionsTable).where(eq(subscriptionsTable.organizationId, orgId)),
  ]);

  res.json(buildAdminOrg(org, Number(memberCounts[0]?.count ?? 0), subs[0] ?? null, null, false));
});

// ─── GET /admin/alerts ────────────────────────────────────────────────────────
router.get("/admin/alerts", async (req, res) => {
  const items = await loadAllOrgsEnriched();
  const alerts = items.flatMap(({ org, memberCount, sub, hasAdmin }) =>
    computeAlerts(org, sub, memberCount, hasAdmin),
  );
  res.json(alerts);
});

// ─── GET /admin/organizations/:id/members ─────────────────────────────────────
router.get("/admin/organizations/:id/members", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const orgId = Number(rawId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const members = await db
    .select({
      id: membersTable.id,
      role: membersTable.role,
      status: membersTable.status,
      createdAt: membersTable.createdAt,
      user: {
        id: usersTable.id,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        avatarUrl: usersTable.avatarUrl,
        isSuperAdmin: usersTable.isSuperAdmin,
        lastLoginAt: usersTable.lastLoginAt,
      },
    })
    .from(membersTable)
    .innerJoin(usersTable, eq(membersTable.userId, usersTable.id))
    .where(eq(membersTable.organizationId, orgId))
    .orderBy(desc(membersTable.createdAt));

  res.json(members);
});

// ─── PATCH /admin/members/:memberId ──────────────────────────────────────────
router.patch("/admin/members/:memberId", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.memberId) ? req.params.memberId[0] : req.params.memberId;
  const memberId = Number(rawId);
  if (!memberId || isNaN(memberId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { role, status } = req.body as Record<string, unknown>;
  const updates: Partial<typeof membersTable.$inferInsert> = {};
  if (typeof role === "string") updates.role = role;
  if (typeof status === "string") updates.status = status;

  let updated;
  try {
    updated = await db.transaction(async (tx) => {
      const [initialTarget] = await tx
        .select({ organizationId: membersTable.organizationId })
        .from(membersTable)
        .where(eq(membersTable.id, memberId))
        .limit(1);
      if (!initialTarget) return undefined;
      await tx.execute(
        sql`select pg_advisory_xact_lock(67101, ${initialTarget.organizationId})`,
      );
      const [target] = await tx
        .select({
          role: membersTable.role,
          status: membersTable.status,
          organizationId: membersTable.organizationId,
        })
        .from(membersTable)
        .where(eq(membersTable.id, memberId))
        .limit(1);
      if (!target) return undefined;
      const nextRole = updates.role ?? target.role;
      const nextStatus = updates.status ?? target.status;
      if (
        target.role === "owner" &&
        target.status === "active" &&
        (nextRole !== "owner" || nextStatus !== "active")
      ) {
        const [otherActiveOwner] = await tx
          .select({ id: membersTable.id })
          .from(membersTable)
          .where(and(
            eq(membersTable.organizationId, target.organizationId),
            eq(membersTable.role, "owner"),
            eq(membersTable.status, "active"),
            ne(membersTable.id, memberId),
          ))
          .limit(1);
        if (!otherActiveOwner) throw new LastActiveOwnerAdminMutationError();
      }
      const [result] = await tx
        .update(membersTable)
        .set(updates)
        .where(eq(membersTable.id, memberId))
        .returning();
      return result;
    });
  } catch (error) {
    if (error instanceof LastActiveOwnerAdminMutationError) {
      res.status(409).json({ error: "Le dernier propriétaire actif ne peut pas être rétrogradé ou suspendu" });
      return;
    }
    throw error;
  }

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  const [withUser] = await db
    .select({
      id: membersTable.id,
      role: membersTable.role,
      status: membersTable.status,
      createdAt: membersTable.createdAt,
      user: {
        id: usersTable.id,
        email: usersTable.email,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        avatarUrl: usersTable.avatarUrl,
        isSuperAdmin: usersTable.isSuperAdmin,
      },
    })
    .from(membersTable)
    .innerJoin(usersTable, eq(membersTable.userId, usersTable.id))
    .where(eq(membersTable.id, memberId));

  res.json(withUser);
});

// ─── DELETE /admin/members/:memberId ──────────────────────────────────────────
router.delete("/admin/members/:memberId", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.memberId) ? req.params.memberId[0] : req.params.memberId;
  const memberId = Number(rawId);
  if (!memberId || isNaN(memberId)) { res.status(400).json({ error: "Invalid id" }); return; }

  let deleted;
  try {
    deleted = await db.transaction(async (tx) => {
      const [initialTarget] = await tx
        .select({ organizationId: membersTable.organizationId })
        .from(membersTable)
        .where(eq(membersTable.id, memberId))
        .limit(1);
      if (!initialTarget) return undefined;
      await tx.execute(
        sql`select pg_advisory_xact_lock(67101, ${initialTarget.organizationId})`,
      );
      const [target] = await tx
        .select({
          role: membersTable.role,
          status: membersTable.status,
          organizationId: membersTable.organizationId,
        })
        .from(membersTable)
        .where(eq(membersTable.id, memberId))
        .limit(1);
      if (!target) return undefined;
      if (target.role === "owner" && target.status === "active") {
        const [otherActiveOwner] = await tx
          .select({ id: membersTable.id })
          .from(membersTable)
          .where(and(
            eq(membersTable.organizationId, target.organizationId),
            eq(membersTable.role, "owner"),
            eq(membersTable.status, "active"),
            ne(membersTable.id, memberId),
          ))
          .limit(1);
        if (!otherActiveOwner) throw new LastActiveOwnerAdminMutationError();
      }
      const [result] = await tx
        .delete(membersTable)
        .where(eq(membersTable.id, memberId))
        .returning();
      return result;
    });
  } catch (error) {
    if (error instanceof LastActiveOwnerAdminMutationError) {
      res.status(409).json({ error: "Le dernier propriétaire actif ne peut pas être supprimé" });
      return;
    }
    throw error;
  }
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).end();
});

// ─── GET /admin/users ─────────────────────────────────────────────────────────
router.get("/admin/users", async (req, res) => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  if (users.some((user) => user.id === 5)) {
    const publishableKey = process.env.CLERK_PUBLISHABLE_KEY ?? "";
    const secretKey = process.env.CLERK_SECRET_KEY ?? "";
    const parsedPublishableKey = publishableKey
      ? parsePublishableKey(publishableKey)
      : null;
    const auth = getAuth(req);

    console.log("[admin/users][safe-clerk-trace] users.id=5", {
      middleware: {
        publishableKeySource: "process.env.CLERK_PUBLISHABLE_KEY",
        secretKeySource: "process.env.CLERK_SECRET_KEY",
        sessionIssuer: auth.sessionClaims?.iss ?? null,
        authenticatedUserId: auth.userId ?? null,
        frontendApi: parsedPublishableKey?.frontendApi ?? null,
        environment: parsedPublishableKey
          ? isDevelopmentFromPublishableKey(publishableKey)
            ? "development"
            : "production"
          : null,
        secretKeyConfigured: Boolean(secretKey),
        secretKeyEnvironment: secretKey
          ? isDevelopmentFromSecretKey(secretKey)
            ? "development"
            : "production"
          : null,
      },
      clerkClient: {
        implementation: "@clerk/express clerkClient singleton",
        secretKeySource: "@clerk/express loadApiEnv()",
        secretKeyConfigured: Boolean(secretKey),
        secretKeyEnvironment: secretKey
          ? isDevelopmentFromSecretKey(secretKey)
            ? "development"
            : "production"
          : null,
        frontendApi: "not exposed by clerkClient.users.getUser(); resolved by its secret key",
      },
      comparison: {
        middlewareAndClerkClientUseSameSecretEnvVar:
          "process.env.CLERK_SECRET_KEY",
        secretValueLogged: false,
      },
    });
  }

  const enrichedUsers = await Promise.all(users.map(async (user) => {
    try {
      const clerkUser = await clerkClient.users.getUser(user.clerkId);
      const email = clerkUser.primaryEmailAddress?.emailAddress ?? user.email;
      const firstName = clerkUser.firstName ?? user.firstName;
      const lastName = clerkUser.lastName ?? user.lastName;
      const avatarUrl = clerkUser.imageUrl ?? user.avatarUrl;

      return {
        ...user,
        email,
        firstName,
        lastName,
        avatarUrl,
      };
    } catch {
      // Un compte Clerk supprimé ou temporairement indisponible ne doit pas
      // empêcher l'affichage des autres utilisateurs locaux.
      return user;
    }
  }));
  res.json(enrichedUsers);
});

// ─── GET /admin/organizations/:orgId/resources ────────────────────────────────
router.get("/admin/organizations/:orgId/resources", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.orgId) ? req.params.orgId[0] : req.params.orgId;
  const orgId = Number(rawId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const resources = await db
    .select()
    .from(resourcesTable)
    .where(eq(resourcesTable.organizationId, orgId))
    .orderBy(desc(resourcesTable.createdAt));

  res.json(resources);
});

// ─── POST /admin/organizations/:orgId/resources ───────────────────────────────
router.post("/admin/organizations/:orgId/resources", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.orgId) ? req.params.orgId[0] : req.params.orgId;
  const orgId = Number(rawId);
  if (!orgId || isNaN(orgId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { title, description, category, documentType, imageUrl, fileUrl } = req.body;
  if (!title || typeof title !== "string") {
    res.status(400).json({ error: "title is required" });
    return;
  }

  const [created] = await db
    .insert(resourcesTable)
    .values({ organizationId: orgId, title, description, category, documentType, imageUrl, fileUrl })
    .returning();

  res.status(201).json(created);
});

// ─── PATCH /admin/resources/:id ───────────────────────────────────────────────
router.patch("/admin/resources/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = Number(rawId);
  if (!id || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { title, description, category, documentType, imageUrl, fileUrl } = req.body;
  const [updated] = await db
    .update(resourcesTable)
    .set({ title, description, category, documentType, imageUrl, fileUrl, updatedAt: new Date() })
    .where(eq(resourcesTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

// ─── DELETE /admin/resources/:id ──────────────────────────────────────────────
router.delete("/admin/resources/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = Number(rawId);
  if (!id || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [deleted] = await db.delete(resourcesTable).where(eq(resourcesTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).end();
});

// ─── PATCH /admin/resources/:id/publish ───────────────────────────────────────
router.patch("/admin/resources/:id/publish", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = Number(rawId);
  if (!id || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { isPublished } = req.body;
  if (typeof isPublished !== "boolean") {
    res.status(400).json({ error: "isPublished must be a boolean" });
    return;
  }

  const [updated] = await db
    .update(resourcesTable)
    .set({ isPublished, publishedAt: isPublished ? new Date() : null, updatedAt: new Date() })
    .where(eq(resourcesTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

// ─── GET /admin/global-resources ─────────────────────────────────────────────
router.get("/admin/global-resources", async (req, res): Promise<void> => {
  const resources = await db
    .select()
    .from(resourcesTable)
    .where(eq(resourcesTable.isGlobal, true))
    .orderBy(desc(resourcesTable.createdAt));
  res.json(resources);
});

// ─── POST /admin/global-resources ────────────────────────────────────────────
router.post("/admin/global-resources", async (req, res): Promise<void> => {
  const { title, description, category, documentType, imageUrl, fileUrl, isPublished } = req.body;
  if (!title || typeof title !== "string") {
    res.status(400).json({ error: "title is required" });
    return;
  }
  const [created] = await db
    .insert(resourcesTable)
    .values({
      isGlobal: true,
      organizationId: null,
      title, description, category, documentType, imageUrl, fileUrl,
      isPublished: isPublished !== false, // publié par défaut
    })
    .returning();
  res.status(201).json(created);
});

// ─── PATCH /admin/users/:id/superadmin ────────────────────────────────────────
router.patch("/admin/users/:id/superadmin", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const userId = Number(rawId);
  if (!userId || isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { isSuperAdmin } = req.body;
  if (typeof isSuperAdmin !== "boolean") {
    res.status(400).json({ error: "isSuperAdmin must be a boolean" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ isSuperAdmin })
    .where(eq(usersTable.id, userId))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

// ─── GET /admin/echanges/feedback ────────────────────────────────────────────
router.get("/admin/echanges/feedback", async (req, res) => {
  const rows = await db
    .select({
      id: cocciFeedbackTable.id,
      organizationId: cocciFeedbackTable.organizationId,
      organizationName: organizationsTable.name,
      userId: cocciFeedbackTable.userId,
      userFirstName: usersTable.firstName,
      userLastName: usersTable.lastName,
      userEmail: usersTable.email,
      subject: cocciFeedbackTable.subject,
      requestType: cocciFeedbackTable.requestType,
      message: cocciFeedbackTable.message,
      attachmentUrl: cocciFeedbackTable.attachmentUrl,
      wantsCallback: cocciFeedbackTable.wantsCallback,
      status: cocciFeedbackTable.status,
      history: cocciFeedbackTable.history,
      createdAt: cocciFeedbackTable.createdAt,
      updatedAt: cocciFeedbackTable.updatedAt,
    })
    .from(cocciFeedbackTable)
    .innerJoin(organizationsTable, eq(cocciFeedbackTable.organizationId, organizationsTable.id))
    .innerJoin(usersTable, eq(cocciFeedbackTable.userId, usersTable.id))
    .orderBy(desc(cocciFeedbackTable.createdAt));

  res.json(rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  })));
});

// ─── PATCH /admin/echanges/feedback/:id ──────────────────────────────────────
router.patch("/admin/echanges/feedback/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = Number(rawId);
  if (!id || isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { status, note } = req.body as Record<string, unknown>;
  if (!status || typeof status !== "string") {
    res.status(400).json({ error: "status requis" });
    return;
  }

  const VALID_STATUSES = ["nouveau", "en_cours", "traite", "ferme"];
  if (!VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: "Statut invalide" });
    return;
  }

  const [existing] = await db
    .select({ history: cocciFeedbackTable.history })
    .from(cocciFeedbackTable)
    .where(eq(cocciFeedbackTable.id, id));

  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const historyEntry: Record<string, unknown> = {
    date: new Date().toISOString(),
    status,
  };
  if (typeof note === "string" && note.trim()) historyEntry.note = note.trim();

  const newHistory = [
    ...((existing.history as unknown[]) ?? []),
    historyEntry,
  ];

  const [updated] = await db
    .update(cocciFeedbackTable)
    .set({ status, history: newHistory, updatedAt: new Date() })
    .where(eq(cocciFeedbackTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Not found" }); return; }

  // Return enriched row
  const [enriched] = await db
    .select({
      id: cocciFeedbackTable.id,
      organizationId: cocciFeedbackTable.organizationId,
      organizationName: organizationsTable.name,
      userId: cocciFeedbackTable.userId,
      userFirstName: usersTable.firstName,
      userLastName: usersTable.lastName,
      userEmail: usersTable.email,
      subject: cocciFeedbackTable.subject,
      requestType: cocciFeedbackTable.requestType,
      message: cocciFeedbackTable.message,
      attachmentUrl: cocciFeedbackTable.attachmentUrl,
      wantsCallback: cocciFeedbackTable.wantsCallback,
      status: cocciFeedbackTable.status,
      history: cocciFeedbackTable.history,
      createdAt: cocciFeedbackTable.createdAt,
      updatedAt: cocciFeedbackTable.updatedAt,
    })
    .from(cocciFeedbackTable)
    .innerJoin(organizationsTable, eq(cocciFeedbackTable.organizationId, organizationsTable.id))
    .innerJoin(usersTable, eq(cocciFeedbackTable.userId, usersTable.id))
    .where(eq(cocciFeedbackTable.id, id));

  res.json({
    ...enriched,
    createdAt: enriched.createdAt.toISOString(),
    updatedAt: enriched.updatedAt.toISOString(),
  });
});

// ─── GET /admin/echanges/ratings ─────────────────────────────────────────────
router.get("/admin/echanges/ratings", async (req, res) => {
  const rows = await db
    .select({
      id: cocciRatingsTable.id,
      organizationId: cocciRatingsTable.organizationId,
      organizationName: organizationsTable.name,
      userId: cocciRatingsTable.userId,
      userFirstName: usersTable.firstName,
      userLastName: usersTable.lastName,
      userEmail: usersTable.email,
      stars: cocciRatingsTable.stars,
      comment: cocciRatingsTable.comment,
      createdAt: cocciRatingsTable.createdAt,
    })
    .from(cocciRatingsTable)
    .innerJoin(organizationsTable, eq(cocciRatingsTable.organizationId, organizationsTable.id))
    .innerJoin(usersTable, eq(cocciRatingsTable.userId, usersTable.id))
    .orderBy(desc(cocciRatingsTable.createdAt));

  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

// ─── GET /admin/echanges/stats ────────────────────────────────────────────────
router.get("/admin/echanges/stats", async (req, res) => {
  const [ratingStats] = await db
    .select({
      total: count(),
      average: avg(cocciRatingsTable.stars),
    })
    .from(cocciRatingsTable);

  const dist = await db
    .select({ stars: cocciRatingsTable.stars, cnt: count() })
    .from(cocciRatingsTable)
    .groupBy(cocciRatingsTable.stars);

  const distribution: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  for (const d of dist) {
    distribution[String(d.stars)] = Number(d.cnt);
  }

  const [newFeedback] = await db
    .select({ cnt: count() })
    .from(cocciFeedbackTable)
    .where(eq(cocciFeedbackTable.status, "nouveau"));

  res.json({
    totalRatings: Number(ratingStats?.total ?? 0),
    averageStars: ratingStats?.average ? Math.round(Number(ratingStats.average) * 10) / 10 : 0,
    distribution,
    newFeedbackCount: Number(newFeedback?.cnt ?? 0),
    newRatingCount: 0, // ratings are always "new" since they have no status
  });
});

// ─── RÉFÉRENTIEL D'ACTIONS (admin) ────────────────────────────────────────────

// GET /admin/action-library — liste tout le référentiel (actif + inactif)
router.get("/admin/action-library", async (_req, res) => {
  const rows = await db
    .select()
    .from(actionLibraryTable)
    .orderBy(actionLibraryTable.sortOrder, actionLibraryTable.id);
  res.json(rows);
});

// POST /admin/action-library — crée une nouvelle action (isSystem=false)
router.post("/admin/action-library", async (req, res) => {
  const { name, description, category, subcategory, esgPillar, level, odd, sortOrder } =
    req.body as {
      name?: string;
      description?: string;
      category?: string;
      subcategory?: string;
      esgPillar?: string;
      level?: string;
      odd?: string[] | null;
      sortOrder?: number;
    };

  if (!name?.trim() || !esgPillar || !level || !category) {
    res.status(400).json({ error: "name, esgPillar, level et category sont obligatoires" });
    return;
  }

  const [created] = await db
    .insert(actionLibraryTable)
    .values({
      name: name.trim(),
      description: description?.trim() ?? null,
      category: category,
      subcategory: subcategory ?? null,
      esgPillar,
      level,
      odd: Array.isArray(odd) ? odd.join(",") : (odd ?? null),
      sortOrder: sortOrder ?? 999,
      isSystem: false,
      isActive: true,
    })
    .returning();

  res.status(201).json(created);
});

// PATCH /admin/action-library/:id — modifie une action (nom, description, pilier, niveau, statut…)
router.patch("/admin/action-library/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [existing] = await db
    .select()
    .from(actionLibraryTable)
    .where(eq(actionLibraryTable.id, id))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const { name, description, category, subcategory, esgPillar, level, isActive, sortOrder } =
    req.body as Record<string, unknown>;

  const update: Partial<typeof actionLibraryTable.$inferInsert> = {};
  if (typeof name === "string") update.name = name.trim();
  if (description !== undefined) update.description = (description as string | null) ?? null;
  if (typeof category === "string") update.category = category;
  if (subcategory !== undefined) update.subcategory = (subcategory as string | null) ?? null;
  if (typeof esgPillar === "string") update.esgPillar = esgPillar;
  if (typeof level === "string") update.level = level;
  if (typeof isActive === "boolean") update.isActive = isActive;
  if (typeof sortOrder === "number") update.sortOrder = sortOrder;

  const [updated] = await db
    .update(actionLibraryTable)
    .set(update)
    .where(eq(actionLibraryTable.id, id))
    .returning();

  res.json(updated);
});

// DELETE /admin/action-library/:id — supprime une action non-système
router.delete("/admin/action-library/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [existing] = await db
    .select()
    .from(actionLibraryTable)
    .where(eq(actionLibraryTable.id, id))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (existing.isSystem) {
    res.status(403).json({ error: "Les actions système ne peuvent pas être supprimées" });
    return;
  }

  await db.delete(actionLibraryTable).where(eq(actionLibraryTable.id, id));
  res.status(204).send();
});

export default router;
