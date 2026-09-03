import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import { z } from "zod";
import { db, pool, usersTable, membersTable, organizationsTable, userConsentsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { sensitiveLimiter } from "../middlewares/rateLimit";
import { getOrCreateUser } from "../lib/auth";
import { logAuditEvent } from "../lib/audit";
import { GetMeResponse, UpdateMeBody, UpdateMeResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// ─── Profil ───────────────────────────────────────────────────────────────────

router.get("/users/me", requireAuth, async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const user = await getOrCreateUser(req.clerkUserId!);
  res.json(GetMeResponse.parse(user));
});

router.patch("/users/me", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = await getOrCreateUser(req.clerkUserId!);
  const [updated] = await db
    .update(usersTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id))
    .returning();

  await logAuditEvent(req, "user.update_profile", { userId: user.id });
  res.json(UpdateMeResponse.parse(updated));
});

// ─── Export RGPD ─────────────────────────────────────────────────────────────

/**
 * GET /users/me/export
 * Génère et télécharge une copie structurée des données personnelles.
 * Limite stricte : 10 exports / 15 min par IP.
 */
router.get(
  "/users/me/export",
  requireAuth,
  sensitiveLimiter,
  async (req, res): Promise<void> => {
    const user = await getOrCreateUser(req.clerkUserId!);

    const memberships = await db
      .select({
        orgName: organizationsTable.name,
        role: membersTable.role,
        joinedAt: membersTable.createdAt,
      })
      .from(membersTable)
      .innerJoin(organizationsTable, eq(membersTable.organizationId, organizationsTable.id))
      .where(eq(membersTable.userId, user.id));

    // Ne jamais exposer les adresses @pending.local (identifiants techniques Clerk)
    const displayEmail = user.email?.endsWith("@pending.local") ? null : user.email;

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: {
        id: user.id,
        email: displayEmail,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
      },
      organizations: memberships.map((m) => ({
        name: m.orgName,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    };

    await logAuditEvent(req, "user.export_data", {
      userId: user.id,
      metadata: { orgCount: memberships.length },
    });

    res.setHeader("Content-Disposition", 'attachment; filename="mes-donnees-cocci.json"');
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    res.json(exportData);
  },
);

// ─── Suppression de compte ────────────────────────────────────────────────────

const deletionReasonSchema = z.object({
  reason: z.string().max(500).optional(),
});

/**
 * POST /users/me/deletion-request
 * Anonymise immédiatement les données personnelles locales, conserve les
 * données métier et supprime ensuite l'identité Clerk.
 */
router.post(
  "/users/me/deletion-request",
  requireAuth,
  sensitiveLimiter,
  async (req, res): Promise<void> => {
    const parsed = deletionReasonSchema.safeParse(req.body);
    const user = await getOrCreateUser(req.clerkUserId!);
    const soleOwner = await pool.query(
      `SELECT m.organization_id
       FROM members m
       WHERE m.user_id = $1 AND m.role = 'owner'
         AND NOT EXISTS (
           SELECT 1 FROM members other
           WHERE other.organization_id = m.organization_id
             AND other.role = 'owner' AND other.user_id <> $1
         )
       LIMIT 1`,
      [user.id],
    );
    if (soleOwner.rowCount) {
      res.status(409).json({
        error: "Transférez d'abord la propriété de vos organisations avant de supprimer votre compte.",
      });
      return;
    }

    const stamp = Date.now();
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(${user.id})`);
      await tx.update(usersTable).set({
        email: `deleted-${user.id}-${stamp}@anonymized.invalid`,
        firstName: null,
        lastName: null,
        avatarUrl: null,
        updatedAt: new Date(),
      }).where(eq(usersTable.id, user.id));
      await tx.delete(membersTable).where(eq(membersTable.userId, user.id));
    });

    await logAuditEvent(req, "user.delete_request", {
      userId: null,
      metadata: { anonymized: true, reasonProvided: parsed.success && !!parsed.data.reason },
    });

    try {
      await clerkClient.users.deleteUser(req.clerkUserId!);
      await db.update(usersTable).set({
        clerkId: `deleted_${user.id}_${stamp}`,
        updatedAt: new Date(),
      }).where(eq(usersTable.id, user.id));
    } catch (error) {
      await logAuditEvent(req, "user.delete_provider_failed", {
        userId: null,
        success: false,
        metadata: { provider: "clerk" },
      });
      res.status(502).json({
        error: "Les données personnelles ont été anonymisées, mais la suppression de l'identité doit être relancée.",
      });
      return;
    }

    res.json({
      success: true,
      message: "Votre compte et vos données personnelles ont été supprimés.",
    });
  },
);

// ─── Consentements ────────────────────────────────────────────────────────────

const consentSchema = z.object({
  documentType: z.enum(["cgu", "privacy"]),
  documentVersion: z.string().min(1).max(20),
});

/**
 * GET /users/me/consents
 * Retourne l'historique des consentements de l'utilisateur connecté.
 */
router.get("/users/me/consents", requireAuth, async (req, res): Promise<void> => {
  const user = await getOrCreateUser(req.clerkUserId!);
  const consents = await db
    .select({
      id: userConsentsTable.id,
      documentType: userConsentsTable.documentType,
      documentVersion: userConsentsTable.documentVersion,
      acceptedAt: userConsentsTable.acceptedAt,
    })
    .from(userConsentsTable)
    .where(eq(userConsentsTable.userId, user.id))
    .orderBy(desc(userConsentsTable.acceptedAt));

  res.json(consents);
});

/**
 * POST /users/me/consents
 * Enregistre l'acceptation d'un document légal (CGU ou politique de confidentialité).
 */
router.post("/users/me/consents", requireAuth, async (req, res): Promise<void> => {
  const parsed = consentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Paramètres invalides", details: parsed.error.issues });
    return;
  }

  const user = await getOrCreateUser(req.clerkUserId!);
  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
    req.socket?.remoteAddress ??
    null;

  const [consent] = await db
    .insert(userConsentsTable)
    .values({
      userId: user.id,
      documentType: parsed.data.documentType,
      documentVersion: parsed.data.documentVersion,
      ipAddress: ip,
    })
    .returning();

  await logAuditEvent(req, "user.consent_recorded", {
    userId: user.id,
    metadata: {
      documentType: parsed.data.documentType,
      documentVersion: parsed.data.documentVersion,
    },
  });

  res.status(201).json(consent);
});

export default router;
