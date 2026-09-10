/**
 * Test d'intégration des événements Stripe métier (webhookHandlers.handleStripeEvent).
 *
 * Vérifie sur une organisation temporaire :
 *   1. checkout.session.completed (paid)   → abonnement actif + formule/plafond enregistrés
 *   2. checkout.session.completed (unpaid) → statut "trial" (SEPA en attente)
 *   3. invoice.payment_succeeded           → trial → active
 *   4. invoice.payment_failed              → suspended
 *   5. customer.subscription.deleted       → suspended
 *
 * Usage : pnpm --filter @workspace/api-server exec tsx src/test/webhookEvents.test.ts
 */
import { pool } from "@workspace/db";
import type Stripe from "stripe";
import { getInvoiceSubscriptionId, handleStripeEvent } from "../webhookHandlers";

let failures = 0;
function assert(cond: boolean, label: string): void {
  if (cond) console.log(`  ✓ ${label}`);
  else { failures++; console.error(`  ✗ ${label}`); }
}

function makeEvent(type: string, object: object): Stripe.Event {
  return { id: "evt_test", type, data: { object } } as unknown as Stripe.Event;
}

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

async function getSub(orgId: number) {
  const r = await pool.query(
    "SELECT mode, status, offer_name, max_employees, stripe_customer_id, stripe_subscription_id FROM subscriptions WHERE organization_id = $1",
    [orgId],
  );
  return r.rows[0] ?? null;
}

async function main() {
  const org = await pool.query<{ id: number }>(
    "INSERT INTO organizations (name) VALUES ('__test_webhook_org__') RETURNING id",
  );
  const orgId = org.rows[0].id;
  const user = await pool.query<{ id: number }>(
    `INSERT INTO users (clerk_id, email, primary_organization_id)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [`__test_webhook_clerk_${orgId}`, `__test_webhook_${orgId}@example.test`, orgId],
  );
  const userId = user.rows[0].id;
  await pool.query(
    `INSERT INTO onboarding_progress (user_id, status)
     VALUES ($1, 'payment_pending')`,
    [userId],
  );
  const subId = "sub_test_webhook_1";

  try {
    // 1. Checkout payé (carte) → actif + formule dérivée des metadata
    console.log("checkout.session.completed (paid)");
    await handleStripeEvent(makeEvent("checkout.session.completed", {
      customer: "cus_test_1",
      subscription: subId,
      payment_status: "paid",
      metadata: { orgId: String(orgId), offerName: "Cocci — 1 à 5 salariés", maxEmployees: "5", effectifKey: "1-5" },
    }));
    let sub = await getSub(orgId);
    assert(sub?.mode === "stripe", "mode = stripe");
    assert(sub?.status === "active", "status = active");
    assert(sub?.offer_name === "Cocci — 1 à 5 salariés", "offer_name enregistré");
    assert(sub?.max_employees === 5, "max_employees enregistré");
    assert(sub?.stripe_subscription_id === subId, "stripe_subscription_id enregistré");

    // 2. Checkout non payé (SEPA en attente) → trial
    await pool.query(
      "UPDATE onboarding_progress SET status = 'payment_pending', completed_at = NULL WHERE user_id = $1",
      [userId],
    );
    console.log("checkout.session.completed (unpaid / SEPA)");
    await handleStripeEvent(makeEvent("checkout.session.completed", {
      customer: "cus_test_1",
      subscription: subId,
      payment_status: "unpaid",
      metadata: { orgId: String(orgId) },
    }));
    sub = await getSub(orgId);
    assert(sub?.status === "trial", "status = trial en attente de paiement");
    assert(sub?.offer_name === "Cocci — 1 à 5 salariés", "offer_name conservé (COALESCE)");

    // 3. Paiement confirmé → active
    console.log("invoice.payment_succeeded");
    await handleStripeEvent(makeEvent("invoice.payment_succeeded", {
      parent: { subscription_details: { subscription: subId } },
    }));
    sub = await getSub(orgId);
    assert(sub?.status === "active", "trial → active après paiement");
    const onboarding = await pool.query<{ status: string; completed_at: Date | null }>(
      "SELECT status, completed_at FROM onboarding_progress WHERE user_id = $1",
      [userId],
    );
    assert(onboarding.rows[0]?.status === "completed", "payment_pending → completed après paiement");
    assert(onboarding.rows[0]?.completed_at != null, "completed_at est renseigné après paiement");

    // 4. Paiement échoué → suspended
    console.log("invoice.payment_failed");
    await handleStripeEvent(makeEvent("invoice.payment_failed", { subscription: subId }));
    sub = await getSub(orgId);
    assert(sub?.status === "suspended", "suspended après échec de paiement");

    // 5. PaymentIntent échoué depuis un abonnement trial → suspended
    await pool.query("UPDATE subscriptions SET status = 'trial' WHERE organization_id = $1", [orgId]);
    console.log("payment_intent.payment_failed");
    await handleStripeEvent(makeEvent("payment_intent.payment_failed", {
      customer: "cus_test_1",
      status: "requires_payment_method",
    }));
    sub = await getSub(orgId);
    assert(sub?.status === "suspended", "trial → suspended après payment_intent.payment_failed");

    // 6. Résiliation → suspended (après réactivation simulée)
    console.log("customer.subscription.deleted");
    await pool.query("UPDATE subscriptions SET status = 'active' WHERE organization_id = $1", [orgId]);
    await handleStripeEvent(makeEvent("customer.subscription.deleted", { id: subId, customer: "cus_test_1" }));
    sub = await getSub(orgId);
    assert(sub?.status === "suspended", "suspended après résiliation");
  } finally {
    await pool.query("DELETE FROM subscriptions WHERE organization_id = $1", [orgId]);
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    await pool.query("DELETE FROM organizations WHERE id = $1", [orgId]);
    await pool.end();
  }

  if (failures > 0) { console.error(`\n${failures} assertion(s) en échec`); process.exit(1); }
  console.log("\n✅ Tous les tests webhook passent");
}

main().catch((err) => { console.error(err); process.exit(1); });
