export type OrganizationMemberRole = "owner" | "admin" | "member" | "viewer";

export type OrganizationRoleDenial =
  | "ORGANIZATION_MEMBERSHIP_REQUIRED"
  | "ORGANIZATION_ROLE_REQUIRED";

export function getOrganizationRoleDenial(
  role: string | null,
  allowedRoles?: readonly OrganizationMemberRole[],
): OrganizationRoleDenial | null {
  if (!role) return "ORGANIZATION_MEMBERSHIP_REQUIRED";
  if (allowedRoles && !allowedRoles.includes(role as OrganizationMemberRole)) {
    return "ORGANIZATION_ROLE_REQUIRED";
  }
  return null;
}
