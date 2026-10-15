export type PostAuthRedirectInput = {
  organizationCount?: number;
  hasSubscriptionIntent: boolean;
  hasGiftInvitation?: boolean;
  onboardingStatus?: string | null;
  hasPrimaryOrganization?: boolean;
};

export type PostAuthRedirect = {
  path: "/dashboard" | "/onboarding" | "/offre";
  clearSubscriptionIntent: boolean;
};

export type PostAuthRedirectRuntimeState = {
  currentPath?: string;
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  organizations: readonly unknown[] | undefined;
  organizationsLoading: boolean;
  organizationsFetching: boolean;
  hasSubscriptionIntent: boolean;
  hasGiftInvitation?: boolean;
  onboardingStatus?: string | null;
  hasPrimaryOrganization?: boolean;
  onboardingLoading?: boolean;
  onboardingFetching?: boolean;
};

export type PostAuthRedirectEffects = {
  navigate: (path: PostAuthRedirect["path"], options: { replace: true }) => void;
  clearOnboardingSession: () => void;
};

function normalizePath(path: string): string {
  const pathname = path.split("?")[0] ?? "";
  return pathname.replace(/\/+$/, "") || "/";
}

export function isNavigationTargetCurrent(currentPath: string, targetPath: string): boolean {
  return normalizePath(currentPath) === normalizePath(targetPath);
}

/**
 * An organization is the durable signal that setup has already been completed.
 * A subscription intent only matters for users who still need to create one.
 */
export function resolvePostAuthRedirect({
  organizationCount,
  hasSubscriptionIntent,
  hasGiftInvitation,
  onboardingStatus,
  hasPrimaryOrganization,
}: PostAuthRedirectInput): PostAuthRedirect {
  if (hasGiftInvitation) {
    return { path: "/offre", clearSubscriptionIntent: false };
  }
  if (onboardingStatus !== undefined || hasPrimaryOrganization !== undefined) {
    const isComplete = onboardingStatus === "completed" && hasPrimaryOrganization === true;
    return {
      path: isComplete ? "/dashboard" : "/onboarding",
      clearSubscriptionIntent: isComplete,
    };
  }

  const hasExistingOrganization = (organizationCount ?? 0) > 0;

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
    || state.onboardingLoading
    || state.onboardingFetching
    || !state.organizations
  ) {
    return false;
  }

  const redirect = resolvePostAuthRedirect({
    organizationCount: state.organizations.length,
    hasSubscriptionIntent: state.hasSubscriptionIntent,
    hasGiftInvitation: state.hasGiftInvitation,
    onboardingStatus: state.onboardingStatus,
    hasPrimaryOrganization: state.hasPrimaryOrganization,
  });

  if (redirect.clearSubscriptionIntent) {
    effects.clearOnboardingSession();
  }

  if (state.currentPath && isNavigationTargetCurrent(state.currentPath, redirect.path)) {
    return false;
  }

  effects.navigate(redirect.path, { replace: true });
  return true;
}

export function shouldRedirectOnboardingToDashboard(organizationCount: number): boolean {
  return organizationCount > 0;
}
