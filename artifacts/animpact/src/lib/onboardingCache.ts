import type { OnboardingProgress } from "@workspace/api-client-react";

export function onboardingAfterOrganizationCreated(
  current: OnboardingProgress | undefined,
  organizationId: number,
): OnboardingProgress {
  return {
    status: "organization_created",
    effectifKey: current?.effectifKey ?? null,
    completedAt: current?.completedAt ?? null,
    primaryOrganizationId: organizationId,
  };
}

export function onboardingAfterGiftInvitationClaim(
  current: OnboardingProgress | undefined,
  organizationId: number,
): OnboardingProgress {
  return {
    status: "completed",
    effectifKey: current?.effectifKey ?? null,
    completedAt: current?.completedAt ?? null,
    primaryOrganizationId: organizationId,
  };
}
