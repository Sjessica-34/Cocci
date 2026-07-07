import { AppLayout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { BookOpen, Leaf, Network, Layers } from "lucide-react";
import { TabDecouvrir } from "./tabs/TabDecouvrir";
import { TabSaisie } from "./tabs/TabSaisie";
import { TabCartoDependances } from "./tabs/TabCartoDependances";
import { TabCartoEnjeux } from "./tabs/TabCartoEnjeux";

export function Biodiversite() {
  const { currentOrgId } = useCurrentOrganization();

  return (
    <AppLayout>
      <h1 className="text-xl font-bold mb-6">🌿 Dépendances à la Biodiversité</h1>
      <Tabs defaultValue="guide" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="guide" className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Guide</span>
          </TabsTrigger>
          <TabsTrigger value="saisie" className="flex items-center gap-1.5">
            <Leaf className="h-4 w-4" />
            <span className="hidden sm:inline">Saisie</span>
          </TabsTrigger>
          <TabsTrigger value="cartographie" className="flex items-center gap-1.5">
            <Network className="h-4 w-4" />
            <span className="hidden sm:inline">Cartographie</span>
          </TabsTrigger>
          <TabsTrigger value="enjeux" className="flex items-center gap-1.5">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Enjeux</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guide">
          <TabDecouvrir />
        </TabsContent>

        <TabsContent value="saisie">
          {currentOrgId
            ? <TabSaisie orgId={currentOrgId} />
            : <p className="text-sm text-muted-foreground">Sélectionnez une organisation.</p>}
        </TabsContent>

        <TabsContent value="cartographie">
          {currentOrgId
            ? <TabCartoDependances orgId={currentOrgId} />
            : <p className="text-sm text-muted-foreground">Sélectionnez une organisation.</p>}
        </TabsContent>

        <TabsContent value="enjeux">
          {currentOrgId
            ? <TabCartoEnjeux orgId={currentOrgId} />
            : <p className="text-sm text-muted-foreground">Sélectionnez une organisation.</p>}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
