import { AppLayout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { useListOrganizations } from "@workspace/api-client-react";
import { BarChart3, BookOpen, Layers, Leaf, Network } from "lucide-react";
import { TabDecouvrir } from "./tabs/TabDecouvrir";
import { TabSaisie } from "./tabs/TabSaisie";
import { TabCartoDependances } from "./tabs/TabCartoDependances";
import { TabCartoEnjeux } from "./tabs/TabCartoEnjeux";
import { TabSynthese } from "./tabs/TabSynthese";

export function Biodiversite() {
  const { currentOrgId } = useCurrentOrganization();
  const { data: orgs = [] } = useListOrganizations();

  const rootOrg = orgs.find((o) => !o.parentId) ?? null;
  const subsidiaries = orgs.filter((o) => rootOrg && o.parentId === rootOrg.id);
  // Group view = groupe en mode auto (résultats agrégés depuis filiales)
  const isGroupView =
    rootOrg?.type === "groupe" &&
    rootOrg?.groupMode === "auto" &&
    subsidiaries.length > 0 &&
    currentOrgId === rootOrg.id;

  return (
    <AppLayout>
      <h1 className="text-xl font-bold mb-6">🌿 Dépendances à la Biodiversité</h1>
      <Tabs defaultValue="guide" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 max-w-3xl">
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
          <TabsTrigger value="synthese" className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Synthèse</span>
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
            ? <TabCartoDependances
                orgId={currentOrgId}
                subsidiaries={isGroupView ? subsidiaries : undefined}
              />
            : <p className="text-sm text-muted-foreground">Sélectionnez une organisation.</p>}
        </TabsContent>

        <TabsContent value="enjeux">
          {currentOrgId
            ? <TabCartoEnjeux orgId={currentOrgId} />
            : <p className="text-sm text-muted-foreground">Sélectionnez une organisation.</p>}
        </TabsContent>

        <TabsContent value="synthese">
          {currentOrgId
            ? <TabSynthese orgId={currentOrgId} />
            : <p className="text-sm text-muted-foreground">Sélectionnez une organisation.</p>}
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
