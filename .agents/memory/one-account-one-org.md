---
name: 1-compte-1-org model
description: Architecture multi-org "1 compte = 1 org principale" — rootOrg, filiales, onboarding, GroupSwitcher, WorkspaceGuard.
---

## Rule
Un compte utilisateur = 1 organisation principale (type='entreprise' ou type='groupe', parentId=null).
Les filiales ont parentId=rootOrg.id.

## Trouver rootOrg et filiales depuis la liste
```ts
const rootOrg = orgs.find(o => !o.parentId) ?? null;
const subsidiaries = orgs.filter(o => o.parentId === rootOrg?.id);
```

## WorkspaceGuard
Composant wrapper dans App.tsx : si `useListOrganizations()` retourne un tableau vide, redirect vers `/onboarding`.
Appliqué à toutes les routes workspace module (pas à /settings, /admin, /organizations/*).

## Flux onboarding
- `/onboarding` — page full-screen (pas AppLayout), choix nom + type (entreprise/groupe)
- `/onboarding/filiales` — wizard ajout filiales (uniquement pour groupes), déclenche la dialog GroupMode après la 1ère filiale

## GroupSwitcher (sidebar)
- Remplace EntitySelector
- Entreprise : label statique + bouton Paramètres (→ /organizations/{id}/settings)
- Groupe : DropdownMenu avec Vue Groupe / filiales / Ajouter une filiale / Paramètres du groupe
- Auto-init currentOrgId si null au chargement
- GroupModeDialog apparaît automatiquement quand rootOrg.type='groupe' && !rootOrg.groupMode && subsidiaries.length > 0

## Transform entreprise → groupe
Dans /organizations/:id/settings, bouton "Transformer" → AlertDialog → PATCH {type: 'groupe'} → redirect /onboarding/filiales.
Ajouté `type` au schéma OpenAPI OrganizationUpdate + codegen relancé.

**Why:** Le modèle initial permettait plusieurs orgs par compte (multi-tenant). La redesign impose 1 org principale pour simplifier le UX et le modèle de données.

**How to apply:** Ne jamais créer d'org sans parentId si l'user en a déjà une. Le WorkspaceGuard ne doit pas bloquer /onboarding, /admin, /settings, /organizations/*.
