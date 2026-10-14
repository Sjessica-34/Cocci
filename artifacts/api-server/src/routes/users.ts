import { Router, type IRouter } from "express";
import { and, eq, desc, ne, sql, isNull } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import { z } from "zod";
import {
  db,
  usersTable,
  membersTable,
  organizationsTable,
  userConsentsTable,
  onboardingProgressTable,
  organizationInvitationsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { sensitiveLimiter } from "../middlewares/rateLimit";
import { getOrCreateUser } from "../lib/auth";
import { logAuditEvent } from "../lib/audit";
import { GetMeResponse, UpdateMeBody, UpdateMeResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const onboardingUpdateSchema = z.object({
  status: z.enum([
    "not_started",
    "organization_created",
    "subsidiaries_configured",
    "workforce_completed",
    "subscription_selected",
    "payment_pending",
    "completed",
  ]),
  effectifKey: z.string().min(1).max(20).optional(),
});
const onboardingStatusOrder = [
  "not_started",
  "organization_created",
  "subsidiaries_configured",
  "workforce_completed",
  "subscription_selected",
  "payment_pending",
  "completed",
] as const;

// ─── Profil ───────────────────────────────────────────────────────────────────

router.get("/users/me", requireAuth, async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const clerkUserId = req.clerkUserId!;
  const traceContext = {
    requestId: (req as any).id ?? null,
    route: "/api/users/me",
  };
  const user = await getOrCreateUser(clerkUserId, traceContext);

  let clerkLookupResult: Record<string, unknown>;
  try {
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    clerkLookupResult = {
      status: "success",
      requestedUserId: clerkUserId,
      returnedUserId: clerkUser.id,
      returnedEmail: clerkUser.primaryEmailAddress?.emailAddress ?? null,
    };
  } catch (error) {
    clerkLookupResult = {
      status: "error",
      requestedUserId: clerkUserId,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStatus: error && typeof error === "object"
        ? (error as any).status ?? (error as any).statusCode ?? null
        : null,
      errorDetails: error instanceof Error
        ? Object.fromEntries(
            Object.getOwnPropertyNames(error).map((key) => [key, (error as any)[key]]),
          )
        : error,
    };
  }

  console.log("[auth-trace] same request auth-to-clerk comparison", {
    ...traceContext,
    middlewareAuthUserId: clerkUserId,
    getOrCreateUser: {
      localUserId: user.id,
      storedClerkId: user.clerkId,
    },
    clerkClientGetUser: clerkLookupResult,
  });

  res.json(GetMeResponse.parse(user));
});

router.get("/users/me/pending-invitation", requireAuth, async (req, res): Promise<void> => {
  const user = await getOrCreateUser(req.clerkUserId!);
  const [activeMembership] = await db.select({ id: membersTable.id })
    .from(membersTable)
    .where(and(
      eq(membersTable.userId, user.id),
      eq(membersTable.status, "active"),
      isNull(membersTable.archivedAt),
    ))
    .limit(1);
  if (activeMembership) {
    res.json({ organizationId: null });
    return;
  }

  const [invitation] = await db.select()
    .from(organizationInvitationsTable)
    .where(and(
      eq(organizationInvitationsTable.email, user.email.trim().toLowerCase()),
      eq(organizationInvitationsTable.status, "pending"),
    ))
    .orderBy(desc(organizationInvitationsTable.createdAt))
    .limit(1);

  if (!invitation || !invitation.memberId) {
    const [expiredInvitation] = await db.select()
      .from(organizationInvitationsTable)
      .where(and(
        eq(organizationInvitationsTable.email, user.email.trim().toLowerCase()),
        eq(organizationInvitationsTable.status, "expired"),
      ))
      .orderBy(desc(organizationInvitationsTable.createdAt))
      .limit(1);
    if (expiredInvitation) {
      res.status(410).json({
        code: "INVITATION_EXPIRED",
        error: "Cette invitation a expiré. Demandez à l’administrateur d’en envoyer une nouvelle.",
      });
      return;
    }
    res.json({ organizationId: null });
    return;
  }
  if (invitation.expiresAt && invitation.expiresAt.getTime() <= Date.now()) {
    await db.transaction(async (tx) => {
      await tx.update(organizationInvitationsTable)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(organizationInvitationsTable.id, invitation.id));
      await tx.update(membersTable)
        .set({ status: "suspended" })
        .where(and(
          eq(membersTable.id, invitation.memberId!),
          eq(membersTable.status, "invited"),
        ));
    });
    res.status(410).json({
      code: "INVITATION_EXPIRED",
      error: "Cette invitation a expiré. Demandez à l’administrateur d’en envoyer une nouvelle.",
    });
    return;
  }
  res.json({ organizationId: invitation.organizationId });
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

router.get("/users/me/onboarding", requireAuth, async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const user = await getOrCreateUser(req.clerkUserId!);
  const [progress] = await db
    .select()
    .from(onboardingProgressTable)
    .where(eq(onboardingProgressTable.userId, user.id))
    .limit(1);

  res.json({
    status: progress?.status ?? "not_started",
    effectifKey: progress?.effectifKey ?? null,
    completedAt: progress?.completedAt ?? null,
    primaryOrganizationId: user.primaryOrganizationId,
  });
});

router.patch("/users/me/onboarding", requireAuth, async (req, res): Promise<void> => {
  const parsed = onboardingUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const user = await getOrCreateUser(req.clerkUserId!);
  const [current] = await db
    .select()
    .from(onboardingProgressTable)
    .where(eq(onboardingProgressTable.userId, user.id))
    .limit(1);
  const currentIndex = onboardingStatusOrder.indexOf(
    current?.status as typeof onboardingStatusOrder[number] ?? "not_started",
  );
  const nextIndex = onboardingStatusOrder.indexOf(parsed.data.status);

  if (nextIndex < currentIndex) {
    res.status(409).json({ error: "Une étape d'onboarding déjà validée ne peut pas être annulée." });
    return;
  }
  if (parsed.data.status === "completed") {
    res.status(403).json({ error: "La finalisation de l'onboarding est réservée au serveur." });
    return;
  }

  const [updated] = await db
    .insert(onboardingProgressTable)
    .values({
      userId: user.id,
      status: parsed.data.status,
      effectifKey: parsed.data.effectifKey,
    })
    .onConflictDoUpdate({
      target: onboardingProgressTable.userId,
      set: {
        status: parsed.data.status,
        ...(parsed.data.effectifKey ? { effectifKey: parsed.data.effectifKey } : {}),
        updatedAt: new Date(),
      },
    })
    .returning();

  res.json({
    status: updated.status,
    effectifKey: updated.effectifKey,
    completedAt: updated.completedAt,
    primaryOrganizationId: user.primaryOrganizationId,
  });
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

class SoleOwnerDeletionError extends Error {}

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
    const stamp = Date.now();
    try {
      await db.transaction(async (tx) => {
        const ownedOrganizations = await tx
          .select({ organizationId: membersTable.organizationId })
          .from(membersTable)
          .where(and(
            eq(membersTable.userId, user.id),
            eq(membersTable.role, "owner"),
            eq(membersTable.status, "active"),
          ))
          .orderBy(membersTable.organizationId);

        for (const { organizationId } of ownedOrganizations) {
          await tx.execute(
            sql`select pg_advisory_xact_lock(67101, ${organizationId})`,
          );
        }

        for (const { organizationId } of ownedOrganizations) {
          const [otherOwner] = await tx
            .select({ id: membersTable.id })
            .from(membersTable)
            .where(and(
              eq(membersTable.organizationId, organizationId),
              eq(membersTable.role, "owner"),
              eq(membersTable.status, "active"),
              ne(membersTable.userId, user.id),
            ))
            .limit(1);
          if (!otherOwner) {
            throw new SoleOwnerDeletionError();
          }
        }

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
    } catch (error) {
      if (error instanceof SoleOwnerDeletionError) {
        res.status(409).json({
          error: "Transférez d'abord la propriété de vos organisations avant de supprimer votre compte.",
        });
        return;
      }
      throw error;
    }

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
