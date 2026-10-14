import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { createAcceptInvitationHandler } from "../routes/members";
import { createPendingInvitationHandler } from "../routes/users";

type AcceptDependencies = NonNullable<Parameters<typeof createAcceptInvitationHandler>[0]>;
type PendingDependencies = NonNullable<Parameters<typeof createPendingInvitationHandler>[0]>;
type Invitation = NonNullable<Awaited<ReturnType<AcceptDependencies["findInvitation"]>>>;
type InvitationUser = Awaited<ReturnType<AcceptDependencies["getUser"]>>;

const organizationId = 42;
const userEmail = "invitee@example.test";

function makeInvitation(
  overrides: Partial<Invitation> = {},
): Invitation {
  return {
    id: 7,
    organizationId,
    email: userEmail,
    memberId: 9,
    role: "admin",
    status: "pending",
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    updatedAt: new Date(),
    clerkInvitationId: "clerk-invite-7",
    invitedByUserId: 1,
    ...overrides,
  } as Invitation;
}

function makeUser(primaryOrganizationId: number | null = null): InvitationUser {
  return {
    id: 3,
    email: userEmail,
    primaryOrganizationId,
  } as InvitationUser;
}

function makeRequest(id = organizationId): Request {
  return {
    params: { id: String(id) },
    clerkUserId: "clerk-user-3",
  } as unknown as Request;
}

function makeResponse() {
  const result: { statusCode: number; body: unknown; response: Response } = {
    statusCode: 200,
    body: undefined,
    response: undefined as unknown as Response,
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

function makeAcceptHarness(options: {
  userOrganizationId?: number | null;
  initialMembershipRole?: string;
  invitation?: Invitation;
  expiredInvitation?: Invitation;
} = {}) {
  const state = {
    userOrganizationId: options.userOrganizationId ?? null,
    membershipRole: options.initialMembershipRole,
    invitation: options.invitation,
    expiredInvitation: options.expiredInvitation,
    acceptedCount: 0,
    expiredCount: 0,
    lookupStatuses: [] as string[],
  };
  const dependencies: AcceptDependencies = {
    getUser: async () => makeUser(state.userOrganizationId),
    findActiveMembership: async () => state.membershipRole
      ? { role: state.membershipRole }
      : undefined,
    findInvitation: async (_orgId, _email, status) => {
      state.lookupStatuses.push(status);
      return status === "pending" ? state.invitation : state.expiredInvitation;
    },
    markInvitationExpired: async () => {
      state.expiredCount++;
    },
    acceptInvitation: async (_userId, orgId) => {
      state.acceptedCount++;
      state.userOrganizationId = orgId;
      state.membershipRole = "admin";
      state.invitation = undefined;
    },
  };
  return { state, handler: createAcceptInvitationHandler(dependencies) };
}

test("acceptation sans invitation répond 404", async () => {
  const { state, handler } = makeAcceptHarness();
  const response = makeResponse();

  await handler(makeRequest(), response.response);

  assert.equal(response.statusCode, 404);
  assert.deepEqual(response.body, {
    code: "INVITATION_NOT_FOUND",
    error: "Aucune invitation en attente ne correspond à ce compte.",
  });
  assert.deepEqual(state.lookupStatuses, ["pending", "expired"]);
  assert.equal(state.acceptedCount, 0);
});

test("acceptation d'une invitation expirée répond 410 et la marque expirée", async () => {
  const invitation = makeInvitation({ expiresAt: new Date(Date.now() - 1_000) });
  const { state, handler } = makeAcceptHarness({ invitation });
  const response = makeResponse();

  await handler(makeRequest(), response.response);

  assert.equal(response.statusCode, 410);
  assert.equal((response.body as { code: string }).code, "INVITATION_EXPIRED");
  assert.equal(state.expiredCount, 1);
  assert.equal(state.acceptedCount, 0);
});

test("réessayer une invitation acceptée répond de façon idempotente", async () => {
  const { state, handler } = makeAcceptHarness({
    invitation: makeInvitation(),
  });
  const firstResponse = makeResponse();
  const secondResponse = makeResponse();

  await handler(makeRequest(), firstResponse.response);
  await handler(makeRequest(), secondResponse.response);

  assert.equal(firstResponse.statusCode, 200);
  assert.deepEqual(firstResponse.body, { organizationId, role: "admin" });
  assert.equal(secondResponse.statusCode, 200);
  assert.deepEqual(secondResponse.body, firstResponse.body);
  assert.equal(state.acceptedCount, 1);
  assert.deepEqual(state.lookupStatuses, ["pending"]);
});

test("un compte déjà rattaché à une autre organisation répond 409", async () => {
  const { state, handler } = makeAcceptHarness({ userOrganizationId: 99 });
  const response = makeResponse();

  await handler(makeRequest(), response.response);

  assert.equal(response.statusCode, 409);
  assert.equal((response.body as { code: string }).code, "INVITATION_OTHER_ORGANIZATION");
  assert.equal(state.acceptedCount, 0);
  assert.deepEqual(state.lookupStatuses, []);
});

test("la route utilisateur signale aussi une invitation expirée avec 410", async () => {
  const invitation = makeInvitation({ expiresAt: new Date(Date.now() - 1_000) });
  let markedExpired = false;
  const dependencies: PendingDependencies = {
    getUser: async () => makeUser(),
    hasActiveMembership: async () => false,
    findInvitation: async (_email, status) => status === "pending" ? invitation : undefined,
    markInvitationExpired: async () => {
      markedExpired = true;
    },
  };
  const handler = createPendingInvitationHandler(dependencies);
  const response = makeResponse();

  await handler(makeRequest(), response.response);

  assert.equal(response.statusCode, 410);
  assert.equal((response.body as { code: string }).code, "INVITATION_EXPIRED");
  assert.equal(markedExpired, true);
});

test("la route utilisateur répond 410 pour une invitation déjà marquée expirée", async () => {
  const expiredInvitation = makeInvitation({
    memberId: null,
    status: "expired",
    expiresAt: new Date(Date.now() - 1_000),
  });
  const dependencies: PendingDependencies = {
    getUser: async () => makeUser(),
    hasActiveMembership: async () => false,
    findInvitation: async (_email, status) => status === "expired" ? expiredInvitation : undefined,
    markInvitationExpired: async () => assert.fail("l'invitation est déjà expirée"),
  };
  const handler = createPendingInvitationHandler(dependencies);
  const response = makeResponse();

  await handler(makeRequest(), response.response);

  assert.equal(response.statusCode, 410);
  assert.equal((response.body as { code: string }).code, "INVITATION_EXPIRED");
});

test("la route utilisateur n'expose pas d'invitation acceptée comme invitation en attente", async () => {
  const dependencies: PendingDependencies = {
    getUser: async () => makeUser(),
    hasActiveMembership: async () => false,
    findInvitation: async () => undefined,
    markInvitationExpired: async () => assert.fail("aucune expiration attendue"),
  };
  const handler = createPendingInvitationHandler(dependencies);
  const response = makeResponse();

  await handler(makeRequest(), response.response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { organizationId: null });
});
