import { useCallback } from "react";
import { useAuth } from "@clerk/react";
import { ApiError, customFetch } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebugMount } from "@/lib/requestDebug";

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

export function hasActiveOrganizationSubscription(
  subscription: OrganizationSubscription | undefined,
) {
  return subscription?.status === "active" || subscription?.status === "trial";
}

export function isOrganizationSubscriptionReady(
  orgId: number | null | undefined,
  subscription: OrganizationSubscription | undefined,
  isLoading: boolean,
) {
  return Boolean(orgId) && subscription !== undefined && !isLoading;
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

async function loadOrganizationSubscription(
  orgId: number,
  getToken: ClerkTokenGetter,
): Promise<OrganizationSubscription> {
  const loadController = new AbortController();
  let loadTimedOut = false;
  const loadTimeoutId = window.setTimeout(() => {
    loadTimedOut = true;
    loadController.abort();
  }, LOAD_TIMEOUT_MS);

  try {
    let lastError: Error | null = null;
    for (let requestAttempt = 0; requestAttempt < MAX_REQUEST_ATTEMPTS; requestAttempt += 1) {
      let token: string;
      try {
        token = await waitForClerkToken(
          getToken,
          () => loadController.signal.aborted,
          requestAttempt > 0,
        );
      } catch (err) {
        if (loadTimedOut) {
          throw new SubscriptionStatusTimeoutError(
            "La vérification de votre abonnement a pris trop de temps.",
          );
        }
        lastError = err instanceof Error ? err : new Error("Subscription status unavailable");
        break;
      }

      if (loadController.signal.aborted) {
        if (loadTimedOut) {
          throw new SubscriptionStatusTimeoutError(
            "La vérification de votre abonnement a pris trop de temps.",
          );
        }
        throw new DOMException("Subscription check cancelled.", "AbortError");
      }

      try {
        const requestController = new AbortController();
        const abortRequest = () => requestController.abort();
        loadController.signal.addEventListener("abort", abortRequest, { once: true });
        const requestTimeoutId = window.setTimeout(
          () => requestController.abort(),
          REQUEST_TIMEOUT_MS,
        );
        let data: { subscription: OrganizationSubscription };
        try {
          data = await customFetch<{ subscription: OrganizationSubscription }>(
            `/api/organizations/${orgId}/subscription`,
            {
              headers: { Authorization: `Bearer ${token}` },
              signal: requestController.signal,
            },
          );
        } finally {
          window.clearTimeout(requestTimeoutId);
          loadController.signal.removeEventListener("abort", abortRequest);
        }
        return data.subscription ?? null;
      } catch (err) {
        if (loadTimedOut) {
          throw new SubscriptionStatusTimeoutError(
            "La vérification de votre abonnement a pris trop de temps.",
          );
        }
        lastError = err instanceof Error ? err : new Error("Subscription status unavailable");
        // Les refus d'accès restent visibles. Une erreur 401/5xx ou un
        // timeout réseau peut en revanche être retenté avec un token frais.
        if (
          !isRetryableStatusError(err)
          || requestAttempt >= MAX_REQUEST_ATTEMPTS - 1
        ) {
          break;
        }
        await wait(AUTH_RETRY_DELAY_MS);
      }
    }

    throw lastError ?? new Error("Subscription status unavailable");
  } finally {
    window.clearTimeout(loadTimeoutId);
  }
}

function getOrganizationSubscriptionQueryKey(
  userId: string | null | undefined,
  orgId: number | null | undefined,
) {
  return ["organization-subscription", userId ?? null, orgId ?? null] as const;
}

export function useOrganizationSubscription(orgId: number | null | undefined) {
  useDebugMount("useOrganizationSubscription");
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = getOrganizationSubscriptionQueryKey(userId, orgId);
  const hasAuthenticatedOrganization = Boolean(
    orgId && userId && isLoaded && isSignedIn,
  );
  const subscriptionQuery = useQuery<OrganizationSubscription, Error>({
    queryKey,
    queryFn: () => loadOrganizationSubscription(orgId!, getToken),
    enabled: hasAuthenticatedOrganization,
    retry: false,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    meta: { debugLabel: "useOrganizationSubscription" },
  });

  const refresh = useCallback(() => {
    if (!hasAuthenticatedOrganization) return;
    void queryClient.invalidateQueries({
      queryKey: getOrganizationSubscriptionQueryKey(userId, orgId),
      exact: true,
    });
  }, [hasAuthenticatedOrganization, orgId, queryClient, userId]);

  const isLoading = Boolean(orgId) && (
    !isLoaded
    || !isSignedIn
    || subscriptionQuery.isPending
    || (subscriptionQuery.isStale && subscriptionQuery.isFetching)
  );
  const subscription = subscriptionQuery.error
    ? undefined
    : subscriptionQuery.data;

  return {
    subscription,
    isLoading,
    error: subscriptionQuery.error ?? null,
    isActive: isActiveStripeSubscription(subscription),
    refresh,
  };
}

export function canStartSubscriptionCheckout({
  currentOrgId,
  effectifKey,
  isAuthLoaded,
  isSignedIn,
  isActive,
  checkoutStarted,
}: {
  currentOrgId: number | null | undefined;
  effectifKey: string | null;
  isAuthLoaded: boolean;
  isSignedIn: boolean | undefined;
  isActive: boolean;
  checkoutStarted: boolean;
}) {
  return Boolean(currentOrgId)
    && Boolean(effectifKey)
    && isAuthLoaded
    && isSignedIn
    && !isActive
    && !checkoutStarted;
}

export function isSubscriptionCheckoutButtonDisabled({
  checkoutLoading,
  subscriptionLoading,
  currentOrgId,
  subscriptionReady,
  subscriptionError,
  isActive,
}: {
  checkoutLoading: boolean;
  subscriptionLoading: boolean;
  currentOrgId: number | null | undefined;
  subscriptionReady: boolean;
  subscriptionError: unknown;
  isActive: boolean;
}) {
  return checkoutLoading
    || subscriptionLoading
    || (
      Boolean(currentOrgId)
      && !subscriptionReady
      && !subscriptionError
    )
    || isActive;
}
