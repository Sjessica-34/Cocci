/**
 * Test de bout en bout de la route POST /api/stripe/webhook.
 *
 * Envoie un événement checkout.session.completed SIGNÉ au serveur en cours
 * d'exécution, avec une ligne leurre supplémentaire dans stripe._managed_webhooks
 * (autre compte / autre URL), et vérifie :
 *   1. la résolution déterministe du secret (leurres ignorés) → 200 + abonnement actif en DB
 *   2. une signature invalide → réponse non-2xx (Stripe réessaie)
 *
 * Usage : depuis scripts/ → pnpm exec tsx ../artifacts/api-server/src/test/webhookRoute.test.ts
 */
import Stripe from "stripe";
import { pool } from "@workspace/db";
import { getUncachableStripeClient } from "../stripeClient";

let failures = 0;
function assert(cond: boolean, label: string): void {
  if (cond) console.log(`  ✓ ${label}`);
  else { failures++; console.error(`  ✗ ${label}`); }
}

async function main() {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  if (!domain) throw new Error("REPLIT_DOMAINS manquant");
  const webhookUrl = `https://${domain}/api/stripe/webhook`;

  // Secret réel de l'endpoint configuré
  const secretRow = await pool.query<{ secret: string }>(
    "SELECT secret FROM stripe._managed_webhooks WHERE url = $1 ORDER BY created DESC LIMIT 1",
    [webhookUrl],
  );
  const realSecret = secretRow.rows[0]?.secret;
  if (!realSecret) throw new Error(`Aucun webhook géré pour ${webhookUrl}`);

  // Ligne leurre : ANCIEN endpoint du MÊME compte Stripe (cas réel après
  // changement de domaine) avec un secret différent. La résolution par URL doit
  // l'ignorer, et le sync ne doit plus faire de LIMIT 1 ambigu par compte.
  const accountRow = await pool.query<{ account_id: string }>(
    "SELECT account_id FROM stripe._managed_webhooks WHERE url = $1 LIMIT 1",
    [webhookUrl],
  );
  const realAccountId = accountRow.rows[0].account_id;
  const decoyId = "we_test_decoy_1";
  await pool.query(
    `INSERT INTO stripe._managed_webhooks
       (id, object, url, enabled_events, enabled, livemode, secret, status, created, account_id)
     VALUES ($1, 'webhook_endpoint', 'https://old-domain.example.com/api/stripe/webhook',
             '["*"]'::jsonb, true, false, 'whsec_decoy_secret', 'enabled',
             extract(epoch FROM now())::bigint - 86400, $2)
     ON CONFLICT (id) DO NOTHING`,
    [decoyId, realAccountId],
  );

  const org = await pool.query<{ id: number }>(
    "INSERT INTO organizations (name) VALUES ('__test_webhook_route_org__') RETURNING id",
  );
  const orgId = org.rows[0].id;
  const subId = "sub_test_route_1";

  // Le sync stripe-replit-sync re-fetch la session depuis l'API Stripe → il faut
  // une vraie session (mode test). On en crée une avec un prix actif du catalogue.
  const stripeApi = await getUncachableStripeClient();
  const priceRow = await pool.query<{ id: string }>(
    "SELECT id FROM stripe.prices WHERE active = true LIMIT 1",
  );
  if (!priceRow.rows[0]) throw new Error("Aucun prix actif dans stripe.prices");
  const realSession = await stripeApi.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceRow.rows[0].id, quantity: 1 }],
    success_url: "https://example.com/ok",
    cancel_url: "https://example.com/ko",
    metadata: { orgId: String(orgId) },
  });
  const sessionId = realSession.id;

  try {
    const event = {
      id: "evt_test_route_1",
      object: "event",
      api_version: "2025-06-30",
      created: Math.floor(Date.now() / 1000),
      type: "checkout.session.completed",
      livemode: false,
      pending_webhooks: 0,
      request: { id: null, idempotency_key: null },
      data: {
        object: {
          id: sessionId,
          object: "checkout.session",
          customer: "cus_test_route_1",
          subscription: subId,
          payment_status: "paid",
          mode: "subscription",
          status: "complete",
          metadata: { orgId: String(orgId), offerName: "Cocci — 1 à 5 salariés", maxEmployees: "5" },
        },
      },
    };
    const payload = JSON.stringify(event);
    const stripe = new Stripe("sk_test_dummy");

    // 1. Signature valide (secret réel) malgré la ligne leurre
    console.log("Événement signé avec le secret de l'endpoint configuré");
    const goodSig = stripe.webhooks.generateTestHeaderString({ payload, secret: realSecret });
    const okResp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": goodSig },
      body: payload,
    });
    assert(okResp.status === 200, `route répond 200 (reçu ${okResp.status})`);

    const sub = await pool.query(
      "SELECT mode, status, offer_name, max_employees FROM subscriptions WHERE organization_id = $1",
      [orgId],
    );
    assert(sub.rows[0]?.mode === "stripe", "abonnement mode = stripe");
    assert(sub.rows[0]?.status === "active", "abonnement actif après checkout payé");
    assert(sub.rows[0]?.offer_name === "Cocci — 1 à 5 salariés", "formule enregistrée");
    assert(sub.rows[0]?.max_employees === 5, "plafond d'effectif enregistré");

    // 2. Signature invalide (ex. secret de l'ancien endpoint) → non-2xx (retry Stripe)
    console.log("Événement signé avec le secret de l'ancien endpoint (leurre)");
    const badSig = stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_decoy_secret" });
    const badResp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": badSig },
      body: payload,
    });
    assert(badResp.status >= 400, `signature du mauvais endpoint rejetée en non-2xx (reçu ${badResp.status})`);

    // 3. Erreur DB persistante (org inexistante → violation FK) → non-2xx (retry Stripe)
    console.log("Événement valide mais échec d'écriture DB (org inexistante)");
    const dbErrorEvent = { ...event, id: "evt_test_route_2", data: { object: { ...event.data.object, metadata: { orgId: "999999999" } } } };
    const dbErrorPayload = JSON.stringify(dbErrorEvent);
    const dbErrorSig = stripe.webhooks.generateTestHeaderString({ payload: dbErrorPayload, secret: realSecret });
    const dbErrorResp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": dbErrorSig },
      body: dbErrorPayload,
    });
    assert(dbErrorResp.status >= 400, `échec DB renvoyé en non-2xx pour retry Stripe (reçu ${dbErrorResp.status})`);
  } finally {
    await stripeApi.checkout.sessions.expire(sessionId).catch(() => {});
    await pool.query("DELETE FROM stripe._managed_webhooks WHERE id = $1", [decoyId]);
    await pool.query("DELETE FROM stripe.accounts WHERE id = 'acct_decoy'").catch(() => {});
    await pool.query("DELETE FROM stripe.checkout_sessions WHERE id = $1", [sessionId]).catch(() => {});
    await pool.query("DELETE FROM subscriptions WHERE organization_id = $1", [orgId]);
    await pool.query("DELETE FROM organizations WHERE id = $1", [orgId]);
    await pool.end();
  }

  if (failures > 0) { console.error(`\n${failures} assertion(s) en échec`); process.exit(1); }
  console.log("\n✅ Test de la route webhook OK");
}

main().catch((err) => { console.error(err); process.exit(1); });
