import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";

/**
 * Retourne true si l'utilisateur connecté est superadmin.
 * Utilise le hook getMe qui JIT-provisionne l'utilisateur.
 */
export function useIsSuperAdmin(): { isSuperAdmin: boolean; isLoading: boolean } {
  const { data: user, isLoading } = useGetMe({
    query: { queryKey: getGetMeQueryKey() },
  });

  return {
    isSuperAdmin: user?.isSuperAdmin === true,
    isLoading,
  };
}
