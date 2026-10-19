export function isFreeSubscriptionExpired(
  mode: string | null | undefined,
  endAt: string | null | undefined,
  today = new Date().toISOString().slice(0, 10),
): boolean {
  return mode === "free" && Boolean(endAt) && endAt! < today;
}

export function hasSubscriptionAccess(
  subscription: { mode?: string | null; status?: string | null; endAt?: string | null } | null | undefined,
  today = new Date().toISOString().slice(0, 10),
): boolean {
  if (!subscription || !["active", "trial"].includes(subscription.status ?? "")) return false;
  return !isFreeSubscriptionExpired(subscription.mode, subscription.endAt, today);
}
