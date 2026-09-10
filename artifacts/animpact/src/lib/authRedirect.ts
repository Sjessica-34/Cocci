export type PostAuthRedirectInput = {
  organizationCount: number;
  hasSubscriptionIntent: boolean;
};

export type PostAuthRedirect = {
  path: "/dashboard" | "/onboarding";
  clearSubscriptionIntent: boolean;
};

export type PostAuthRedirectRuntimeState = {
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  organizations: readonly unknown[] | undefined;
  organizationsLoading: boolean;
  organizationsFetching: boolean;
  hasSubscriptionIntent: boolean;
};

export type PostAuthRedirectEffects = {
  navigate: (path: PostAuthRedirect["path"], options: { replace: true }) => void;
  clearOnboardingSession: () => void;
};

/**
 * An organization is the durable signal that setup has already been completed.
 * A subscription intent only matters for users who still need to create one.
 */
export function resolvePostAuthRedirect({
  organizationCount,
  hasSubscriptionIntent,
}: PostAuthRedirectInput): PostAuthRedirect {
  const hasExistingOrganization = organizationCount > 0;

  return {
    path: hasExistingOrganization
      ? "/dashboard"
      : hasSubscriptionIntent
        ? "/onboarding"
        : "/dashboard",
    clearSubscriptionIntent: hasExistingOrganization,
  };
}

/**
 * Connects the Clerk/React Query state to the post-auth navigation side effect.
 *
 * Keeping the readiness gate here makes it possible to verify the real
 * integration contract without mounting Clerk or a browser in the test runner.
 */
export function runPostAuthRedirect(
  state: PostAuthRedirectRuntimeState,
  effects: PostAuthRedirectEffects,
): boolean {
  if (
    !state.isLoaded
    || !state.isSignedIn
    || state.organizationsLoading
    || state.organizationsFetching
    || !state.organizations
  ) {
    return false;
  }

  const redirect = resolvePostAuthRedirect({
    organizationCount: state.organizations.length,
    hasSubscriptionIntent: state.hasSubscriptionIntent,
  });

  if (redirect.clearSubscriptionIntent) {
    effects.clearOnboardingSession();
  }

  effects.navigate(redirect.path, { replace: true });
  return true;
}

export function shouldRedirectOnboardingToDashboard(organizationCount: number): boolean {
  return organizationCount > 0;
}
