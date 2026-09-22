import { useEffect } from "react";

type QueryKey = readonly unknown[];

type RequestRecord = {
  method: string;
  url: string;
  endpoint: string;
  status: number | null;
  durationMs: number;
  error?: string;
  at: string;
};

type QueryObserverRecord = {
  event: "added" | "removed";
  key: string;
  endpoint: string;
  label: string;
  stackHint: string[];
  at: string;
};

type QueryFetchRecord = {
  key: string;
  endpoint: string;
  action: string;
  at: string;
};

type DebugState = {
  startedAt: string;
  requests: RequestRecord[];
  queryObservers: QueryObserverRecord[];
  queryFetches: QueryFetchRecord[];
  componentMounts: Record<string, { mounted: number; unmounted: number; active: number }>;
};

type RequestDebugBridge = {
  recordRequest: (record: Omit<RequestRecord, "endpoint" | "at">) => void;
  getReport: () => unknown;
  printReport: () => void;
  reset: () => void;
};

const BRIDGE_KEY = "__ANIMPACT_REQUEST_DEBUG__";
const REPORT_KEY = "__ANIMPACT_429_REPORT__";

function getGlobal(): typeof globalThis & {
  [BRIDGE_KEY]?: RequestDebugBridge;
  [REPORT_KEY]?: () => unknown;
} {
  return globalThis as typeof globalThis & {
    [BRIDGE_KEY]?: RequestDebugBridge;
    [REPORT_KEY]?: () => unknown;
  };
}

function now() {
  return new Date().toISOString();
}

function normalizeEndpoint(url: string) {
  try {
    return new URL(url, window.location.origin).pathname;
  } catch {
    return url.split("?")[0];
  }
}

function keyString(queryKey: QueryKey) {
  return JSON.stringify(queryKey);
}

function endpointFromKey(queryKey: QueryKey) {
  const first = queryKey[0];
  return typeof first === "string" ? normalizeEndpoint(first) : keyString(queryKey);
}

function stackHint() {
  const stack = new Error().stack ?? "";
  return stack
    .split("\n")
    .slice(2, 14)
    .map((line) => line.trim())
    .filter((line) => !line.includes("requestDebug"))
    .slice(0, 6);
}

let state: DebugState | null = null;
let reportTimer: ReturnType<typeof setTimeout> | null = null;

function ensureState() {
  if (!state) {
    state = {
      startedAt: now(),
      requests: [],
      queryObservers: [],
      queryFetches: [],
      componentMounts: {},
    };
  }
  return state;
}

function getReport() {
  const current = ensureState();
  const requestsByEndpoint: Record<string, {
    total: number;
    statuses: Record<string, number>;
    errors: number;
    totalDurationMs: number;
  }> = {};

  for (const request of current.requests) {
    const bucket = requestsByEndpoint[request.endpoint] ??= {
      total: 0,
      statuses: {},
      errors: 0,
      totalDurationMs: 0,
    };
    bucket.total += 1;
    bucket.totalDurationMs += request.durationMs;
    if (request.error) bucket.errors += 1;
    const status = String(request.status ?? "network-error");
    bucket.statuses[status] = (bucket.statuses[status] ?? 0) + 1;
  }

  const observersByKey: Record<string, {
    endpoint: string;
    added: number;
    removed: number;
    active: number;
    labels: Record<string, number>;
    stackHints: string[][];
  }> = {};

  for (const event of current.queryObservers) {
    const bucket = observersByKey[event.key] ??= {
      endpoint: event.endpoint,
      added: 0,
      removed: 0,
      active: 0,
      labels: {},
      stackHints: [],
    };
    if (event.event === "added") {
      bucket.added += 1;
      bucket.active += 1;
      bucket.labels[event.label] = (bucket.labels[event.label] ?? 0) + 1;
      if (event.stackHint.length > 0) bucket.stackHints.push(event.stackHint);
    } else {
      bucket.removed += 1;
      bucket.active = Math.max(0, bucket.active - 1);
    }
  }

  const fetchesByKey: Record<string, { endpoint: string; total: number }> = {};
  for (const event of current.queryFetches) {
    const bucket = fetchesByKey[event.key] ??= { endpoint: event.endpoint, total: 0 };
    bucket.total += 1;
  }

  return {
    startedAt: current.startedAt,
    elapsedMs: Date.now() - new Date(current.startedAt).getTime(),
    requestsByEndpoint,
    queryObserversByKey: observersByKey,
    queryFetchesByKey: fetchesByKey,
    componentMounts: current.componentMounts,
    raw: {
      requests: current.requests,
      queryObservers: current.queryObservers,
      queryFetches: current.queryFetches,
    },
  };
}

function printReport() {
  const report = getReport() as {
    startedAt: string;
    elapsedMs: number;
    requestsByEndpoint: Record<string, unknown>;
    queryObserversByKey: Record<string, {
      endpoint: string;
      added: number;
      removed: number;
      active: number;
      labels: Record<string, number>;
    }>;
    queryFetchesByKey: Record<string, unknown>;
    componentMounts: Record<string, unknown>;
  };
  const compactReport = {
    startedAt: report.startedAt,
    elapsedMs: report.elapsedMs,
    requestsByEndpoint: report.requestsByEndpoint,
    queryObserversByKey: Object.fromEntries(
      Object.entries(report.queryObserversByKey).map(([key, value]) => [
        key,
        {
          endpoint: value.endpoint,
          added: value.added,
          removed: value.removed,
          active: value.active,
          labels: value.labels,
        },
      ]),
    ),
    queryFetchesByKey: report.queryFetchesByKey,
    componentMounts: report.componentMounts,
  };
  console.groupCollapsed("[429-debug] rapport courant");
  console.log("[429-debug] report-json", JSON.stringify(compactReport));
  console.groupEnd();
  return report;
}

export function installRequestDebug() {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  const global = getGlobal();
  if (global[BRIDGE_KEY]) return;

  const bridge: RequestDebugBridge = {
    recordRequest(record) {
      ensureState().requests.push({
        ...record,
        endpoint: normalizeEndpoint(record.url),
        at: now(),
      });
      if (reportTimer) clearTimeout(reportTimer);
      reportTimer = setTimeout(() => {
        reportTimer = null;
        printReport();
      }, 1200);
    },
    getReport,
    printReport,
    reset() {
      if (reportTimer) clearTimeout(reportTimer);
      reportTimer = null;
      state = {
        startedAt: now(),
        requests: [],
        queryObservers: [],
        queryFetches: [],
        componentMounts: {},
      };
    },
  };

  global[BRIDGE_KEY] = bridge;
  global[REPORT_KEY] = getReport;
  console.info(
    "[429-debug] instrumentation active. Use window.__ANIMPACT_429_REPORT__() for the full report.",
  );
}

export function recordQueryObserver(
  event: "added" | "removed",
  queryKey: QueryKey,
  label?: string,
) {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  ensureState().queryObservers.push({
    event,
    key: keyString(queryKey),
    endpoint: endpointFromKey(queryKey),
    label: label || "unlabeled",
    stackHint: event === "added" ? stackHint() : [],
    at: now(),
  });
}

export function recordQueryFetch(queryKey: QueryKey, action: string) {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  ensureState().queryFetches.push({
    key: keyString(queryKey),
    endpoint: endpointFromKey(queryKey),
    action,
    at: now(),
  });
}

export function useDebugMount(label: string) {
  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === "undefined") return;
    const current = ensureState().componentMounts[label] ??= {
      mounted: 0,
      unmounted: 0,
      active: 0,
    };
    current.mounted += 1;
    current.active += 1;
    return () => {
      current.unmounted += 1;
      current.active = Math.max(0, current.active - 1);
    };
  }, [label]);
}