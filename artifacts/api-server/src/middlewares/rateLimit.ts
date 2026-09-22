import rateLimit from "express-rate-limit";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { logger } from "../lib/logger";

const isProd = process.env.NODE_ENV === "production";
const generalWindowMs = 15 * 60 * 1000;
const debugGeneralLimiter = !isProd;

type RateLimitRequest = Request & {
  rateLimit?: {
    limit: number;
    used: number;
    remaining: number;
    resetTime?: Date;
  };
};

type DebugWindow = {
  total: number;
  resetAt: number;
  byCategory: Record<string, number>;
};

const debugWindowsByIp = new Map<string, DebugWindow>();

function getRequestCategory(originalUrl: string): string {
  const pathname = originalUrl.split("?")[0].replace(/^\/+/, "");
  const apiPath = pathname.startsWith("api/") ? pathname.slice(4) : pathname;
  const segments = apiPath.split("/").filter(Boolean);

  if (segments[0] === "users" && segments[1] === "me") {
    return "users/me";
  }
  if (segments.includes("onboarding")) {
    return "onboarding";
  }
  if (segments.includes("dashboard")) {
    return "dashboard";
  }
  if (segments.includes("carbon")) {
    return "carbon";
  }
  if (segments[0] === "organizations") {
    return "organizations";
  }

  return segments.slice(0, 2).join("/") || pathname || "/";
}

function trackGeneralRequest(req: Request): DebugWindow {
  const now = Date.now();
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const current = debugWindowsByIp.get(ip);

  if (current && current.resetAt > now) {
    const category = getRequestCategory(req.originalUrl);
    current.total += 1;
    current.byCategory[category] = (current.byCategory[category] ?? 0) + 1;
    return current;
  }

  const nextWindow: DebugWindow = {
    total: 1,
    resetAt: now + generalWindowMs,
    byCategory: {
      [getRequestCategory(req.originalUrl)]: 1,
    },
  };
  debugWindowsByIp.set(ip, nextWindow);

  const cleanupTimer = setTimeout(() => {
    if (debugWindowsByIp.get(ip) === nextWindow) {
      debugWindowsByIp.delete(ip);
    }
  }, generalWindowMs + 1000);
  cleanupTimer.unref?.();

  return nextWindow;
}

function logGeneralLimitDebug(
  req: RateLimitRequest,
  currentWindow: DebugWindow | undefined,
  options: { statusCode: number },
): void {
  const rateLimitInfo = req.rateLimit;
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const resetAt = rateLimitInfo?.resetTime?.getTime() ?? currentWindow?.resetAt;
  const secondsUntilReset = resetAt
    ? Math.max(0, Math.ceil((resetAt - Date.now()) / 1000))
    : undefined;
  const currentCount = rateLimitInfo?.used ?? currentWindow?.total;
  const maxAllowed = rateLimitInfo?.limit ?? 300;
  const summary = Object.fromEntries(
    Object.entries(currentWindow?.byCategory ?? {}).sort(([, a], [, b]) => b - a),
  );

  logger.warn(
    {
      ip,
      originalUrl: req.originalUrl,
      currentCount,
      maxAllowed,
      secondsUntilReset,
      requestsAlreadyMadeByIp: currentWindow?.total,
      statusCode: options.statusCode,
    },
    "[generalLimiter-debug] 429 imminent",
  );
  logger.warn(
    {
      ip,
      summary,
    },
    "[generalLimiter-debug] 429 summary",
  );
}

/** Limite générale — 300 req / 15 min par IP */
const generalRateLimit = rateLimit({
  windowMs: generalWindowMs,
  max: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  // En production derrière un proxy/load-balancer, utiliser l'IP réelle
  ...(isProd ? { trustProxy: 1 } : {}),
  message: { error: "Trop de requêtes. Réessayez dans quelques minutes." },
  skip: (req) => req.path === "/health",
  handler: (req, res, _next, options) => {
    if (debugGeneralLimiter) {
      logGeneralLimitDebug(
        req as RateLimitRequest,
        debugWindowsByIp.get(req.ip ?? req.socket.remoteAddress ?? "unknown"),
        options,
      );
    }
    res.status(options.statusCode).send(options.message);
  },
});

/** Instrumentation temporaire du limiteur général — à supprimer après diagnostic. */
export const generalLimiter: RequestHandler = (req, res, next) => {
  const currentWindow =
    debugGeneralLimiter && req.path !== "/health"
      ? trackGeneralRequest(req)
      : undefined;

  if (currentWindow) {
    res.locals.generalLimiterDebugWindow = currentWindow;
  }

  return generalRateLimit(req, res, next);
};

/** Opérations sensibles — export RGPD, suppression de compte, changement de rôle */
export const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  ...(isProd ? { trustProxy: 1 } : {}),
  message: { error: "Trop de requêtes sur cette opération. Réessayez dans quelques minutes." },
});

/** Sondages publics Baromètre Social (employés sans compte) — 60 req / 15 min */
export const barometreLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  ...(isProd ? { trustProxy: 1 } : {}),
  message: { error: "Trop de réponses envoyées. Réessayez dans quelques minutes." },
});

/** Uploads — 20 req / 15 min */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  ...(isProd ? { trustProxy: 1 } : {}),
  message: { error: "Trop d'uploads. Réessayez dans quelques minutes." },
});
