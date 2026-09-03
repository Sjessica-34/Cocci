import { AppLayout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useModuleContext } from "@/hooks/useModuleContext";
import { useListOrganizations } from "@workspace/api-client-react";

import { BookOpen, Building2, BarChart3, ShoppingCart } from "lucide-react";
import { TabDecouvrir } from "./tabs/TabDecouvrir";
import { TabFournisseurs } from "./tabs/TabFournisseurs";
import { TabDashboard } from "./tabs/TabDashboard";
import { TabAchats } from "./tabs/TabAchats";

export function AchatsResponsables() {
  const { effectiveOrgId, isConsolidated, rootOrgId } = useModuleContext("subsidiary");
  const { data: orgs = [] } = useListOrganizations();

  // Map orgId → nom de la filiale, utilisé pour la colonne "Filiale" dans la vue groupe
  const subsidiaryNames: Record<number, string> = Object.fromEntries(
    orgs
      .filter((o) => rootOrgId !== null && o.parentId === rootOrgId)
      .map((o) => [o.id, o.name]),
  );

  return (
    <AppLayout>
      <h1 className="text-xl font-bold mb-6">📦 Achats &amp; Fournisseurs Responsables</h1>

      <Tabs defaultValue="decouvrir" className="space-y-6">
          <TabsList className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-1 h-auto rounded-lg bg-muted p-1 md:grid-cols-4">
            <TabsTrigger
              value="decouvrir"
              className="w-full min-w-0 gap-2 whitespace-normal px-2 text-center leading-tight sm:px-3 md:whitespace-nowrap"
            >
              <BookOpen className="h-4 w-4" />
              Découvrir
            </TabsTrigger>
            <TabsTrigger
              value="fournisseurs"
              className="w-full min-w-0 gap-2 whitespace-normal px-2 text-center leading-tight sm:px-3 md:whitespace-nowrap"
            >
              <Building2 className="h-4 w-4" />
              Mes fournisseurs
            </TabsTrigger>
            <TabsTrigger
              value="achats"
              className="w-full min-w-0 gap-2 whitespace-normal px-2 text-center leading-tight sm:px-3 md:whitespace-nowrap"
            >
              <ShoppingCart aria-hidden="true" className="h-4 w-4 shrink-0" />
              Achats responsables
            </TabsTrigger>
            <TabsTrigger
              value="dashboard"
              className="w-full min-w-0 gap-2 whitespace-normal px-2 text-center leading-tight sm:px-3 md:whitespace-nowrap"
            >
              <BarChart3 className="h-4 w-4" />
              Synthèse
            </TabsTrigger>
          </TabsList>

          <TabsContent value="decouvrir">
            <TabDecouvrir />
          </TabsContent>

          <TabsContent value="achats">
            {effectiveOrgId ? (
              <TabAchats
                orgId={effectiveOrgId}
                isReadOnly={isConsolidated}
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                Sélectionnez une organisation pour accéder à vos achats.
              </p>
            )}
          </TabsContent>

          <TabsContent value="fournisseurs">
            {effectiveOrgId ? (
              <TabFournisseurs
                orgId={effectiveOrgId}
                isReadOnly={isConsolidated}
                subsidiaryNames={isConsolidated ? subsidiaryNames : undefined}
              />
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
    </AppLayout>
  );
}
