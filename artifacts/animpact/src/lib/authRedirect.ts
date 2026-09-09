export type PostAuthRedirectInput = {
  organizationCount: number;
  hasSubscriptionIntent: boolean;
};

export type PostAuthRedirect = {
  path: "/dashboard" | "/onboarding";
  clearSubscriptionIntent: boolean;
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

export function shouldRedirectOnboardingToDashboard(organizationCount: number): boolean {
  return organizationCount > 0;
}