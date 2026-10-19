export const SUBSCRIPTION_RECOVERY_PATH = "/abonnement?reason=subscription_required";

export function getSubscriptionRecoveryUrl(basePath: string, origin: string): string {
  const normalizedBasePath = basePath.replace(/\/$/, "");
  const [path, query = ""] = SUBSCRIPTION_RECOVERY_PATH.split("?");
  const url = new URL(`${normalizedBasePath}${path}`, origin);
  new URLSearchParams(query).forEach((value, key) => url.searchParams.set(key, value));
  return url.toString();
}
