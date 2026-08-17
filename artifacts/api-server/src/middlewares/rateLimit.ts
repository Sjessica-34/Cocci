import rateLimit from "express-rate-limit";

const isProd = process.env.NODE_ENV === "production";

/** Limite générale — 300 req / 15 min par IP */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  // En production derrière un proxy/load-balancer, utiliser l'IP réelle
  ...(isProd ? { trustProxy: 1 } : {}),
  message: { error: "Trop de requêtes. Réessayez dans quelques minutes." },
  skip: (req) => req.path === "/health",
});

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
