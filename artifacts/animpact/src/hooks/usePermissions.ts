import { useUser } from "@clerk/react";
import { useListMembers, getListMembersQueryKey } from "@workspace/api-client-react";

type Role = "owner" | "admin" | "member" | "viewer";

export interface OrgPermissions {
  role: Role | null;
  isOwner: boolean;
  canManage: boolean;
  isLoading: boolean;
}

/**
 * Returns the current Clerk user's role and permission flags within an org.
 * Relies on the members list which exposes clerkId for matching.
 */
export function usePermissions(orgId: number): OrgPermissions {
  const { user } = useUser();
  const { data: members, isLoading } = useListMembers(orgId, {
    query: { enabled: !!orgId, queryKey: getListMembersQueryKey(orgId) },
  });

  if (isLoading || !user || !members) {
    return { role: null, isOwner: false, canManage: false, isLoading };
  }

  const myMembership = members.find((m) => m.user?.clerkId === user.id);
  const role = (myMembership?.role as Role) ?? null;

  return {
    role,
    isOwner: role === "owner",
    canManage: role === "owner" || role === "admin",
    isLoading: false,
  };
}
