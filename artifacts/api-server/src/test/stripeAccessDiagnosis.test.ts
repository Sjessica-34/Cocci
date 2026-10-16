import assert from "node:assert/strict";
import test from "node:test";
import type Stripe from "stripe";
import { diagnoseStripeAccessRecovery } from "../stripeAccessRecovery";

function makeStripe(overrides: Record<string, unknown> = {}): Stripe {
  const invoice = {
    id: "in_current",
    customer: "cus_current",
    subscription: "sub_current",
    status: "open",
    payment_intent: "pi_current",
  };
  const implementation = {
    subscriptions: {
      retrieve: async () => ({
        id: "sub_current",
        customer: "cus_current",
        latest_invoice: "in_current",
      }),
    },
    invoices: {
      list: async () => ({ data: [invoice], has_more: false }),
      retrieve: async () => invoice,
    },
    paymentIntents: {
      retrieve: async () => ({ status: "processing", latest_charge: "ch_current" }),
    },
    disputes: {
      list: async () => ({ data: [{ status: "under_review" }] }),
    },
    ...overrides,
  };
  return implementation as unknown as Stripe;
}

test("diagnosis reports only safe flags for a current unpaid invoice, pending payment, and dispute", async () => {
  const result = await diagnoseStripeAccessRecovery(makeStripe(), "cus_current", "sub_current");
  assert.deepEqual(result, {
    hasUnpaidInvoice: true,
    hasPendingPayment: true,
    hasUnresolvedDispute: true,
  });
  assert.deepEqual(Object.keys(result).sort(), [
    "hasPendingPayment",
    "hasUnpaidInvoice",
    "hasUnresolvedDispute",
  ]);
});

test("diagnosis ignores invoices belonging to another customer or subscription", async () => {
  const stripe = makeStripe({
    invoices: {
      list: async () => ({
        data: [{
          id: "in_foreign",
          customer: "cus_other",
          subscription: "sub_other",
          status: "open",
          payment_intent: "pi_foreign",
        }],
        has_more: false,
      }),
      retrieve: async () => ({
        id: "in_current",
        customer: "cus_current",
        subscription: "sub_current",
        status: "paid",
        payment_intent: "pi_paid",
      }),
    },
    paymentIntents: {
      retrieve: async () => ({ status: "succeeded", latest_charge: "ch_paid" }),
    },
    disputes: {
      list: async () => ({ data: [{ status: "won" }] }),
    },
  });
  const result = await diagnoseStripeAccessRecovery(stripe, "cus_current", "sub_current");
  assert.deepEqual(result, {
    hasUnpaidInvoice: false,
    hasPendingPayment: false,
    hasUnresolvedDispute: false,
  });
});

test("diagnosis rejects a Stripe subscription linked to a different customer", async () => {
  const stripe = makeStripe({
    subscriptions: {
      retrieve: async () => ({
        id: "sub_current",
        customer: "cus_other",
        latest_invoice: null,
      }),
    },
  });
  await assert.rejects(
    diagnoseStripeAccessRecovery(stripe, "cus_current", "sub_current"),
    /does not match/,
  );
});

test("diagnosis checks historical subscription invoices for unresolved disputes", async () => {
  const requestedCursors: Array<string | undefined> = [];
  const stripe = makeStripe({
    invoices: {
      list: async (params: { starting_after?: string }) => {
        requestedCursors.push(params.starting_after);
        return params.starting_after
          ? {
              data: [{
                id: "in_history",
                customer: "cus_current",
                subscription: "sub_current",
                status: "paid",
                payment_intent: "pi_history",
              }],
              has_more: false,
            }
          : {
              data: [{
                id: "in_current",
                customer: "cus_current",
                subscription: "sub_current",
                status: "paid",
                payment_intent: "pi_current",
              }],
              has_more: true,
            };
      },
    },
    paymentIntents: {
      retrieve: async (id: string) => ({
        status: "succeeded",
        latest_charge: `ch_${id}`,
      }),
    },
    disputes: {
      list: async ({ charge }: { charge: string }) => ({
        data: charge === "ch_pi_history" ? [{ status: "under_review" }] : [],
      }),
    },
  });
  const result = await diagnoseStripeAccessRecovery(stripe, "cus_current", "sub_current");

  assert.deepEqual(requestedCursors, [undefined, "in_current"]);
  assert.deepEqual(result, {
    hasUnpaidInvoice: false,
    hasPendingPayment: false,
    hasUnresolvedDispute: true,
  });
});

test("diagnosis detects a pending payment among partial invoice payments", async () => {
  const inspectedPaymentIntents: string[] = [];
  const stripe = makeStripe({
    invoices: {
      list: async () => ({
        data: [{
          id: "in_current",
          customer: "cus_current",
          subscription: "sub_current",
          status: "open",
          payments: {
            data: [
              { payment: { payment_intent: "pi_paid" } },
              { payment: { payment_intent: { id: "pi_processing" } } },
            ],
          },
        }],
        has_more: false,
      }),
    },
    paymentIntents: {
      retrieve: async (id: string) => {
        inspectedPaymentIntents.push(id);
        return {
          status: id === "pi_processing" ? "processing" : "succeeded",
          latest_charge: null,
        };
      },
    },
  });

  const result = await diagnoseStripeAccessRecovery(stripe, "cus_current", "sub_current");
  assert.deepEqual(inspectedPaymentIntents.sort(), ["pi_paid", "pi_processing"]);
  assert.equal(result.hasPendingPayment, true);
});
