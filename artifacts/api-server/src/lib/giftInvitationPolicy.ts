export type GiftClaimDecision =
  | "eligible"
  | "already_claimed"
  | "invalid_invitation"
  | "email_mismatch"
  | "existing_non_free_subscription";

export function shouldCompleteOnboardingForClaimedGift(input: {
  onboardingStatus: string | null | undefined;
  primaryOrganizationId: number | null | undefined;
  claimedInvitationOrganizationId: number | null | undefined;
}): boolean {
  return input.onboardingStatus !== "completed"
    && input.primaryOrganizationId != null
    && input.claimedInvitationOrganizationId === input.primaryOrganizationId;
}

export function isGiftInvitationEmailVerified(inviteEmail: string, verifiedEmails: string[]): boolean {
  const normalizedInviteEmail = inviteEmail.trim().toLowerCase();
  return verifiedEmails.some((email) => email.trim().toLowerCase() === normalizedInviteEmail);
}

export function isGiftInvitationBeneficiary(input: {
  authenticatedClerkId: string;
  databaseClerkId: string | null | undefined;
  userId: number;
  primaryOrganizationId: number | null | undefined;
  organizationId: number;
  firstMemberUserId: number | null | undefined;
  firstMemberStatus: string | null | undefined;
  firstMemberArchived: boolean;
}): boolean {
  return input.authenticatedClerkId === input.databaseClerkId
    && input.primaryOrganizationId === input.organizationId
    && input.firstMemberUserId === input.userId
    && input.firstMemberStatus === "active"
    && !input.firstMemberArchived;
}

export function decideGiftInvitationClaim(input: {
  invite: {
    email: string;
    expiresAt: Date;
    claimedAt: Date | null;
    revokedAt: Date | null;
    organizationId: number | null;
    offerName: string;
  } | null;
  verifiedEmails: string[];
  organizationId: number;
  isBeneficiaryAccount?: boolean;
  existingSubscription?: { mode: string; offerName: string | null } | null;
  now?: Date;
}): GiftClaimDecision {
  const { invite } = input;
  if (!invite || invite.revokedAt) return "invalid_invitation";
  if (!isGiftInvitationEmailVerified(invite.email, input.verifiedEmails)) return "email_mismatch";
  if (invite.claimedAt) {
    return invite.organizationId === input.organizationId
      && input.isBeneficiaryAccount === true
      && input.existingSubscription?.mode === "free"
      && input.existingSubscription.offerName === invite.offerName
      ? "already_claimed"
      : "invalid_invitation";
  }
  if (invite.expiresAt <= (input.now ?? new Date())) return "invalid_invitation";
  if (input.existingSubscription && input.existingSubscription.mode !== "free") {
    return "existing_non_free_subscription";
  }
  return "eligible";
}
