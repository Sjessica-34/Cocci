import assert from "node:assert/strict";
import test from "node:test";
import {
  getSubscriptionRecoveryUrl,
  SUBSCRIPTION_RECOVERY_PATH,
} from "../lib/subscriptionRecovery";

test("un rejet renvoie vers la page existante de régularisation", () => {
  assert.equal(SUBSCRIPTION_RECOVERY_PATH, "/abonnement?reason=subscription_required");
  assert.equal(
    getSubscriptionRecoveryUrl("/cocci/", "https://cocci.example"),
    "https://cocci.example/cocci/abonnement?reason=subscription_required",
  );
});
