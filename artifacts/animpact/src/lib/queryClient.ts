import {
  QueryClient,
  QueryCache,
  MutationCache,
  focusManager,
  onlineManager,
} from "@tanstack/react-query";
import { ApiError } from "@workspace/api-client-react";
import {
  installRequestDebug,
  recordQueryFetch,
  recordQueryObserver,
} from "./requestDebug";

installRequestDebug();

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

if (import.meta.env.DEV) {
  const observerAddedAt = new Map<string, number>();
  const invalidatedAt = new Map<string, number>();
  let externalCause: { value: "focus" | "reconnect"; until: number } | null = null;

  function debugNow() {
    return new Date().toISOString();
  }

  function debugKey(queryKey: readonly unknown[]) {
    return JSON.stringify(queryKey);
  }

  function logQueryDebug(
    event: string,
    queryKey: readonly unknown[],
    details: Record<string, unknown> = {},
  ) {
    console.info(`[429-debug] ${event}`, JSON.stringify({
      at: debugNow(),
      key: queryKey,
      ...details,
    }));
  }

  function inferFetchCause(key: string, now: number) {
    const invalidationTime = invalidatedAt.get(key);
    if (invalidationTime !== undefined && now - invalidationTime <= 1000) {
      return "invalidate";
    }

    if (externalCause && externalCause.until >= now) {
      return externalCause.value;
    }

    const observerTime = observerAddedAt.get(key);
    if (observerTime !== undefined && now - observerTime <= 250) {
      return "observer-mount (inferred)";
    }

    return "unknown/manual (not exposed by QueryCache)";
  }

  focusManager.subscribe((focused) => {
    if (!focused) return;
    const now = Date.now();
    externalCause = { value: "focus", until: now + 1000 };
    console.info("[429-debug] refetch-trigger", JSON.stringify({
      at: debugNow(),
      cause: "focus",
    }));
  });

  onlineManager.subscribe((online) => {
    if (!online) return;
    const now = Date.now();
    externalCause = { value: "reconnect", until: now + 1000 };
    console.info("[429-debug] refetch-trigger", JSON.stringify({
      at: debugNow(),
      cause: "reconnect",
    }));
  });

  queryClient.getQueryCache().subscribe((event) => {
    const query = event.query;
    const key = debugKey(query.queryKey);
    const now = Date.now();

    if (event.type === "observerAdded" || event.type === "observerRemoved") {
      const observer = event.observer as {
        options?: { meta?: { debugLabel?: string } };
      };
      if (event.type === "observerAdded") {
        observerAddedAt.set(key, now);
      }
      recordQueryObserver(
        event.type === "observerAdded" ? "added" : "removed",
        query.queryKey,
        observer.options?.meta?.debugLabel,
      );
      logQueryDebug(
        event.type === "observerAdded" ? "observer-added" : "observer-removed",
        query.queryKey,
        {
          debugLabel: observer.options?.meta?.debugLabel ?? null,
          observers: query.getObserversCount(),
        },
      );
    }

    if (event.type === "updated") {
      const action = (event as {
        action?: {
          type?: string;
          meta?: unknown;
        };
      }).action;
      const actionType = action?.type;

      if (actionType === "invalidate") {
        invalidatedAt.set(key, now);
        logQueryDebug("query-invalidate", query.queryKey);
      }

      if (actionType === "fetch") {
        recordQueryFetch(query.queryKey, actionType);
        logQueryDebug("query-fetch-start", query.queryKey, {
          cause: inferFetchCause(key, now),
          fetchStatus: query.state.fetchStatus,
          status: query.state.status,
          actionMeta: action?.meta ?? null,
        });
      }
    }
  });
}
