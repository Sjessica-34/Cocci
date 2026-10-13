import express, { type Express } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
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

const isProduction = process.env.NODE_ENV === "production";
const app: Express = express();
if (isProduction) {
  // Infomaniak exposes the visitor IP through one reverse-proxy hop.
  // express-rate-limit reads this Express setting; it is not a limiter option.
  app.set("trust proxy", 1);
}

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
    // Keep CSP disabled until a policy covering the SPA and Clerk assets is
    // defined; Helmet's other security headers remain enabled.
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
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Exercise-Id",
      "idempotency-key",
      "Idempotency-Key",
    ],
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

// Clerk protects API requests. Static assets and SPA deep links do not need
// server-side authentication middleware.
app.use(
  "/api",
  clerkMiddleware(() => ({
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  })),
);

// ─── Rate limiting général (/api/*) ──────────────────────────────────────────
app.use("/api", generalLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api", router);

// Infomaniak runs one Node.js process per site. Serve the built SPA from the
// same origin as the API so browser requests, Clerk redirects, and deep links
// do not depend on Replit's artifact proxy.
const frontendDistDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../animpact/dist/public",
);
app.use(
  express.static(frontendDistDir, {
    index: false,
    maxAge: isProduction ? "1h" : 0,
    setHeaders(res, filePath) {
      if (path.basename(filePath) === "index.html") {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  }),
);
app.use((req, res, next) => {
  if (
    (req.method !== "GET" && req.method !== "HEAD")
    || req.path === "/api"
    || req.path.startsWith("/api/")
    || !req.accepts("html")
  ) {
    next();
    return;
  }

  res.sendFile(path.join(frontendDistDir, "index.html"), (error) => {
    if (error) next(error);
  });
});

export default app;
