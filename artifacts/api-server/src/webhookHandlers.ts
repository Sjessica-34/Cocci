import Stripe from "stripe";
import { pool } from "@workspace/db";
import { getStripeWebhookSecret, getUncachableStripeClient } from "./stripeClient";
import { logger } from "./lib/logger";
import { sendSubscriptionConfirmation } from "./lib/email";
import { getPublicAppUrl } from "./appUrl";

// ── Mise à jour de la table subscriptions selon les événements Stripe ─────────

async function upsertSubscriptionFromStripe(opts: {
  orgId: number;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string; // Stripe status: active | past_due | canceled | etc.
}): Promise<void> {
  const { orgId, stripeCustomerId, stripeSubscriptionId, status } = opts;

  // Mapper le statut Stripe vers notre statut interne
  const internalStatus =
    status === "active" || status === "trialing" ? "active"
    : status === "past_due" ? "trial" // grâce de paiement
    : "suspended";

  await pool.query(
    `INSERT INTO subscriptions
       (organization_id, mode, status, stripe_customer_id, stripe_subscription_id, start_at, updated_at)
     VALUES ($1, 'stripe', $2, $3, $4, NOW(), NOW())
     ON CONFLICT (organization_id)
     DO UPDATE SET
       mode = 'stripe',
       status = $2,
       stripe_customer_id = $3,
       stripe_subscription_id = $4,
       updated_at = NOW()`,
    [orgId, internalStatus, stripeCustomerId, stripeSubscriptionId],
  );
}

async function suspendSubscriptionByStripeSubId(stripeSubscriptionId: string): Promise<void> {
  await pool.query(
    `UPDATE subscriptions SET status = 'suspended', updated_at = NOW()
     WHERE stripe_subscription_id = $1`,
    [stripeSubscriptionId],
  );
}

// ── Handler principal ─────────────────────────────────────────────────────────

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
        "Ensure the webhook route is registered BEFORE app.use(express.json()).",
      );
    }

    // Vérifier la signature une seule fois avec le secret explicite de
    // l'environnement. Tout échec lève → non-2xx → retry Stripe.
    const stripe = getUncachableStripeClient();
    const webhookSecret = getStripeWebhookSecret();
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    // Logique métier locale — toute erreur persistante lève → retry Stripe.
    await handleStripeEvent(event);
  }
}

/**
 * Logique métier pure (événement déjà vérifié) — exportée pour les tests d'intégration.
 * Les erreurs (DB, etc.) sont relancées : la route webhook répond alors non-2xx
 * et Stripe réessaie l'événement. Seul l'envoi d'email est isolé (catch interne).
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const orgId = session.metadata?.orgId ? parseInt(session.metadata.orgId) : null;
          if (!orgId || !session.customer || !session.subscription) break;

          // SEPA Direct Debit : payment_status = "unpaid" en attente de confirmation bancaire.
          // On laisse l'accès (status "trial") jusqu'à validation par invoice.payment_succeeded.
          // Paiement carte immédiat : payment_status = "paid" → active directement.
          const internalStatus = session.payment_status === "paid" ? "active" : "trial";

          // Formule sélectionnée pendant l'onboarding (transmise via metadata)
          const offerName = session.metadata?.offerName ?? null;
          const maxEmployees = session.metadata?.maxEmployees
            ? parseInt(session.metadata.maxEmployees)
            : null;

          await pool.query(
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
            [orgId, internalStatus, session.customer as string, session.subscription as string,
             offerName, maxEmployees],
          );
          logger.info({ orgId, paymentStatus: session.payment_status, internalStatus },
            "Subscription upserted after checkout");

          // Envoyer l'email de confirmation à l'admin de l'organisation
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
            // Ne pas faire échouer le webhook si l'email plante
            logger.error({ emailErr, orgId }, "Failed to send subscription confirmation email");
          }

          break;
        }

        // SEPA confirmé : la banque a débité → activer l'abonnement
        case "invoice.payment_succeeded": {
          const invoice = event.data.object as Stripe.Invoice & { subscription?: string | { id: string } | null };
          const invoiceSubId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
          if (!invoiceSubId) break;
          const row = await pool.query<{ organization_id: number }>(
            "SELECT organization_id FROM subscriptions WHERE stripe_subscription_id = $1 LIMIT 1",
            [invoiceSubId],
          );
          if (!row.rows[0]) break;
          await pool.query(
            `UPDATE subscriptions SET status = 'active', updated_at = NOW()
             WHERE organization_id = $1 AND status = 'trial'`,
            [row.rows[0].organization_id],
          );
          logger.info({ sub: invoiceSubId }, "Subscription activated after payment_succeeded");
          break;
        }

        // SEPA échoué ou carte refusée → bloquer l'accès
        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice & { subscription?: string | { id: string } | null };
          const failedSubId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
          if (!failedSubId) break;
          await pool.query(
            `UPDATE subscriptions SET status = 'suspended', updated_at = NOW()
             WHERE stripe_subscription_id = $1`,
            [failedSubId],
          );
          logger.info({ sub: failedSubId }, "Subscription suspended after payment_failed");
          break;
        }

        case "customer.subscription.updated": {
          const sub = event.data.object as Stripe.Subscription;
          // Retrouver l'org depuis stripe_subscription_id
          const row = await pool.query<{ organization_id: number }>(
            "SELECT organization_id FROM subscriptions WHERE stripe_subscription_id = $1 LIMIT 1",
            [sub.id],
          );
          if (!row.rows[0]) break;

          await upsertSubscriptionFromStripe({
            orgId: row.rows[0].organization_id,
            stripeCustomerId: sub.customer as string,
            stripeSubscriptionId: sub.id,
            status: sub.status,
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
      throw err; // → non-2xx → retry Stripe
    }
}
