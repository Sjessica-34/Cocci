type OrganizationLogoSource = {
  id: number;
  logoUrl?: string | null;
};

export function resolveOrganizationLogoUrl({
  selectedOrganization,
  rootOrganizationId,
  clerkOrganizationImageUrl,
  isAdminView,
}: {
  selectedOrganization: OrganizationLogoSource | null;
  rootOrganizationId: number | null;
  clerkOrganizationImageUrl: string | null | undefined;
  isAdminView: boolean;
}): string | null {
  const neonLogoUrl = selectedOrganization?.logoUrl?.trim();
  if (neonLogoUrl) return neonLogoUrl;

  const selectedIsRoot = selectedOrganization?.id === rootOrganizationId;
  if (!isAdminView && selectedIsRoot) {
    return clerkOrganizationImageUrl?.trim() || null;
  }

  return null;
}
