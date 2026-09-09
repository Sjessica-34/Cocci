import { getAuth } from "@clerk/express";
import { pool } from "@workspace/db";
import type { Request, Response, NextFunction } from "express";

export function hasActiveSubscriptionStatus(status: string | null | undefined): boolean {
  return status === "active" || status === "trial";
}

/**
 * Vérifie qu'une organisation a un abonnement actif.
 *
 * Règles :
 * - is_super_admin → toujours autorisé (accès Cocci gratuit)
 * - subscription.status IN ('active', 'trial') → autorisé
 * - Pas de ligne subscription → 402
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

    // 2. Vérifier l'abonnement de l'org.
    // req.orgId est déjà validé et garanti par requireOrgMembership qui s'exécute avant.
    const orgId = req.orgId;
    if (!orgId) {
      // Ne devrait pas arriver : requireOrgMembership doit précéder ce middleware.
      res.status(500).json({ error: "Internal server error: orgId missing" });
      return;
    }

    const subRow = await pool.query<{ status: string }>(
      "SELECT status FROM subscriptions WHERE organization_id = $1 LIMIT 1",
      [orgId],
    );
    const status = subRow.rows[0]?.status;

    if (hasActiveSubscriptionStatus(status)) {
      next();
      return;
    }

    // suspended ou expired → 402
    res.status(402).json({
      error: "subscription_required",
      message: "Un abonnement actif est requis pour accéder à cette ressource.",
    });
  } catch (err) {
    // Échec fermé : une erreur DB lors de la vérification d'abonnement
    // ne doit pas autoriser silencieusement l'accès.
    next(err);
  }
}
