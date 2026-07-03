import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";

/**
 * Badge de diagnostic — visible uniquement en développement (import.meta.env.DEV).
 * Affiche l'état de l'authentification et du rôle superadmin en temps réel.
 * À supprimer avant la mise en production.
 */
export function DebugBadge() {
  if (!import.meta.env.DEV) return null;

  return <DebugBadgeInner />;
}

function DebugBadgeInner() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { data: apiUser, isLoading, isError, error } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      staleTime: 0,
      retry: false,
    },
  });

  const status = isLoading ? "⏳ chargement…" : isError ? `❌ erreur (${(error as any)?.status ?? "?"})` : "✅ ok";

  return (
    <div
      style={{
        position: "fixed",
        top: 8,
        right: 8,
        zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        color: "#fff",
        fontSize: 11,
        fontFamily: "monospace",
        padding: "8px 12px",
        borderRadius: 6,
        lineHeight: 1.6,
        maxWidth: 320,
        pointerEvents: "none",
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: 4, color: "#facc15" }}>🛠 Debug — cocci</div>

      <div><span style={{ color: "#94a3b8" }}>Clerk chargé :</span> {clerkLoaded ? "oui" : "non"}</div>
      <div><span style={{ color: "#94a3b8" }}>Clerk userId :</span> {clerkUser?.id ?? "—"}</div>
      <div><span style={{ color: "#94a3b8" }}>Clerk email :</span> {clerkUser?.primaryEmailAddress?.emailAddress ?? "—"}</div>

      <div style={{ marginTop: 4, borderTop: "1px solid #334155", paddingTop: 4 }}>
        <div><span style={{ color: "#94a3b8" }}>/api/users/me :</span> {status}</div>
        {apiUser && (
          <>
            <div><span style={{ color: "#94a3b8" }}>DB user id :</span> {apiUser.id}</div>
            <div><span style={{ color: "#94a3b8" }}>DB email :</span> {apiUser.email}</div>
            <div>
              <span style={{ color: "#94a3b8" }}>isSuperAdmin :</span>{" "}
              <span style={{ color: apiUser.isSuperAdmin ? "#4ade80" : "#f87171", fontWeight: "bold" }}>
                {String(apiUser.isSuperAdmin)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
