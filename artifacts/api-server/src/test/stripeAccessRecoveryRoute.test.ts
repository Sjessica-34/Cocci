import assert from "node:assert/strict";
import test from "node:test";
import express, { type RequestHandler } from "express";
import type { Server } from "node:http";
import type Stripe from "stripe";
import { pool } from "@workspace/db";
import { createSubscriptionStatusHandler } from "../routes/subscriptions";

type RecoveryCase = {
  name: string;
  outstandingInvoice?: boolean;
  unresolvedDispute?: boolean;
  expectedStatus: "active" | "suspended";
};

const recoveryCases: RecoveryCase[] = [
  {
    name: "réactive l’abonnement suspendu après paiement confirmé et contrôles positifs",
    expectedStatus: "active",
  },
  {
    name: "garde l’accès suspendu lorsqu’une autre facture de l’abonnement reste impayée",
    outstandingInvoice: true,
    expectedStatus: "suspended",
  },
  {
    name: "garde l’accès suspendu lorsqu’un litige SEPA reste ouvert",
    unresolvedDispute: true,
    expectedStatus: "suspended",
  },
];

for (const recoveryCase of recoveryCases) {
  test(`GET /organizations/:orgId/subscription ${recoveryCase.name}`, async () => {
    const originalQuery = pool.query;
    let updateCalls = 0;

    (pool as typeof pool & { query: typeof pool.query }).query = (async (
      query: unknown,
    ) => {
      const sql = String(query);
      if (sql.includes("COALESCE(parent_id, id)")) {
        return { rows: [{ billing_org_id: 741 }] } as never;
      }
      if (sql.includes("SELECT mode, status, offer_name")) {
        return {
          rows: [{
            mode: "stripe",
            status: "suspended",
            offer_name: "Test",
            stripe_customer_id: "cus_recovery_test",
            stripe_subscription_id: "sub_recovery_test",
          }],
        } as never;
      }
      if (sql.includes("SELECT mode, status, stripe_subscription_id")) {
        return {
          rows: [{
            mode: "stripe",
            status: "suspended",
            stripe_subscription_id: "sub_recovery_test",
          }],
        } as never;
      }
      if (sql.includes("UPDATE subscriptions")) {
        updateCalls++;
        return { rows: [{ organization_id: 741 }] } as never;
      }
      throw new Error(`Unexpected database query in route test: ${sql}`);
    }) as typeof pool.query;

    const stripe = {
      subscriptions: {
        retrieve: async () => ({
          id: "sub_recovery_test",
          customer: "cus_recovery_test",
          status: "active",
          latest_invoice: "in_recovery_paid",
        }),
      },
      invoices: {
        retrieve: async () => ({
          id: "in_recovery_paid",
          customer: "cus_recovery_test",
          subscription: "sub_recovery_test",
          status: "paid",
          payment_intent: "pi_recovery_paid",
        }),
        list: async () => ({
          data: recoveryCase.outstandingInvoice
            ? [{
                id: "in_recovery_open",
                subscription: "sub_recovery_test",
                amount_remaining: 1200,
              }]
            : [],
        }),
      },
      paymentIntents: {
        retrieve: async () => ({
          id: "pi_recovery_paid",
          status: "succeeded",
          latest_charge: "ch_recovery_sepa",
        }),
      },
      charges: {
        retrieve: async () => ({
          id: "ch_recovery_sepa",
          payment_method_details: { type: "sepa_debit" },
        }),
      },
      disputes: {
        list: async () => ({
          data: recoveryCase.unresolvedDispute ? [{ status: "needs_response" }] : [],
        }),
      },
    } as unknown as Stripe;

    const app = express();
    app.get(
      "/organizations/:orgId/subscription",
      ((req, _res, next) => {
        req.orgId = Number(req.params.orgId);
        next();
      }) as RequestHandler,
      createSubscriptionStatusHandler({ getStripeClient: () => stripe }),
    );
    const server = await new Promise<Server>((resolve, reject) => {
      const listeningServer = app.listen(0, "127.0.0.1", () => resolve(listeningServer));
      listeningServer.once("error", reject);
    });

    try {
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      const response = await fetch(
        `http://127.0.0.1:${address.port}/organizations/741/subscription`,
      );
      assert.equal(response.status, 200);
      const body = await response.json() as {
        subscription: { status: string };
        stripeDetails: null;
      };

      assert.equal(body.subscription.status, recoveryCase.expectedStatus);
      assert.equal(updateCalls, recoveryCase.expectedStatus === "active" ? 1 : 0);
    } finally {
      (pool as typeof pool & { query: typeof pool.query }).query = originalQuery;
      await new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    }
  });
}
