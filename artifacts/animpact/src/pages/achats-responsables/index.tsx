import { AppLayout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useModuleContext } from "@/hooks/useModuleContext";
import { ConsolidatedPlaceholder } from "@/components/ConsolidatedPlaceholder";
import { BookOpen, Building2, BarChart3 } from "lucide-react";
import { TabDecouvrir } from "./tabs/TabDecouvrir";
import { TabFournisseurs } from "./tabs/TabFournisseurs";
import { TabDashboard } from "./tabs/TabDashboard";

export function AchatsResponsables() {
  const { effectiveOrgId, isConsolidated } = useModuleContext("subsidiary");

  return (
    <AppLayout>
      <h1 className="text-xl font-bold mb-6">📦 Achats &amp; Fournisseurs Responsables</h1>

      {isConsolidated ? (
        <ConsolidatedPlaceholder moduleName="Achats & Fournisseurs Responsables" />
      ) : (
        <Tabs defaultValue="decouvrir" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="decouvrir" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Découvrir
            </TabsTrigger>
            <TabsTrigger value="fournisseurs" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Mes fournisseurs
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Tableau de bord
            </TabsTrigger>
          </TabsList>

          <TabsContent value="decouvrir">
            <TabDecouvrir />
          </TabsContent>

          <TabsContent value="fournisseurs">
            {effectiveOrgId ? (
              <TabFournisseurs orgId={effectiveOrgId} />
            ) : (
              <p className="text-muted-foreground text-sm">
                Sélectionnez une organisation pour accéder à vos fournisseurs.
              </p>
            )}
          </TabsContent>

          <TabsContent value="dashboard">
            {effectiveOrgId ? (
              <TabDashboard orgId={effectiveOrgId} />
            ) : (
              <p className="text-muted-foreground text-sm">
                Sélectionnez une organisation pour accéder au tableau de bord.
              </p>
            )}
          </TabsContent>
        </Tabs>
      )}
    </AppLayout>
  );
}
