import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Trophy } from "lucide-react";
import { useModuleContext } from "@/hooks/useModuleContext";
import { GroupModuleBanner } from "@/components/GroupModuleBanner";
import { TabDecouvrir } from "./tabs/TabDecouvrir";
import { TabResultat } from "./tabs/TabResultat";

export function ImpactScore() {
  const { effectiveOrgId, showGroupBanner } = useModuleContext("group");
  const [tab, setTab] = useState<"decouvrir" | "resultat">("decouvrir");

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {showGroupBanner && <GroupModuleBanner />}

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-violet-600" />
            <h1 className="text-xl font-bold text-foreground">Mon Impact Score</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Mesurez et centralisez votre score RSE pour le retrouver dans vos tableaux de bord et rapports.
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="h-9">
            <TabsTrigger value="decouvrir" className="gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              Découvrir
            </TabsTrigger>
            <TabsTrigger value="resultat" className="gap-1.5 text-xs">
              <Trophy className="h-3.5 w-3.5" />
              Mon résultat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="decouvrir" className="mt-5">
            <TabDecouvrir />
          </TabsContent>

          <TabsContent value="resultat" className="mt-5">
            {effectiveOrgId ? (
              <TabResultat orgId={effectiveOrgId} />
            ) : (
              <div className="rounded-xl border border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                Sélectionnez une organisation pour accéder à votre résultat.
              </div>
            )}
          </TabsContent>
        </Tabs>

      </div>
    </AppLayout>
  );
}
