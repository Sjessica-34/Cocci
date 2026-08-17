import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { db, usersTable, membersTable, organizationsTable, userConsentsTable } from "@workspace/db";
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
 * Enregistre une demande de suppression (traitement manuel sous 30 jours, RGPD art. 17).
 * Ne supprime rien immédiatement. Journalise l'opération.
 */
router.post(
  "/users/me/deletion-request",
  requireAuth,
  sensitiveLimiter,
  async (req, res): Promise<void> => {
    const parsed = deletionReasonSchema.safeParse(req.body);
    const user = await getOrCreateUser(req.clerkUserId!);

    await logAuditEvent(req, "user.delete_request", {
      userId: user.id,
      metadata: parsed.success && parsed.data.reason
        ? { reasonProvided: true }
        : { reasonProvided: false },
    });

    res.json({
      success: true,
      message:
        "Votre demande de suppression a bien été enregistrée. Notre équipe la traitera dans un délai de 30 jours ouvrés conformément au RGPD (art. 17).",
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
