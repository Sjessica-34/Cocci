export type OnboardingRouteOrganization = {
  parentId?: number | null;
  type?: string | null;
};

export type OnboardingRouteState = {
  status: string;
  organizations: readonly OnboardingRouteOrganization[];
  hasEffectifSelection: boolean;
  hasMatchingSubscriptionIntent: boolean;
};

export type OnboardingStepPath =
  | "/onboarding"
  | "/onboarding/filiales"
  | "/onboarding/effectif"
  | "/onboarding/abonnement"
  | "/dashboard";

export function resolveOnboardingStepPath({
  status,
  organizations,
  hasEffectifSelection,
  hasMatchingSubscriptionIntent,
}: OnboardingRouteState): OnboardingStepPath {
  if (status === "completed") return "/dashboard";

  const rootOrganization = organizations.find((organization) => !organization.parentId);
  if (status === "organization_created" && rootOrganization?.type === "groupe") {
    return "/onboarding/filiales";
  }

  if (status === "organization_created" || status === "subsidiaries_configured") {
    return hasMatchingSubscriptionIntent && hasEffectifSelection
      ? "/onboarding/abonnement"
      : "/onboarding/effectif";
  }

  if (
    status === "workforce_completed"
    || status === "subscription_selected"
    || status === "payment_pending"
  ) {
    return hasEffectifSelection ? "/onboarding/abonnement" : "/onboarding/effectif";
  }

  return "/onboarding";
}
