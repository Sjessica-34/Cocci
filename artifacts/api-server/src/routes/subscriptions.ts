import { Router } from "express";
import { db, onboardingProgressTable, pool } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOrgMembership, requireOrgRole } from "../middlewares/exerciseScope";
import { getUncachableStripeClient } from "../stripeClient";
import { configuredEffectifOffers, resolveCheckoutOffer } from "../stripeCatalog";
import { logger } from "../lib/logger";
import { getPublicAppUrl } from "../appUrl";
import { getBillingOrganizationId } from "../lib/billingOrganization";
import {
  attachStripeCheckoutSession,
  cancelCheckoutAttempt,
  createPendingCheckoutAttempt,
  getStripeObjectId,
} from "../stripeCheckoutAttempts";
import {
  shouldBlockNewStripeCheckout,
  STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES,
} from "../stripeSubscriptionTransitions";
import { eq } from "drizzle-orm";

const router = Router();

// ── GET /api/stripe/plans — offres disponibles (public, sans IDs Stripe) ─────
router.get("/stripe/plans", async (_req, res): Promise<void> => {
  try {
    const stripe = await getUncachableStripeClient();
    const plans = await Promise.all(
      configuredEffectifOffers().map(async (offer) => {
        const price = await stripe.prices.retrieve(offer.priceId);
        const productId = typeof price.product === "string" ? price.product : price.product.id;
        if (!price.active || productId !== offer.productId || !price.recurring || price.recurring.interval !== "month") {
          throw new Error("Configured Stripe price is unavailable");
        }

        const tier = offer.maxEmployees && offer.maxEmployees <= 25
          ? "tpe"
          : offer.maxEmployees && offer.maxEmployees <= 100
            ? "pme"
            : "eti";

        return {
          key: offer.effectifKey,
          name: offer.offerName,
          description: null,
          tier,
          prices: [{
            unitAmount: price.unit_amount ?? 0,
            currency: price.currency,
            recurring: { interval: price.recurring.interval },
          }],
        };
      }),
    );
    res.json({ plans });
  } catch (err) {
    logger.error({ err }, "stripe/plans error");
    // Stripe pas encore configuré ou catalogue incomplet
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
      const billingOrgId = await getBillingOrganizationId(orgId);
      const row = await pool.query(
        `SELECT mode, status, offer_name, stripe_customer_id, stripe_subscription_id,
                start_at, end_at, trial_end_at, max_users, override_max_users
         FROM subscriptions WHERE organization_id = $1 LIMIT 1`,
        [billingOrgId],
      );
       const sub = row.rows[0] ?? null;
       if (
         sub?.mode === "free"
         && sub.end_at
         && String(sub.end_at).slice(0, 10) < new Date().toISOString().slice(0, 10)
         && (sub.status === "active" || sub.status === "trial")
       ) {
         await pool.query(
           "UPDATE subscriptions SET status = 'expired', updated_at = NOW() WHERE organization_id = $1 AND mode = 'free' AND end_at < CURRENT_DATE AND status IN ('active', 'trial')",
           [billingOrgId],
         );
         sub.status = "expired";
       }

      // L'état local, alimenté exclusivement par les webhooks vérifiés, est la
      // source utilisée par l'application. La propriété historique est gardée
      // pour préserver le contrat de réponse sans requête au schéma stripe.*.
      res.json({ subscription: sub, stripeDetails: null });
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
  requireOrgRole(["owner", "admin"]),
  async (req, res): Promise<void> => {
    const orgId = req.orgId!;
    const body = (req.body ?? {}) as Record<string, unknown>;

    // Toute tentative de choisir un produit ou un prix Stripe depuis le client
    // est explicitement rejetée. Le catalogue métier du serveur est la source
    // de vérité exclusive.
    if ("priceId" in body || "productId" in body) {
      res.status(400).json({ error: "Stripe identifiers must not be supplied by the client" });
      return;
    }

    try {
      const billingOrgId = await getBillingOrganizationId(orgId);
      const offer = resolveCheckoutOffer({
        effectifKey: body.effectifKey,
        action: body.action,
      });
      if (!offer) {
        res.status(400).json({ error: "Unsupported checkout selection" });
        return;
      }

      const stripe = await getUncachableStripeClient();
      const currentSubscription = await pool.query<{
        mode: string | null;
        status: string | null;
        stripe_subscription_id: string | null;
      }>(
        "SELECT mode, status, stripe_subscription_id FROM subscriptions WHERE organization_id = $1 LIMIT 1",
        [billingOrgId],
      );
      const current = currentSubscription.rows[0];
      let stripeSubscriptionStatus: string | null = null;
      if (
        current?.mode === "stripe"
        && current.status === "suspended"
        && current.stripe_subscription_id
      ) {
        const stripeSubscription = await stripe.subscriptions.retrieve(current.stripe_subscription_id);
        stripeSubscriptionStatus = stripeSubscription.status;
      }
      if (shouldBlockNewStripeCheckout({
        mode: current?.mode,
        localStatus: current?.status,
        stripeSubscriptionId: current?.stripe_subscription_id,
        stripeSubscriptionStatus,
      })) {
        const recoveryRequired = current?.status === "suspended";
        res.status(409).json({
          error: recoveryRequired
            ? "Régularisez l’abonnement Stripe existant avant de souscrire à nouveau"
            : "An active Stripe subscription already exists",
          code: recoveryRequired ? "SUBSCRIPTION_RECOVERY_REQUIRED" : "ACTIVE_SUBSCRIPTION_EXISTS",
        });
        return;
      }

      // L'effectif déclaré est la limite métier à respecter : une formule
      // inférieure ne doit jamais pouvoir être souscrite, même via un appel
      // direct à l'API qui contournerait l'état désactivé de l'interface.
      const organizationRow = await pool.query<{ employee_count: number | null }>(
        `SELECT COALESCE(
           o.employee_count,
           (
             SELECT ew.total_headcount
             FROM employment_workforce ew
              WHERE ew.organization_id = o.id
             ORDER BY ew.updated_at DESC NULLS LAST, ew.id DESC
             LIMIT 1
           )
         ) AS employee_count
         FROM organizations o
         WHERE o.id = $1
         LIMIT 1`,
        [billingOrgId],
      );
      const employeeCount = organizationRow.rows[0]?.employee_count ?? null;
      if (
        employeeCount !== null &&
        offer.maxEmployees !== null &&
        employeeCount > offer.maxEmployees
      ) {
        res.status(409).json({
          error: "Cette formule ne couvre pas l'effectif déclaré de l'organisation",
          code: "PLAN_TOO_SMALL",
          employeeCount,
          maxEmployees: offer.maxEmployees,
        });
        return;
      }

      const baseUrl = getPublicAppUrl();
      // Vérification de cohérence côté Stripe : la configuration serveur doit
      // pointer vers un prix actif rattaché au produit Cocci attendu.
      const price = await stripe.prices.retrieve(offer.priceId);
      const priceProductId = typeof price.product === "string" ? price.product : price.product.id;
       if (!price.active || priceProductId !== offer.productId || !price.recurring || price.recurring.interval !== "month") {
        logger.error({ offerName: offer.offerName }, "Invalid Stripe checkout catalog configuration");
        res.status(500).json({ error: "Stripe catalog configuration is invalid" });
        return;
      }

      // Récupérer ou créer le customer Stripe pour cette org
      const subRow = await pool.query(
        "SELECT stripe_customer_id FROM subscriptions WHERE organization_id = $1 LIMIT 1",
        [billingOrgId],
      );
      let customerId: string | undefined = subRow.rows[0]?.stripe_customer_id;

      if (!customerId) {
        const orgRow = await pool.query(
          "SELECT name FROM organizations WHERE id = $1 LIMIT 1",
          [billingOrgId],
        );
        const customer = await stripe.customers.create({
          name: orgRow.rows[0]?.name ?? undefined,
          metadata: { orgId: String(billingOrgId) },
        });
        customerId = customer.id;
      }

       const checkoutAttemptId = await createPendingCheckoutAttempt({
         organizationId: billingOrgId,
         stripeCustomerId: customerId,
       });

       try {
         const session = await stripe.checkout.sessions.create({
           customer: customerId,
            // Cocci accepte exclusivement le prélèvement SEPA.
            payment_method_types: [...STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES],
           line_items: [{ price: offer.priceId, quantity: 1 }],
           mode: "subscription",
           // Pour SEPA, Stripe demande un mandat de prélèvement — on l'accepte automatiquement
           payment_method_options: {
             sepa_debit: { mandate_options: {} },
           },
           subscription_data: {
             metadata: {
               checkoutAttemptId,
               orgId: String(billingOrgId),
             },
           },
           // Stripe revient sur une confirmation dédiée, jamais sur le catalogue.
           // Seule une clé métier issue du catalogue serveur est exposée à l'URL.
           success_url: `${baseUrl}/abonnement/confirmation?offer=${encodeURIComponent(
             offer.effectifKey ?? offer.action ?? "subscription",
           )}`,
           cancel_url: `${baseUrl}/abonnement?cancelled=1`,
           metadata: {
             orgId: String(billingOrgId),
             checkoutAttemptId,
             offerName: offer.offerName,
             ...(offer.effectifKey ? { effectifKey: offer.effectifKey } : {}),
             ...(offer.action ? { action: offer.action } : {}),
             ...(offer.maxEmployees != null ? { maxEmployees: String(offer.maxEmployees) } : {}),
           },
           locale: "fr",
         });

         await attachStripeCheckoutSession({
           attemptId: checkoutAttemptId,
           stripeCheckoutSessionId: session.id,
           stripeSubscriptionId: getStripeObjectId(session.subscription),
           stripePaymentIntentId: getStripeObjectId(session.payment_intent),
         });

         if (req.userId) {
           await db
             .update(onboardingProgressTable)
             .set({ status: "payment_pending", updatedAt: new Date() })
             .where(eq(onboardingProgressTable.userId, req.userId));
         }

         res.json({ url: session.url });
       } catch (err) {
         await cancelCheckoutAttempt(checkoutAttemptId);
         throw err;
       }
    } catch (err) {
      logger.error({ err }, "stripe checkout error");
       if (typeof err === "object" && err !== null && "code" in err && err.code === "23505") {
         res.status(409).json({
           error: "A Stripe checkout is already being created for this organisation",
           code: "CHECKOUT_ATTEMPT_IN_PROGRESS",
         });
         return;
       }
      res.status(500).json({ error: "Checkout session creation failed" });
    }
  },
);

// ── POST /api/organizations/:orgId/stripe/portal ──────────────────────────────
router.post(
  "/organizations/:orgId/stripe/portal",
  requireAuth,
  requireOrgRole(["owner", "admin"]),
  async (req, res): Promise<void> => {
    const orgId = req.orgId!;
    try {
      const billingOrgId = await getBillingOrganizationId(orgId);
      const subRow = await pool.query(
        "SELECT stripe_customer_id FROM subscriptions WHERE organization_id = $1 LIMIT 1",
        [billingOrgId],
      );
      const customerId = subRow.rows[0]?.stripe_customer_id;
      if (!customerId) {
        res.status(400).json({ error: "No Stripe customer found for this organisation" });
        return;
      }

      const baseUrl = getPublicAppUrl();
      const stripe = await getUncachableStripeClient();

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
