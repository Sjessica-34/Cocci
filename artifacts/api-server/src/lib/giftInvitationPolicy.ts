export type GiftClaimDecision =
  | "eligible"
  | "already_claimed"
  | "invalid_invitation"
  | "email_mismatch"
  | "existing_non_free_subscription";

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
  existingSubscription?: { mode: string; offerName: string | null } | null;
  now?: Date;
}): GiftClaimDecision {
  const { invite } = input;
  if (!invite || invite.revokedAt) return "invalid_invitation";
  if (!input.verifiedEmails.includes(invite.email.trim().toLowerCase())) return "email_mismatch";
  if (invite.claimedAt) {
    return invite.organizationId === input.organizationId
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
