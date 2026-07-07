import { AppLayout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { BookOpen, Leaf, Layers, BarChart3 } from "lucide-react";
import { TabDecouvrir } from "./tabs/TabDecouvrir";
import { TabCartoDependances } from "./tabs/TabCartoDependances";
import { TabCartoEnjeux } from "./tabs/TabCartoEnjeux";
import { TabResultats } from "./tabs/TabResultats";

export function Biodiversite() {
  const { currentOrgId } = useCurrentOrganization();

  return (
    <AppLayout>
      <h1 className="text-xl font-bold mb-6">🌿 Dépendances à la Biodiversité</h1>
      <Tabs defaultValue="decouvrir" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="decouvrir" className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Découvrir</span>
          </TabsTrigger>
          <TabsTrigger value="dependances" className="flex items-center gap-1.5">
            <Leaf className="h-4 w-4" />
            <span className="hidden sm:inline">Dépendances</span>
          </TabsTrigger>
          <TabsTrigger value="enjeux" className="flex items-center gap-1.5">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Enjeux</span>
          </TabsTrigger>
          <TabsTrigger value="resultats" className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Résultats</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="decouvrir"><TabDecouvrir /></TabsContent>
        <TabsContent value="dependances">
          {currentOrgId
            ? <TabCartoDependances orgId={currentOrgId} />
            : <p className="text-sm text-muted-foreground">Sélectionnez une organisation.</p>}
        </TabsContent>
        <TabsContent value="enjeux">
          {currentOrgId
            ? <TabCartoEnjeux orgId={currentOrgId} />
            : <p className="text-sm text-muted-foreground">Sélectionnez une organisation.</p>}
        </TabsContent>
        <TabsContent value="resultats">
          {currentOrgId
            ? <TabResultats orgId={currentOrgId} />
            : <p className="text-sm text-muted-foreground">Sélectionnez une organisation.</p>}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
