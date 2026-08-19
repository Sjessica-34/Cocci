/**
 * Test d'intégration de POST /api/stripe/webhook sans compte Stripe.
 *
 * Démarre l'application sur un port local éphémère, signe des événements avec
 * STRIPE_WEBHOOK_SECRET et vérifie :
 *   1. une signature valide → 200 + abonnement local mis à jour
 *   2. une signature invalide → 400 afin que Stripe réessaie
 *   3. une erreur métier/DB → 500 afin que Stripe réessaie
 *   4. un secret webhook absent → 500 (configuration serveur invalide)
 *
 * Usage : pnpm --filter @workspace/api-server exec tsx src/test/webhookRoute.test.ts
 */
import type { Server } from "node:http";
import Stripe from "stripe";
import { pool } from "@workspace/db";

let failures = 0;
function assert(cond: boolean, label: string): void {
  if (cond) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.error(`  ✗ ${label}`);
  }
}

function signedRequest(
  webhookUrl: string,
  payload: string,
  secret: string,
): Promise<Response> {
  const stripe = new Stripe("sk_test_local_webhook");
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
  });
  return fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": signature,
    },
    body: payload,
  });
}

async function startTestServer(): Promise<Server> {
  const { default: app } = await import("../app");
  return new Promise<Server>((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
    server.once("error", reject);
  });
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

async function main() {
  const previousStripeKey = process.env.STRIPE_SECRET_KEY;
  const previousWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const webhookSecret = "whsec_local_route_test";
  process.env.STRIPE_SECRET_KEY = "sk_test_local_webhook";
  process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;

  const server = await startTestServer();
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Impossible de déterminer le port du serveur de test");
  }
  const webhookUrl = `http://127.0.0.1:${address.port}/api/stripe/webhook`;

  const org = await pool.query<{ id: number }>(
    "INSERT INTO organizations (name) VALUES ('__test_webhook_route_org__') RETURNING id",
  );
  const orgId = org.rows[0].id;
  const subId = "sub_test_route_1";

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
        id: "cs_test_local_route_1",
        object: "checkout.session",
        customer: "cus_test_route_1",
        subscription: subId,
        payment_status: "paid",
        mode: "subscription",
        status: "complete",
        metadata: {
          orgId: String(orgId),
          offerName: "Cocci — 1 à 5 salariés",
          maxEmployees: "5",
        },
      },
    },
  };
  const payload = JSON.stringify(event);

  try {
    console.log("Événement signé avec STRIPE_WEBHOOK_SECRET");
    const okResp = await signedRequest(webhookUrl, payload, webhookSecret);
    assert(okResp.status === 200, `route répond 200 (reçu ${okResp.status})`);

    const sub = await pool.query(
      "SELECT mode, status, offer_name, max_employees FROM subscriptions WHERE organization_id = $1",
      [orgId],
    );
    assert(sub.rows[0]?.mode === "stripe", "abonnement mode = stripe");
    assert(
      sub.rows[0]?.status === "active",
      "abonnement actif après checkout payé",
    );
    assert(
      sub.rows[0]?.offer_name === "Cocci — 1 à 5 salariés",
      "formule enregistrée",
    );
    assert(sub.rows[0]?.max_employees === 5, "plafond d'effectif enregistré");

    console.log("Événement signé avec un mauvais secret");
    const badResp = await signedRequest(webhookUrl, payload, "whsec_wrong");
    assert(
      badResp.status === 400,
      `signature invalide rejetée en 400 (reçu ${badResp.status})`,
    );

    console.log("Événement valide mais échec d'écriture DB");
    const dbErrorEvent = {
      ...event,
      id: "evt_test_route_2",
      data: {
        object: {
          ...event.data.object,
          metadata: { orgId: "999999999" },
        },
      },
    };
    const dbErrorPayload = JSON.stringify(dbErrorEvent);
    const dbErrorResp = await signedRequest(
      webhookUrl,
      dbErrorPayload,
      webhookSecret,
    );
    assert(
      dbErrorResp.status === 500,
      `échec DB renvoyé en 500 (reçu ${dbErrorResp.status})`,
    );

    console.log("Événement reçu sans STRIPE_WEBHOOK_SECRET configuré");
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const noSecretResp = await signedRequest(
      webhookUrl,
      payload,
      webhookSecret,
    );
    assert(
      noSecretResp.status === 500,
      `secret absent renvoyé en 500 (reçu ${noSecretResp.status})`,
    );
  } finally {
    if (previousStripeKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousStripeKey;
    if (previousWebhookSecret === undefined)
      delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previousWebhookSecret;

    await pool.query("DELETE FROM subscriptions WHERE organization_id = $1", [
      orgId,
    ]);
    await pool.query("DELETE FROM organizations WHERE id = $1", [orgId]);
    await closeServer(server);
    await pool.end();
  }

  if (failures > 0) {
    console.error(`\n${failures} assertion(s) en échec`);
    process.exit(1);
  }
  console.log("\n✅ Test de la route webhook OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});