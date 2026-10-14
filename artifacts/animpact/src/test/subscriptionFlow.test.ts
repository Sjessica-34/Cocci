import assert from "node:assert/strict";
import test from "node:test";
import {
  canStartSubscriptionCheckout,
  hasActiveOrganizationSubscription,
  isOrganizationSubscriptionReady,
  isSubscriptionCheckoutButtonDisabled,
} from "@/hooks/useOrganizationSubscription";
import {
  pendingInvitationRedirect,
  resolvePostAuthRedirect,
  runPostAuthRedirect,
  shouldRedirectOnboardingToDashboard,
} from "@/lib/authRedirect";
import { invitationFailureMessage } from "@/lib/invitationFlow";
import { purchaseSeatAndInviteAdditionalUser } from "../lib/additionalUserInviteFlow";

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

test("un compte existant reprend toujours le dashboard après authentification", () => {
  assert.deepEqual(
    resolvePostAuthRedirect({
      organizationCount: 1,
      hasSubscriptionIntent: true,
    }),
    {
      path: "/dashboard",
      clearSubscriptionIntent: true,
    },
  );
});

test("un invité lié à une organisation ne repart pas vers la création d'entreprise", () => {
  assert.deepEqual(
    resolvePostAuthRedirect({
      organizationCount: 1,
      hasSubscriptionIntent: false,
      onboardingStatus: "not_started",
      hasPrimaryOrganization: true,
    }),
    {
      path: "/dashboard",
      clearSubscriptionIntent: true,
    },
  );
});

test("un nouvel utilisateur avec une intention d'abonnement commence l'onboarding", () => {
  assert.deepEqual(
    resolvePostAuthRedirect({
      organizationCount: 0,
      hasSubscriptionIntent: true,
    }),
    {
      path: "/onboarding",
      clearSubscriptionIntent: false,
    },
  );
});

test("un nouvel utilisateur sans invitation ni organisation commence l'onboarding", () => {
  assert.deepEqual(
    resolvePostAuthRedirect({
      organizationCount: 0,
      hasSubscriptionIntent: false,
    }),
    {
      path: "/onboarding",
      clearSubscriptionIntent: false,
    },
  );
});

test("une invitation en attente revient sur son acceptation Cocci, sinon l'onboarding prend le relais", () => {
  assert.equal(pendingInvitationRedirect(42), "/accept-invitation?organizationId=42");
  assert.equal(pendingInvitationRedirect(null), "/onboarding");
});

test("les erreurs d'invitation affichent un message adapté", () => {
  assert.match(invitationFailureMessage(410), /expiré/);
  assert.match(invitationFailureMessage(409), /autre organisation Cocci/);
  assert.match(invitationFailureMessage(404), /Aucune invitation/);
  assert.match(invitationFailureMessage(401, "lookup"), /session n’est plus valide/);
  assert.match(invitationFailureMessage(undefined, "lookup"), /onboarding est suspendu/);
});

test("le branchement Clerk/React Query envoie un compte configuré au dashboard", () => {
  const navigationCalls: Array<{
    path: "/dashboard" | "/onboarding";
    options: { replace: true };
  }> = [];
  let onboardingSessionCleared = false;

  const redirected = runPostAuthRedirect(
    {
      isLoaded: true,
      isSignedIn: true,
      organizations: [{ id: "org_existing" }],
      organizationsLoading: false,
      organizationsFetching: false,
      hasSubscriptionIntent: true,
    },
    {
      navigate: (path, options) => navigationCalls.push({ path, options }),
      clearOnboardingSession: () => {
        onboardingSessionCleared = true;
      },
    },
  );

  assert.equal(redirected, true);
  assert.deepEqual(navigationCalls, [
    { path: "/dashboard", options: { replace: true } },
  ]);
  assert.equal(onboardingSessionCleared, true);
  assert.notEqual(navigationCalls[0]?.path, "/onboarding");
});

test("la redirection post-auth attend que Clerk et les organisations soient prêts", () => {
  const navigatedTo: string[] = [];
  const effects = {
    navigate: (path: "/dashboard" | "/onboarding") => navigatedTo.push(path),
    clearOnboardingSession: () => {},
  };

  assert.equal(
    runPostAuthRedirect(
      {
        isLoaded: false,
        isSignedIn: true,
        organizations: undefined,
        organizationsLoading: true,
        organizationsFetching: false,
        hasSubscriptionIntent: true,
      },
      effects,
    ),
    false,
  );
  assert.deepEqual(navigatedTo, []);

  assert.equal(
    runPostAuthRedirect(
      {
        isLoaded: true,
        isSignedIn: true,
        organizations: [],
        organizationsLoading: false,
        organizationsFetching: true,
        hasSubscriptionIntent: true,
      },
      effects,
    ),
    false,
  );
  assert.deepEqual(navigatedTo, []);

  assert.equal(
    runPostAuthRedirect(
      {
        isLoaded: true,
        isSignedIn: true,
        organizations: [{ id: "org_existing" }],
        organizationsLoading: false,
        organizationsFetching: false,
        hasSubscriptionIntent: true,
      },
      effects,
    ),
    true,
  );
  assert.deepEqual(navigatedTo, ["/dashboard"]);
});

test("l'accès direct à l'onboarding redirige un compte déjà configuré", () => {
  assert.equal(shouldRedirectOnboardingToDashboard(1), true);
  assert.equal(shouldRedirectOnboardingToDashboard(0), false);
});

test("une relance d'invitation réutilise le siège payé sans nouvel achat", async () => {
  let seatReadyEmail: string | null = null;
  let purchases = 0;
  let invitations = 0;
  const invitationRequests: Array<{ email: string; role: string }> = [];

  const retryableInvite = () =>
    purchaseSeatAndInviteAdditionalUser({
      email: " New.Person@Example.com ",
      role: "admin",
      seatReadyEmail,
      purchaseSeat: async () => {
        purchases++;
      },
      markSeatReady: (email) => {
        seatReadyEmail = email;
      },
      sendInvitation: async (email, role) => {
        invitations++;
        invitationRequests.push({ email, role });
        if (invitations === 1) throw new Error("Clerk invitation failed");
      },
    });

  await assert.rejects(retryableInvite(), /Clerk invitation failed/);
  assert.equal(seatReadyEmail, "new.person@example.com");
  await retryableInvite();

  assert.equal(purchases, 1);
  assert.equal(invitations, 2);
  assert.deepEqual(invitationRequests, [
    { email: "new.person@example.com", role: "admin" },
    { email: "new.person@example.com", role: "admin" },
  ]);
});