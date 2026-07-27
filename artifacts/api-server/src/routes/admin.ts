import { Router } from "express";
import {
  db,
  usersTable,
  organizationsTable,
  membersTable,
  resourcesTable,
  subscriptionsTable,
} from "@workspace/db";
import { eq, desc, count, max, and, isNull, isNotNull, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireSuperAdmin } from "../middlewares/requireSuperAdmin";

const router = Router();

// Toutes les routes admin nécessitent auth + superadmin
router.use("/admin", requireAuth, requireSuperAdmin);

// ─── Helpers ───────────────────────────────────────────────────────────────

type Sub = typeof subscriptionsTable.$inferSelect | null;

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

  const [updated] = await db
    .update(membersTable)
    .set(updates)
    .where(eq(membersTable.id, memberId))
    .returning();

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

  const [deleted] = await db
    .delete(membersTable)
    .where(eq(membersTable.id, memberId))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).end();
});

// ─── GET /admin/users ─────────────────────────────────────────────────────────
router.get("/admin/users", async (req, res) => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(users);
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

export default router;
