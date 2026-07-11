import { AppLayout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckSquare, BookOpen, HelpCircle } from "lucide-react";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { useCurrentExercise } from "@/hooks/useCurrentExercise";
import { TabPlan } from "./TabPlan";
import { TabBibliotheque } from "./TabBibliotheque";
import { TabGuide } from "./TabGuide";

export function MesActions() {
  const { currentOrgId } = useCurrentOrganization();
  const { currentExerciseId } = useCurrentExercise();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mes actions RSE</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Suivez vos engagements RSE tout au long de l'exercice grâce au référentiel Cocci.
          </p>
        </div>

        {!currentOrgId || !currentExerciseId ? (
          <div className="rounded-lg border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            Sélectionnez une organisation et un exercice pour accéder à votre plan d'actions.
          </div>
        ) : (
          <Tabs defaultValue="plan" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="plan" className="gap-2 text-sm">
                <CheckSquare className="h-4 w-4" />
                Plan d'actions
              </TabsTrigger>
              <TabsTrigger value="bibliotheque" className="gap-2 text-sm">
                <BookOpen className="h-4 w-4" />
                Bibliothèque d'actions
              </TabsTrigger>
              <TabsTrigger value="guide" className="gap-2 text-sm">
                <HelpCircle className="h-4 w-4" />
                Guide
              </TabsTrigger>
            </TabsList>

            <TabsContent value="plan">
              <TabPlan orgId={currentOrgId} />
            </TabsContent>

            <TabsContent value="bibliotheque">
              <TabBibliotheque orgId={currentOrgId} />
            </TabsContent>

            <TabsContent value="guide">
              <TabGuide />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
