import { Router } from "express";
import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { clerkClient } from "@clerk/express";
import {
  db, giftInvitationsTable, membersTable, subscriptionsTable, usersTable,
  onboardingProgressTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireSuperAdmin } from "../middlewares/requireSuperAdmin";
import { getOrCreateUser } from "../lib/auth";
import { sendGiftInvitationEmail } from "../lib/email";
import { getPublicAppUrl } from "../appUrl";
import {
  decideGiftInvitationClaim,
  isGiftInvitationBeneficiary,
  isGiftInvitationEmailVerified,
} from "../lib/giftInvitationPolicy";

const router = Router();
const giftKeys = ["1-5", "6-10", "11-25", "26-50", "51-100", "101-250", "250+"] as const;
const giftMaxEmployees: Record<(typeof giftKeys)[number], number | null> = {
  "1-5": 5, "6-10": 10, "11-25": 25, "26-50": 50,
  "51-100": 100, "101-250": 250, "250+": null,
};
const giftLabel = (key: (typeof giftKeys)[number]) =>
  key === "250+" ? "Plus de 250 salariés" : `${key.replace("-", " à ")} salariés`;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

router.use("/admin", requireAuth, requireSuperAdmin);

router.get("/admin/gift-invitations", async (_req, res) => {
  const rows = await db.select({
    id: giftInvitationsTable.id,
    email: giftInvitationsTable.email,
    offerName: giftInvitationsTable.offerName,
    effectifKey: giftInvitationsTable.effectifKey,
    durationMonths: giftInvitationsTable.durationMonths,
    expiresAt: giftInvitationsTable.expiresAt,
    claimedAt: giftInvitationsTable.claimedAt,
    revokedAt: giftInvitationsTable.revokedAt,
    organizationId: giftInvitationsTable.organizationId,
  }).from(giftInvitationsTable).orderBy(giftInvitationsTable.createdAt);
  res.json(rows);
});

router.post("/admin/gift-invitations", async (req, res): Promise<void> => {
  const input = z.object({
    email: z.string().email().transform((value) => value.trim().toLowerCase()),
    effectifKey: z.enum(giftKeys),
    durationMonths: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12), z.null()]),
    sendEmail: z.boolean().default(false),
  }).safeParse(req.body);
  if (!input.success) { res.status(400).json({ error: input.error.message }); return; }
  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 30 * 86400000);
  const admin = await getOrCreateUser(req.clerkUserId!);
  const [row] = await db.insert(giftInvitationsTable).values({
    email: input.data.email,
    tokenHash: hashToken(rawToken),
    offerName: giftLabel(input.data.effectifKey),
    effectifKey: input.data.effectifKey,
    maxEmployees: giftMaxEmployees[input.data.effectifKey],
    durationMonths: input.data.durationMonths,
    expiresAt,
    createdByUserId: admin.id,
  }).returning({ id: giftInvitationsTable.id });
  const url = `${getPublicAppUrl()}/offre#${rawToken}`;
  const emailSent = input.data.sendEmail
    ? await sendGiftInvitationEmail({
      to: input.data.email,
      organizationOffer: giftLabel(input.data.effectifKey),
      url,
      expiresAt,
    })
    : false;
  res.status(201).json({ id: row.id, url, expiresAt, emailSent });
});

router.delete("/admin/gift-invitations/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db.update(giftInvitationsTable)
    .set({ revokedAt: new Date() })
    .where(and(eq(giftInvitationsTable.id, id), isNull(giftInvitationsTable.claimedAt), isNull(giftInvitationsTable.revokedAt)))
    .returning({ id: giftInvitationsTable.id });
  if (!row) { res.status(409).json({ error: "Invitation already used, expired, or revoked" }); return; }
  res.status(204).end();
});

router.post("/gift-invitations/validate", async (req, res): Promise<void> => {
  const parsed = z.object({ token: z.string().min(32).max(128) }).safeParse(req.body);
  if (!parsed.success) { res.status(404).json({ error: "Invitation unavailable" }); return; }
  const token = parsed.data.token;
  if (token.length < 32 || token.length > 128) { res.status(404).json({ error: "Invitation unavailable" }); return; }
  const [row] = await db.select({
    email: giftInvitationsTable.email,
    effectifKey: giftInvitationsTable.effectifKey,
    offerName: giftInvitationsTable.offerName,
    durationMonths: giftInvitationsTable.durationMonths,
    expiresAt: giftInvitationsTable.expiresAt,
    claimedAt: giftInvitationsTable.claimedAt,
    revokedAt: giftInvitationsTable.revokedAt,
  }).from(giftInvitationsTable).where(eq(giftInvitationsTable.tokenHash, hashToken(token))).limit(1);
  if (!row || row.claimedAt || row.revokedAt || row.expiresAt <= new Date()) {
    res.status(404).json({ error: "Invitation unavailable" }); return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.json({
    email: row.email,
    effectifKey: row.effectifKey,
    offerName: row.offerName,
    durationMonths: row.durationMonths,
    expiresAt: row.expiresAt,
  });
});

router.post("/gift-invitations/verify", requireAuth, async (req, res): Promise<void> => {
  const parsed = z.object({ token: z.string().min(32).max(128) }).safeParse(req.body);
  if (!parsed.success) { res.status(404).json({ error: "Invitation indisponible." }); return; }
  const clerkUser = await clerkClient.users.getUser(req.clerkUserId!);
  const verifiedEmails = clerkUser.emailAddresses
    .filter((address) => address.verification?.status === "verified")
    .map((address) => address.emailAddress.trim().toLowerCase());
  const [invite] = await db.select({
    email: giftInvitationsTable.email,
    expiresAt: giftInvitationsTable.expiresAt,
    claimedAt: giftInvitationsTable.claimedAt,
    revokedAt: giftInvitationsTable.revokedAt,
  }).from(giftInvitationsTable)
    .where(eq(giftInvitationsTable.tokenHash, hashToken(parsed.data.token))).limit(1);
  if (!invite || invite.claimedAt || invite.revokedAt || invite.expiresAt <= new Date()) {
    res.status(409).json({ error: "Cette invitation a expiré, a été révoquée ou a déjà été utilisée." });
    return;
  }
  if (!isGiftInvitationEmailVerified(invite.email, verifiedEmails)) {
    res.status(403).json({
      error: "Cette invitation est nominative. Connectez-vous avec l’adresse e-mail invitée et vérifiez-la dans Clerk.",
    });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.json({ verified: true });
});

router.post("/gift-invitations/claim", requireAuth, async (req, res): Promise<void> => {
  const parsed = z.object({ token: z.string().min(32).max(128) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invitation invalide" }); return; }
  const clerkUserId = req.clerkUserId!;
  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const verifiedEmails = clerkUser.emailAddresses
    .filter((address) => address.verification?.status === "verified")
    .map((address) => address.emailAddress.trim().toLowerCase());
  const [inviteIdentity] = await db.select({
    email: giftInvitationsTable.email,
    expiresAt: giftInvitationsTable.expiresAt,
    claimedAt: giftInvitationsTable.claimedAt,
    revokedAt: giftInvitationsTable.revokedAt,
  }).from(giftInvitationsTable)
    .where(eq(giftInvitationsTable.tokenHash, hashToken(parsed.data.token)))
    .limit(1);
  if (!inviteIdentity || (!inviteIdentity.claimedAt
    && (inviteIdentity.revokedAt || inviteIdentity.expiresAt <= new Date()))) {
    res.status(409).json({ error: "Invitation expirée, révoquée ou déjà utilisée." }); return;
  }
  if (!isGiftInvitationEmailVerified(inviteIdentity.email, verifiedEmails)) {
    res.status(403).json({ error: "L’adresse e-mail invitée doit être vérifiée dans Clerk et correspondre au compte connecté." }); return;
  }
  const user = await getOrCreateUser(clerkUserId);
  if (!user.primaryOrganizationId) { res.status(409).json({ error: "Créez d'abord votre organisation Cocci." }); return; }
  const today = new Date().toISOString().slice(0, 10);
  try {
    const result = await db.transaction(async (tx) => {
      const [invite] = await tx.select().from(giftInvitationsTable)
        .where(eq(giftInvitationsTable.tokenHash, hashToken(parsed.data.token))).for("update").limit(1);
      const [existingSub] = await tx.select({
        mode: subscriptionsTable.mode,
        offerName: subscriptionsTable.offerName,
        endAt: subscriptionsTable.endAt,
      }).from(subscriptionsTable).where(eq(subscriptionsTable.organizationId, user.primaryOrganizationId!)).limit(1);
      const [lockedUser] = await tx.select({
        clerkId: usersTable.clerkId,
        primaryOrganizationId: usersTable.primaryOrganizationId,
      }).from(usersTable).where(eq(usersTable.id, user.id)).for("update").limit(1);
      const [initialMembership] = await tx.select({
        userId: membersTable.userId,
        status: membersTable.status,
        archivedAt: membersTable.archivedAt,
      }).from(membersTable)
        .where(eq(membersTable.organizationId, user.primaryOrganizationId!))
        .orderBy(asc(membersTable.id))
        .for("update")
        .limit(1);
      const isBeneficiaryAccount = isGiftInvitationBeneficiary({
        authenticatedClerkId: clerkUserId,
        databaseClerkId: lockedUser?.clerkId,
        userId: user.id,
        primaryOrganizationId: lockedUser?.primaryOrganizationId,
        organizationId: user.primaryOrganizationId!,
        firstMemberUserId: initialMembership?.userId,
        firstMemberStatus: initialMembership?.status,
        firstMemberArchived: initialMembership?.archivedAt !== null,
      });
      if (!isBeneficiaryAccount) throw new Error("INVITATION_ACCOUNT_MISMATCH");
      const decision = decideGiftInvitationClaim({
        invite: invite ?? null,
        verifiedEmails,
        organizationId: user.primaryOrganizationId!,
        isBeneficiaryAccount,
        existingSubscription: existingSub ?? null,
      });
      if (decision === "email_mismatch") throw new Error("INVITATION_EMAIL_MISMATCH");
      if (decision === "invalid_invitation") throw new Error("INVITATION_INVALID");
      if (decision === "existing_non_free_subscription") throw new Error("EXISTING_NON_FREE_SUBSCRIPTION");
      if (decision === "already_claimed") {
        const completedAt = new Date();
        await tx.update(onboardingProgressTable).set({
          status: "completed",
          completedAt,
          updatedAt: completedAt,
        }).where(eq(onboardingProgressTable.userId, user.id));
        return { organizationId: user.primaryOrganizationId, endAt: existingSub.endAt };
      }
      const endDate = invite.durationMonths === null ? null : (() => {
        const date = new Date(`${today}T00:00:00Z`);
        const day = date.getUTCDate();
        date.setUTCDate(1);
        date.setUTCMonth(date.getUTCMonth() + invite.durationMonths!);
        const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
        date.setUTCDate(Math.min(day, lastDay));
        return date.toISOString().slice(0, 10);
      })();
      const [activatedSubscription] = await tx.insert(subscriptionsTable).values({
        organizationId: user.primaryOrganizationId!,
        mode: "free",
        status: "active",
        offerName: invite.offerName,
        maxEmployees: invite.maxEmployees,
        startAt: today,
        endAt: endDate,
        autoRenew: false,
      }).onConflictDoUpdate({
        target: subscriptionsTable.organizationId,
        set: {
          mode: "free", status: "active", offerName: invite.offerName,
          maxEmployees: invite.maxEmployees, startAt: today, endAt: endDate,
          autoRenew: false, updatedAt: new Date(),
        },
        where: eq(subscriptionsTable.mode, "free"),
      }).returning({ organizationId: subscriptionsTable.organizationId });
      if (!activatedSubscription) throw new Error("EXISTING_NON_FREE_SUBSCRIPTION");
      await tx.update(giftInvitationsTable).set({
        claimedAt: new Date(), organizationId: user.primaryOrganizationId!,
      }).where(eq(giftInvitationsTable.id, invite.id));
      await tx.update(onboardingProgressTable).set({
        status: "completed", completedAt: new Date(), updatedAt: new Date(),
      }).where(eq(onboardingProgressTable.userId, user.id));
      return { organizationId: user.primaryOrganizationId, endAt: endDate };
    });
    res.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "INVITATION_EMAIL_MISMATCH") { res.status(403).json({ error: "L’adresse e-mail invitée doit être vérifiée dans Clerk et correspondre au compte connecté." }); return; }
    if (code === "INVITATION_ACCOUNT_MISMATCH") { res.status(403).json({ error: "Cette invitation est déjà liée à un autre compte ou à une autre organisation." }); return; }
    if (code === "INVITATION_INVALID") { res.status(409).json({ error: "Invitation expirée, révoquée ou déjà utilisée." }); return; }
    if (code === "EXISTING_NON_FREE_SUBSCRIPTION") { res.status(409).json({ error: "Une souscription non gratuite existe déjà. Aucun changement n'a été effectué." }); return; }
    throw error;
  }
});

export default router;
