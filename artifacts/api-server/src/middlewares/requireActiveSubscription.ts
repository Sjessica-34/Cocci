import type { Request, Response, NextFunction } from "express";
import { db, subscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/**
 * Vérifie que l'organisation a un abonnement actif ou en période d'essai.
 *
 * Doit être utilisé APRÈS requireMembership (qui attache req.membership et req.currentUser).
 * L'organizationId est lu depuis req.membership.organizationId ou req.params.id en fallback.
 *
 * Status bloquants : "suspended" | "expired"
 * Status autorisés : "active" | "trial"
 * Absence d'abonnement : autorisé (offre gratuite)
 * Superadmin : toujours autorisé
 */
export async function requireActiveSubscription(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Superadmins contournent toutes les restrictions d'abonnement
  if (req.currentUser?.isSuperAdmin) {
    next();
    return;
  }

  const rawOrgId =
    req.membership?.organizationId ??
    Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);

  if (!rawOrgId || Number.isNaN(rawOrgId)) {
    res.status(400).json({ error: "Organization id required for subscription check" });
    return;
  }

  const [sub] = await db
    .select({
      status: subscriptionsTable.status,
      endAt: subscriptionsTable.endAt,
    })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.organizationId, rawOrgId))
    .limit(1);

  // Pas d'abonnement enregistré = offre gratuite, on laisse passer
  if (!sub) {
    next();
    return;
  }

  const ALLOWED_STATUSES = ["active", "trial"];
  if (!ALLOWED_STATUSES.includes(sub.status)) {
    res.status(402).json({
      error: "Un abonnement actif est requis pour accéder à cette fonctionnalité.",
      code: "SUBSCRIPTION_REQUIRED",
      subscriptionStatus: sub.status,
    });
    return;
  }

  // Vérification de la date d'expiration (si renseignée)
  if (sub.endAt && new Date(sub.endAt) < new Date()) {
    res.status(402).json({
      error: "Votre abonnement a expiré.",
      code: "SUBSCRIPTION_EXPIRED",
    });
    return;
  }

  next();
}
