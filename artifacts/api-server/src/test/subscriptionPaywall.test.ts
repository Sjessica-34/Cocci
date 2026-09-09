import assert from "node:assert/strict";
import test from "node:test";
import type { NextFunction, Request, Response } from "express";
import { pool } from "@workspace/db";
import router from "../routes";
import {
  hasActiveSubscriptionStatus,
  requireActiveSubscription,
} from "../middlewares/requireActiveSubscription";

test("une organisation sans abonnement n'a pas accès aux routes métier", async () => {
  const originalQuery = pool.query;
  let statusCode: number | undefined;
  let responseBody: unknown;
  let nextCalled = false;

  (pool as typeof pool & { query: typeof pool.query }).query = (async (query: unknown) => {
    if (String(query).includes("FROM users")) {
      return { rows: [{ is_super_admin: false }] } as never;
    }
    return { rows: [] } as never;
  }) as typeof pool.query;

  const auth = Object.assign(
    () => ({
      userId: "clerk_test_user",
      sessionId: "sess_test",
      tokenType: "session_token",
      isAuthenticated: true,
    }),
    { [Symbol.for("@clerk/express.auth")]: true },
  );
  const req = {
    auth,
    orgId: 42,
  } as unknown as Request;
  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: unknown) {
      responseBody = body;
      return this;
    },
  } as unknown as Response;
  const next: NextFunction = () => {
    nextCalled = true;
  };

  try {
    await requireActiveSubscription(req, res, next);
  } finally {
    (pool as typeof pool & { query: typeof pool.query }).query = originalQuery;
  }

  assert.equal(statusCode, 402);
  assert.deepEqual(responseBody, {
    error: "subscription_required",
    message: "Un abonnement actif est requis pour accéder à cette ressource.",
  });
  assert.equal(nextCalled, false);
});

test("un abonnement actif laisse passer le middleware workspace", async () => {
  const originalQuery = pool.query;
  let nextCalled = false;

  (pool as typeof pool & { query: typeof pool.query }).query = (async (query: unknown) => {
    if (String(query).includes("FROM users")) {
      return { rows: [{ is_super_admin: false }] } as never;
    }
    return { rows: [{ status: "active" }] } as never;
  }) as typeof pool.query;

  const auth = Object.assign(
    () => ({
      userId: "clerk_test_user",
      sessionId: "sess_test",
      tokenType: "session_token",
      isAuthenticated: true,
    }),
    { [Symbol.for("@clerk/express.auth")]: true },
  );
  const req = { auth, orgId: 42 } as unknown as Request;
  const res = {} as Response;

  try {
    await requireActiveSubscription(req, res, () => {
      nextCalled = true;
    });
  } finally {
    (pool as typeof pool & { query: typeof pool.query }).query = originalQuery;
  }

  assert.equal(nextCalled, true);
});

test("l'abonnement du groupe racine autorise l'accès d'une filiale", async () => {
  const originalQuery = pool.query;
  let queriedSubscriptionOrgId: number | undefined;
  let nextCalled = false;

  (pool as typeof pool & { query: typeof pool.query }).query = (async (
    query: unknown,
    values?: unknown[],
  ) => {
    const text = String(query);
    if (text.includes("FROM users")) {
      return { rows: [{ is_super_admin: false }] } as never;
    }
    if (text.includes("FROM organizations")) {
      return { rows: [{ billing_org_id: 7 }] } as never;
    }
    if (text.includes("FROM subscriptions")) {
      queriedSubscriptionOrgId = values?.[0] as number;
      return { rows: [{ status: "active" }] } as never;
    }
    return { rows: [] } as never;
  }) as typeof pool.query;

  const auth = Object.assign(
    () => ({
      userId: "clerk_test_user",
      sessionId: "sess_test",
      tokenType: "session_token",
      isAuthenticated: true,
    }),
    { [Symbol.for("@clerk/express.auth")]: true },
  );
  const req = { auth, orgId: 42 } as unknown as Request;
  const res = {} as Response;

  try {
    await requireActiveSubscription(req, res, () => {
      nextCalled = true;
    });
  } finally {
    (pool as typeof pool & { query: typeof pool.query }).query = originalQuery;
  }

  assert.equal(queriedSubscriptionOrgId, 7);
  assert.equal(nextCalled, true);
});

test("les statuts actifs et trial sont les seuls statuts autorisant le workspace", () => {
  assert.equal(hasActiveSubscriptionStatus("active"), true);
  assert.equal(hasActiveSubscriptionStatus("trial"), true);
  assert.equal(hasActiveSubscriptionStatus(null), false);
  assert.equal(hasActiveSubscriptionStatus(undefined), false);
  assert.equal(hasActiveSubscriptionStatus("suspended"), false);
  assert.equal(hasActiveSubscriptionStatus("expired"), false);
});

test("les routes de statut et de Checkout sont montées avant le paywall", () => {
  const layers = (router as unknown as {
    stack: Array<{
      handle?: {
        stack?: Array<{ route?: { path?: string } }>;
      };
      name?: string;
    }>;
  }).stack;
  const subscriptionRouterIndex = layers.findIndex((layer) => {
    const paths = layer.handle?.stack
      ?.map((nestedLayer) => nestedLayer.route?.path)
      .filter((path): path is string => Boolean(path));
    return paths?.includes("/organizations/:orgId/subscription")
      && paths.includes("/organizations/:orgId/stripe/checkout");
  });
  const paywallIndex = layers.findIndex(
    (layer) => layer.name === "requireActiveSubscriptionExceptOrganizationSetup",
  );

  assert.notEqual(subscriptionRouterIndex, -1);
  assert.notEqual(paywallIndex, -1);
  assert.ok(subscriptionRouterIndex < paywallIndex);
});