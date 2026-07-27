import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, usersTable, membersTable, organizationsTable } from "@workspace/db";
import { cocciFeedbackTable, cocciRatingsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateUser } from "../lib/auth";

const router = Router();

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function resolveUserAndOrg(
  clerkUserId: string,
  orgId: number,
): Promise<{ userId: number; ok: boolean }> {
  const user = await getOrCreateUser(clerkUserId);

  // Superadmins can act on any org
  if (user.isSuperAdmin) return { userId: user.id, ok: true };

  // Regular users must be active members of that org
  const [membership] = await db
    .select({ id: membersTable.id })
    .from(membersTable)
    .where(
      and(
        eq(membersTable.userId, user.id),
        eq(membersTable.organizationId, orgId),
        eq(membersTable.status, "active"),
      ),
    )
    .limit(1);

  return { userId: user.id, ok: !!membership };
}

// ─── POST /echanges/feedback ─────────────────────────────────────────────────
router.post("/echanges/feedback", requireAuth, async (req, res): Promise<void> => {
  const { organizationId, subject, requestType, message, attachmentUrl, wantsCallback } =
    req.body as Record<string, unknown>;

  const orgId = Number(organizationId);
  if (!orgId || isNaN(orgId)) {
    res.status(400).json({ error: "organizationId requis" });
    return;
  }
  if (!subject || typeof subject !== "string") {
    res.status(400).json({ error: "subject requis" });
    return;
  }
  if (!requestType || typeof requestType !== "string") {
    res.status(400).json({ error: "requestType requis" });
    return;
  }
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message requis" });
    return;
  }

  const { userId, ok } = await resolveUserAndOrg(req.clerkUserId!, orgId);
  if (!ok) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  // Validate attachmentUrl: only allow https:// URLs (prevent XSS via javascript: or data: schemes)
  let safeAttachmentUrl: string | null = null;
  if (typeof attachmentUrl === "string" && attachmentUrl.trim()) {
    try {
      const parsed = new URL(attachmentUrl.trim());
      if (parsed.protocol === "https:") {
        safeAttachmentUrl = attachmentUrl.trim();
      } else {
        res.status(400).json({ error: "attachmentUrl must use the https:// protocol" });
        return;
      }
    } catch {
      res.status(400).json({ error: "attachmentUrl is not a valid URL" });
      return;
    }
  }

  const [created] = await db
    .insert(cocciFeedbackTable)
    .values({
      organizationId: orgId,
      userId,
      subject,
      requestType,
      message,
      attachmentUrl: safeAttachmentUrl,
      wantsCallback: wantsCallback === true,
      status: "nouveau",
      history: [],
    })
    .returning();

  res.status(201).json(created);
});

// ─── GET /echanges/feedback ──────────────────────────────────────────────────
router.get("/echanges/feedback", requireAuth, async (req, res): Promise<void> => {
  const orgId = Number(req.query.organizationId);
  if (!orgId || isNaN(orgId)) {
    res.status(400).json({ error: "organizationId requis" });
    return;
  }

  const { userId, ok } = await resolveUserAndOrg(req.clerkUserId!, orgId);
  if (!ok) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const rows = await db
    .select()
    .from(cocciFeedbackTable)
    .where(
      and(
        eq(cocciFeedbackTable.organizationId, orgId),
        eq(cocciFeedbackTable.userId, userId),
      ),
    )
    .orderBy(desc(cocciFeedbackTable.createdAt));

  res.json(rows);
});

// ─── POST /echanges/ratings ──────────────────────────────────────────────────
router.post("/echanges/ratings", requireAuth, async (req, res): Promise<void> => {
  const { organizationId, stars, comment } = req.body as Record<string, unknown>;

  const orgId = Number(organizationId);
  if (!orgId || isNaN(orgId)) {
    res.status(400).json({ error: "organizationId requis" });
    return;
  }
  const starsNum = Number(stars);
  if (!starsNum || starsNum < 1 || starsNum > 5) {
    res.status(400).json({ error: "stars doit être entre 1 et 5" });
    return;
  }

  const { userId, ok } = await resolveUserAndOrg(req.clerkUserId!, orgId);
  if (!ok) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [created] = await db
    .insert(cocciRatingsTable)
    .values({
      organizationId: orgId,
      userId,
      stars: starsNum,
      comment: typeof comment === "string" && comment.trim() ? comment.trim() : null,
    })
    .returning();

  res.status(201).json(created);
});

// ─── GET /echanges/ratings ───────────────────────────────────────────────────
router.get("/echanges/ratings", requireAuth, async (req, res): Promise<void> => {
  const orgId = Number(req.query.organizationId);
  if (!orgId || isNaN(orgId)) {
    res.status(400).json({ error: "organizationId requis" });
    return;
  }

  const { userId, ok } = await resolveUserAndOrg(req.clerkUserId!, orgId);
  if (!ok) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const rows = await db
    .select()
    .from(cocciRatingsTable)
    .where(
      and(
        eq(cocciRatingsTable.organizationId, orgId),
        eq(cocciRatingsTable.userId, userId),
      ),
    )
    .orderBy(desc(cocciRatingsTable.createdAt));

  res.json(rows);
});

export default router;
