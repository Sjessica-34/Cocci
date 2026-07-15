import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  getListBioDependenciesQueryKey,
  getListBioConnectionsQueryKey,
  listBioDependencies,
  listBioConnections,
  type Organization,
} from "@workspace/api-client-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConsolidatedElement {
  virtualId: string;
  category: string | null;
  subCategory: string | null;
  name: string | null;
  chainPosition: string | null;
  dependencyLevel: number | null;
  masteryLevel: number | null;
  comments: string | null;
  x: number | null;
  y: number | null;
  origins: Array<{ orgId: number; orgName: string; elementId: number }>;
}

export interface ConsolidatedConnection {
  virtualId: string;
  fromVirtualId: string;
  toVirtualId: string;
  relationType: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Clé de déduplication d'un élément : même catégorie + sous-type + nom → même élément.
 * Un nom null est considéré identique à un autre null (éléments génériques).
 */
function elementKey(
  cat?: string | null,
  sub?: string | null,
  name?: string | null,
): string {
  return `${cat ?? ""}|${sub ?? ""}|${name ?? ""}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Agrège et déduplique les bio-dépendances et connexions de toutes les filiales.
 *
 * - Éléments identiques (même catégorie + sous-type + nom) → une seule entrée avec plusieurs `origins`.
 * - Connexions identiques (même fromVirtualId → toVirtualId + relationType) → une seule entrée.
 * - Toutes les requêtes sont faites en parallèle.
 */
export function useConsolidatedBio(subsidiaries: Organization[]) {
  const orgIds = subsidiaries.map((s) => s.id);

  const depsResults = useQueries({
    queries: orgIds.map((id) => ({
      queryKey: getListBioDependenciesQueryKey(id),
      queryFn:  () => listBioDependencies(id),
      staleTime: 60_000,
    })),
  });

  const connResults = useQueries({
    queries: orgIds.map((id) => ({
      queryKey: getListBioConnectionsQueryKey(id),
      queryFn:  () => listBioConnections(id),
      staleTime: 60_000,
    })),
  });

  const isLoading =
    depsResults.some((q) => q.isLoading) ||
    connResults.some((q) => q.isLoading);

  const { elements, connections } = useMemo(() => {
    // ── Déduplication des éléments ───────────────────────────────────────────
    const elementMap = new Map<string, ConsolidatedElement>();
    // Map orgId-elementId → virtualId pour retrouver les connexions
    const idToVirtual = new Map<string, string>();

    subsidiaries.forEach((org, i) => {
      const items = depsResults[i]?.data?.items ?? [];
      items.forEach((el) => {
        const key = elementKey(el.category, el.subCategory, el.name);
        idToVirtual.set(`${org.id}-${el.id}`, key);

        if (elementMap.has(key)) {
          elementMap.get(key)!.origins.push({
            orgId:     org.id,
            orgName:   org.name,
            elementId: el.id,
          });
        } else {
          elementMap.set(key, {
            virtualId:       key,
            category:        el.category      ?? null,
            subCategory:     el.subCategory   ?? null,
            name:            el.name          ?? null,
            chainPosition:   el.chainPosition ?? null,
            dependencyLevel: el.dependencyLevel ?? null,
            masteryLevel:    el.masteryLevel  ?? null,
            comments:        el.comments      ?? null,
            x:               el.x             ?? null,
            y:               el.y             ?? null,
            origins: [{ orgId: org.id, orgName: org.name, elementId: el.id }],
          });
        }
      });
    });

    // ── Déduplication des connexions ─────────────────────────────────────────
    const connMap = new Map<string, ConsolidatedConnection>();

    subsidiaries.forEach((org, i) => {
      const conns = connResults[i]?.data?.items ?? [];
      conns.forEach((conn) => {
        const fromVId = idToVirtual.get(`${org.id}-${conn.fromElementId}`);
        const toVId   = idToVirtual.get(`${org.id}-${conn.toElementId}`);
        if (!fromVId || !toVId) return;
        const connKey = `${fromVId}→${toVId}|${conn.relationType ?? ""}`;
        if (!connMap.has(connKey)) {
          connMap.set(connKey, {
            virtualId:     connKey,
            fromVirtualId: fromVId,
            toVirtualId:   toVId,
            relationType:  conn.relationType ?? null,
          });
        }
      });
    });

    return {
      elements:    Array.from(elementMap.values()),
      connections: Array.from(connMap.values()),
    };
  // depsResults / connResults arrays are stable references from useQueries
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsResults, connResults, subsidiaries]);

  return { elements, connections, isLoading };
}
