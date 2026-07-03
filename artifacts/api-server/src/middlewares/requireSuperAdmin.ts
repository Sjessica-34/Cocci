import type { Request, Response, NextFunction } from "express";
import { getOrCreateUser } from "../lib/auth";

/**
 * Middleware — vérifie que l'utilisateur authentifié est superadmin.
 * Doit être utilisé après requireAuth.
 * Attache req.currentUser si pas déjà fait.
 */
export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const clerkUserId = req.clerkUserId!;
  const user = await getOrCreateUser(clerkUserId);

  if (!user.isSuperAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  req.currentUser = user;
  next();
}
