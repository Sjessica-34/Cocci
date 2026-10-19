export const SUPER_ADMIN_QUERY_STALE_TIME_MS = 2 * 60 * 1000;

export function isCurrentClerkUser(targetClerkId: string | undefined, currentClerkId: string | undefined): boolean {
  return Boolean(targetClerkId && currentClerkId && targetClerkId === currentClerkId);
}
