import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListOrganizations } from "@workspace/api-client-react";
import { setCurrentOrg } from "@/hooks/useCurrentOrganization";

/**
 * Bandeau affiché lorsqu'un utilisateur positionné sur une filiale
 * consulte un module dont les données sont gérées au niveau du Groupe.
 *
 * Propose un raccourci pour repasser en "Vue Groupe".
 */
export function GroupModuleBanner() {
  const { data: orgs = [] } = useListOrganizations();
  const rootOrg = orgs.find((o) => !o.parentId);

  function switchToGroup() {
    if (rootOrg) {
      setCurrentOrg(rootOrg.id);
    }
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 mb-2">
      <Info className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
      <div className="flex-1 min-w-0">
        <span className="font-semibold">Ce module est géré au niveau du Groupe.</span>
        {" "}Ces informations sont partagées par toutes les filiales et ne peuvent être modifiées que depuis la vue Groupe.
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-100 hover:text-blue-800 hover:border-blue-300"
        onClick={switchToGroup}
      >
        Passer en Vue Groupe
      </Button>
    </div>
  );
}
