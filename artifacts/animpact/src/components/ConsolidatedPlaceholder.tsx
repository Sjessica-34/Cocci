import { BarChart3 } from "lucide-react";

interface ConsolidatedPlaceholderProps {
  moduleName: string;
}

/**
 * Affiché lorsque le contexte "Vue Groupe" consulte un module Filiale.
 * La vue consolidée (agrégation des données de toutes les filiales)
 * sera implémentée module par module.
 *
 * Sélectionnez une filiale dans le GroupSwitcher pour accéder aux données.
 */
export function ConsolidatedPlaceholder({ moduleName }: ConsolidatedPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed rounded-xl bg-muted/20">
      <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <BarChart3 className="h-6 w-6 text-primary/60" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">
        Vue consolidée — {moduleName}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        En mode <span className="font-medium">Vue Groupe</span>, ce module affichera une synthèse agrégée des données de toutes les filiales.
        <br className="hidden sm:block" />
        <span className="mt-2 block">
          Pour accéder aux données d'une filiale, sélectionnez-la dans le menu en haut à gauche.
        </span>
      </p>
    </div>
  );
}
