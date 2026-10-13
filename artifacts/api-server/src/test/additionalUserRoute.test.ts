import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import type Stripe from "stripe";
import {
  type Member,
  type User,
  onboardingProgressTable,
  pool,
  usersTable,
} from "@workspace/db";
import { getOrCreateUser } from "../lib/auth";
import { createInviteMemberHandler } from "../routes/members";
import {
  createAdditionalUserHandler,
  createRemoveAdditionalUserHandler,
} from "../routes/subscriptions";
import type { CatalogOffer } from "../stripeCatalog";

const offer: CatalogOffer = {
  offerName: "Cocci — Utilisateur supplémentaire",
  maxEmployees: null,
  effectifKey: null,
  action: "additional_user",
  productId: "prod_cocci",
  priceId: "price_additional_user",
};

function makeHarness(opts: {
  paymentFails?: boolean;
  failLocalUpdateOnce?: boolean;
  memberCount?: number;
  quantity?: number;
} = {}) {
  const state = {
    maxUsers: 11,
    quantity: opts.quantity ?? 1,
    memberCount: opts.memberCount ?? 10,
    commits: 0,
    rollbacks: 0,
    stripeUpdate: null as Stripe.SubscriptionUpdateParams | null,
    stripeUpdates: 0,
    stripeIdempotencyKeys: [] as string[],
    appliedStripeIdempotencyKeys: new Set<string>(),
    failLocalUpdateOnce: Boolean(opts.failLocalUpdateOnce),
    idempotencyKey: "00000000-0000-4000-8000-000000000001",
    requests: new Map<string, {
      status: string;
      stripe_subscription_id: string;
      stripe_update_params: Stripe.SubscriptionUpdateParams;
      max_users: number;
    }>(),
    statusCode: 200,
    body: undefined as unknown,
  };

  const client = {
    async query(query: string, values?: unknown[]) {
      if (query === "BEGIN" || query === "COMMIT" || query === "ROLLBACK") {
        if (query === "COMMIT") state.commits++;
        if (query === "ROLLBACK") state.rollbacks++;
        return { rows: [], rowCount: 0 };
      }
      if (query.includes("FROM subscriptions") && query.includes("FOR UPDATE")) {
        return {
          rows: [{
            mode: "stripe",
            status: "active",
            stripe_subscription_id: "sub_simulated",
            stripe_customer_id: "cus_simulated",
            max_users: state.maxUsers,
            override_max_users: null,
          }],
          rowCount: 1,
        };
      }
      if (query.includes("FROM additional_user_seat_requests")) {
        if (query.includes("idempotency_key = $2")) {
          const saved = state.requests.get(String(values?.[1]));
          return { rows: saved ? [saved] : [], rowCount: saved ? 1 : 0 };
        }
        const pending = [...state.requests.values()].filter((entry) => entry.status === "pending");
        return { rows: pending.map(() => ({ idempotency_key: "pending" })), rowCount: pending.length };
      }
      if (query.includes("INSERT INTO additional_user_seat_requests")) {
        state.requests.set(String(values?.[1]), {
          status: "pending",
          stripe_subscription_id: String(values?.[2]),
          stripe_update_params: JSON.parse(String(values?.[3])) as Stripe.SubscriptionUpdateParams,
          max_users: Number(values?.[4]),
        });
        return { rows: [], rowCount: 1 };
      }
      if (query.includes("UPDATE additional_user_seat_requests")) {
        const saved = state.requests.get(String(values?.[1]));
        if (saved) saved.status = query.includes("status = 'completed'") ? "completed" : "failed";
        return { rows: [], rowCount: saved ? 1 : 0 };
      }
      if (query.includes("FROM members")) {
        return {
          rows: [{ member_count: state.memberCount }],
          rowCount: 1,
        };
      }
      if (query.includes("UPDATE subscriptions")) {
        if (state.failLocalUpdateOnce) {
          state.failLocalUpdateOnce = false;
          throw new Error("Simulated local database failure");
        }
        state.maxUsers = Number(values?.[1]);
        return { rows: [], rowCount: 1 };
      }
      throw new Error(`Unexpected SQL in additional-user test: ${query}`);
    },
    release() {},
  };

  const stripe = {
    prices: {
      retrieve: async () => ({
        active: true,
        product: offer.productId,
        recurring: { interval: "month" },
        tax_behavior: "inclusive",
        currency: "eur",
        unit_amount: 300,
      }),
    },
    subscriptions: {
      retrieve: async () => ({
        id: "sub_simulated",
        customer: "cus_simulated",
        status: "active",
        metadata: { cocciBaseMaxUsers: "10" },
        items: {
          data: [{
            id: "si_additional_user",
            price: { id: offer.priceId },
            quantity: state.quantity,
          }],
        },
      }),
      update: async (
        _id: string,
        params: Stripe.SubscriptionUpdateParams,
        options?: Stripe.RequestOptions,
      ) => {
        state.stripeUpdates++;
        state.stripeIdempotencyKeys.push(options?.idempotencyKey ?? "");
        state.stripeUpdate = params;
        if (opts.paymentFails) {
          throw Object.assign(new Error("The invoice payment was declined"), { statusCode: 402 });
        }
        const idempotencyKey = options?.idempotencyKey ?? "";
        if (!state.appliedStripeIdempotencyKeys.has(idempotencyKey)) {
          state.appliedStripeIdempotencyKeys.add(idempotencyKey);
          const item = params.items?.[0];
          if (item && "quantity" in item && item.quantity !== undefined) {
            state.quantity = item.quantity;
          } else if (item && "deleted" in item && item.deleted) {
            state.quantity = 0;
          }
        }
        return {} as Stripe.Subscription;
      },
    },
  } as unknown as Stripe;

  const handler = createAdditionalUserHandler({
    connect: (async () => client) as typeof pool.connect,
    getBillingOrganizationId: async (orgId) => orgId,
    getStripe: () => stripe,
    resolveOffer: () => offer,
  });
  const removeHandler = createRemoveAdditionalUserHandler({
    connect: (async () => client) as typeof pool.connect,
    getBillingOrganizationId: async (orgId) => orgId,
    getStripe: () => stripe,
    resolveOffer: () => offer,
  });
  const response = {
    status(code: number) {
      state.statusCode = code;
      return this;
    },
    json(body: unknown) {
      state.body = body;
      return this;
    },
  } as unknown as Response;
  const request = {
    orgId: 42,
    get(name: string) {
      return name.toLowerCase() === "idempotency-key" ? state.idempotencyKey : undefined;
    },
  } as unknown as Request;

  return { handler, removeHandler, request, response, state };
}

test("ajoute un siège après acceptation du paiement et applique la limite une seule fois", async () => {
  const { handler, request, response, state } = makeHarness();

  await handler(request, response);

  assert.equal(state.statusCode, 200);
  assert.deepEqual(state.body, { maxUsers: 12 });
  assert.equal(state.maxUsers, 12);
  assert.equal(state.quantity, 2);
  assert.equal(state.commits, 2);
  assert.equal(state.rollbacks, 0);
  assert.equal(state.stripeUpdates, 1);
  assert.equal(state.requests.get(state.idempotencyKey)?.status, "completed");
  assert.equal(state.stripeUpdate?.proration_behavior, "always_invoice");
  assert.equal(state.stripeUpdate?.payment_behavior, "error_if_incomplete");
});

test("une réponse perdue puis rejouée renvoie le résultat initial sans rappeler Stripe", async () => {
  const { handler, request, response, state } = makeHarness();

  await handler(request, response);
  const originalResult = state.body;
  state.body = undefined;
  await handler(request, response);

  assert.equal(state.statusCode, 200);
  assert.deepEqual(state.body, originalResult);
  assert.equal(state.stripeUpdates, 1);
  assert.equal(state.quantity, 2);
  assert.equal(state.maxUsers, 12);
});

test("un replay reprend une mise à jour Stripe acceptée avant une panne locale", async () => {
  const { handler, request, response, state } = makeHarness({ failLocalUpdateOnce: true });

  await handler(request, response);
  assert.equal(state.statusCode, 500);
  assert.equal(state.quantity, 2);
  assert.equal(state.maxUsers, 11);
  assert.equal(state.requests.get(state.idempotencyKey)?.status, "pending");

  state.statusCode = 200;
  state.body = undefined;
  await handler(request, response);

  assert.equal(state.statusCode, 200);
  assert.deepEqual(state.body, { maxUsers: 12 });
  assert.equal(state.quantity, 2);
  assert.equal(state.maxUsers, 12);
  assert.equal(state.stripeUpdates, 2);
  assert.equal(state.stripeIdempotencyKeys[0], state.stripeIdempotencyKeys[1]);
  assert.equal(state.requests.get(state.idempotencyKey)?.status, "completed");
});

test("un achat ultérieur avec une nouvelle clé ajoute un siège supplémentaire", async () => {
  const { handler, request, response, state } = makeHarness();

  await handler(request, response);
  const firstKey = state.idempotencyKey;
  state.idempotencyKey = "00000000-0000-4000-8000-000000000002";
  await handler(request, response);

  assert.equal(state.statusCode, 200);
  assert.deepEqual(state.body, { maxUsers: 13 });
  assert.equal(state.quantity, 3);
  assert.equal(state.maxUsers, 13);
  assert.equal(state.stripeUpdates, 2);
  assert.notEqual(state.stripeIdempotencyKeys[0], state.stripeIdempotencyKeys[1]);
  assert.equal(state.requests.get(firstKey)?.status, "completed");
  assert.equal(state.requests.get(state.idempotencyKey)?.status, "completed");
});

test("un paiement refusé ne valide ni la quantité ni la limite locale", async () => {
  const { handler, request, response, state } = makeHarness({ paymentFails: true });

  await handler(request, response);

  assert.equal(state.statusCode, 402);
  assert.deepEqual(state.body, { error: "Stripe could not complete the seat purchase" });
  assert.equal(state.maxUsers, 11);
  assert.equal(state.quantity, 1);
  assert.equal(state.commits, 2);
  assert.equal(state.rollbacks, 0);
  assert.equal(state.requests.get(state.idempotencyKey)?.status, "failed");
});

test("retire un siège et synchronise la limite après acceptation de Stripe", async () => {
  const { removeHandler, request, response, state } = makeHarness();

  await removeHandler(request, response);

  assert.equal(state.statusCode, 200);
  assert.deepEqual(state.body, { maxUsers: 10 });
  assert.equal(state.maxUsers, 10);
  assert.equal(state.quantity, 0);
  assert.equal(state.commits, 1);
  assert.equal(state.rollbacks, 0);
  assert.equal(state.stripeUpdate?.proration_behavior, "always_invoice");
  assert.equal(state.stripeUpdate?.payment_behavior, "error_if_incomplete");
  assert.deepEqual(state.stripeUpdate?.items, [{ id: "si_additional_user", deleted: true }]);
});

test("refuse le retrait si le quota tomberait sous les membres actifs ou invités", async () => {
  const { removeHandler, request, response, state } = makeHarness({ memberCount: 11 });

  await removeHandler(request, response);

  assert.equal(state.statusCode, 409);
  assert.deepEqual(state.body, {
    error: "USER_LIMIT_BELOW_CURRENT_MEMBERS",
    memberCount: 11,
    maxUsers: 10,
  });
  assert.equal(state.maxUsers, 11);
  assert.equal(state.quantity, 1);
  assert.equal(state.stripeUpdate, null);
  assert.equal(state.commits, 0);
  assert.equal(state.rollbacks, 1);
});

test("un échec Stripe ne diminue ni la quantité ni le quota local", async () => {
  const { removeHandler, request, response, state } = makeHarness({ paymentFails: true });

  await removeHandler(request, response);

  assert.equal(state.statusCode, 500);
  assert.deepEqual(state.body, { error: "Unable to remove the additional user" });
  assert.equal(state.maxUsers, 11);
  assert.equal(state.quantity, 1);
  assert.equal(state.commits, 0);
  assert.equal(state.rollbacks, 1);
});

test("retire un seul siège quand plusieurs sièges payants sont présents", async () => {
  const { removeHandler, request, response, state } = makeHarness({ quantity: 3 });

  await removeHandler(request, response);

  assert.equal(state.statusCode, 200);
  assert.deepEqual(state.body, { maxUsers: 12 });
  assert.equal(state.maxUsers, 12);
  assert.equal(state.quantity, 2);
  assert.deepEqual(state.stripeUpdate?.items, [{ id: "si_additional_user", quantity: 2 }]);
});

test("un siège payé est invité puis rattaché à la même organisation après acceptation", async () => {
  const { handler: purchaseSeat, request: purchaseRequest, response: purchaseResponse, state: billing } =
    makeHarness();
  const invitationState = {
    users: [] as User[],
    members: [] as Member[],
    nextUserId: 1,
    nextMemberId: 1,
    failedInvitationOnce: true,
    invitationRequests: [] as Array<{
      emailAddress: string;
      notify: boolean;
      ignoreExisting: boolean;
      publicMetadata: { cocciOrganizationId: number; cocciRole: string };
    }>,
  };
  const invite = createInviteMemberHandler({
    getEffectiveMaxUsers: async () => billing.maxUsers,
    countMembers: async () => 10 + invitationState.members.length,
    findUserByEmail: async (email) =>
      invitationState.users.find((user) => user.email === email),
    createPlaceholderUser: async (email, organizationId) => {
      const user = {
        id: invitationState.nextUserId++,
        clerkId: `invited_${invitationState.nextUserId}`,
        email,
        firstName: null,
        lastName: null,
        avatarUrl: null,
        isSuperAdmin: false,
        primaryOrganizationId: organizationId,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      invitationState.users.push(user);
      return user;
    },
    findCurrentMembership: async (userId) => {
      const membership = invitationState.members.find((member) => member.userId === userId);
      return membership ? { organizationId: membership.organizationId } : undefined;
    },
    createMembership: async (input) => {
      const member = {
        ...input,
        id: invitationState.nextMemberId++,
        archivedAt: null,
        createdAt: new Date(),
      };
      invitationState.members.push(member);
      return member;
    },
    setPrimaryOrganization: async (userId, organizationId) => {
      const user = invitationState.users.find((entry) => entry.id === userId)!;
      user.primaryOrganizationId = organizationId;
      return user;
    },
    sendInvitation: async (input) => {
      invitationState.invitationRequests.push(input);
      if (invitationState.failedInvitationOnce) {
        invitationState.failedInvitationOnce = false;
        throw new Error("Clerk unavailable");
      }
      return {};
    },
    deleteMembership: async (memberId) => {
      invitationState.members = invitationState.members.filter((member) => member.id !== memberId);
    },
    deleteUser: async (userId) => {
      invitationState.users = invitationState.users.filter((user) => user.id !== userId);
    },
  });
  const inviteRequest = {
    params: { id: "42" },
    body: { email: "new.person@example.com", role: "admin" },
    log: { error() {} },
  } as unknown as Request;
  const inviteResponse = makeResponse();

  await purchaseSeat(purchaseRequest, purchaseResponse);
  assert.equal(billing.stripeUpdates, 1);
  assert.equal(billing.quantity, 2);
  assert.equal(billing.maxUsers, 12);

  await invite(inviteRequest, inviteResponse.response, () => {});
  assert.equal(inviteResponse.statusCode, 502);
  assert.equal(billing.stripeUpdates, 1);
  assert.equal(billing.quantity, 2);
  assert.equal(invitationState.users.length, 0);
  assert.equal(invitationState.members.length, 0);

  inviteResponse.reset();
  await invite(inviteRequest, inviteResponse.response, () => {});
  assert.equal(inviteResponse.statusCode, 201);
  assert.equal(billing.stripeUpdates, 1);
  assert.equal(billing.quantity, 2);
  assert.equal(invitationState.users.length, 1);
  assert.equal(invitationState.members.length, 1);
  assert.equal(invitationState.members[0]?.organizationId, 42);
  assert.equal(invitationState.members[0]?.role, "admin");
  assert.equal(invitationState.members[0]?.status, "invited");
  assert.deepEqual(invitationState.invitationRequests[1], {
    emailAddress: "new.person@example.com",
    notify: true,
    ignoreExisting: true,
    publicMetadata: { cocciOrganizationId: 42, cocciRole: "admin" },
  });

  const transaction = {
    execute: async () => undefined,
    select: () => {
      let joined = false;
      return {
        from() {
          return this;
        },
        innerJoin() {
          joined = true;
          return this;
        },
        where() {
          return this;
        },
        limit: async () => {
          if (!joined) return [];
          const user = invitationState.users.find(
            (candidate) =>
              candidate.email === "new.person@example.com" &&
              candidate.clerkId.startsWith("invited_"),
          );
          const member = invitationState.members.find(
            (candidate) => candidate.userId === user?.id && candidate.status === "invited",
          );
          return user && member ? [{ user, member }] : [];
        },
      };
    },
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: () => {
          if (table === usersTable) {
            return {
              returning: async () => {
                const user = invitationState.users[0]!;
                Object.assign(user, values);
                return [user];
              },
            };
          }
          const member = invitationState.members[0]!;
          Object.assign(member, values);
          return Promise.resolve([]);
        },
      }),
    }),
    insert: (table: unknown) => ({
      values: () => ({
        onConflictDoNothing: async () => {
          assert.equal(table, onboardingProgressTable);
        },
      }),
    }),
  };
  const acceptedUser = await getOrCreateUser(
    "clerk_accepted_user",
    undefined,
    {
      transaction: async (callback) => callback(transaction),
      getClerkUser: async () => ({
        primaryEmailAddress: { emailAddress: "New.Person@Example.com" },
        emailAddresses: [{ emailAddress: "New.Person@Example.com" }],
        firstName: "New",
        lastName: "Person",
        imageUrl: "https://example.test/avatar.png",
      }),
    },
  );

  assert.equal(acceptedUser.email, "new.person@example.com");
  assert.equal(acceptedUser.clerkId, "clerk_accepted_user");
  assert.equal(acceptedUser.primaryOrganizationId, 42);
  assert.equal(invitationState.members[0]?.userId, acceptedUser.id);
  assert.equal(invitationState.members[0]?.organizationId, 42);
  assert.equal(invitationState.members[0]?.role, "admin");
  assert.equal(invitationState.members[0]?.status, "active");
  assert.equal(billing.stripeUpdates, 1);
  assert.equal(billing.quantity, 2);
});

function makeResponse() {
  const result: {
    statusCode: number;
    body: unknown;
    response: Response;
    reset(): void;
  } = {
    statusCode: 200,
    body: undefined,
    response: undefined as unknown as Response,
    reset() {
      result.statusCode = 200;
      result.body = undefined;
    },
  };
  result.response = {
    status(code: number) {
      result.statusCode = code;
      return this;
    },
    json(body: unknown) {
      result.body = body;
      return this;
    },
  } as unknown as Response;
  return result;
}
