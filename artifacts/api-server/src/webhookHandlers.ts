import Stripe from "stripe";
import { pool } from "@workspace/db";
import { getStripeWebhookSecret, getUncachableStripeClient } from "./stripeClient";
import { logger } from "./lib/logger";
import { sendSubscriptionConfirmation } from "./lib/email";
import { getPublicAppUrl } from "./appUrl";
import { getStripeObjectId } from "./stripeCheckoutAttempts";

type InvoiceSubscriptionReference = {
  subscription?: string | { id: string } | null;
  billing_reason?: string | null;
  parent?: {
    subscription_details?: {
      subscription?: string | { id: string } | null;
    } | null;
  } | null;
};

export function getInvoiceSubscriptionId(
  invoice: InvoiceSubscriptionReference,
): string | null {
  const reference =
    invoice.subscription ?? invoice.parent?.subscription_details?.subscription;
  return typeof reference === "string" ? reference : reference?.id ?? null;
}

async function syncCurrentSubscriptionFromStripe(opts: {
  orgId: number;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  maxUsers: number | null;
}): Promise<void> {
  const terminalStripeStatuses = new Set([
    "canceled",
    "incomplete_expired",
    "paused",
    "unpaid",
  ]);
  const shouldSuspend = terminalStripeStatuses.has(opts.status);

  const result = await pool.query(
    `UPDATE subscriptions
     SET mode = 'stripe',
         stripe_customer_id = $2,
         status = CASE
           WHEN subscriptions.status = 'suspended' THEN 'suspended'
           WHEN $4::boolean THEN 'suspended'
           ELSE subscriptions.status
         END,
         max_users = CASE
           WHEN subscriptions.override_max_users IS NULL AND $5::integer IS NOT NULL THEN $5
           ELSE subscriptions.max_users
         END,
         updated_at = NOW()
     WHERE organization_id = $1
       AND stripe_subscription_id = $3
     RETURNING status`,
    [opts.orgId, opts.stripeCustomerId, opts.stripeSubscriptionId, shouldSuspend, opts.maxUsers],
  );

  if (shouldSuspend && result.rowCount) {
    await pool.query(
      `UPDATE stripe_checkout_attempts
       SET status = CASE WHEN status IN ('pending', 'completed') THEN 'failed' ELSE status END,
           updated_at = NOW()
       WHERE organization_id = $1
         AND stripe_subscription_id = $2`,
      [opts.orgId, opts.stripeSubscriptionId],
    );
  }
}

async function suspendSubscriptionByStripeSubId(stripeSubscriptionId: string): Promise<void> {
  const result = await pool.query(
    `UPDATE subscriptions SET status = 'suspended', updated_at = NOW()
     WHERE stripe_subscription_id = $1`,
    [stripeSubscriptionId],
  );
  if (result.rowCount) {
    await pool.query(
      `UPDATE stripe_checkout_attempts
       SET status = CASE WHEN status IN ('pending', 'completed') THEN 'failed' ELSE status END,
           updated_at = NOW()
       WHERE stripe_subscription_id = $1`,
      [stripeSubscriptionId],
    );
  }
}

async function completeCurrentCheckoutSession(opts: {
  session: Stripe.Checkout.Session;
  organizationId: number;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  checkoutAttemptId: string;
  internalStatus: "active" | "trial";
  offerName: string | null;
  maxEmployees: number | null;
}): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const attempt = await client.query(
      `SELECT id
       FROM stripe_checkout_attempts
       WHERE id = $1
         AND organization_id = $2
         AND status = 'pending'
         AND stripe_customer_id = $3
         AND stripe_checkout_session_id = $4
       FOR UPDATE`,
      [
        opts.checkoutAttemptId,
        opts.organizationId,
        opts.stripeCustomerId,
        opts.session.id,
      ],
    );

    if (!attempt.rows[0]) {
      await client.query("ROLLBACK");
      logger.info(
        {
          event: "checkout.session.completed",
          organizationId: opts.organizationId,
          checkoutSessionId: opts.session.id,
          checkoutAttemptId: opts.checkoutAttemptId,
        },
        "Ignoring checkout event without the current pending attempt",
      );
      return false;
    }

    await client.query(
      `INSERT INTO subscriptions
         (organization_id, mode, status, stripe_customer_id, stripe_subscription_id,
          offer_name, max_employees, start_at, updated_at)
       VALUES ($1, 'stripe', $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT (organization_id)
       DO UPDATE SET
         mode = 'stripe',
         status = $2,
         stripe_customer_id = $3,
         stripe_subscription_id = $4,
         offer_name = COALESCE($5, subscriptions.offer_name),
         max_employees = COALESCE($6, subscriptions.max_employees),
         updated_at = NOW()`,
      [
        opts.organizationId,
        opts.internalStatus,
        opts.stripeCustomerId,
        opts.stripeSubscriptionId,
        opts.offerName,
        opts.maxEmployees,
      ],
    );

    await client.query(
      `UPDATE stripe_checkout_attempts
       SET status = 'completed',
           stripe_subscription_id = $2,
           stripe_payment_intent_id = COALESCE($3, stripe_payment_intent_id),
           completed_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [
        opts.checkoutAttemptId,
        opts.stripeSubscriptionId,
        getStripeObjectId(opts.session.payment_intent),
      ],
    );

    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

type PaymentFailureTarget = {
  organization_id: number;
  stripe_subscription_id: string;
  attempt_id: string;
};

async function findCurrentPaymentFailureTarget(
  paymentIntent: Stripe.PaymentIntent,
): Promise<PaymentFailureTarget | null> {
  const customerId = getStripeObjectId(paymentIntent.customer);
  const paymentIntentAttemptId = paymentIntent.metadata?.checkoutAttemptId ?? null;
  const paymentIntentWithInvoice = paymentIntent as Stripe.PaymentIntent & {
    invoice?: string | InvoiceSubscriptionReference | null;
  };
  const direct = await pool.query<PaymentFailureTarget>(
    `SELECT s.organization_id, s.stripe_subscription_id, a.id AS attempt_id
     FROM subscriptions s
     JOIN stripe_checkout_attempts a
       ON a.organization_id = s.organization_id
      AND a.stripe_subscription_id = s.stripe_subscription_id
     WHERE s.status = 'trial'
       AND a.status = 'completed'
       AND a.stripe_payment_intent_id = $1
       AND ($2::text IS NULL OR a.stripe_customer_id = $2)
       AND ($3::text IS NULL OR a.id = $3)
     LIMIT 1`,
    [paymentIntent.id, customerId, paymentIntentAttemptId],
  );
  if (direct.rows[0]) return direct.rows[0];

  let subscriptionId: string | null = null;
  if (paymentIntentWithInvoice.invoice && typeof paymentIntentWithInvoice.invoice !== "string") {
    subscriptionId = getInvoiceSubscriptionId(
      paymentIntentWithInvoice.invoice,
    );
  } else if (typeof paymentIntentWithInvoice.invoice === "string") {
    const stripe = await getUncachableStripeClient();
    const invoice = await stripe.invoices.retrieve(paymentIntentWithInvoice.invoice);
    subscriptionId = getInvoiceSubscriptionId(
      invoice as unknown as InvoiceSubscriptionReference,
    );
  }
  if (!subscriptionId) return null;

  const bySubscription = await pool.query<PaymentFailureTarget>(
    `SELECT s.organization_id, s.stripe_subscription_id, a.id AS attempt_id
     FROM subscriptions s
     JOIN stripe_checkout_attempts a
       ON a.organization_id = s.organization_id
      AND a.stripe_subscription_id = s.stripe_subscription_id
     WHERE s.status = 'trial'
       AND a.status = 'completed'
       AND s.stripe_subscription_id = $1
       AND ($2::text IS NULL OR a.stripe_customer_id = $2)
     LIMIT 1`,
    [subscriptionId, customerId],
  );
  return bySubscription.rows[0] ?? null;
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
        "Ensure the webhook route is registered BEFORE app.use(express.json()).",
      );
    }

    const stripe = getUncachableStripeClient();
    const webhookSecret = getStripeWebhookSecret();
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    await handleStripeEvent(event);
  }
}

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.orgId ? parseInt(session.metadata.orgId) : null;
        const customerId = getStripeObjectId(session.customer);
        const subscriptionId = getStripeObjectId(session.subscription);
        const checkoutAttemptId = session.metadata?.checkoutAttemptId;
        if (!orgId || !customerId || !subscriptionId || !checkoutAttemptId) break;

        const internalStatus = session.payment_status === "paid" ? "active" : "trial";
        const offerName = session.metadata?.offerName ?? null;
        const maxEmployees = session.metadata?.maxEmployees
          ? parseInt(session.metadata.maxEmployees)
          : null;

        const accepted = await completeCurrentCheckoutSession({
          session,
          organizationId: orgId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          checkoutAttemptId,
          internalStatus,
          offerName,
          maxEmployees,
        });
        if (!accepted) break;

        if (internalStatus === "active") {
          await pool.query(
            `UPDATE onboarding_progress p
             SET status = 'completed', completed_at = COALESCE(p.completed_at, NOW()), updated_at = NOW()
             FROM users u
             WHERE p.user_id = u.id
               AND u.primary_organization_id = $1
               AND p.status <> 'completed'`,
            [orgId],
          );
        }
        logger.info(
          {
            orgId,
            paymentStatus: session.payment_status,
            internalStatus,
            checkoutAttemptId,
            checkoutSessionId: session.id,
          },
          "Subscription upserted after checkout",
        );

        try {
          const adminRow = await pool.query<{
            email: string;
            first_name: string | null;
            org_name: string;
          }>(
            `SELECT u.email, u.first_name, o.name AS org_name
             FROM users u
             JOIN members m ON m.user_id = u.id
             JOIN organizations o ON o.id = m.organization_id
             WHERE m.organization_id = $1
               AND m.role IN ('owner', 'admin')
               AND m.status = 'active'
             ORDER BY CASE WHEN m.role = 'owner' THEN 0 ELSE 1 END
             LIMIT 1`,
            [orgId],
          );
          if (adminRow.rows[0]) {
            const { email, first_name, org_name } = adminRow.rows[0];
            const baseUrl = getPublicAppUrl();
            await sendSubscriptionConfirmation({
              to: email,
              firstName: first_name,
              orgName: org_name,
              spaceUrl: baseUrl,
              portalUrl: `${baseUrl}/abonnement`,
            });
          } else {
            logger.warn({ orgId }, "No admin found for subscription confirmation email");
          }
        } catch (emailErr) {
          logger.error({ emailErr, orgId }, "Failed to send subscription confirmation email");
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as unknown as InvoiceSubscriptionReference;
        const invoiceSubId = getInvoiceSubscriptionId(invoice);
        if (!invoiceSubId) break;
        const row = await pool.query<{ organization_id: number }>(
          "SELECT organization_id FROM subscriptions WHERE stripe_subscription_id = $1 LIMIT 1",
          [invoiceSubId],
        );
        if (!row.rows[0]) break;
        await pool.query(
          `UPDATE subscriptions SET status = 'active', updated_at = NOW()
           WHERE organization_id = $1
             AND stripe_subscription_id = $2
             AND status = 'trial'`,
          [row.rows[0].organization_id, invoiceSubId],
        );
        await pool.query(
          `UPDATE onboarding_progress p
           SET status = 'completed', completed_at = COALESCE(p.completed_at, NOW()), updated_at = NOW()
           FROM users u
           WHERE p.user_id = u.id
             AND u.primary_organization_id = $1
             AND p.status <> 'completed'`,
          [row.rows[0].organization_id],
        );
        logger.info({ sub: invoiceSubId }, "Subscription activated after payment_succeeded");
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as unknown as InvoiceSubscriptionReference;
        const failedSubId = getInvoiceSubscriptionId(invoice);
        if (!failedSubId) break;
        if (invoice.billing_reason === "subscription_update") {
          logger.info(
            { sub: failedSubId },
            "Ignoring failed subscription update invoice; existing subscription entitlements remain unchanged",
          );
          break;
        }
        await suspendSubscriptionByStripeSubId(failedSubId);
        logger.info({ sub: failedSubId }, "Subscription suspended after payment_failed");
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const target = await findCurrentPaymentFailureTarget(paymentIntent);
        if (!target) {
          logger.info(
            { paymentIntent: paymentIntent.id },
            "Ignoring payment_failed without the current checkout attempt",
          );
          break;
        }

        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const result = await client.query(
            `UPDATE subscriptions
             SET status = 'suspended', updated_at = NOW()
             WHERE organization_id = $1
               AND stripe_subscription_id = $2
               AND status = 'trial'`,
            [target.organization_id, target.stripe_subscription_id],
          );
          if (result.rowCount) {
            await client.query(
              `UPDATE stripe_checkout_attempts
               SET status = 'failed', updated_at = NOW()
               WHERE id = $1 AND status = 'completed'`,
              [target.attempt_id],
            );
          }
          await client.query("COMMIT");
          logger.info(
            {
              paymentIntent: paymentIntent.id,
              subscription: target.stripe_subscription_id,
              suspendedCount: result.rowCount ?? 0,
            },
            "Subscription suspended after payment_intent.payment_failed",
          );
        } catch (err) {
          await client.query("ROLLBACK");
          throw err;
        } finally {
          client.release();
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = getStripeObjectId(sub.customer);
        if (!customerId) break;
        const row = await pool.query<{ organization_id: number }>(
          "SELECT organization_id FROM subscriptions WHERE stripe_subscription_id = $1 LIMIT 1",
          [sub.id],
        );
        if (!row.rows[0]) break;

        await syncCurrentSubscriptionFromStripe({
          orgId: row.rows[0].organization_id,
          stripeCustomerId: customerId,
          stripeSubscriptionId: sub.id,
          status: sub.status,
          maxUsers: (() => {
            const baseMaxUsers = Number(sub.metadata?.cocciBaseMaxUsers);
            const additionalUserPriceId = process.env.STRIPE_ADDITIONAL_USER_PRICE_ID?.trim();
            if (
              !Number.isInteger(baseMaxUsers) ||
              baseMaxUsers < 1 ||
              !additionalUserPriceId ||
              sub.metadata?.cocciBaseMaxUsers == null
            ) {
              return null;
            }
            const quantity = (sub.items?.data ?? [])
              .filter((item) => item.price.id === additionalUserPriceId)
              .reduce((total, item) => total + (item.quantity ?? 0), 0);
            return baseMaxUsers + quantity;
          })(),
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await suspendSubscriptionByStripeSubId(sub.id);
        logger.info({ subId: sub.id }, "Subscription cancelled");
        break;
      }

      default:
        break;
    }
  } catch (err) {
    logger.error({ err, eventType: event.type }, "Error handling Stripe event");
    throw err;
  }
}