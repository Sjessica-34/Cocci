import { useEffect, useState } from "react";
import { customFetch } from "@workspace/api-client-react";

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

export function useOrganizationSubscription(orgId: number | null | undefined) {
  const [subscription, setSubscription] = useState<OrganizationSubscription | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(Boolean(orgId));
  const [error, setError] = useState<Error | null>(null);

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

    setIsLoading(true);
    setError(null);
    customFetch<{ subscription: OrganizationSubscription }>(
      `/api/organizations/${orgId}/subscription`,
    )
      .then((data) => {
        if (cancelled) return;
        setSubscription(data.subscription ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setSubscription(undefined);
        setError(err instanceof Error ? err : new Error("Subscription status unavailable"));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orgId]);

  return {
    subscription,
    isLoading,
    error,
    isActive: isActiveStripeSubscription(subscription),
  };
}