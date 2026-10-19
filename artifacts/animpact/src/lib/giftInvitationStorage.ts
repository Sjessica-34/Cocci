export const GIFT_INVITATION_STORAGE_KEY = "cocci_gift_invitation";

function readFrom(storage: Storage): string | null {
  try {
    return storage.getItem(GIFT_INVITATION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function readGiftInvitationToken(): string | null {
  if (typeof window === "undefined") return null;
  return readFrom(window.sessionStorage) ?? readFrom(window.localStorage);
}

export function saveGiftInvitationToken(token: string): void {
  if (typeof window === "undefined") return;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      storage.setItem(GIFT_INVITATION_STORAGE_KEY, token);
    } catch {
      // Keep the flow working if one storage backend is unavailable.
    }
  }
}

export function clearGiftInvitationToken(): void {
  if (typeof window === "undefined") return;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      storage.removeItem(GIFT_INVITATION_STORAGE_KEY);
    } catch {
      // Continue clearing the other storage backend.
    }
  }
}
