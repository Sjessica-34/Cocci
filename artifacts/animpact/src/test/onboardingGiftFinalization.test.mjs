import assert from "node:assert/strict";
import test from "node:test";
import {
  onboardingAfterGiftInvitationClaim,
  onboardingAfterOrganizationCreated,
} from "../lib/onboardingCache.ts";
import { resolvePostAuthRedirect } from "../lib/authRedirect.ts";

const progress = {
  status: "organization_created",
  effectifKey: "11-25",
  completedAt: null,
  primaryOrganizationId: null,
};

test("une réclamation réussie marque completed et dirige vers le dashboard", () => {
  const completed = onboardingAfterGiftInvitationClaim(progress, 42);

  assert.equal(completed.status, "completed");
  assert.equal(completed.primaryOrganizationId, 42);
  assert.equal(completed.effectifKey, "11-25");
  assert.equal(resolvePostAuthRedirect({
    hasSubscriptionIntent: false,
    hasGiftInvitation: false,
    onboardingStatus: completed.status,
    hasPrimaryOrganization: true,
  }).path, "/dashboard");
});

test("la création seule ne marque pas completed après un échec de réclamation", () => {
  const notCompleted = onboardingAfterOrganizationCreated(progress, 42);

  assert.equal(notCompleted.status, "organization_created");
  assert.equal(resolvePostAuthRedirect({
    hasSubscriptionIntent: false,
    hasGiftInvitation: false,
    onboardingStatus: notCompleted.status,
    hasPrimaryOrganization: true,
  }).path, "/onboarding");
});
