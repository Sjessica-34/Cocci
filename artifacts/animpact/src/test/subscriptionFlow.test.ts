import assert from "node:assert/strict";
import test from "node:test";
import {
  canStartSubscriptionCheckout,
  hasActiveOrganizationSubscription,
  isOrganizationSubscriptionReady,
  isSubscriptionCheckoutButtonDisabled,
} from "@/hooks/useOrganizationSubscription";

test("une réponse subscription: null laisse le bouton Souscrire utilisable", () => {
  const subscriptionReady = isOrganizationSubscriptionReady(42, null, false);

  assert.equal(subscriptionReady, true);
  assert.equal(
    isSubscriptionCheckoutButtonDisabled({
      checkoutLoading: false,
      subscriptionLoading: false,
      currentOrgId: 42,
      subscriptionReady,
      subscriptionError: null,
      isActive: false,
    }),
    false,
  );
});

test("une erreur technique de vérification n'empêche pas une tentative de Checkout", () => {
  assert.equal(
    isSubscriptionCheckoutButtonDisabled({
      checkoutLoading: false,
      subscriptionLoading: false,
      currentOrgId: 42,
      subscriptionReady: false,
      subscriptionError: new Error("status unavailable"),
      isActive: false,
    }),
    false,
  );
  assert.equal(
    canStartSubscriptionCheckout({
      currentOrgId: 42,
      effectifKey: "1-5",
      isAuthLoaded: true,
      isSignedIn: true,
      isActive: false,
      checkoutStarted: false,
    }),
    true,
  );
});

test("un abonnement actif ou trial est reconnu comme accès workspace", () => {
  assert.equal(
    hasActiveOrganizationSubscription({
      mode: "stripe",
      status: "active",
      offer_name: "Cocci",
      stripe_customer_id: null,
      stripe_subscription_id: "sub_123",
      end_at: null,
    }),
    true,
  );
  assert.equal(
    hasActiveOrganizationSubscription({
      mode: "stripe",
      status: "trial",
      offer_name: "Cocci",
      stripe_customer_id: null,
      stripe_subscription_id: "sub_123",
      end_at: null,
    }),
    true,
  );
});