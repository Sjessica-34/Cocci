import assert from "node:assert/strict";
import { test } from "node:test";
import { getOrganizationRoleDenial } from "../lib/organizationRolePolicy";

test("owner and admin can manage additional organization users", () => {
  const allowedRoles = ["owner", "admin"] as const;

  assert.equal(getOrganizationRoleDenial("owner", allowedRoles), null);
  assert.equal(getOrganizationRoleDenial("admin", allowedRoles), null);
});

test("member, viewer, and missing membership are denied distinctly", () => {
  const allowedRoles = ["owner", "admin"] as const;

  assert.equal(getOrganizationRoleDenial("member", allowedRoles), "ORGANIZATION_ROLE_REQUIRED");
  assert.equal(getOrganizationRoleDenial("viewer", allowedRoles), "ORGANIZATION_ROLE_REQUIRED");
  assert.equal(getOrganizationRoleDenial(null, allowedRoles), "ORGANIZATION_MEMBERSHIP_REQUIRED");
});
