import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.originalUrl.split("?")[0] === "/api/users/me") {
    console.log("[auth-trace] middleware received auth().userId", {
      requestId: (req as any).id ?? null,
      route: req.originalUrl,
      authUserId: userId,
    });
  }
  (req as any).clerkUserId = userId;
  next();
}
