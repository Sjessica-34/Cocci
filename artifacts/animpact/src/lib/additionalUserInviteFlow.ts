export type AdditionalUserInviteRole = "admin" | "member" | "viewer";

export async function purchaseSeatAndInviteAdditionalUser(options: {
  email: string;
  role: AdditionalUserInviteRole;
  seatReadyEmail: string | null;
  purchaseSeat(): Promise<void>;
  markSeatReady(normalizedEmail: string): void;
  sendInvitation(normalizedEmail: string, role: AdditionalUserInviteRole): Promise<unknown>;
}): Promise<void> {
  const normalizedEmail = options.email.trim().toLowerCase();
  if (options.seatReadyEmail !== normalizedEmail) {
    await options.purchaseSeat();
    options.markSeatReady(normalizedEmail);
  }

  await options.sendInvitation(normalizedEmail, options.role);
}
