import { Lock } from "lucide-react";
import { useListExercises } from "@workspace/api-client-react";
import { useCurrentExercise } from "@/hooks/useCurrentExercise";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";

export function ClosedExerciseBanner() {
  const { currentOrgId } = useCurrentOrganization();
  const { currentExerciseId } = useCurrentExercise();
  const { data: exercises } = useListExercises(currentOrgId ?? 0, {
    query: { queryKey: ["/api/organizations", currentOrgId, "exercises"], enabled: currentOrgId != null },
  });

  const current = exercises?.find((e) => e.id === currentExerciseId);
  if (!current || current.status !== "closed") return null;

  return (
    <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
      <Lock className="h-4 w-4 shrink-0" />
      <span>
        L'exercice {current.year} est clôturé. Les données sont en lecture seule — réouvrez l'exercice pour les
        modifier.
      </span>
    </div>
  );
}
