import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { ApiError } from "@workspace/api-client-react";

function handle402(error: unknown): void {
  if (error instanceof ApiError && error.status === 402) {
    // Rediriger vers la page d'abonnement avec un message explicatif
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
    const url = new URL(`${basePath}/abonnement`, window.location.origin);
    url.searchParams.set("reason", "subscription_required");
    window.location.href = url.toString();
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handle402,
  }),
  mutationCache: new MutationCache({
    onError: handle402,
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        // Ne pas réessayer sur les erreurs 402 (abonnement requis)
        if (error instanceof ApiError && error.status === 402) return false;
        return failureCount < 1;
      },
    },
  },
});

/**
 * Exercise IDs are sent in request headers rather than included in every
 * module query key. Refresh exercise-dependent queries on an exercise switch,
 * but keep organization, identity, onboarding, and billing checks cached.
 */
export function invalidateExerciseScopedQueries(client: QueryClient) {
  return client.invalidateQueries({
    predicate: ({ queryKey }) => {
      const resource = queryKey[0];
      if (typeof resource !== "string") return true;
      if (
        resource.startsWith("/api/users/")
        || resource === "organization-subscription"
      ) {
        return false;
      }
      if (resource === "/api/organizations") {
        return queryKey.length > 2 && queryKey[2] !== "exercises";
      }
      if (
        resource.startsWith("/api/organizations/")
        && /\/(exercises|subscription)$/.test(resource)
      ) {
        return false;
      }
      return true;
    },
  });
}
