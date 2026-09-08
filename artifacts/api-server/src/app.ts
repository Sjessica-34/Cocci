import express, { type Express } from "express";
import Stripe from "stripe";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { generalLimiter } from "./middlewares/rateLimit";
import router from "./routes";
import { logger } from "./lib/logger";
import { WebhookHandlers } from "./webhookHandlers";

// ─── Origines autorisées ──────────────────────────────────────────────────────
// En développement : Replit dev-domains + localhost
// En production    : ALLOWED_ORIGINS (CSV) obligatoire
function buildCorsOrigin(): cors.CorsOptions["origin"] {
  const isProd = process.env.NODE_ENV === "production";

  const extra: string[] = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const devPatterns: RegExp[] = [
    /^https?:\/\/localhost(:\d+)?$/,
    /\.replit\.dev$/,
    /\.repl\.co$/,
    /\.replit\.app$/,
  ];

  return (origin, callback) => {
    // Requêtes sans header Origin (server-to-server, curl en dev)
    if (!origin) return callback(null, !isProd);

    // Origines explicitement listées
    if (extra.includes(origin)) return callback(null, true);

    // En dev : accepter les domaines Replit et localhost
    if (!isProd && devPatterns.some((p) => p.test(origin))) {
      return callback(null, true);
    }

    callback(new Error("CORS: origine non autorisée"));
  };
}

const app: Express = express();

// ─── Logging HTTP ─────────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        // Masquer les tokens dans le path (ex: /public/barometre/TOKEN)
        const rawUrl: string = req.url ?? "";
        const sanitizedUrl = rawUrl
          .replace(/\/public\/barometre\/[^/?]+/g, "/public/barometre/[REDACTED]")
          .split("?")[0]; // supprimer les query params des logs
        return { id: req.id, method: req.method, url: sanitizedUrl };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ─── Sécurité HTTP ────────────────────────────────────────────────────────────
app.use(
  helmet({
    // CSP désactivé ici car le frontend est une SPA sur un autre domaine ;
    // le configurer à ce niveau bloquerait les réponses API JSON.
    contentSecurityPolicy: false,
    // Headers activés par Helmet par défaut :
    // X-Content-Type-Options: nosniff
    // X-Frame-Options: SAMEORIGIN
    // Strict-Transport-Security (HSTS)
    // X-Download-Options
    // X-Permitted-Cross-Domain-Policies
    // Referrer-Policy: no-referrer
    crossOriginEmbedderPolicy: false, // évite de bloquer les assets Clerk
  }),
);

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: buildCorsOrigin(),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Exercise-Id"],
    maxAge: 86400, // 24h preflight cache
  }),
);

// ─── Stripe webhook — AVANT le body parser JSON ───────────────────────────────
// Le webhook Stripe nécessite le body brut (Buffer), pas du JSON parsé.
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) { res.status(400).json({ error: "Missing stripe-signature" }); return; }
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (err: any) {
      logger.error({ err: err?.message }, "Stripe webhook error");
      const isInvalidSignature =
        err instanceof Stripe.errors.StripeSignatureVerificationError;
      res
        .status(isInvalidSignature ? 400 : 500)
        .json({ error: "Webhook processing error" });
    }
  },
);

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ─── Clerk ───────────────────────────────────────────────────────────────────
app.use(
  clerkMiddleware((req) => ({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  })),
);

// ─── Rate limiting général (/api/*) ──────────────────────────────────────────
app.use("/api", generalLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api", router);

export default app;
