import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveEffectifContinuePath,
  resolveOnboardingStepPath,
} from "../lib/onboardingNavigation.ts";

test("un effectif classique ouvre le récapitulatif formule", () => {
  assert.equal(resolveEffectifContinuePath(false), "/onboarding/abonnement");
  assert.equal(resolveOnboardingStepPath({
    status: "organization_created",
    organizations: [{ parentId: null }],
    hasEffectifSelection: true,
    hasMatchingSubscriptionIntent: true,
  }), "/onboarding/abonnement");
});

test("un effectif avec invitation reprend l’offre gratuite au lieu des formules payantes", () => {
  assert.equal(resolveEffectifContinuePath(true), "/offre");
});
