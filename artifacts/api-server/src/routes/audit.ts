import { Router } from "express";
import { db, auditLogsTable, usersTable, organizationsTable } from "@workspace/db";
import { desc, and, eq, gte, lte, sql, ilike } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";
import { requireSuperAdmin } from "../middlewares/requireSuperAdmin";
import { logAuditEvent } from "../lib/audit";
import { getOrCreateUser } from "../lib/auth";

const router = Router();

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  orgId: z.coerce.number().int().positive().optional(),
  userId: z.coerce.number().int().positive().optional(),
  action: z.string().max(100).optional(),
  success: z.enum(["true", "false"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

/**
 * GET /admin/audit-logs
 * Accès superadmin uniquement — liste paginée des événements d'audit.
 */
router.get(
  "/admin/audit-logs",
  requireAuth,
  requireSuperAdmin,
  async (req, res): Promise<void> => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Paramètres invalides", details: parsed.error.issues });
      return;
    }

    const { page, limit, orgId, userId, action, success, from, to } = parsed.data;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (orgId != null) conditions.push(eq(auditLogsTable.organizationId, orgId));
    if (userId != null) conditions.push(eq(auditLogsTable.userId, userId));
    if (action) conditions.push(ilike(auditLogsTable.action, `%${action}%`));
    if (success !== undefined) conditions.push(eq(auditLogsTable.success, success === "true"));
    if (from) {
      try { conditions.push(gte(auditLogsTable.createdAt, new Date(from))); } catch {}
    }
    if (to) {
      try { conditions.push(lte(auditLogsTable.createdAt, new Date(to))); } catch {}
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db
        .select({
          id: auditLogsTable.id,
          userId: auditLogsTable.userId,
          organizationId: auditLogsTable.organizationId,
          action: auditLogsTable.action,
          entityType: auditLogsTable.entityType,
          entityId: auditLogsTable.entityId,
          success: auditLogsTable.success,
          metadata: auditLogsTable.metadata,
          ipAddress: auditLogsTable.ipAddress,
          createdAt: auditLogsTable.createdAt,
        })
        .from(auditLogsTable)
        .where(where)
        .orderBy(desc(auditLogsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(auditLogsTable)
        .where(where),
    ]);

    // Journaliser l'accès à la page d'audit
    const admin = await getOrCreateUser(req.clerkUserId!);
    await logAuditEvent(req, "admin.view_audit_logs", { userId: admin.id });

    res.json({ data: rows, total, page, limit, pages: Math.ceil(total / limit) });
  },
);

/**
 * GET /admin/audit-logs/actions
 * Liste des actions distinctes — utile pour les filtres du tableau de bord.
 */
router.get(
  "/admin/audit-logs/actions",
  requireAuth,
  requireSuperAdmin,
  async (_req, res): Promise<void> => {
    const rows = await db
      .selectDistinct({ action: auditLogsTable.action })
      .from(auditLogsTable)
      .orderBy(auditLogsTable.action)
      .limit(200);
    res.json(rows.map((r) => r.action));
  },
);

export default router;
