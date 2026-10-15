import assert from "node:assert/strict";
import test from "node:test";
import { decideGiftInvitationClaim, isGiftInvitationEmailVerified } from "../lib/giftInvitationPolicy.ts";

const now = new Date("2026-10-15T12:00:00Z");
const invite = (overrides = {}) => ({
  email: "client@example.com",
  expiresAt: new Date("2026-10-30T00:00:00Z"),
  claimedAt: null,
  revokedAt: null,
  organizationId: null,
  offerName: "1 à 5 salariés",
  ...overrides,
});
const input = (overrides = {}) => ({
  invite: invite(),
  verifiedEmails: ["client@example.com"],
  organizationId: 41,
  now,
  ...overrides,
});

test("la création d'une invitation ne dépend pas de l'existence d'un compte Clerk; l'activation compare les adresses normalisées", () => {
  assert.equal(isGiftInvitationEmailVerified("  Client@Example.com ", ["client@example.com"]), true);
  assert.equal(isGiftInvitationEmailVerified("new@example.com", []), false);
});

test("une invitation valide pour une adresse vérifiée peut être activée", () => {
  assert.equal(decideGiftInvitationClaim(input()), "eligible");
});

test("une adresse non vérifiée ou différente ne peut pas utiliser l'invitation", () => {
  assert.equal(decideGiftInvitationClaim(input({ verifiedEmails: [] })), "email_mismatch");
});

test("une invitation expirée ou révoquée est refusée", () => {
  assert.equal(
    decideGiftInvitationClaim(input({ invite: invite({ expiresAt: new Date("2026-10-15T11:59:59Z") }) })),
    "invalid_invitation",
  );
  assert.equal(
    decideGiftInvitationClaim(input({ invite: invite({ revokedAt: now }) })),
    "invalid_invitation",
  );
});

test("une souscription non gratuite n'est jamais remplacée par l'offre", () => {
  for (const mode of ["stripe", "invoice"]) {
    assert.equal(
      decideGiftInvitationClaim(input({ existingSubscription: { mode, offerName: "Cocci Pro" } })),
      "existing_non_free_subscription",
    );
  }
});

test("le rejeu du même lien est idempotent uniquement pour la même organisation et la même offre gratuite", () => {
  const claimedInvite = invite({ claimedAt: now, organizationId: 41 });
  assert.equal(decideGiftInvitationClaim(input({
    invite: claimedInvite,
    existingSubscription: { mode: "free", offerName: "1 à 5 salariés" },
  })), "already_claimed");
  assert.equal(decideGiftInvitationClaim(input({
    invite: claimedInvite,
    organizationId: 42,
    existingSubscription: { mode: "free", offerName: "1 à 5 salariés" },
  })), "invalid_invitation");
});

test("un abonnement gratuit explicitement présent reste compatible avec une offre autorisée", () => {
  assert.equal(decideGiftInvitationClaim(input({
    existingSubscription: { mode: "free", offerName: "Offre précédente" },
  })), "eligible");
});
