import assert from "node:assert/strict";
import test from "node:test";
import {
  hasSubscriptionAccess,
  isFreeSubscriptionExpired,
} from "../lib/freeSubscriptionExpiry.ts";

test("une formule gratuite reste valide jusqu'à la date de fin incluse", () => {
  assert.equal(isFreeSubscriptionExpired("free", "2026-10-15", "2026-10-15"), false);
  assert.equal(isFreeSubscriptionExpired("free", "2026-10-14", "2026-10-15"), true);
});

test("une offre gratuite illimitée n'expire pas", () => {
  assert.equal(isFreeSubscriptionExpired("free", null, "2026-10-15"), false);
});

test("la règle d'expiration des offres gratuites ne modifie pas Stripe", () => {
  assert.equal(isFreeSubscriptionExpired("stripe", "2026-10-14", "2026-10-15"), false);
});

test("sans ligne d'abonnement, l'accès est refusé", () => {
  assert.equal(hasSubscriptionAccess(null, "2026-10-15"), false);
});

test("seuls les statuts actif et essai donnent accès, sous réserve de l'expiration gratuite", () => {
  assert.equal(hasSubscriptionAccess({ mode: "free", status: "active", endAt: null }, "2026-10-15"), true);
  assert.equal(hasSubscriptionAccess({ mode: "stripe", status: "trial" }, "2026-10-15"), true);
  assert.equal(hasSubscriptionAccess({ mode: "stripe", status: "suspended" }, "2026-10-15"), false);
  assert.equal(hasSubscriptionAccess({ mode: "free", status: "active", endAt: "2026-10-14" }, "2026-10-15"), false);
});
