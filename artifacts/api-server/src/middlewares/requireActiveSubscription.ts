import { getAuth } from "@clerk/express";
import { pool } from "@workspace/db";
import type { Request, Response, NextFunction } from "express";

/**
 * Vérifie qu'une organisation a un abonnement actif.
 *
 * Règles :
 * - is_super_admin → toujours autorisé (accès Cocci gratuit)
 * - subscription.status IN ('active', 'trial') → autorisé
 * - Pas de ligne subscription → autorisé (période de grâce / free)
 * - subscription.status IN ('suspended', 'expired') → 402
 *
 * Doit être utilisé APRÈS requireAuth et requireOrgMembership
 * (orgId doit être présent dans req.orgId ou req.params.orgId).
 */
export async function requireActiveSubscription(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // 1. Super admin → accès libre
    const userRow = await pool.query<{ is_super_admin: boolean }>(
      "SELECT is_super_admin FROM users WHERE clerk_id = $1 LIMIT 1",
      [auth.userId],
    );
    if (userRow.rows[0]?.is_super_admin) {
      next();
      return;
    }

    // 2. Vérifier l'abonnement de l'org
    const orgId = (req as any).orgId ?? req.params.orgId;
    if (!orgId) {
      next();
      return;
    }

    const subRow = await pool.query<{ status: string }>(
      "SELECT status FROM subscriptions WHERE organization_id = $1 LIMIT 1",
      [parseInt(String(orgId))],
    );
    const status = subRow.rows[0]?.status;

    // Pas de ligne → période de grâce, on laisse passer
    if (!status) {
      next();
      return;
    }

    if (status === "active" || status === "trial") {
      next();
      return;
    }

    // suspended ou expired → 402
    res.status(402).json({
      error: "subscription_required",
      message: "Un abonnement actif est requis pour accéder à cette ressource.",
    });
  } catch (err) {
    // En cas d'erreur DB, ne pas bloquer l'accès
    next();
  }
}
