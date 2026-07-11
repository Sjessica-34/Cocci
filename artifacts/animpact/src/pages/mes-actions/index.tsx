import { AppLayout } from "@/components/layout";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { useCurrentExercise } from "@/hooks/useCurrentExercise";
import { AlertCircle, ListChecks, BookOpen } from "lucide-react";
import { Link } from "wouter";
import { ActionChecklist } from "./ActionChecklist";

export function MesActions() {
  const { currentOrgId } = useCurrentOrganization();
  const { currentExerciseId } = useCurrentExercise();

  return (
    <AppLayout>
      <div className="space-y-6 pb-16">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ListChecks className="h-6 w-6 text-primary" />
              Mes actions RSE
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Cochez les actions réalisées et documentez-les avec une date, un commentaire et un justificatif.
            </p>
          </div>
          <Link href="/guide-rse">
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-1">
              <BookOpen className="h-4 w-4" />
              Guide RSE
            </span>
          </Link>
        </div>

        {!currentOrgId || !currentExerciseId ? (
          <div className="flex items-center gap-3 p-5 rounded-xl border border-amber-200 bg-amber-50">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              Sélectionnez une organisation et un exercice pour accéder aux actions RSE.
            </p>
          </div>
        ) : (
          <ActionChecklist orgId={currentOrgId} />
        )}
      </div>
    </AppLayout>
  );
}
