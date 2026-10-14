import assert from "node:assert/strict";
import test from "node:test";
import {
  canStartSubscriptionCheckout,
  hasActiveOrganizationSubscription,
  isOrganizationSubscriptionReady,
  isSubscriptionCheckoutButtonDisabled,
} from "@/hooks/useOrganizationSubscription";
import {
  isNavigationTargetCurrent,
  resolvePostAuthRedirect,
  runPostAuthRedirect,
  shouldRedirectOnboardingToDashboard,
} from "@/lib/authRedirect";
import { onboardingAfterOrganizationCreated } from "@/lib/onboardingCache";
import { resolveOnboardingStepPath } from "@/lib/onboardingNavigation";
import {
  isCurrentClerkUser,
  SUPER_ADMIN_QUERY_STALE_TIME_MS,
} from "@/lib/superAdminQueryPolicy";

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

test("un nouvel utilisateur sans intention d'abonnement arrive au dashboard", () => {
  assert.deepEqual(
    resolvePostAuthRedirect({
      organizationCount: 0,
      hasSubscriptionIntent: false,
    }),
    {
      path: "/dashboard",
      clearSubscriptionIntent: false,
    },
  );
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

test("la redirection post-auth ne remplace pas la route déjà affichée", () => {
  const navigationCalls: string[] = [];
  const redirected = runPostAuthRedirect(
    {
      currentPath: "/dashboard/",
      isLoaded: true,
      isSignedIn: true,
      organizations: [{ id: "org_existing" }],
      organizationsLoading: false,
      organizationsFetching: false,
      hasSubscriptionIntent: false,
      onboardingLoading: false,
      onboardingFetching: false,
    },
    {
      navigate: (path) => navigationCalls.push(path),
      clearOnboardingSession: () => {},
    },
  );

  assert.equal(redirected, false);
  assert.deepEqual(navigationCalls, []);
  assert.equal(isNavigationTargetCurrent("/dashboard?tab=overview", "/dashboard"), true);
});

test("la création d'une organisation met à jour le cache onboarding sans perdre l'effectif", () => {
  assert.deepEqual(
    onboardingAfterOrganizationCreated(
      {
        status: "not_started",
        effectifKey: "11-25",
        completedAt: null,
        primaryOrganizationId: null,
      },
      42,
    ),
    {
      status: "organization_created",
      effectifKey: "11-25",
      completedAt: null,
      primaryOrganizationId: 42,
    },
  );
});

test("une intention de forfait correspondante reprend directement l'abonnement après la création de l'espace", () => {
  assert.equal(
    resolveOnboardingStepPath({
      status: "organization_created",
      organizations: [{ id: 42, type: "entreprise", parentId: null }],
      hasEffectifSelection: true,
      hasMatchingSubscriptionIntent: true,
    }),
    "/onboarding/abonnement",
  );
  assert.equal(
    resolveOnboardingStepPath({
      status: "organization_created",
      organizations: [{ id: 42, type: "entreprise", parentId: null }],
      hasEffectifSelection: false,
      hasMatchingSubscriptionIntent: false,
    }),
    "/onboarding/effectif",
  );
});

test("les groupes passent par le récapitulatif avant Checkout et un forfait sans effectif revient à la sélection", () => {
  assert.equal(
    resolveOnboardingStepPath({
      status: "organization_created",
      organizations: [{ id: 42, type: "groupe", parentId: null }],
      hasEffectifSelection: true,
      hasMatchingSubscriptionIntent: true,
    }),
    "/onboarding/abonnement",
  );
  assert.equal(
    resolveOnboardingStepPath({
      status: "workforce_completed",
      organizations: [{ id: 42, type: "entreprise", parentId: null }],
      hasEffectifSelection: false,
      hasMatchingSubscriptionIntent: false,
    }),
    "/onboarding/effectif",
  );
});

test("la reprise d'onboarding suit la dernière étape persistée sans ressaisir l'effectif", () => {
  const org = [{ id: 42, type: "entreprise", parentId: null }];
  const group = [{ id: 43, type: "groupe", parentId: null }];
  const route = (
    status: string,
    organizations: typeof org,
    hasEffectifSelection: boolean,
    hasMatchingSubscriptionIntent: boolean,
  ) => resolveOnboardingStepPath({
    status,
    organizations,
    hasEffectifSelection,
    hasMatchingSubscriptionIntent,
  });

  assert.equal(route("subsidiaries_configured", org, true, false), "/onboarding/effectif");
  assert.equal(route("subsidiaries_configured", org, true, true), "/onboarding/abonnement");
  assert.equal(route("workforce_completed", org, true, false), "/onboarding/abonnement");
  assert.equal(route("subscription_selected", org, true, false), "/onboarding/abonnement");
  assert.equal(route("payment_pending", org, true, false), "/onboarding/abonnement");
  assert.equal(route("completed", org, true, false), "/dashboard");
  assert.equal(route("organization_created", group, true, true), "/onboarding/abonnement");
});

test("les droits superadmin ont une fraîcheur bornée et le changement de son propre rôle est détecté", () => {
  assert.equal(SUPER_ADMIN_QUERY_STALE_TIME_MS, 2 * 60 * 1000);
  assert.equal(isCurrentClerkUser("clerk_user_1", "clerk_user_1"), true);
  assert.equal(isCurrentClerkUser("clerk_user_2", "clerk_user_1"), false);
  assert.equal(isCurrentClerkUser(undefined, "clerk_user_1"), false);
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
        isSignedIn: false,
        organizations: undefined,
        organizationsLoading: false,
        organizationsFetching: false,
        hasSubscriptionIntent: false,
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