import type { Request } from "express";
import { db, auditLogsTable } from "@workspace/db";
import { logger } from "./logger";

export type AuditAction =
  | "user.export_data"
  | "user.delete_request"
  | "user.update_profile"
  | "user.consent_recorded"
  | "org.create"
  | "org.update"
  | "org.delete"
  | "member.role_change"
  | "member.remove"
  | "resource.create"
  | "resource.update"
  | "resource.delete"
  | "admin.view_audit_logs"
  | "admin.update_subscription"
  | "admin.update_org"
  | (string & {});

interface AuditOptions {
  userId?: number | null;
  organizationId?: number | null;
  entityType?: string;
  entityId?: string | number;
  success?: boolean;
  /** Données contextuelles — ne jamais inclure mots de passe, tokens, secrets */
  metadata?: Record<string, unknown>;
}

/** Extrait l'IP réelle en tenant compte des proxies (Replit, load-balancers) */
function getClientIp(req: Request): string | null {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress ?? null;
}

/**
 * Enregistre un événement dans la table audit_logs.
 * N'échoue jamais silencieusement — les erreurs sont loguées mais ne propagent pas.
 */
export async function logAuditEvent(
  req: Request,
  action: AuditAction,
  opts: AuditOptions = {},
): Promise<void> {
  const { userId, organizationId, entityType, entityId, success = true, metadata } = opts;

  try {
    await db.insert(auditLogsTable).values({
      userId: userId ?? null,
      organizationId: organizationId ?? null,
      action,
      entityType: entityType ?? null,
      entityId: entityId != null ? String(entityId) : null,
      success,
      metadata: metadata ? JSON.stringify(metadata) : null,
      ipAddress: getClientIp(req),
      userAgent: (req.headers["user-agent"] as string | undefined) ?? null,
    });
  } catch (err) {
    // Un échec de journalisation ne doit jamais bloquer l'opération métier
    logger.error({ err, action }, "audit: failed to write log entry");
  }
}
