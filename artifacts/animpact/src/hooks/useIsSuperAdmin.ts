import { useAuth } from "@clerk/react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useDebugMount } from "@/lib/requestDebug";

/**
 * Retourne true si l'utilisateur connecté est superadmin.
 * Réutilise le cache partagé pour éviter un appel /api/users/me à chaque
 * remontage du layout. Le cache React Query est purgé lors d'un changement
 * d'utilisateur Clerk.
 */
export function useIsSuperAdmin(): { isSuperAdmin: boolean; isLoading: boolean } {
  useDebugMount("useIsSuperAdmin");
  const { isLoaded, isSignedIn } = useAuth();
  const { data: user, isLoading } = useGetMe({
    query: {
      enabled: isLoaded && isSignedIn,
      queryKey: getGetMeQueryKey(),
      meta: { debugLabel: "useIsSuperAdmin:getMe" },
    },
  });

  return {
    isSuperAdmin: user?.isSuperAdmin === true,
    isLoading: !isLoaded || (isSignedIn === true && isLoading),
  };
}
