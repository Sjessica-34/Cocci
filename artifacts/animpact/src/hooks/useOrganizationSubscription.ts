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

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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

    if (!orgId) {
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
      };
    }

    async function loadSubscription() {
      setIsLoading(true);
      setError(null);

      let lastError: Error | null = null;
      for (let attempt = 0; attempt < MAX_AUTH_ATTEMPTS; attempt += 1) {
        try {
          // Une session Clerk fraîchement créée peut ne pas encore disposer d'un
          // JWT exploitable. Le second essai force donc un jeton non mis en cache.
          const token = await getToken({ skipCache: attempt > 0 });
          if (!token) {
            lastError = new Error("Authentication token unavailable");
          } else {
            const data = await customFetch<{ subscription: OrganizationSubscription }>(
              `/api/organizations/${orgId}/subscription`,
              { headers: { Authorization: `Bearer ${token}` } },
            );
            if (!cancelled) {
              setSubscription(data.subscription ?? null);
              setError(null);
            }
            return;
          }
        } catch (err) {
          lastError = err instanceof Error ? err : new Error("Subscription status unavailable");
          const status = err instanceof ApiError ? err.status : null;
          // Seuls les échecs d'authentification transitoires et les erreurs
          // serveur sont relancés automatiquement. Les refus d'accès restent
          // visibles pour ne pas masquer une erreur de droits.
          if (status !== 401 && (status == null || status < 500)) {
            break;
          }
        }

        if (attempt < MAX_AUTH_ATTEMPTS - 1 && !cancelled) {
          await wait(AUTH_RETRY_DELAY_MS);
        }
      }

      if (!cancelled) {
        setSubscription(undefined);
        setError(lastError ?? new Error("Subscription status unavailable"));
      }
    }

    void loadSubscription().finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
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