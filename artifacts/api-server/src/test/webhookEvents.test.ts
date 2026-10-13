/**
 * Test d'intégration des événements Stripe métier (webhookHandlers.handleStripeEvent).
 *
 * Vérifie :
 *   - un Checkout SEPA complété crée trial puis invoice.payment_succeeded active ;
 *   - un Checkout abandonné ne change pas suspended ;
 *   - deux Checkouts successifs rendent le plus ancien inexploitable ;
 *   - seuls le Checkout et le PaymentIntent de la tentative courante modifient l'état ;
 *   - customer.subscription.updated ne promeut jamais trial ou suspended ;
 *   - un ancien événement rejoué est ignoré.
 *
 * Usage : pnpm --filter @workspace/api-server exec tsx src/test/webhookEvents.test.ts
 */
import { pool } from "@workspace/db";
import type Stripe from "stripe";
import {
  attachStripeCheckoutSession,
  createPendingCheckoutAttempt,
} from "../stripeCheckoutAttempts";
import { getInvoiceSubscriptionId, handleStripeEvent } from "../webhookHandlers";

let failures = 0;
function assert(cond: boolean, label: string): void {
  if (cond) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.error(`  ✗ ${label}`);
  }
}

function makeEvent(type: string, object: object): Stripe.Event {
  return { id: `evt_test_${type}`, type, data: { object } } as unknown as Stripe.Event;
}

function makeCheckoutSession(opts: {
  orgId: number;
  attemptId: string;
  sessionId: string;
  customerId: string;
  subscriptionId: string;
  paymentIntentId: string;
  paymentStatus: "paid" | "unpaid";
}): Stripe.Checkout.Session {
  return {
    id: opts.sessionId,
    customer: opts.customerId,
    subscription: opts.subscriptionId,
    payment_intent: opts.paymentIntentId,
    payment_status: opts.paymentStatus,
    metadata: {
      orgId: String(opts.orgId),
      checkoutAttemptId: opts.attemptId,
      offerName: "Cocci — 1 à 5 salariés",
      maxEmployees: "5",
    },
  } as unknown as Stripe.Checkout.Session;
}

async function getSub(orgId: number) {
  const r = await pool.query(
    `SELECT mode, status, offer_name, max_employees, stripe_customer_id, stripe_subscription_id
     FROM subscriptions
     WHERE organization_id = $1`,
    [orgId],
  );
  return r.rows[0] ?? null;
}

async function getAttempt(attemptId: string) {
  const r = await pool.query(
    `SELECT status, stripe_checkout_session_id, stripe_subscription_id, stripe_payment_intent_id
     FROM stripe_checkout_attempts
     WHERE id = $1`,
    [attemptId],
  );
  return r.rows[0] ?? null;
}

async function main() {
  assert(
    getInvoiceSubscriptionId({ subscription: "sub_legacy" }) === "sub_legacy",
    "invoice.subscription reste compatible",
  );
  assert(
    getInvoiceSubscriptionId({
      parent: { subscription_details: { subscription: "sub_nested" } },
    }) === "sub_nested",
    "invoice.parent.subscription_details.subscription est supporté",
  );

  const org = await pool.query<{ id: number }>(
    "INSERT INTO organizations (name) VALUES ('__test_webhook_attempts_org__') RETURNING id",
  );
  const orgId = org.rows[0].id;
  const user = await pool.query<{ id: number }>(
    `INSERT INTO users (clerk_id, email, primary_organization_id)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [`__test_webhook_attempts_clerk_${orgId}`, `__test_webhook_attempts_${orgId}@example.test`, orgId],
  );
  const userId = user.rows[0].id;
  await pool.query(
    `INSERT INTO onboarding_progress (user_id, status)
     VALUES ($1, 'payment_pending')`,
    [userId],
  );

  const customerId = "cus_test_attempts";
  const initialSubscriptionId = "sub_test_attempt_initial";
  const initialPaymentIntentId = "pi_test_attempt_initial";
  const previousAdditionalUserPriceId = process.env.STRIPE_ADDITIONAL_USER_PRICE_ID;

  try {
    // 1. Première tentative SEPA : Checkout unpaid → trial.
    const initialAttemptId = await createPendingCheckoutAttempt({
      organizationId: orgId,
      stripeCustomerId: customerId,
    });
    await attachStripeCheckoutSession({
      attemptId: initialAttemptId,
      stripeCheckoutSessionId: "cs_test_initial",
      stripeSubscriptionId: initialSubscriptionId,
      stripePaymentIntentId: initialPaymentIntentId,
    });
    await handleStripeEvent(makeEvent("checkout.session.completed", makeCheckoutSession({
      orgId,
      attemptId: initialAttemptId,
      sessionId: "cs_test_initial",
      customerId,
      subscriptionId: initialSubscriptionId,
      paymentIntentId: initialPaymentIntentId,
      paymentStatus: "unpaid",
    })));
    let sub = await getSub(orgId);
    assert(sub?.status === "trial", "Checkout unpaid courant → trial");
    assert(sub?.stripe_subscription_id === initialSubscriptionId, "souscription courante enregistrée");
    assert((await getAttempt(initialAttemptId))?.status === "completed", "tentative initiale consommée");

    // 2. SEPA confirmé : seul invoice.payment_succeeded fait trial → active.
    await handleStripeEvent(makeEvent("invoice.payment_succeeded", {
      parent: { subscription_details: { subscription: initialSubscriptionId } },
    }));
    sub = await getSub(orgId);
    assert(sub?.status === "active", "trial → active après invoice.payment_succeeded");
    const onboarding = await pool.query<{ status: string; completed_at: Date | null }>(
      "SELECT status, completed_at FROM onboarding_progress WHERE user_id = $1",
      [userId],
    );
    assert(onboarding.rows[0]?.status === "completed", "onboarding complété après paiement");

    // L'ancien paiement échoue ensuite : la souscription courante devient suspended.
    await pool.query(
      "UPDATE subscriptions SET status = 'trial' WHERE organization_id = $1",
      [orgId],
    );
    await handleStripeEvent(makeEvent("invoice.payment_failed", {
      subscription: initialSubscriptionId,
    }));
    sub = await getSub(orgId);
    assert(sub?.status === "suspended", "échec de la tentative initiale → suspended");

    // 3. Checkout abandonné : création de tentative, aucun changement d'accès.
    const abandonedAttemptId = await createPendingCheckoutAttempt({
      organizationId: orgId,
      stripeCustomerId: customerId,
    });
    await attachStripeCheckoutSession({
      attemptId: abandonedAttemptId,
      stripeCheckoutSessionId: "cs_test_abandoned",
    });
    sub = await getSub(orgId);
    assert(sub?.status === "suspended", "Checkout créé mais abandonné → reste suspended");

    // 4. Deux Checkouts successifs : seul le plus récent est exploitable.
    const firstRetryAttemptId = await createPendingCheckoutAttempt({
      organizationId: orgId,
      stripeCustomerId: customerId,
    });
    await attachStripeCheckoutSession({
      attemptId: firstRetryAttemptId,
      stripeCheckoutSessionId: "cs_test_retry_old",
    });
    const currentRetryAttemptId = await createPendingCheckoutAttempt({
      organizationId: orgId,
      stripeCustomerId: customerId,
    });
    const retrySubscriptionId = "sub_test_attempt_retry";
    const retryPaymentIntentId = "pi_test_attempt_retry";
    await attachStripeCheckoutSession({
      attemptId: currentRetryAttemptId,
      stripeCheckoutSessionId: "cs_test_retry_current",
      stripeSubscriptionId: retrySubscriptionId,
      stripePaymentIntentId: retryPaymentIntentId,
    });
    assert(
      (await getAttempt(firstRetryAttemptId))?.status === "superseded",
      "ancienne tentative superseded après un nouveau Checkout",
    );

    await handleStripeEvent(makeEvent("checkout.session.completed", makeCheckoutSession({
      orgId,
      attemptId: firstRetryAttemptId,
      sessionId: "cs_test_retry_old",
      customerId,
      subscriptionId: "sub_test_attempt_old_retry",
      paymentIntentId: "pi_test_attempt_old_retry",
      paymentStatus: "unpaid",
    })));
    sub = await getSub(orgId);
    assert(sub?.status === "suspended", "ancien Checkout complété après supersession → aucun changement");

    // 5. Nouvelle tentative réellement complétée : suspended → trial.
    await handleStripeEvent(makeEvent("checkout.session.completed", makeCheckoutSession({
      orgId,
      attemptId: currentRetryAttemptId,
      sessionId: "cs_test_retry_current",
      customerId,
      subscriptionId: retrySubscriptionId,
      paymentIntentId: retryPaymentIntentId,
      paymentStatus: "unpaid",
    })));
    sub = await getSub(orgId);
    assert(sub?.status === "trial", "nouveau Checkout SEPA complété → suspended → trial");
    assert(sub?.stripe_subscription_id === retrySubscriptionId, "nouvelle souscription devenue courante");

    // customer.subscription.updated ne promeut pas trial → active.
    await handleStripeEvent(makeEvent("customer.subscription.updated", {
      id: retrySubscriptionId,
      customer: customerId,
      status: "active",
    }));
    sub = await getSub(orgId);
    assert(sub?.status === "trial", "customer.subscription.updated ne fait pas trial → active");

    // 6. Nouvel échec PaymentIntent : seule la tentative courante est suspendue.
    await handleStripeEvent(makeEvent("payment_intent.payment_failed", {
      id: retryPaymentIntentId,
      customer: customerId,
      status: "requires_payment_method",
    }));
    sub = await getSub(orgId);
    assert(sub?.status === "suspended", "nouveau PaymentIntent échoué → suspended");

    // Un ancien Checkout rejoué et une ancienne mise à jour ne changent rien.
    await handleStripeEvent(makeEvent("checkout.session.completed", makeCheckoutSession({
      orgId,
      attemptId: currentRetryAttemptId,
      sessionId: "cs_test_retry_current",
      customerId,
      subscriptionId: retrySubscriptionId,
      paymentIntentId: retryPaymentIntentId,
      paymentStatus: "unpaid",
    })));
    await handleStripeEvent(makeEvent("customer.subscription.updated", {
      id: retrySubscriptionId,
      customer: customerId,
      status: "active",
    }));
    sub = await getSub(orgId);
    assert(sub?.status === "suspended", "anciens événements après échec → aucun changement");

    // 7. Une troisième tentative devient trial ; l'ancien PaymentIntent ne la suspend pas.
    const thirdAttemptId = await createPendingCheckoutAttempt({
      organizationId: orgId,
      stripeCustomerId: customerId,
    });
    const thirdSubscriptionId = "sub_test_attempt_third";
    const thirdPaymentIntentId = "pi_test_attempt_third";
    await attachStripeCheckoutSession({
      attemptId: thirdAttemptId,
      stripeCheckoutSessionId: "cs_test_third",
      stripeSubscriptionId: thirdSubscriptionId,
      stripePaymentIntentId: thirdPaymentIntentId,
    });
    await handleStripeEvent(makeEvent("checkout.session.completed", makeCheckoutSession({
      orgId,
      attemptId: thirdAttemptId,
      sessionId: "cs_test_third",
      customerId,
      subscriptionId: thirdSubscriptionId,
      paymentIntentId: thirdPaymentIntentId,
      paymentStatus: "unpaid",
    })));
    await handleStripeEvent(makeEvent("payment_intent.payment_failed", {
      id: retryPaymentIntentId,
      customer: customerId,
      status: "requires_payment_method",
    }));
    sub = await getSub(orgId);
    assert(sub?.status === "trial", "ancien PaymentIntent ne suspend pas la nouvelle tentative");

    // La nouvelle tentative échoue réellement, puis une tentative suivante réussit.
    await handleStripeEvent(makeEvent("payment_intent.payment_failed", {
      id: thirdPaymentIntentId,
      customer: customerId,
      status: "requires_payment_method",
    }));
    sub = await getSub(orgId);
    assert(sub?.status === "suspended", "échec de la nouvelle tentative courante → suspended");

    const successfulAttemptId = await createPendingCheckoutAttempt({
      organizationId: orgId,
      stripeCustomerId: customerId,
    });
    const successfulSubscriptionId = "sub_test_attempt_success";
    await attachStripeCheckoutSession({
      attemptId: successfulAttemptId,
      stripeCheckoutSessionId: "cs_test_success",
      stripeSubscriptionId: successfulSubscriptionId,
      stripePaymentIntentId: "pi_test_attempt_success",
    });
    await handleStripeEvent(makeEvent("checkout.session.completed", makeCheckoutSession({
      orgId,
      attemptId: successfulAttemptId,
      sessionId: "cs_test_success",
      customerId,
      subscriptionId: successfulSubscriptionId,
      paymentIntentId: "pi_test_attempt_success",
      paymentStatus: "unpaid",
    })));
    await handleStripeEvent(makeEvent("invoice.payment_succeeded", {
      subscription: successfulSubscriptionId,
    }));
    sub = await getSub(orgId);
    assert(sub?.status === "active", "nouvelle tentative réussie → active");

    // La quantité réellement présente sur l'abonnement Stripe est la source de
    // vérité de la limite locale, et rejouer un webhook ne double pas le quota.
    process.env.STRIPE_ADDITIONAL_USER_PRICE_ID = "price_test_additional_user";
    const subscriptionUpdated = (quantity: number) => makeEvent("customer.subscription.updated", {
      id: successfulSubscriptionId,
      customer: customerId,
      status: "active",
      metadata: { cocciBaseMaxUsers: "8" },
      items: {
        data: quantity === 0
          ? []
          : [{
              id: "si_test_additional_user",
              price: { id: "price_test_additional_user" },
              quantity,
            }],
      },
    });

    await handleStripeEvent(subscriptionUpdated(2));
    let seatLimit = await pool.query<{ max_users: number }>(
      "SELECT max_users FROM subscriptions WHERE organization_id = $1",
      [orgId],
    );
    assert(Number(seatLimit.rows[0]?.max_users) === 10, "quantité Stripe 2 → limite de 10 utilisateurs");

    await handleStripeEvent(subscriptionUpdated(2));
    seatLimit = await pool.query<{ max_users: number }>(
      "SELECT max_users FROM subscriptions WHERE organization_id = $1",
      [orgId],
    );
    assert(Number(seatLimit.rows[0]?.max_users) === 10, "webhook rejoué → aucun siège en doublon");

    await handleStripeEvent(subscriptionUpdated(4));
    seatLimit = await pool.query<{ max_users: number }>(
      "SELECT max_users FROM subscriptions WHERE organization_id = $1",
      [orgId],
    );
    assert(Number(seatLimit.rows[0]?.max_users) === 12, "changement Stripe de quantité 2 → 4 synchronisé");

    await handleStripeEvent(subscriptionUpdated(0));
    seatLimit = await pool.query<{ max_users: number }>(
      "SELECT max_users FROM subscriptions WHERE organization_id = $1",
      [orgId],
    );
    assert(Number(seatLimit.rows[0]?.max_users) === 8, "suppression du complément Stripe → limite de base");

    await handleStripeEvent(makeEvent("invoice.payment_failed", {
      subscription: successfulSubscriptionId,
      billing_reason: "subscription_update",
    }));
    sub = await getSub(orgId);
    seatLimit = await pool.query<{ max_users: number }>(
      "SELECT max_users FROM subscriptions WHERE organization_id = $1",
      [orgId],
    );
    assert(sub?.status === "active", "facture d'ajustement refusée → abonnement de base conservé");
    assert(Number(seatLimit.rows[0]?.max_users) === 8, "facture d'ajustement refusée → siège non accordé");
  } finally {
    if (previousAdditionalUserPriceId === undefined) {
      delete process.env.STRIPE_ADDITIONAL_USER_PRICE_ID;
    } else {
      process.env.STRIPE_ADDITIONAL_USER_PRICE_ID = previousAdditionalUserPriceId;
    }
    await pool.query("DELETE FROM stripe_checkout_attempts WHERE organization_id = $1", [orgId]);
    await pool.query("DELETE FROM subscriptions WHERE organization_id = $1", [orgId]);
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    await pool.query("DELETE FROM organizations WHERE id = $1", [orgId]);
    await pool.end();
  }

  if (failures > 0) {
    console.error(`\n${failures} assertion(s) en échec`);
    process.exit(1);
  }
  console.log("\n✅ Tous les tests webhook passent");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});