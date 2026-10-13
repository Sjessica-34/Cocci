import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import type Stripe from "stripe";
import { pool } from "@workspace/db";
import {
  createAdditionalUserHandler,
  createRemoveAdditionalUserHandler,
} from "../routes/subscriptions";
import type { CatalogOffer } from "../stripeCatalog";

const offer: CatalogOffer = {
  offerName: "Cocci — Utilisateur supplémentaire",
  maxEmployees: null,
  effectifKey: null,
  action: "additional_user",
  productId: "prod_cocci",
  priceId: "price_additional_user",
};

function makeHarness(opts: {
  paymentFails?: boolean;
  memberCount?: number;
  quantity?: number;
} = {}) {
  const state = {
    maxUsers: 11,
    quantity: opts.quantity ?? 1,
    memberCount: opts.memberCount ?? 10,
    commits: 0,
    rollbacks: 0,
    stripeUpdate: null as Stripe.SubscriptionUpdateParams | null,
    statusCode: 200,
    body: undefined as unknown,
  };

  const client = {
    async query(query: string, values?: unknown[]) {
      if (query === "BEGIN" || query === "COMMIT" || query === "ROLLBACK") {
        if (query === "COMMIT") state.commits++;
        if (query === "ROLLBACK") state.rollbacks++;
        return { rows: [], rowCount: 0 };
      }
      if (query.includes("FROM subscriptions") && query.includes("FOR UPDATE")) {
        return {
          rows: [{
            mode: "stripe",
            status: "active",
            stripe_subscription_id: "sub_simulated",
            stripe_customer_id: "cus_simulated",
            max_users: state.maxUsers,
            override_max_users: null,
          }],
          rowCount: 1,
        };
      }
      if (query.includes("FROM members")) {
        return {
          rows: [{ member_count: state.memberCount }],
          rowCount: 1,
        };
      }
      if (query.includes("UPDATE subscriptions")) {
        state.maxUsers = Number(values?.[1]);
        return { rows: [], rowCount: 1 };
      }
      throw new Error(`Unexpected SQL in additional-user test: ${query}`);
    },
    release() {},
  };

  const stripe = {
    prices: {
      retrieve: async () => ({
        active: true,
        product: offer.productId,
        recurring: { interval: "month" },
        tax_behavior: "inclusive",
        currency: "eur",
        unit_amount: 300,
      }),
    },
    subscriptions: {
      retrieve: async () => ({
        id: "sub_simulated",
        customer: "cus_simulated",
        status: "active",
        metadata: { cocciBaseMaxUsers: "10" },
        items: {
          data: [{
            id: "si_additional_user",
            price: { id: offer.priceId },
            quantity: state.quantity,
          }],
        },
      }),
      update: async (_id: string, params: Stripe.SubscriptionUpdateParams) => {
        state.stripeUpdate = params;
        if (opts.paymentFails) {
          throw new Error("The invoice payment was declined");
        }
        const item = params.items?.[0];
        if (item && "quantity" in item && item.quantity !== undefined) {
          state.quantity = item.quantity;
        } else if (item && "deleted" in item && item.deleted) {
          state.quantity = 0;
        }
        return {} as Stripe.Subscription;
      },
    },
  } as unknown as Stripe;

  const handler = createAdditionalUserHandler({
    connect: (async () => client) as typeof pool.connect,
    getBillingOrganizationId: async (orgId) => orgId,
    getStripe: () => stripe,
    resolveOffer: () => offer,
  });
  const removeHandler = createRemoveAdditionalUserHandler({
    connect: (async () => client) as typeof pool.connect,
    getBillingOrganizationId: async (orgId) => orgId,
    getStripe: () => stripe,
    resolveOffer: () => offer,
  });
  const response = {
    status(code: number) {
      state.statusCode = code;
      return this;
    },
    json(body: unknown) {
      state.body = body;
      return this;
    },
  } as unknown as Response;
  const request = { orgId: 42 } as Request;

  return { handler, removeHandler, request, response, state };
}

test("ajoute un siège après acceptation du paiement et applique la limite une seule fois", async () => {
  const { handler, request, response, state } = makeHarness();

  await handler(request, response);

  assert.equal(state.statusCode, 200);
  assert.deepEqual(state.body, { maxUsers: 12 });
  assert.equal(state.maxUsers, 12);
  assert.equal(state.quantity, 2);
  assert.equal(state.commits, 1);
  assert.equal(state.rollbacks, 0);
  assert.equal(state.stripeUpdate?.proration_behavior, "always_invoice");
  assert.equal(state.stripeUpdate?.payment_behavior, "error_if_incomplete");
});

test("un paiement refusé ne valide ni la quantité ni la limite locale", async () => {
  const { handler, request, response, state } = makeHarness({ paymentFails: true });

  await handler(request, response);

  assert.equal(state.statusCode, 500);
  assert.deepEqual(state.body, { error: "Unable to add the additional user" });
  assert.equal(state.maxUsers, 11);
  assert.equal(state.quantity, 1);
  assert.equal(state.commits, 0);
  assert.equal(state.rollbacks, 1);
});

test("retire un siège et synchronise la limite après acceptation de Stripe", async () => {
  const { removeHandler, request, response, state } = makeHarness();

  await removeHandler(request, response);

  assert.equal(state.statusCode, 200);
  assert.deepEqual(state.body, { maxUsers: 10 });
  assert.equal(state.maxUsers, 10);
  assert.equal(state.quantity, 0);
  assert.equal(state.commits, 1);
  assert.equal(state.rollbacks, 0);
  assert.equal(state.stripeUpdate?.proration_behavior, "always_invoice");
  assert.equal(state.stripeUpdate?.payment_behavior, "error_if_incomplete");
  assert.deepEqual(state.stripeUpdate?.items, [{ id: "si_additional_user", deleted: true }]);
});

test("refuse le retrait si le quota tomberait sous les membres actifs ou invités", async () => {
  const { removeHandler, request, response, state } = makeHarness({ memberCount: 11 });

  await removeHandler(request, response);

  assert.equal(state.statusCode, 409);
  assert.deepEqual(state.body, {
    error: "USER_LIMIT_BELOW_CURRENT_MEMBERS",
    memberCount: 11,
    maxUsers: 10,
  });
  assert.equal(state.maxUsers, 11);
  assert.equal(state.quantity, 1);
  assert.equal(state.stripeUpdate, null);
  assert.equal(state.commits, 0);
  assert.equal(state.rollbacks, 1);
});

test("un échec Stripe ne diminue ni la quantité ni le quota local", async () => {
  const { removeHandler, request, response, state } = makeHarness({ paymentFails: true });

  await removeHandler(request, response);

  assert.equal(state.statusCode, 500);
  assert.deepEqual(state.body, { error: "Unable to remove the additional user" });
  assert.equal(state.maxUsers, 11);
  assert.equal(state.quantity, 1);
  assert.equal(state.commits, 0);
  assert.equal(state.rollbacks, 1);
});

test("retire un seul siège quand plusieurs sièges payants sont présents", async () => {
  const { removeHandler, request, response, state } = makeHarness({ quantity: 3 });

  await removeHandler(request, response);

  assert.equal(state.statusCode, 200);
  assert.deepEqual(state.body, { maxUsers: 12 });
  assert.equal(state.maxUsers, 12);
  assert.equal(state.quantity, 2);
  assert.deepEqual(state.stripeUpdate?.items, [{ id: "si_additional_user", quantity: 2 }]);
});
