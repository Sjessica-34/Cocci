import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";

/**
 * Retourne true si l'utilisateur connecté est superadmin.
 * staleTime: 0 garantit un refetch à chaque montage (pas de cache stale).
 */
export function useIsSuperAdmin(): { isSuperAdmin: boolean; isLoading: boolean } {
  const { data: user, isLoading } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      staleTime: 0,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
    },
  });

  return {
    isSuperAdmin: user?.isSuperAdmin === true,
    isLoading,
  };
}
