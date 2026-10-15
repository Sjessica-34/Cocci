import assert from "node:assert/strict";
import test from "node:test";
import { resolveOrganizationLogoUrl } from "../lib/organizationLogo";

test("a saved Neon logo takes precedence over the Clerk image", () => {
  assert.equal(
    resolveOrganizationLogoUrl({
      selectedOrganization: { id: 10, logoUrl: "https://cdn.example/neon.png" },
      rootOrganizationId: 10,
      clerkOrganizationImageUrl: "https://img.clerk.com/root.png",
      isAdminView: false,
    }),
    "https://cdn.example/neon.png",
  );
});

test("the normal session uses its Clerk image only for the root organization", () => {
  assert.equal(
    resolveOrganizationLogoUrl({
      selectedOrganization: { id: 10, logoUrl: null },
      rootOrganizationId: 10,
      clerkOrganizationImageUrl: "https://img.clerk.com/root.png",
      isAdminView: false,
    }),
    "https://img.clerk.com/root.png",
  );
});

test("a subsidiary without its own Neon logo does not inherit the group's Clerk logo", () => {
  assert.equal(
    resolveOrganizationLogoUrl({
      selectedOrganization: { id: 11, logoUrl: null },
      rootOrganizationId: 10,
      clerkOrganizationImageUrl: "https://img.clerk.com/root.png",
      isAdminView: false,
    }),
    null,
  );
});

test("superadmin view never falls back to the administrator's Clerk image", () => {
  assert.equal(
    resolveOrganizationLogoUrl({
      selectedOrganization: { id: 20, logoUrl: null },
      rootOrganizationId: 20,
      clerkOrganizationImageUrl: "https://img.clerk.com/admin.png",
      isAdminView: true,
    }),
    null,
  );
});
