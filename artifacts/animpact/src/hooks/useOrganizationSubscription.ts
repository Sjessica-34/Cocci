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
const TOKEN_ATTEMPT_TIMEOUT_MS = 2_500;
const TOKEN_WAIT_TIMEOUT_MS = 12_000;
const MAX_REQUEST_ATTEMPTS = 2;
const REQUEST_TIMEOUT_MS = 4_000;
const LOAD_TIMEOUT_MS = 20_000;

type ClerkTokenGetter = (options?: {
  skipCache?: boolean;
}) => Promise<string | null>;

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

async function waitForClerkToken(
  getToken: ClerkTokenGetter,
  isCancelled: () => boolean,
  forceRefresh = false,
) {
  const startedAt = Date.now();
  let attempt = 0;
  let lastError: Error | null = null;

  while (Date.now() - startedAt < TOKEN_WAIT_TIMEOUT_MS) {
    if (isCancelled()) {
      throw new DOMException("Subscription check cancelled.", "AbortError");
    }

    const remainingMs = TOKEN_WAIT_TIMEOUT_MS - (Date.now() - startedAt);
    try {
      // Clerk peut avoir une session valide dans ses cookies avant que son
      // token local soit immédiatement disponible. Une tentative individuelle
      // reste bornée à 2,5 s, mais un retour null est traité comme transitoire.
      const token = await withTimeout(
        getToken({ skipCache: forceRefresh || attempt > 0 }),
        Math.min(TOKEN_ATTEMPT_TIMEOUT_MS, remainingMs),
        "Le jeton d'authentification n'est pas disponible.",
      );

      if (token) return token;
      lastError = new Error("Authentication token unavailable");
    } catch (err) {
      lastError = err instanceof Error
        ? err
        : new Error("Subscription authentication unavailable");
    }

    attempt += 1;
    const waitMs = Math.min(
      AUTH_RETRY_DELAY_MS,
      TOKEN_WAIT_TIMEOUT_MS - (Date.now() - startedAt),
    );
    if (waitMs <= 0) break;
    await wait(waitMs);
  }

  throw lastError ?? new SubscriptionStatusTimeoutError(
    "Le jeton d'authentification n'est pas disponible.",
  );
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

  useEffect(() => {
    let cancelled = false;
    const loadTimeoutId = window.setTimeout(() => {
      cancelled = true;
      setSubscription(undefined);
      setError(new SubscriptionStatusTimeoutError(
        "La vérification de votre abonnement a pris trop de temps.",
      ));
      setIsLoading(false);
    }, LOAD_TIMEOUT_MS);

    if (!orgId) {
      window.clearTimeout(loadTimeoutId);
      setSubscription(undefined);
      setIsLoading(false);
      setError(null);
      return () => {
        cancelled = true;
      };
    }

    if (!isLoaded || !isSignedIn) {
      setSubscription(undefined);
      setIsLoading(true);
      setError(null);
      return () => {
        cancelled = true;
        window.clearTimeout(loadTimeoutId);
      };
    }

    async function loadSubscription() {
      setIsLoading(true);
      setError(null);
      setSubscription(undefined);

      let lastError: Error | null = null;
      for (let requestAttempt = 0; requestAttempt < MAX_REQUEST_ATTEMPTS; requestAttempt += 1) {
        let token: string;
        try {
          token = await waitForClerkToken(
            getToken,
            () => cancelled,
            requestAttempt > 0,
          );
        } catch (err) {
          lastError = err instanceof Error ? err : new Error("Subscription status unavailable");
          break;
        }

        if (cancelled) return;

        try {
          const controller = new AbortController();
          const requestTimeoutId = window.setTimeout(
            () => controller.abort(),
            REQUEST_TIMEOUT_MS,
          );
          let data: { subscription: OrganizationSubscription };
          try {
            data = await customFetch<{ subscription: OrganizationSubscription }>(
              `/api/organizations/${orgId}/subscription`,
              {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal,
              },
            );
          } finally {
            window.clearTimeout(requestTimeoutId);
          }
          if (!cancelled) {
            setSubscription(data.subscription ?? null);
            setError(null);
          }
          return;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error("Subscription status unavailable");
          // Les refus d'accès restent visibles. Une erreur 401/5xx ou un
          // timeout réseau peut en revanche être retenté avec un token frais.
          if (
            !isRetryableStatusError(err)
            || requestAttempt >= MAX_REQUEST_ATTEMPTS - 1
            || cancelled
          ) {
            break;
          }
          await wait(AUTH_RETRY_DELAY_MS);
        }
      }

      if (!cancelled) {
        setSubscription(undefined);
        setError(lastError ?? new Error("Subscription status unavailable"));
      }
    }

    void loadSubscription().finally(() => {
      window.clearTimeout(loadTimeoutId);
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(loadTimeoutId);
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