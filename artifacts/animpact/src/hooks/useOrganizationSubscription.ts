import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import { ApiError, customFetch } from "@workspace/api-client-react";

export type OrganizationSubscription = {
  mode: string;
  status: string;
  offer_name: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  end_at: string | null;
} | null;

export function isActiveStripeSubscription(
  subscription: OrganizationSubscription | undefined,
) {
  return subscription?.status === "active" && subscription.mode === "stripe";
}

const AUTH_RETRY_DELAY_MS = 350;
const MAX_AUTH_ATTEMPTS = 2;
const TOKEN_TIMEOUT_MS = 2_500;
const REQUEST_TIMEOUT_MS = 4_000;
const LOAD_TIMEOUT_MS = 8_000;

class SubscriptionStatusTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubscriptionStatusTimeoutError";
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new SubscriptionStatusTimeoutError(message));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isRetryableStatusError(error: unknown) {
  if (error instanceof SubscriptionStatusTimeoutError) return true;
  if (error instanceof ApiError) {
    return error.status === 401 || error.status >= 500;
  }
  return error instanceof DOMException && error.name === "AbortError";
}

export function useOrganizationSubscription(orgId: number | null | undefined) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [subscription, setSubscription] = useState<OrganizationSubscription | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(Boolean(orgId));
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  console.info("[subscription-debug] hook:render", {
    orgPresent: Boolean(orgId),
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    refreshKey,
  });

  useEffect(() => {
    let cancelled = false;
    console.info("[subscription-debug] effect:enter", {
      orgPresent: Boolean(orgId),
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      refreshKey,
    });
    const loadTimeoutId = window.setTimeout(() => {
      cancelled = true;
      console.warn("[subscription-debug] load:timeout", {
        orgPresent: Boolean(orgId),
        timeoutMs: LOAD_TIMEOUT_MS,
      });
      setSubscription(undefined);
      setError(new SubscriptionStatusTimeoutError(
        "La vérification de votre abonnement a pris trop de temps.",
      ));
      setIsLoading(false);
    }, LOAD_TIMEOUT_MS);

    if (!orgId) {
      console.info("[subscription-debug] effect:return-no-organization");
      window.clearTimeout(loadTimeoutId);
      setSubscription(undefined);
      setIsLoading(false);
      setError(null);
      return () => {
        cancelled = true;
      };
    }

    if (!isLoaded || !isSignedIn) {
      console.info("[subscription-debug] effect:return-auth-not-ready", {
        isLoaded,
        isSignedIn: Boolean(isSignedIn),
      });
      setSubscription(undefined);
      setIsLoading(true);
      setError(null);
      return () => {
        cancelled = true;
        window.clearTimeout(loadTimeoutId);
      };
    }

    async function loadSubscription() {
      console.info("[subscription-debug] load:start", {
        orgPresent: Boolean(orgId),
        maxAttempts: MAX_AUTH_ATTEMPTS,
      });
      setIsLoading(true);
      setError(null);
      setSubscription(undefined);

      let lastError: Error | null = null;
      for (let attempt = 0; attempt < MAX_AUTH_ATTEMPTS; attempt += 1) {
        try {
          console.info("[subscription-debug] getToken:start", {
            attempt: attempt + 1,
            skipCache: attempt > 0,
          });
          // Une session Clerk fraîchement créée peut ne pas encore disposer d'un
          // JWT exploitable. Le second essai force donc un jeton non mis en cache.
          const token = await withTimeout(
            getToken({ skipCache: attempt > 0 }),
            TOKEN_TIMEOUT_MS,
            "Le jeton d'authentification n'est pas disponible.",
          );
          console.info("[subscription-debug] getToken:finish", {
            attempt: attempt + 1,
            tokenAvailable: Boolean(token),
          });
          if (!token) {
            console.warn("[subscription-debug] getToken:no-token", {
              attempt: attempt + 1,
            });
            lastError = new Error("Authentication token unavailable");
          } else {
            const controller = new AbortController();
            const requestTimeoutId = window.setTimeout(
              () => controller.abort(),
              REQUEST_TIMEOUT_MS,
            );
            let data: { subscription: OrganizationSubscription };
            try {
              console.info("[subscription-debug] fetch:start", {
                attempt: attempt + 1,
                url: `/api/organizations/${orgId}/subscription`,
                authorizationProvided: true,
              });
              data = await customFetch<{ subscription: OrganizationSubscription }>(
                `/api/organizations/${orgId}/subscription`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                  signal: controller.signal,
                  onResponse: (response) => {
                    console.info("[subscription-debug] fetch:response", {
                      attempt: attempt + 1,
                      status: response.status,
                      ok: response.ok,
                    });
                  },
                },
              );
            } finally {
              window.clearTimeout(requestTimeoutId);
            }
            if (!cancelled) {
              console.info("[subscription-debug] fetch:success", {
                attempt: attempt + 1,
                subscriptionPresent: data.subscription != null,
              });
              setSubscription(data.subscription ?? null);
              setError(null);
            }
            return;
          }
        } catch (err) {
          lastError = err instanceof Error ? err : new Error("Subscription status unavailable");
          console.error("[subscription-debug] attempt:error", {
            attempt: attempt + 1,
            errorName: lastError.name,
            errorMessage: lastError.message,
            status: err instanceof ApiError ? err.status : null,
          });
          // Seuls les échecs d'authentification transitoires et les erreurs
          // serveur sont relancés automatiquement. Les refus d'accès restent
          // visibles pour ne pas masquer une erreur de droits.
          if (!isRetryableStatusError(err)) {
            break;
          }
        }

        if (attempt < MAX_AUTH_ATTEMPTS - 1 && !cancelled) {
          console.info("[subscription-debug] retry:scheduled", {
            nextAttempt: attempt + 2,
            delayMs: AUTH_RETRY_DELAY_MS,
          });
          await wait(AUTH_RETRY_DELAY_MS);
        }
      }

      if (!cancelled) {
        console.info("[subscription-debug] load:error", {
          errorName: lastError?.name ?? "Error",
          errorMessage: lastError?.message ?? "Subscription status unavailable",
        });
        setSubscription(undefined);
        setError(lastError ?? new Error("Subscription status unavailable"));
      }
    }

    void loadSubscription().finally(() => {
      window.clearTimeout(loadTimeoutId);
      console.info("[subscription-debug] load:finally", { cancelled });
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(loadTimeoutId);
      console.info("[subscription-debug] effect:cleanup");
    };
  }, [getToken, isLoaded, isSignedIn, orgId, refreshKey]);

  return {
    subscription,
    isLoading,
    error,
    isActive: isActiveStripeSubscription(subscription),
    refresh,
  };
}