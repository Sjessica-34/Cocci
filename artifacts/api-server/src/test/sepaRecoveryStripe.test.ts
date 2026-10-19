import assert from "node:assert/strict";
import test from "node:test";
import type Stripe from "stripe";
import {
  createRecoverySetupCheckout,
  getRecoverySetupPaymentMethod,
  getRecoverySetupSessionReferences,
  payExistingRecoveryInvoice,
} from "../sepaRecoveryStripe";

function stripeMock(impl: Record<string, unknown>): Stripe {
  return impl as unknown as Stripe;
}

test("recovery creates setup Checkout only; it never creates a subscription", async () => {
  let checkoutParams: Record<string, unknown> | undefined;
  let subscriptionCreateCalls = 0;
  const stripe = stripeMock({
    checkout: { sessions: { create: async (params: Record<string, unknown>) => {
      checkoutParams = params;
      return { id: "cs_setup", url: "https://checkout.stripe.test/cs_setup" };
    } } },
    subscriptions: { create: async () => { subscriptionCreateCalls++; } },
  });

  const session = await createRecoverySetupCheckout(stripe, {
    baseUrl: "https://cocci.test",
    organizationId: 23,
    customerId: "cus_existing",
    subscriptionId: "sub_existing",
    invoiceId: "in_open",
  });

  assert.equal(session.id, "cs_setup");
  assert.equal(subscriptionCreateCalls, 0);
  assert.equal(checkoutParams?.mode, "setup");
  assert.deepEqual(checkoutParams?.payment_method_types, ["sepa_debit"]);
  assert.match(String(checkoutParams?.success_url), /sepaRecoverySession=\{CHECKOUT_SESSION_ID\}/);
  assert.equal((checkoutParams?.metadata as Record<string, string>).subscription_id, "sub_existing");
});

test("a completed setup Checkout can be resumed later, but an incomplete or foreign session is rejected", () => {
  const expected = {
    customerId: "cus_existing",
    organizationId: 23,
    subscriptionId: "sub_existing",
  };
  const completed = {
    mode: "setup",
    status: "complete",
    customer: "cus_existing",
    setup_intent: "seti_done",
    metadata: {
      cocci_flow: "sepa_recovery",
      organization_id: "23",
      subscription_id: "sub_existing",
      invoice_id: "in_open",
    },
    // A completed session remains resumable from its success URL later.
    expires_at: 1,
  } as unknown as Stripe.Checkout.Session;
  assert.deepEqual(getRecoverySetupSessionReferences(completed, expected), {
    invoiceId: "in_open",
    setupIntentId: "seti_done",
  });
  assert.equal(getRecoverySetupSessionReferences({
    ...completed,
    status: "open",
  } as Stripe.Checkout.Session, expected), null);
  assert.equal(getRecoverySetupSessionReferences({
    ...completed,
    customer: "cus_other",
  } as Stripe.Checkout.Session, expected), null);
});

test("the returned SetupIntent must be succeeded and bound to the same invoice", () => {
  const expected = {
    customerId: "cus_existing",
    organizationId: 23,
    subscriptionId: "sub_existing",
    invoiceId: "in_open",
  };
  const setupIntent = {
    id: "seti_done",
    status: "succeeded",
    customer: "cus_existing",
    payment_method: "pm_sepa_new",
    metadata: {
      cocci_flow: "sepa_recovery",
      organization_id: "23",
      subscription_id: "sub_existing",
      invoice_id: "in_open",
    },
  } as unknown as Stripe.SetupIntent;
  assert.equal(getRecoverySetupPaymentMethod(setupIntent, expected), "pm_sepa_new");
  assert.equal(getRecoverySetupPaymentMethod({
    ...setupIntent,
    status: "processing",
  } as Stripe.SetupIntent, expected), null);
  assert.equal(getRecoverySetupPaymentMethod({
    ...setupIntent,
    metadata: { ...setupIntent.metadata, invoice_id: "in_other" },
  } as Stripe.SetupIntent, expected), null);
});

test("a processing SEPA payment is not sent to invoices.pay again on a later return", async () => {
  let intentStatus = "requires_payment_method";
  let payCalls = 0;
  const stripe = stripeMock({
    paymentIntents: { retrieve: async () => ({ status: intentStatus }) },
    subscriptions: { update: async () => ({}) },
    invoices: { pay: async () => {
      payCalls++;
      intentStatus = "processing";
      return { status: "open" };
    } },
  });
  const input = {
    subscriptionId: "sub_existing",
    invoice: {
      id: "in_open",
      status: "open",
      amount_remaining: 1999,
      payment_intent: "pi_checkout_created",
    },
    paymentMethodId: "pm_sepa_new",
    setupIntentId: "seti_confirmed",
  };

  assert.equal(await payExistingRecoveryInvoice(stripe, input), "processing");
  assert.equal(await payExistingRecoveryInvoice(stripe, input), "processing");
  assert.equal(payCalls, 1);
});

test("an unsuccessful SEPA attempt can be retried with a new mandate and idempotency key", async () => {
  const idempotencyKeys: string[] = [];
  let attempt = 0;
  const stripe = stripeMock({
    paymentIntents: { retrieve: async () => ({ status: "requires_payment_method" }) },
    subscriptions: { update: async () => ({}) },
    invoices: { pay: async (_invoiceId: string, _params: unknown, options: { idempotencyKey: string }) => {
      idempotencyKeys.push(options.idempotencyKey);
      attempt++;
      if (attempt === 1) throw new Error("SEPA debit rejected");
      return { status: "paid" };
    } },
  });
  const invoice = { id: "in_open", status: "open", amount_remaining: 1999 };

  await assert.rejects(
    payExistingRecoveryInvoice(stripe, {
      subscriptionId: "sub_existing",
      invoice,
      paymentMethodId: "pm_bad",
      setupIntentId: "seti_bad",
    }),
    /SEPA debit rejected/,
  );
  assert.equal(await payExistingRecoveryInvoice(stripe, {
    subscriptionId: "sub_existing",
    invoice,
    paymentMethodId: "pm_replacement",
    setupIntentId: "seti_replacement",
  }), "paid");
  assert.equal(idempotencyKeys.length, 2);
  assert.notEqual(idempotencyKeys[0], idempotencyKeys[1]);
});
