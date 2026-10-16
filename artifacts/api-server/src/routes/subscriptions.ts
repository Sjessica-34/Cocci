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
import { activateRecoveredSubscriptionIfSettled } from "../stripeAccessRecovery";
import {
  createRecoverySetupCheckout,
  getRecoverySetupPaymentMethod,
  getRecoverySetupSessionReferences,
  payExistingRecoveryInvoice,
} from "../sepaRecoveryStripe";
import { eq } from "drizzle-orm";

const router = Router();

function getInvoiceSubscriptionReference(invoice: unknown): string | null {
  const value = invoice as {
    subscription?: string | { id: string } | null;
    parent?: { subscription_details?: { subscription?: string | { id: string } | null } | null } | null;
  };
  return getStripeObjectId(value.subscription)
    ?? getStripeObjectId(value.parent?.subscription_details?.subscription);
}

function getInvoicePaymentIntentReference(invoice: unknown): string | null {
  const value = invoice as {
    payment_intent?: string | { id: string } | null;
    payments?: { data?: Array<{ payment?: { payment_intent?: string | { id: string } | null } }> };
  };
  return getStripeObjectId(value.payment_intent)
    ?? getStripeObjectId(value.payments?.data?.[0]?.payment?.payment_intent);
}

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
          sub?.mode === "stripe"
          && sub.status === "suspended"
          && sub.stripe_customer_id
          && sub.stripe_subscription_id
        ) {
          try {
            const stripe = await getUncachableStripeClient();
            const accessActivated = await activateRecoveredSubscriptionIfSettled({
              stripe,
              organizationId: billingOrgId,
              customerId: sub.stripe_customer_id,
              subscriptionId: sub.stripe_subscription_id,
            });
            if (accessActivated) sub.status = "active";
          } catch (err) {
            // Stripe reconciliation must not make the local subscription
            // status endpoint unavailable. Access remains suspended until
            // Stripe can positively confirm settlement.
            logger.warn(
              { err, organizationId: billingOrgId },
              "subscription recovery reconciliation unavailable",
            );
          }
        }
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

// ── SEPA recovery: setup-only Checkout, then pay the existing invoice ─────────
router.post(
  "/organizations/:orgId/stripe/recovery/setup",
  requireAuth,
  requireOrgRole(["owner", "admin"]),
  async (req, res): Promise<void> => {
    try {
      const billingOrgId = await getBillingOrganizationId(req.orgId!);
      const local = await pool.query<{
        mode: string;
        status: string;
        stripe_customer_id: string | null;
        stripe_subscription_id: string | null;
      }>(
        `SELECT mode, status, stripe_customer_id, stripe_subscription_id
         FROM subscriptions WHERE organization_id = $1 LIMIT 1`,
        [billingOrgId],
      );
      const current = local.rows[0];
      if (
        current?.mode !== "stripe"
        || current.status !== "suspended"
        || !current.stripe_customer_id
        || !current.stripe_subscription_id
      ) {
        res.status(409).json({ error: "Aucune souscription Stripe suspendue à régulariser" });
        return;
      }

      const stripe = await getUncachableStripeClient();
      const sub = await stripe.subscriptions.retrieve(current.stripe_subscription_id);
      if (getStripeObjectId(sub.customer) !== current.stripe_customer_id) {
        res.status(409).json({
          error: "La souscription Stripe n'est pas rattachée au client Cocci",
          code: "SUBSCRIPTION_CUSTOMER_MISMATCH",
        });
        return;
      }
      if (sub.status !== "past_due") {
        if (["active", "trialing"].includes(sub.status)) {
          const accessActivated = await activateRecoveredSubscriptionIfSettled({
            stripe,
            organizationId: billingOrgId,
            customerId: current.stripe_customer_id,
            subscriptionId: sub.id,
          });
          if (accessActivated) {
            res.json({ status: "active" });
            return;
          }
        }
        res.status(409).json({
          error: "La souscription Stripe n'est pas dans un état récupérable",
          code: "SUBSCRIPTION_NOT_PAST_DUE",
        });
        return;
      }

      const openInvoices = await stripe.invoices.list({
        customer: current.stripe_customer_id,
        status: "open",
        limit: 100,
      });
      const unpaid = openInvoices.data.filter((invoice) => {
        return getInvoiceSubscriptionReference(invoice) === sub.id && invoice.amount_remaining > 0;
      });
      if (unpaid.length !== 1) {
        if (unpaid.length === 0 && ["active", "trialing"].includes(sub.status)) {
          const accessActivated = await activateRecoveredSubscriptionIfSettled({
            stripe,
            organizationId: billingOrgId,
            customerId: current.stripe_customer_id,
            subscriptionId: sub.id,
          });
          if (accessActivated) {
            res.json({ status: "active" });
            return;
          }
        }
        res.status(409).json({
          error: unpaid.length
            ? "Plusieurs factures impayées doivent être vérifiées avant la régularisation"
            : "Aucune facture impayée ouverte n'est associée à cette souscription",
          code: unpaid.length ? "AMBIGUOUS_OPEN_INVOICES" : "NO_OPEN_INVOICE",
        });
        return;
      }
      const invoice = await stripe.invoices.retrieve(unpaid[0].id);
      if (
        invoice.status !== "open"
        || invoice.amount_remaining <= 0
        || invoice.customer !== current.stripe_customer_id
        || getInvoiceSubscriptionReference(invoice) !== sub.id
      ) {
        res.status(409).json({ error: "La facture a changé d'état; rechargez la page avant de réessayer" });
        return;
      }

      const session = await createRecoverySetupCheckout(stripe, {
        baseUrl: getPublicAppUrl(),
        organizationId: billingOrgId,
        customerId: current.stripe_customer_id,
        subscriptionId: sub.id,
        invoiceId: invoice.id,
      });
      res.json({ url: session.url });
    } catch (err) {
      logger.error({ err }, "stripe SEPA recovery setup error");
      res.status(500).json({ error: "Impossible de préparer la régularisation SEPA" });
    }
  },
);

router.post(
  "/organizations/:orgId/stripe/recovery/complete",
  requireAuth,
  requireOrgRole(["owner", "admin"]),
  async (req, res): Promise<void> => {
    const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId : "";
    if (!sessionId.startsWith("cs_")) {
      res.status(400).json({ error: "Session de régularisation invalide" });
      return;
    }

    try {
      const billingOrgId = await getBillingOrganizationId(req.orgId!);
      const local = await pool.query<{
        mode: string;
        status: string;
        stripe_customer_id: string | null;
        stripe_subscription_id: string | null;
      }>(
        `SELECT mode, status, stripe_customer_id, stripe_subscription_id
         FROM subscriptions WHERE organization_id = $1 LIMIT 1`,
        [billingOrgId],
      );
      const current = local.rows[0];
      if (
        current?.mode !== "stripe"
        || !current.stripe_customer_id
        || !current.stripe_subscription_id
      ) {
        res.status(409).json({ error: "Souscription Stripe introuvable" });
        return;
      }

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const sessionRefs = getRecoverySetupSessionReferences(session, {
        customerId: current.stripe_customer_id,
        organizationId: billingOrgId,
        subscriptionId: current.stripe_subscription_id,
      });
      if (!sessionRefs) {
        res.status(409).json({ error: "Cette session ne correspond pas à la régularisation courante" });
        return;
      }
      const { invoiceId, setupIntentId } = sessionRefs;

      const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
      const paymentMethodId = getRecoverySetupPaymentMethod(setupIntent, {
        customerId: current.stripe_customer_id,
        organizationId: billingOrgId,
        subscriptionId: current.stripe_subscription_id,
        invoiceId,
      });
      if (!paymentMethodId) {
        res.status(409).json({ error: "Le nouveau mandat SEPA n'a pas été confirmé" });
        return;
      }

      // Re-read both Stripe resources immediately before changing the payment
      // method or attempting payment; client-supplied IDs are never trusted.
      const [sub, invoice, paymentMethod] = await Promise.all([
        stripe.subscriptions.retrieve(current.stripe_subscription_id),
        stripe.invoices.retrieve(invoiceId, { expand: ["payment_intent"] }),
        stripe.paymentMethods.retrieve(paymentMethodId),
      ]);
      const invoiceSubId = getInvoiceSubscriptionReference(invoice);
      if (
        sub.customer !== current.stripe_customer_id
        || invoice.customer !== current.stripe_customer_id
        || invoiceSubId !== sub.id
        || paymentMethod.customer !== current.stripe_customer_id
        || paymentMethod.type !== "sepa_debit"
      ) {
        res.status(409).json({ error: "Les objets Stripe ne correspondent plus à la souscription courante" });
        return;
      }
      if (invoice.status === "paid" && sub.status === "active") {
        const accessActivated = await activateRecoveredSubscriptionIfSettled({
          stripe,
          organizationId: billingOrgId,
          customerId: current.stripe_customer_id,
          subscriptionId: sub.id,
          invoiceId,
        });
        res.json({ status: "paid", accessActivated });
        return;
      }
      if (sub.status !== "past_due" || current.status !== "suspended") {
        res.status(409).json({
          error: "La souscription n'est plus en retard ou n'est pas suspendue dans Cocci",
          code: "SUBSCRIPTION_STATE_CHANGED",
        });
        return;
      }
      if (invoice.status !== "open" || invoice.amount_remaining <= 0) {
        res.status(409).json({ error: "La facture n'est plus ouverte et impayée", code: "INVOICE_NOT_PAYABLE" });
        return;
      }

      const status = await payExistingRecoveryInvoice(stripe, {
        subscriptionId: sub.id,
        invoice,
        paymentMethodId,
        setupIntentId,
      });
      const accessActivated = status === "paid"
        && await activateRecoveredSubscriptionIfSettled({
          stripe,
          organizationId: billingOrgId,
          customerId: current.stripe_customer_id,
          subscriptionId: sub.id,
          invoiceId,
        });
      res.json({ status, accessActivated });
    } catch (err) {
      logger.error({ err }, "stripe SEPA recovery completion error");
      res.status(500).json({ error: "Le paiement de la facture n'a pas pu être lancé" });
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
