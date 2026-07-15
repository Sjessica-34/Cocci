---
name: Module scope architecture
description: Registre central + hook useModuleContext pour piloter la logique groupe/filiale sans modifier la navigation.
---

## Règle
Chaque module RSE déclare son scope dans `src/config/moduleScopes.ts` ("group" ou "subsidiary").
`useModuleContext(scope)` retourne effectiveOrgId, isReadOnly, showGroupBanner, isConsolidated.

## Pourquoi
L'architecture multi-tenant groupe/filiale doit être configurable module par module sans modifier le routeur ni les composants de navigation.

## Comment appliquer

### Module Groupe (données partagées par toutes les filiales)
```tsx
const { effectiveOrgId, isReadOnly, showGroupBanner } = useModuleContext("group");
// effectiveOrgId → toujours l'org racine
// showGroupBanner / isReadOnly → true si l'utilisateur est sur une filiale
// Ajouter <GroupModuleBanner /> si showGroupBanner
// Wrapper les TabsContent dans <div inert={isReadOnly ? "" : undefined}> pour lecture seule générique
```

### Module Filiale (données par entité)
```tsx
const { effectiveOrgId, isConsolidated } = useModuleContext("subsidiary");
// effectiveOrgId → l'org sélectionnée (filiale ou solo)
// isConsolidated → true si vue Groupe (placeholder agrégé)
// Afficher <ConsolidatedPlaceholder moduleName="..." /> si isConsolidated
```

### Pages Admin (settings, members)
Cas particulier : ces pages font `setCurrentOrg(orgId)` en useEffect. Capturer le contexte AVANT via :
```tsx
const { currentOrgId: navOrgId } = useCurrentOrganization();
const navOrgAtMountRef = useRef(navOrgId); // frozen at mount, before effect fires
const isAdminReadOnly = allOrgs.some(o => o.parentId === rootOrg?.id && o.id === navOrgAtMountRef.current);
```

## Note
`inert` est un attribut HTML5 valide — ajouter `{/* @ts-expect-error */}` sur le div. Il rend tout le sous-arbre non-interactif mais visuellement visible.
