import assert from "node:assert/strict";
import test from "node:test";
import { resolvePostAuthRedirect, runPostAuthRedirect } from "../lib/authRedirect.ts";

test("une invitation en session reprend après connexion même si le compte a déjà une organisation", () => {
  assert.deepEqual(resolvePostAuthRedirect({
    organizationCount: 1,
    hasSubscriptionIntent: false,
    hasGiftInvitation: true,
    onboardingStatus: "completed",
    hasPrimaryOrganization: true,
  }), {
    path: "/offre",
    clearSubscriptionIntent: false,
  });
});

test("la reprise post-auth ne supprime pas le jeton d'invitation", () => {
  const navigations = [];
  let cleared = false;
  runPostAuthRedirect({
    currentPath: "/sign-in",
    isLoaded: true,
    isSignedIn: true,
    organizations: [{ id: "org_existing" }],
    organizationsLoading: false,
    organizationsFetching: false,
    hasSubscriptionIntent: false,
    hasGiftInvitation: true,
    onboardingStatus: "completed",
    hasPrimaryOrganization: true,
  }, {
    navigate: (path) => navigations.push(path),
    clearOnboardingSession: () => { cleared = true; },
  });
  assert.deepEqual(navigations, ["/offre"]);
  assert.equal(cleared, false);
});
