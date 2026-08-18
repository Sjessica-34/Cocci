import { useListOrganizations } from "@workspace/api-client-react";
import { useCurrentOrganization } from "./useCurrentOrganization";
import { useAdminViewOrg } from "./useAdminView";
import type { ModuleScope } from "@/config/moduleScopes";

/**
 * Contexte dérivé pour un module selon son scope et l'entité active.
 *
 * - `effectiveOrgId`  : l'orgId à utiliser pour les requêtes API.
 * - `isReadOnly`      : true quand une filiale consulte un module Groupe.
 * - `showGroupBanner` : true quand le bandeau "géré au niveau Groupe" doit s'afficher.
 * - `isConsolidated`  : true quand "Vue Groupe" consulte un module Filiale.
 *                       Utiliser UNIQUEMENT pour les gardes d'écriture (désactiver
 *                       formulaires, boutons "Enregistrer", actions de saisie).
 *                       NE PAS brancher l'interface sur cette valeur — la vue Groupe
 *                       et la vue Filiale doivent utiliser exactement le même composant.
 * - `isGroup`         : true si l'org racine est de type "groupe".
 * - `rootOrgId`       : id de l'organisation racine.
 */
export interface ModuleContext {
  effectiveOrgId: number | null;
  isReadOnly: boolean;
  showGroupBanner: boolean;
  isConsolidated: boolean;
  isGroup: boolean;
  rootOrgId: number | null;
}

export function useModuleContext(scope: ModuleScope): ModuleContext {
  const { currentOrgId } = useCurrentOrganization();
  const adminViewOrgId = useAdminViewOrg();
  // Quand un super-admin visite l'espace d'un client (viewAs), on utilise les
  // orgs de CE client — pas celles de l'admin — pour calculer rootOrg et effectiveOrgId.
  const { data: orgs = [] } = useListOrganizations(
    adminViewOrgId ? { viewAs: adminViewOrgId } : undefined,
  );

  const rootOrg = orgs.find((o) => !o.parentId) ?? null;
  const isGroup = rootOrg?.type === "groupe";
  const subsidiaries = orgs.filter((o) => rootOrg && o.parentId === rootOrg.id);
  const hasSubsidiaries = subsidiaries.length > 0;

  // Une filiale est active quand le groupe a des filiales ET que l'org sélectionnée
  // n'est pas le groupe lui-même.
  const isViewingSubsidiary = isGroup && hasSubsidiaries && currentOrgId !== rootOrg?.id;
  // Vue Groupe = groupe actif OU entreprise solo (pas de filiales)
  const isViewingGroup = !isViewingSubsidiary;

  if (scope === "group") {
    return {
      // Les modules Groupe se basent toujours sur l'org racine pour les requêtes.
      effectiveOrgId: rootOrg?.id ?? currentOrgId,
      isReadOnly: isViewingSubsidiary,
      showGroupBanner: isViewingSubsidiary,
      isConsolidated: false,
      isGroup,
      rootOrgId: rootOrg?.id ?? null,
    };
  }

  // scope === "subsidiary"
  return {
    effectiveOrgId: currentOrgId,
    isReadOnly: false,
    showGroupBanner: false,
    // La vue consolidée sera implémentée module par module.
    isConsolidated: isGroup && isViewingGroup && hasSubsidiaries,
    isGroup,
    rootOrgId: rootOrg?.id ?? null,
  };
}
