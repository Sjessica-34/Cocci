import { Router } from "express";
import { pool } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOrgMembership } from "../middlewares/exerciseScope";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "../lib/logger";

const router = Router();

// ── GET /api/stripe/plans — offres disponibles (public) ──────────────────────
router.get("/stripe/plans", async (_req, res): Promise<void> => {
  try {
    const result = await pool.query(`
      SELECT
        p.id          AS product_id,
        p.name        AS product_name,
        p.description AS product_description,
        p.metadata    AS product_metadata,
        pr.id         AS price_id,
        pr.unit_amount,
        pr.currency,
        pr.recurring
      FROM stripe.products p
      JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
      WHERE p.active = true
      ORDER BY pr.unit_amount ASC
    `);

    // Grouper les prix par produit
    const map = new Map<string, { id: string; name: string; description: string | null; metadata: Record<string, string>; prices: object[] }>();
    for (const row of result.rows) {
      if (!map.has(row.product_id)) {
        map.set(row.product_id, {
          id: row.product_id,
          name: row.product_name,
          description: row.product_description,
          metadata: row.product_metadata ?? {},
          prices: [],
        });
      }
      map.get(row.product_id)!.prices.push({
        id: row.price_id,
        unitAmount: row.unit_amount,
        currency: row.currency,
        recurring: row.recurring,
      });
    }

    res.json({ plans: Array.from(map.values()) });
  } catch (err) {
    logger.error({ err }, "stripe/plans error");
    // Stripe pas encore configuré ou aucun produit créé
    res.json({ plans: [] });
  }
});

// ── GET /api/organizations/:orgId/subscription — statut actuel ───────────────
router.get(
  "/organizations/:orgId/subscription",
  requireAuth,
  requireOrgMembership,
  async (req, res): Promise<void> => {
    const orgId = req.orgId!;
    try {
      const row = await pool.query(
        `SELECT mode, status, offer_name, stripe_customer_id, stripe_subscription_id,
                start_at, end_at, trial_end_at, max_users, override_max_users
         FROM subscriptions WHERE organization_id = $1 LIMIT 1`,
        [orgId],
      );
      const sub = row.rows[0] ?? null;

      // Si abonnement Stripe actif, récupérer les détails depuis stripe.subscriptions
      let stripeDetails = null;
      if (sub?.stripe_subscription_id) {
        try {
          const sr = await pool.query(
            "SELECT status, current_period_end FROM stripe.subscriptions WHERE id = $1 LIMIT 1",
            [sub.stripe_subscription_id],
          );
          stripeDetails = sr.rows[0] ?? null;
        } catch {
          // stripe.* pas encore créé
        }
      }

      res.json({ subscription: sub, stripeDetails });
    } catch (err) {
      logger.error({ err }, "subscription status error");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ── POST /api/organizations/:orgId/stripe/checkout ────────────────────────────
router.post(
  "/organizations/:orgId/stripe/checkout",
  requireAuth,
  requireOrgMembership,
  async (req, res): Promise<void> => {
    const orgId = req.orgId!;
    const { priceId } = req.body as { priceId: string };

    if (!priceId) {
      res.status(400).json({ error: "priceId is required" });
      return;
    }

    try {
      const stripe = await getUncachableStripeClient();

      // Récupérer ou créer le customer Stripe pour cette org
      const subRow = await pool.query(
        "SELECT stripe_customer_id FROM subscriptions WHERE organization_id = $1 LIMIT 1",
        [orgId],
      );
      let customerId: string | undefined = subRow.rows[0]?.stripe_customer_id;

      if (!customerId) {
        const orgRow = await pool.query(
          "SELECT name FROM organizations WHERE id = $1 LIMIT 1",
          [orgId],
        );
        const customer = await stripe.customers.create({
          name: orgRow.rows[0]?.name ?? undefined,
          metadata: { orgId: String(orgId) },
        });
        customerId = customer.id;
      }

      const origin = `${req.protocol}://${req.get("host")}`;
      // Les URLs de succès/annulation pointent vers la SPA (chemin /animpact/ en dev, / en prod)
      const baseUrl = process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
        : origin;

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        // Activer SEPA Direct Debit (prélèvement IBAN) + carte bancaire
        payment_method_types: ["card", "sepa_debit"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        // Pour SEPA, Stripe demande un mandat de prélèvement — on l'accepte automatiquement
        payment_method_options: {
          sepa_debit: { mandate_options: {} },
        },
        success_url: `${baseUrl}/abonnement?success=1`,
        cancel_url: `${baseUrl}/abonnement?cancelled=1`,
        metadata: { orgId: String(orgId) },
        locale: "fr",
      });

      res.json({ url: session.url });
    } catch (err) {
      logger.error({ err }, "stripe checkout error");
      res.status(500).json({ error: "Checkout session creation failed" });
    }
  },
);

// ── POST /api/organizations/:orgId/stripe/portal ──────────────────────────────
router.post(
  "/organizations/:orgId/stripe/portal",
  requireAuth,
  requireOrgMembership,
  async (req, res): Promise<void> => {
    const orgId = req.orgId!;
    try {
      const subRow = await pool.query(
        "SELECT stripe_customer_id FROM subscriptions WHERE organization_id = $1 LIMIT 1",
        [orgId],
      );
      const customerId = subRow.rows[0]?.stripe_customer_id;
      if (!customerId) {
        res.status(400).json({ error: "No Stripe customer found for this organisation" });
        return;
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
        : `${req.protocol}://${req.get("host")}`;

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${baseUrl}/abonnement`,
      });

      res.json({ url: portalSession.url });
    } catch (err) {
      logger.error({ err }, "stripe portal error");
      res.status(500).json({ error: "Portal session creation failed" });
    }
  },
);

export default router;
