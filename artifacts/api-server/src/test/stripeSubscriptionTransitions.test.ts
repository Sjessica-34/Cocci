import assert from "node:assert/strict";
import test from "node:test";
import {
  decideStripeAccessTransition,
  getInitialStripeSubscriptionStatus,
  shouldBlockNewStripeCheckout,
  STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES,
} from "../stripeSubscriptionTransitions";

test("le Checkout ne propose que le prélèvement SEPA", () => {
  assert.deepEqual(STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES, ["sepa_debit"]);
});

test("un Checkout SEPA non encaissé ouvre l’accès en attente", () => {
  assert.equal(getInitialStripeSubscriptionStatus("unpaid"), "trial");
  assert.equal(getInitialStripeSubscriptionStatus("paid"), "active");
});

test("un rejet du prélèvement courant suspend l’accès", () => {
  assert.equal(decideStripeAccessTransition({
    type: "invoice.payment_failed",
    subscriptionId: "sub_current",
    currentSubscriptionId: "sub_current",
    localStatus: "trial",
    invoicePaid: false,
  }), "suspend");
});

test("un ancien échec reçu après régularisation ne suspend pas un prélèvement payé", () => {
  assert.equal(decideStripeAccessTransition({
    type: "invoice.payment_failed",
    subscriptionId: "sub_current",
    currentSubscriptionId: "sub_current",
    localStatus: "active",
    invoicePaid: true,
  }), "ignore");
});

test("un paiement confirmé réactive l’abonnement suspendu courant", () => {
  assert.equal(decideStripeAccessTransition({
    type: "invoice.payment_succeeded",
    subscriptionId: "sub_current",
    currentSubscriptionId: "sub_current",
    localStatus: "suspended",
    invoicePaid: true,
    stripeSubscriptionStatus: "active",
  }), "activate");
});

test("un succès tardif d’une ancienne souscription ne réactive pas la souscription courante", () => {
  assert.equal(decideStripeAccessTransition({
    type: "invoice.payment_succeeded",
    subscriptionId: "sub_old",
    currentSubscriptionId: "sub_current",
    localStatus: "suspended",
    invoicePaid: true,
    stripeSubscriptionStatus: "active",
  }), "ignore");
});

test("un retour SEPA suspend la souscription courante, mais pas un paiement non-SEPA", () => {
  const event = {
    type: "charge.dispute.created" as const,
    subscriptionId: "sub_current",
    currentSubscriptionId: "sub_current",
    localStatus: "active",
  };
  assert.equal(decideStripeAccessTransition({ ...event, isSepaDebit: true }), "suspend");
  assert.equal(decideStripeAccessTransition({ ...event, isSepaDebit: false }), "ignore");
});

test("une souscription suspendue se régularise sans second Checkout", () => {
  assert.equal(shouldBlockNewStripeCheckout({
    mode: "stripe",
    localStatus: "suspended",
    stripeSubscriptionId: "sub_current",
    stripeSubscriptionStatus: "past_due",
  }), true);
  assert.equal(shouldBlockNewStripeCheckout({
    mode: "stripe",
    localStatus: "suspended",
    stripeSubscriptionId: "sub_current",
    stripeSubscriptionStatus: "canceled",
  }), false);
});
