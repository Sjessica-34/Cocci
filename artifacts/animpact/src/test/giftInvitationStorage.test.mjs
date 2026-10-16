import assert from "node:assert/strict";
import test from "node:test";
import {
  clearGiftInvitationToken,
  GIFT_INVITATION_STORAGE_KEY,
  readGiftInvitationToken,
  saveGiftInvitationToken,
} from "../lib/giftInvitationStorage.ts";

function createStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test("l’invitation reste disponible dans un nouvel onglet après le retour Clerk", () => {
  const sessionStorage = createStorage();
  const localStorage = createStorage();
  globalThis.window = { sessionStorage, localStorage };

  saveGiftInvitationToken("gift-token");
  sessionStorage.removeItem(GIFT_INVITATION_STORAGE_KEY);

  assert.equal(readGiftInvitationToken(), "gift-token");
  delete globalThis.window;
});

test("l’activation ou l’invalidation efface le jeton des deux stockages", () => {
  const sessionStorage = createStorage();
  const localStorage = createStorage();
  globalThis.window = { sessionStorage, localStorage };

  saveGiftInvitationToken("gift-token");
  clearGiftInvitationToken();

  assert.equal(sessionStorage.getItem(GIFT_INVITATION_STORAGE_KEY), null);
  assert.equal(localStorage.getItem(GIFT_INVITATION_STORAGE_KEY), null);
  delete globalThis.window;
});
