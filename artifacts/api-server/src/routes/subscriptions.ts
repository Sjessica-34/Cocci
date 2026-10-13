import { Router, type Request, type Response } from "express";
import type Stripe from "stripe";
import { db, onboardingProgressTable, pool } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { requireOrgMembership, requireOrgRole } from "../middlewares/exerciseScope";
import { getUncachableStripeClient } from "../stripeClient";
import {
  configuredEffectifOffers,
  isEffectifUpgrade,
  resolveCheckoutOffer,
} from "../stripeCatalog";
import type { CatalogOffer } from "../stripeCatalog";
import { logger } from "../lib/logger";
import { getPublicAppUrl } from "../appUrl";
import { getBillingOrganizationId } from "../lib/billingOrganization";
import {
  attachStripeCheckoutSession,
  cancelCheckoutAttempt,
  createPendingCheckoutAttempt,
  getStripeObjectId,
} from "../stripeCheckoutAttempts";
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

// ── POST /api/organizations/:orgId/stripe/change-plan ─────────────────────────
router.post(
  "/organizations/:orgId/stripe/change-plan",
  requireAuth,
  requireOrgRole(["owner", "admin"]),
  async (req, res): Promise<void> => {
    const orgId = req.orgId!;
    const body = (req.body ?? {}) as Record<string, unknown>;
    if ("priceId" in body || "productId" in body) {
      res.status(400).json({ error: "Stripe identifiers must not be supplied by the client" });
      return;
    }

    const targetOffer = resolveCheckoutOffer({ effectifKey: body.effectifKey });
    if (!targetOffer?.effectifKey || targetOffer.maxEmployees === null) {
      res.status(400).json({ code: "INVALID_PLAN", error: "Unsupported plan selection" });
      return;
    }

    const client = await pool.connect();
    let transactionOpen = false;
    try {
      const billingOrgId = await getBillingOrganizationId(orgId);
      await client.query("BEGIN");
      transactionOpen = true;
      const currentResult = await client.query<{
        mode: string;
        status: string;
        stripe_subscription_id: string | null;
        stripe_customer_id: string | null;
        max_employees: number | null;
      }>(
        `SELECT mode, status, stripe_subscription_id, stripe_customer_id, max_employees
         FROM subscriptions
         WHERE organization_id = $1
         FOR UPDATE`,
        [billingOrgId],
      );
      const current = currentResult.rows[0];
      if (
        !current ||
        current.mode !== "stripe" ||
        current.status !== "active" ||
        !current.stripe_subscription_id ||
        !current.stripe_customer_id
      ) {
        await client.query("ROLLBACK");
        transactionOpen = false;
        res.status(409).json({
          code: "ACTIVE_STRIPE_SUBSCRIPTION_REQUIRED",
          error: "An active Stripe subscription is required",
        });
        return;
      }

      const employeeResult = await client.query<{ employee_count: number | null }>(
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
      const employeeCount = employeeResult.rows[0]?.employee_count ?? null;
      if (employeeCount !== null && employeeCount > targetOffer.maxEmployees) {
        await client.query("ROLLBACK");
        transactionOpen = false;
        res.status(409).json({
          code: "PLAN_TOO_SMALL",
          error: "Cette formule ne couvre pas l'effectif déclaré de l'organisation",
          employeeCount,
          maxEmployees: targetOffer.maxEmployees,
        });
        return;
      }

      const stripe = await getUncachableStripeClient();
      const price = await stripe.prices.retrieve(targetOffer.priceId);
      const targetProductId = typeof price.product === "string" ? price.product : price.product.id;
      if (
        !price.active ||
        targetProductId !== targetOffer.productId ||
        !price.recurring ||
        price.recurring.interval !== "month"
      ) {
        throw new Error("Configured Stripe price is unavailable");
      }

      const stripeSubscription = await stripe.subscriptions.retrieve(current.stripe_subscription_id);
      if (
        getStripeObjectId(stripeSubscription.customer) !== current.stripe_customer_id ||
        stripeSubscription.status !== "active"
      ) {
        await client.query("ROLLBACK");
        transactionOpen = false;
        res.status(409).json({
          code: "STRIPE_SUBSCRIPTION_NOT_ACTIVE",
          error: "The Stripe subscription is not active",
        });
        return;
      }

      const configuredOffers = configuredEffectifOffers();
      const additionalUserPriceId = process.env.STRIPE_ADDITIONAL_USER_PRICE_ID?.trim();
      const baseItems = stripeSubscription.items.data.filter((item) =>
        (typeof item.price.product === "string" ? item.price.product : item.price.product.id)
          === targetProductId &&
        item.price.id !== additionalUserPriceId,
      );
      if (baseItems.length !== 1) {
        await client.query("ROLLBACK");
        transactionOpen = false;
        res.status(409).json({
          code: "CURRENT_PLAN_UNRESOLVED",
          error: "The current Cocci plan could not be identified",
        });
        return;
      }
      const baseItem = baseItems[0];
      const currentOffer = configuredOffers.find((offer) => offer.priceId === baseItem.price.id);
      const currentMaxEmployees = currentOffer?.maxEmployees ?? current.max_employees;
      if (
        !isEffectifUpgrade(currentMaxEmployees, targetOffer)
      ) {
        await client.query("ROLLBACK");
        transactionOpen = false;
        res.status(409).json({
          code: "PLAN_NOT_UPGRADE",
          error: "Only a higher Cocci plan can be selected",
        });
        return;
      }

      await stripe.subscriptions.update(
        stripeSubscription.id,
        {
          items: [{
            id: baseItem.id,
            price: targetOffer.priceId,
            quantity: baseItem.quantity ?? 1,
          }],
          proration_behavior: "always_invoice",
          payment_behavior: "error_if_incomplete",
        },
      );

      await client.query("COMMIT");
      transactionOpen = false;
      res.json({
        success: true,
        offerName: targetOffer.offerName,
        maxEmployees: targetOffer.maxEmployees,
      });
    } catch (err) {
      if (transactionOpen) await client.query("ROLLBACK");
      const statusCode = (err as { statusCode?: unknown }).statusCode;
      logger.error({ err, orgId, stage: "stripe_plan_change" }, "Stripe plan change failed");
      if (statusCode === 402) {
        res.status(402).json({
          code: "PLAN_CHANGE_PAYMENT_FAILED",
          error: "Le paiement de la hausse de formule a échoué.",
        });
        return;
      }
      res.status(500).json({ code: "PLAN_CHANGE_FAILED", error: "Impossible de modifier la formule." });
    } finally {
      client.release();
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

      const currentSubscription = await pool.query<{ mode: string | null; status: string | null }>(
        "SELECT mode, status FROM subscriptions WHERE organization_id = $1 LIMIT 1",
        [billingOrgId],
      );
      const hasActiveStripeSubscription = currentSubscription.rows[0]?.mode === "stripe"
        && currentSubscription.rows[0]?.status === "active";
      if (hasActiveStripeSubscription) {
        res.status(409).json({
          error: "An active Stripe subscription already exists",
          code: "ACTIVE_SUBSCRIPTION_EXISTS",
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
      const stripe = await getUncachableStripeClient();
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
           // Activer SEPA Direct Debit (prélèvement IBAN) + carte bancaire
           payment_method_types: ["card", "sepa_debit"],
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

type AdditionalUserHandlerDependencies = {
  connect: typeof pool.connect;
  getBillingOrganizationId: typeof getBillingOrganizationId;
  getStripe: typeof getUncachableStripeClient;
  resolveOffer: () => CatalogOffer | null;
};

export function createAdditionalUserHandler(
  dependencies: AdditionalUserHandlerDependencies = {
    connect: () => pool.connect(),
    getBillingOrganizationId,
    getStripe: getUncachableStripeClient,
    resolveOffer: () => resolveCheckoutOffer({ action: "additional_user" }),
  },
) {
  return async (req: Request, res: Response): Promise<void> => {
    const orgId = req.orgId!;
    const idempotencyKey = req.get("Idempotency-Key");
    if (
      !idempotencyKey ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idempotencyKey,
      )
    ) {
      res.status(400).json({ error: "A valid Idempotency-Key UUID is required" });
      return;
    }
    logger.info({ orgId }, "additional-user seat request received");

    let setupStage = "organization";
    const setup = await (async () => {
      try {
        const billingOrgId = await dependencies.getBillingOrganizationId(orgId);
        setupStage = "database";
        const client = await dependencies.connect();
        return { ok: true as const, billingOrgId, client };
      } catch (error) {
        return { ok: false as const, error, stage: setupStage };
      }
    })();
    if (!setup.ok) {
      logger.error({ err: setup.error, orgId, stage: setup.stage }, "Unable to prepare additional-user seat request");
      res.status(500).json({
        code: setup.stage === "organization" ? "ORGANIZATION_RESOLUTION_FAILED" : "DATABASE_CONNECTION_FAILED",
        stage: setup.stage,
        error: "The organization or database could not be resolved.",
      });
      return;
    }
    const { billingOrgId, client } = setup;
    let transactionOpen = false;
    let failureStage = "database";
    let stripeUpdateSucceeded = false;

    try {
      await client.query("BEGIN");
      transactionOpen = true;
      const current = await client.query<{
        mode: string;
        status: string;
        stripe_subscription_id: string | null;
        stripe_customer_id: string | null;
        max_users: number | null;
        override_max_users: number | null;
      }>(
        `SELECT mode, status, stripe_subscription_id, stripe_customer_id,
                max_users, override_max_users
         FROM subscriptions
         WHERE organization_id = $1
         FOR UPDATE`,
        [billingOrgId],
      );
      const row = current.rows[0];
      const savedRequest = await client.query<{
        status: string;
        stripe_subscription_id: string;
        stripe_update_params: Stripe.SubscriptionUpdateParams;
        max_users: number;
      }>(
        `SELECT status, stripe_subscription_id, stripe_update_params, max_users
         FROM additional_user_seat_requests
         WHERE organization_id = $1 AND idempotency_key = $2
         FOR UPDATE`,
        [billingOrgId, idempotencyKey],
      );
      const previousRequest = savedRequest.rows[0];
      if (previousRequest?.status === "completed") {
        await client.query("COMMIT");
        transactionOpen = false;
        res.json({ maxUsers: previousRequest.max_users });
        return;
      }
      if (previousRequest?.status === "failed") {
        await client.query("ROLLBACK");
        transactionOpen = false;
        res.status(409).json({
          code: "SEAT_ATTEMPT_FAILED",
          error: "This add-seat attempt failed; start a new attempt",
        });
        return;
      }

      let stripeSubscriptionId: string;
      let stripeUpdateParams: Stripe.SubscriptionUpdateParams;
      let maxUsers: number;
      if (previousRequest) {
        stripeSubscriptionId = previousRequest.stripe_subscription_id;
        stripeUpdateParams = previousRequest.stripe_update_params;
        maxUsers = previousRequest.max_users;
      } else {
        if (
          !row ||
          row.mode !== "stripe" ||
          row.status !== "active" ||
          !row.stripe_subscription_id ||
          !row.stripe_customer_id
        ) {
          await client.query("ROLLBACK");
          transactionOpen = false;
          res.status(409).json({ code: "ACTIVE_STRIPE_SUBSCRIPTION_REQUIRED", error: "An active Stripe subscription is required" });
          return;
        }
        if (row.override_max_users !== null) {
          await client.query("ROLLBACK");
          transactionOpen = false;
          res.status(409).json({ code: "USER_LIMIT_MANAGED", error: "The user limit is managed by an administrator" });
          return;
        }

        const inProgress = await client.query(
          `SELECT idempotency_key
           FROM additional_user_seat_requests
           WHERE organization_id = $1 AND status = 'pending'
           LIMIT 1`,
          [billingOrgId],
        );
        if (inProgress.rows.length > 0) {
          await client.query("ROLLBACK");
          transactionOpen = false;
          res.status(409).json({ code: "SEAT_ATTEMPT_PENDING", error: "Retry the pending add-seat attempt before starting another" });
          return;
        }

        const offer = dependencies.resolveOffer();
        if (!offer) {
          await client.query("ROLLBACK");
          transactionOpen = false;
          res.status(503).json({ code: "ADDITIONAL_USER_PRICE_NOT_CONFIGURED", error: "Additional-user pricing is not configured" });
          return;
        }

        failureStage = "stripe_price_lookup";
        const stripe = await dependencies.getStripe();
        const price = await stripe.prices.retrieve(offer.priceId);
        const productId = typeof price.product === "string" ? price.product : price.product.id;
        if (
          !price.active ||
          productId !== offer.productId ||
          !price.recurring ||
          price.recurring.interval !== "month" ||
          price.tax_behavior !== "inclusive" ||
          price.currency !== "eur" ||
          price.unit_amount !== 300
        ) {
          logger.error({ offerName: offer.offerName, priceId: offer.priceId }, "Invalid additional-user Stripe price");
          await client.query("ROLLBACK");
          transactionOpen = false;
          res.status(500).json({
            code: "ADDITIONAL_USER_PRICE_CONFIG_INVALID",
            error: "Additional-user price must be €3 TTC per month",
          });
          return;
        }

        failureStage = "stripe_subscription_lookup";
        const subscription = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
        if (
          subscription.customer !== row.stripe_customer_id ||
          !["active", "trialing"].includes(subscription.status)
        ) {
          await client.query("ROLLBACK");
          transactionOpen = false;
          res.status(409).json({ code: "STRIPE_SUBSCRIPTION_NOT_ACTIVE", error: "The Stripe subscription is not active" });
          return;
        }

        const item = subscription.items.data.find((entry) => entry.price.id === offer.priceId);
        const existingQuantity = item?.quantity ?? 0;
        const metadataBase = Number(subscription.metadata.cocciBaseMaxUsers);
        const baseMaxUsers =
          Number.isInteger(metadataBase) && metadataBase >= 1
            ? metadataBase
            : Math.max((row.max_users ?? 1) - existingQuantity, 1);
        const quantity = existingQuantity + 1;
        stripeSubscriptionId = subscription.id;
        stripeUpdateParams = {
          items: [item ? { id: item.id, quantity } : { price: offer.priceId, quantity }],
          proration_behavior: "always_invoice",
          payment_behavior: "error_if_incomplete",
          metadata: { cocciBaseMaxUsers: String(baseMaxUsers) },
        };
        maxUsers = baseMaxUsers + quantity;
        await client.query(
          `INSERT INTO additional_user_seat_requests
             (organization_id, idempotency_key, status, stripe_subscription_id,
              stripe_update_params, max_users)
           VALUES ($1, $2, 'pending', $3, $4::jsonb, $5)`,
          [
            billingOrgId,
            idempotencyKey,
            stripeSubscriptionId,
            JSON.stringify(stripeUpdateParams),
            maxUsers,
          ],
        );
        failureStage = "stripe_update";
      }

      await client.query("COMMIT");
      transactionOpen = false;
      const stripe = await dependencies.getStripe();
      failureStage = "stripe_update";
      try {
        await stripe.subscriptions.update(stripeSubscriptionId, stripeUpdateParams, {
          idempotencyKey: `additional-user-${billingOrgId}-${idempotencyKey}`,
        });
      } catch (stripeError) {
        const statusCode = (stripeError as { statusCode?: unknown }).statusCode;
        const stripeMessage = stripeError instanceof Error ? stripeError.message : String(stripeError);
        const stripeCode = (stripeError as { code?: unknown }).code;
        logger.error({
          err: stripeError,
          orgId,
          billingOrgId,
          stage: "stripe_update",
          stripeCode: typeof stripeCode === "string" ? stripeCode : null,
          stripeStatusCode: statusCode ?? null,
        }, "Stripe rejected additional-user subscription update");
        if (statusCode === 400 || statusCode === 402) {
          await client.query("BEGIN");
          transactionOpen = true;
          await client.query(
            `UPDATE additional_user_seat_requests
             SET status = 'failed', updated_at = NOW()
             WHERE organization_id = $1 AND idempotency_key = $2`,
            [billingOrgId, idempotencyKey],
          );
          await client.query("COMMIT");
          transactionOpen = false;
          res.status(statusCode).json({
            code: "STRIPE_UPDATE_FAILED",
            stage: "stripe_update",
            paymentSucceeded: false,
            stripeCode: typeof stripeCode === "string" ? stripeCode : null,
            stripeMessage,
            error: "Stripe could not complete the seat purchase",
          });
          return;
        }
        throw stripeError;
      }

      stripeUpdateSucceeded = true;
      failureStage = "database_sync";
      await client.query("BEGIN");
      transactionOpen = true;
      await client.query(
        `UPDATE subscriptions
         SET max_users = $2, updated_at = NOW()
         WHERE organization_id = $1 AND stripe_subscription_id = $3`,
        [billingOrgId, maxUsers, stripeSubscriptionId],
      );
      await client.query(
        `UPDATE additional_user_seat_requests
         SET status = 'completed', updated_at = NOW()
         WHERE organization_id = $1 AND idempotency_key = $2`,
        [billingOrgId, idempotencyKey],
      );
      await client.query("COMMIT");
      transactionOpen = false;
      res.json({ maxUsers });
    } catch (err) {
      if (transactionOpen) {
        await client.query("ROLLBACK").catch(() => undefined);
      }
      const error = err instanceof Error ? err.message : String(err);
      const stripeCode = (err as { code?: unknown })?.code;
      logger.error({
        err,
        orgId,
        billingOrgId,
        stage: failureStage,
        stripeUpdateSucceeded,
        stripeCode: typeof stripeCode === "string" ? stripeCode : null,
      }, "additional-user subscription update failed");
      if (stripeUpdateSucceeded) {
        res.status(503).json({
          code: "STRIPE_SUCCEEDED_LOCAL_SYNC_FAILED",
          stage: failureStage,
          paymentSucceeded: true,
          error: "Stripe accepted the seat; local synchronization failed. Retry the same request.",
        });
      } else if (failureStage.startsWith("stripe_")) {
        res.status(502).json({
          code: failureStage === "stripe_update" ? "STRIPE_OUTCOME_UNKNOWN" : "STRIPE_REQUEST_FAILED",
          stage: failureStage,
          paymentSucceeded: null,
          stripeCode: typeof stripeCode === "string" ? stripeCode : null,
          stripeMessage: error,
          error: "The Stripe request could not be confirmed.",
        });
      } else {
        res.status(500).json({
          code: "ADDITIONAL_USER_DATABASE_FAILED",
          stage: failureStage,
          error: "The seat could not be synchronized locally.",
        });
      }
    } finally {
      client.release();
    }
  };
}

export function createRemoveAdditionalUserHandler(
  dependencies: AdditionalUserHandlerDependencies = {
    connect: () => pool.connect(),
    getBillingOrganizationId,
    getStripe: getUncachableStripeClient,
    resolveOffer: () => resolveCheckoutOffer({ action: "additional_user" }),
  },
) {
  return async (req: Request, res: Response): Promise<void> => {
    const orgId = req.orgId!;
    const billingOrgId = await dependencies.getBillingOrganizationId(orgId);
    const client = await dependencies.connect();

    try {
      await client.query("BEGIN");
      const current = await client.query<{
        mode: string;
        status: string;
        stripe_subscription_id: string | null;
        stripe_customer_id: string | null;
        max_users: number | null;
        override_max_users: number | null;
      }>(
        `SELECT mode, status, stripe_subscription_id, stripe_customer_id,
                max_users, override_max_users
         FROM subscriptions
         WHERE organization_id = $1
         FOR UPDATE`,
        [billingOrgId],
      );
      const row = current.rows[0];
      if (
        !row ||
        row.mode !== "stripe" ||
        row.status !== "active" ||
        !row.stripe_subscription_id ||
        !row.stripe_customer_id
      ) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "An active Stripe subscription is required" });
        return;
      }
      if (row.override_max_users !== null) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "The user limit is managed by an administrator" });
        return;
      }

      const offer = dependencies.resolveOffer();
      if (!offer) {
        await client.query("ROLLBACK");
        res.status(503).json({ error: "Additional-user pricing is not configured" });
        return;
      }

      const stripe = await dependencies.getStripe();
      const price = await stripe.prices.retrieve(offer.priceId);
      const productId = typeof price.product === "string" ? price.product : price.product.id;
      if (
        !price.active ||
        productId !== offer.productId ||
        !price.recurring ||
        price.recurring.interval !== "month" ||
        price.tax_behavior !== "inclusive" ||
        price.currency !== "eur" ||
        price.unit_amount !== 300
      ) {
        logger.error({ offerName: offer.offerName }, "Invalid additional-user Stripe price");
        await client.query("ROLLBACK");
        res.status(500).json({ error: "Additional-user price must be €3 TTC per month" });
        return;
      }

      const subscription = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
      if (
        subscription.customer !== row.stripe_customer_id ||
        !["active", "trialing"].includes(subscription.status)
      ) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "The Stripe subscription is not active" });
        return;
      }

      const item = subscription.items.data.find((entry) => entry.price.id === offer.priceId);
      const existingQuantity = item?.quantity ?? 0;
      if (!item || existingQuantity < 1) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "There is no additional user seat to remove" });
        return;
      }

      const metadataBase = Number(subscription.metadata.cocciBaseMaxUsers);
      const baseMaxUsers =
        Number.isInteger(metadataBase) && metadataBase >= 1
          ? metadataBase
          : Math.max((row.max_users ?? 1) - existingQuantity, 1);
      const maxUsers = baseMaxUsers + existingQuantity - 1;
      const members = await client.query<{ member_count: number }>(
        `SELECT COUNT(*)::integer AS member_count
         FROM members
         WHERE organization_id = $1
           AND archived_at IS NULL
           AND status IN ('active', 'invited')`,
        [billingOrgId],
      );
      const memberCount = Number(members.rows[0]?.member_count ?? 0);
      if (maxUsers < memberCount) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "USER_LIMIT_BELOW_CURRENT_MEMBERS",
          memberCount,
          maxUsers,
        });
        return;
      }

      await stripe.subscriptions.update(subscription.id, {
        items: [
          existingQuantity === 1
            ? { id: item.id, deleted: true }
            : { id: item.id, quantity: existingQuantity - 1 },
        ],
        proration_behavior: "always_invoice",
        payment_behavior: "error_if_incomplete",
        metadata: { cocciBaseMaxUsers: String(baseMaxUsers) },
      });

      await client.query(
        `UPDATE subscriptions
         SET max_users = $2, updated_at = NOW()
         WHERE organization_id = $1 AND stripe_subscription_id = $3`,
        [billingOrgId, maxUsers, row.stripe_subscription_id],
      );
      await client.query("COMMIT");
      res.json({ maxUsers });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      logger.error({ err, billingOrgId }, "additional-user subscription removal failed");
      res.status(500).json({ error: "Unable to remove the additional user" });
    } finally {
      client.release();
    }
  };
}

// ── POST /api/organizations/:orgId/stripe/additional-user ─────────────────────
router.post(
  "/organizations/:orgId/stripe/additional-user",
  requireAuth,
  requireOrgRole(["owner", "admin"]),
  createAdditionalUserHandler(),
);

router.post(
  "/organizations/:orgId/stripe/remove-additional-user",
  requireAuth,
  requireOrgRole(["owner", "admin"]),
  createRemoveAdditionalUserHandler(),
);

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
