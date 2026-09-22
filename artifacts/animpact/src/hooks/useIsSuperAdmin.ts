import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useDebugMount } from "@/lib/requestDebug";

/**
 * Retourne true si l'utilisateur connecté est superadmin.
 * staleTime: 0 garantit un refetch à chaque montage (pas de cache stale).
 */
export function useIsSuperAdmin(): { isSuperAdmin: boolean; isLoading: boolean } {
  useDebugMount("useIsSuperAdmin");
  const { data: user, isLoading } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      staleTime: 0,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      meta: { debugLabel: "useIsSuperAdmin:getMe" },
    },
  });

  return {
    isSuperAdmin: user?.isSuperAdmin === true,
    isLoading,
  };
}
