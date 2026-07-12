import { AppLayout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { useCurrentExercise } from "@/hooks/useCurrentExercise";
import { AlertCircle, ListChecks, BookOpen, ClipboardCheck, Trophy } from "lucide-react";
import { TabGuideContent } from "./TabGuideContent";
import { TabMonPlan } from "./TabMonPlan";
import { ActionChecklist } from "./ActionChecklist";
import { TabRealisations } from "./TabRealisations";

export function MesActions() {
  const { currentOrgId } = useCurrentOrganization();
  const { currentExerciseId } = useCurrentExercise();

  return (
    <AppLayout>
      <div className="space-y-6 pb-16">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-primary" />
            Mes actions RSE
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Suivez vos engagements RSE tout au long de l'exercice grâce au référentiel Cocci.
          </p>
        </div>

        <Tabs defaultValue="guide" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="guide" className="gap-2 text-sm">
              <BookOpen className="h-4 w-4" />
              Guide
            </TabsTrigger>
            <TabsTrigger value="plan" className="gap-2 text-sm">
              <ClipboardCheck className="h-4 w-4" />
              Mon plan d'action
            </TabsTrigger>
            <TabsTrigger value="actions" className="gap-2 text-sm">
              <ListChecks className="h-4 w-4" />
              Mes actions
            </TabsTrigger>
            <TabsTrigger value="realisations" className="gap-2 text-sm">
              <Trophy className="h-4 w-4" />
              Réalisations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="guide">
            <TabGuideContent />
          </TabsContent>

          <TabsContent value="plan">
            {!currentOrgId || !currentExerciseId ? (
              <div className="flex items-center gap-3 p-5 rounded-xl border border-amber-200 bg-amber-50">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800">
                  Sélectionnez une organisation et un exercice pour accéder à votre plan.
                </p>
              </div>
            ) : (
              <TabMonPlan orgId={currentOrgId} />
            )}
          </TabsContent>

          <TabsContent value="actions">
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
          </TabsContent>

          <TabsContent value="realisations">
            {!currentOrgId ? (
              <div className="flex items-center gap-3 p-5 rounded-xl border border-amber-200 bg-amber-50">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800">
                  Sélectionnez une organisation pour accéder à vos réalisations.
                </p>
              </div>
            ) : (
              <TabRealisations orgId={currentOrgId} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
