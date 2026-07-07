import { AppLayout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { BookOpen, Building2, BarChart3 } from "lucide-react";
import { TabDecouvrir } from "./tabs/TabDecouvrir";
import { TabFournisseurs } from "./tabs/TabFournisseurs";
import { TabDashboard } from "./tabs/TabDashboard";

export function AchatsResponsables() {
  const { currentOrgId } = useCurrentOrganization();

  return (
    <AppLayout>
      <h1 className="text-xl font-bold mb-6">📦 Achats &amp; Fournisseurs Responsables</h1>
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

        <TabsContent value="fournisseurs">
          {currentOrgId ? (
            <TabFournisseurs orgId={currentOrgId} />
          ) : (
            <p className="text-muted-foreground text-sm">Sélectionnez une organisation pour accéder à vos fournisseurs.</p>
          )}
        </TabsContent>

        <TabsContent value="dashboard">
          {currentOrgId ? (
            <TabDashboard orgId={currentOrgId} />
          ) : (
            <p className="text-muted-foreground text-sm">Sélectionnez une organisation pour accéder au tableau de bord.</p>
          )}
        </TabsContent>

        <TabsContent value="decouvrir">
          <TabDecouvrir />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
