import { getAuth } from "@clerk/express";
import { pool } from "@workspace/db";
import type { Request, Response, NextFunction } from "express";
import { getBillingOrganizationId } from "../lib/billingOrganization";
import { hasSubscriptionAccess, isFreeSubscriptionExpired } from "../lib/freeSubscriptionExpiry";

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

    const billingOrgId = await getBillingOrganizationId(orgId);
    const subRow = await pool.query<{ status: string; mode: string; end_at: string | null }>(
      "SELECT status, mode, end_at::text FROM subscriptions WHERE organization_id = $1 LIMIT 1",
      [billingOrgId],
    );
    const status = subRow.rows[0]?.status;
    const endAt = subRow.rows[0]?.end_at;
    const endedFreeSubscription = isFreeSubscriptionExpired(subRow.rows[0]?.mode, endAt);

    if (hasSubscriptionAccess({
      mode: subRow.rows[0]?.mode,
      status,
      endAt,
    })) {
      next();
      return;
    }

    if (endedFreeSubscription && status !== "expired") {
      await pool.query(
        "UPDATE subscriptions SET status = 'expired', updated_at = NOW() WHERE organization_id = $1 AND mode = 'free' AND end_at < CURRENT_DATE AND status IN ('active', 'trial')",
        [billingOrgId],
      );
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
