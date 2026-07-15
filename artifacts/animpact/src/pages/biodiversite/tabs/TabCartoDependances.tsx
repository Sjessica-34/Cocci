import "@xyflow/react/dist/style.css";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  Handle, Position, MarkerType,
  type Node, type Edge, type Connection, type NodeProps, type NodeTypes,
} from "@xyflow/react";
import { useQueryClient, useQueries } from "@tanstack/react-query";
import {
  useListBioDependencies,
  useUpdateBioDependency,
  useListBioConnections,
  useCreateBioConnection,
  useDeleteBioConnection,
  getListBioConnectionsQueryKey,
  getListBioDependenciesQueryKey,
  listBioDependencies,
  listBioConnections,
  type BioConnection,
  type Organization,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Network, Plus } from "lucide-react";
import {
  RELATION_TYPES, elementLabel, familyIcon, familyColor, familyBg, defaultElementPosition,
} from "../data";

// ─── Types ────────────────────────────────────────────────────────────────────

type BioNodeData = {
  name: string | null;
  category: string | null;    // famille
  subCategory: string | null; // type spécifique
  origins?: Array<{ orgName: string }> | null; // vue groupe uniquement
};
type BioNode = Node<BioNodeData, "bioElement">;

// ─── Custom node — DOIT être hors du composant ────────────────────────────────

const BioElementNode = memo(function BioElementNode({ data }: NodeProps<BioNode>) {
  const label = elementLabel(data.name, data.category, data.subCategory);
  const icon  = familyIcon(data.category);
  const color = familyColor(data.category);
  const bg    = familyBg(data.category);

  const origins = data.origins;
  const originsText = origins && origins.length > 0
    ? (origins.length === 1 ? origins[0].orgName : `${origins.length} filiales`)
    : null;
  const originsTitle = origins && origins.length > 1
    ? origins.map(o => o.orgName).join(", ")
    : undefined;

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: color, width: 10, height: 10, border: "2px solid white" }}
      />
      <div
        className="rounded-xl shadow-md border-2 p-3 select-none"
        style={{ minWidth: 140, maxWidth: 190, backgroundColor: bg, borderColor: color }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
          <div className="flex-1 min-w-0">
            {label ? (
              <p className="text-xs font-bold leading-tight truncate" style={{ color }}>
                {label}
              </p>
            ) : null}
            <p
              className="text-[10px] leading-tight opacity-70 truncate"
              style={{ color }}
            >
              {data.category ?? ""}
            </p>
          </div>
        </div>
        {originsText && (
          <p
            className="text-[9px] mt-1.5 opacity-60 leading-tight truncate"
            style={{ color }}
            title={originsTitle}
          >
            📍 {originsText}
          </p>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: color, width: 10, height: 10, border: "2px solid white" }}
      />
    </div>
  );
});

// ─── Nœud panneau de zone (arrière-plan AMONT / IN SITU / AVAL) ──────────────
// Fait partie du canvas ReactFlow : zoom et pan restent synchronisés.

const CANVAS_ZONE_W = 390; // largeur de chaque colonne de zone

type ZonePanelData = {
  label: string; bgColor: string; borderColor: string; textColor: string; height: number;
};

const ZonePanelNodeComp = memo(function ZonePanelNodeComp({
  data,
}: NodeProps<Node<ZonePanelData>>) {
  return (
    <div
      style={{
        width:           CANVAS_ZONE_W,
        height:          data.height,
        backgroundColor: data.bgColor,
        borderRight:     `1px dashed ${data.borderColor}`,
        pointerEvents:   "none",
        userSelect:      "none",
        position:        "relative",
      }}
    >
      <div style={{
        position:      "absolute",
        top:           12,
        left:          0,
        right:         0,
        textAlign:     "center",
        color:         data.textColor,
        fontSize:      11,
        fontWeight:    700,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        opacity:       0.7,
      }}>
        {data.label}
      </div>
    </div>
  );
});

// ─── Nœud séparateur horizontal (entre filiales, dans le canvas) ──────────────

type SeparatorData = { totalWidth: number };

const SeparatorNodeComp = memo(function SeparatorNodeComp({
  data,
}: NodeProps<Node<SeparatorData>>) {
  return (
    <div
      style={{
        width:         data.totalWidth,
        height:        2,
        background:    "#e2e8f0",
        pointerEvents: "none",
      }}
    />
  );
});

const nodeTypes: NodeTypes = {
  bioElement: BioElementNode,
  zonePanel:  ZonePanelNodeComp as NodeTypes[string],
  separator:  SeparatorNodeComp as NodeTypes[string],
};

// ─── Nœuds de fond partagés (zone AMONT / IN SITU / AVAL) ────────────────────
// Module-level : mêmes nœuds réutilisés dans IndividualCarto et GroupCarto.
// Ils font partie du canvas ReactFlow → zooment et panent avec les éléments.

const ZONE_H       = 5000;  // hauteur large (couvre tout pan vertical)
const ZONE_Y_START = -100;  // commence au-dessus de l'origine

const ZONE_NODES: Node[] = [
  {
    id: "bg-amont", type: "zonePanel",
    position: { x: 0, y: ZONE_Y_START },
    data: { label: "Amont", bgColor: "#EFF6FF", borderColor: "#BFDBFE", textColor: "#1D4ED8", height: ZONE_H } satisfies ZonePanelData,
    zIndex: -10, selectable: false, draggable: false, connectable: false,
  },
  {
    id: "bg-insitu", type: "zonePanel",
    position: { x: CANVAS_ZONE_W, y: ZONE_Y_START },
    data: { label: "In situ", bgColor: "#ECFDF5", borderColor: "#A7F3D0", textColor: "#065F46", height: ZONE_H } satisfies ZonePanelData,
    zIndex: -10, selectable: false, draggable: false, connectable: false,
  },
  {
    id: "bg-aval", type: "zonePanel",
    position: { x: CANVAS_ZONE_W * 2, y: ZONE_Y_START },
    data: { label: "Aval", bgColor: "#F5F3FF", borderColor: "#DDD6FE", textColor: "#6D28D9", height: ZONE_H } satisfies ZonePanelData,
    zIndex: -10, selectable: false, draggable: false, connectable: false,
  },
];

// ─── Edge helper ──────────────────────────────────────────────────────────────

function connToEdge(conn: BioConnection): Edge {
  return {
    id:     `e${conn.id}`,
    source: String(conn.fromElementId),
    target: String(conn.toElementId),
    type:   "smoothstep",
    label:  conn.relationType ?? undefined,
    labelStyle:      { fontSize: 10, fill: "#475569", fontWeight: 600 },
    labelBgStyle:    { fill: "#f8fafc", stroke: "#e2e8f0", strokeWidth: 1 },
    labelBgPadding:  [6, 3] as [number, number],
    labelBgBorderRadius: 4,
    markerEnd:  { type: MarkerType.ArrowClosed, color: "#94a3b8" },
    style:      { stroke: "#94a3b8", strokeWidth: 1.5 },
    data:       { connectionId: conn.id },
  };
}

// ─── Composant ────────────────────────────────────────────────────────────────

interface Props {
  orgId: number;
  /** Quand fourni, affiche la vue groupe (filiales comme nœuds, Maison mère au centre). */
  subsidiaries?: Organization[];
}

// ─── Vue groupe : carte unique, toutes filiales ───────────────────────────────
// Un seul ReactFlow canvas.
// • Colonnes AMONT / IN SITU / AVAL = nœuds de fond (bougent avec le canvas)
// • Séparateurs horizontaux entre filiales = nœuds canvas
// • Pas d'étiquettes de filiale
// • Chaîne automatique : agences + siège social reliés verticalement

const CANVAS_PAD = 40;  // padding en haut / bas du canvas global
const NODE_H     = 82;  // hauteur approximative d'une carte BioElementNode (px)

function isMaisonMere(org: Organization): boolean {
  return /m[eè]re/i.test(org.name) || /si[eè]ge/i.test(org.name);
}

// Trouve l'élément "représentant" d'une org pour la chaîne automatique :
// pour la maison mère → siège social, pour les filiales → agence
function findChainElement(
  elements: { id: number; name?: string | null }[],
  orgIsMM: boolean,
): number | null {
  if (orgIsMM) {
    const siege = elements.find(el => /si[eè]ge/i.test(el.name ?? ""));
    if (siege) return siege.id;
  }
  const agence = elements.find(el => /agence/i.test(el.name ?? ""));
  return agence?.id ?? null;
}

// GroupCarto : même structure qu'IndividualCarto, source de données = toutes filiales.
// Drag & drop → sauvegarde la position dans la DB de l'org correspondante.

function GroupCarto({ subsidiaries }: { subsidiaries: Organization[] }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<BioNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [canvasHeight, setCanvasHeight]  = useState(350);

  // Refs stables pour comparer les données de useQueries sans créer de boucle infinie.
  // useQueries retourne un NOUVEAU tableau à chaque render → ne jamais le mettre
  // directement en dep d'un useEffect qui appelle setNodes/setEdges.
  const prevDepsData = useRef<object[]>([]);
  const prevConnData = useRef<object[]>([]);

  const nodePositions = useRef(new Map<string, { x: number; y: number }>());

  // Ordonnancement : Maison mère au milieu
  const ordered = useMemo<Organization[]>(() => {
    const mmIdx = subsidiaries.findIndex(isMaisonMere);
    if (mmIdx < 0) return subsidiaries;
    const mm     = subsidiaries[mmIdx];
    const others = subsidiaries.filter((_, i) => i !== mmIdx);
    const half   = Math.ceil(others.length / 2);
    return [...others.slice(0, half), mm, ...others.slice(half)];
  }, [subsidiaries]);

  const orgIds = useMemo(() => ordered.map(o => o.id), [ordered]);

  const depsResults = useQueries({
    queries: orgIds.map(id => ({
      queryKey: getListBioDependenciesQueryKey(id),
      queryFn:  () => listBioDependencies(id),
      staleTime: 60_000,
    })),
  });

  const connResults = useQueries({
    queries: orgIds.map(id => ({
      queryKey: getListBioConnectionsQueryKey(id),
      queryFn:  () => listBioConnections(id),
      staleTime: 60_000,
    })),
  });

  const isLoading = depsResults.some(q => q.isLoading) || connResults.some(q => q.isLoading);

  const updatePos = useUpdateBioDependency();

  // Sync données → nœuds RF.
  // PAS de tableau de deps : l'effet tourne à chaque render MAIS sort immédiatement
  // si les références data de React Query n'ont pas changé.
  // Raison : useQueries renvoie un NOUVEAU tableau à chaque render (référence instable),
  // donc le mettre en dep causerait une boucle infinie. Les objets result.data, eux,
  // sont stables entre deux renders tant qu'aucun refetch ne se produit.
  useEffect(() => {
    if (isLoading) return;

    const curDeps = depsResults.map(r => r.data as object);
    const curConn = connResults.map(r => r.data as object);

    const same =
      curDeps.length === prevDepsData.current.length &&
      curConn.length === prevConnData.current.length &&
      curDeps.every((d, i) => d === prevDepsData.current[i]) &&
      curConn.every((d, i) => d === prevConnData.current[i]);

    if (same) return; // rien n'a changé → pas de setState → pas de boucle

    prevDepsData.current = curDeps;
    prevConnData.current = curConn;

    // ── Offsets Y cumulatifs basés sur la grille réelle de chaque section ──────
    // On calcule d'abord la hauteur réelle de chaque section à partir du nombre
    // de lignes de cartes (même formule que defaultElementPosition).
    const sectionHeights = ordered.map((_, orgIdx) => {
      const elements = depsResults[orgIdx]?.data?.items ?? [];
      const rowCount  = Math.max(1, Math.ceil(elements.length / 2));
      // row 0..rowCount-1, chaque rang = 130px, marge haut 70px, marge bas 60px
      return 70 + rowCount * 130 + 60;
    });

    const yOffsets: number[] = [];
    let cumY = 0;
    for (const h of sectionHeights) {
      yOffsets.push(cumY);
      cumY += h;
    }

    // Les panneaux de zone seront recalculés après le placement des nœuds,
    // depuis les bornes réelles des cartes (voir plus bas).

    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];
    const chainNodeIds: string[] = [];

    // ── Séparateurs entre sections ────────────────────────────────────────────
    const sepW = CANVAS_ZONE_W * 3;
    for (let i = 1; i < ordered.length; i++) {
      allNodes.push({
        id: `sep-${i}`, type: "separator",
        position: { x: 0, y: yOffsets[i] - 1 },
        data: { totalWidth: sepW } satisfies SeparatorData,
        zIndex: -5, selectable: false, draggable: false, connectable: false,
      });
    }

    ordered.forEach((org, orgIdx) => {
      const yOffset  = yOffsets[orgIdx];
      const elements = depsResults[orgIdx]?.data?.items ?? [];
      const conns    = connResults[orgIdx]?.data?.items ?? [];
      const isMM     = isMaisonMere(org);

      const zoneCounts: Record<string, number> = {};
      elements.forEach(el => {
        const nodeId = `${org.id}-${el.id}`;
        const zone   = el.chainPosition ?? "amont";
        const zIdx   = zoneCounts[zone] ?? 0;
        zoneCounts[zone] = zIdx + 1;
        const def = defaultElementPosition(zone, zIdx);

        const saved = nodePositions.current.get(nodeId);
        const pos   = saved ?? (
          el.x != null && el.y != null
            ? { x: el.x, y: el.y + yOffset }
            : { x: def.x, y: def.y + yOffset }
        );

        allNodes.push({
          id: nodeId, type: "bioElement" as const, position: pos,
          data: { name: el.name ?? null, category: el.category ?? null, subCategory: el.subCategory ?? null },
        });
      });

      // Représentant pour la chaîne automatique
      const chainElId = findChainElement(elements, isMM);
      if (chainElId !== null && !chainNodeIds.includes(`${org.id}-${chainElId}`)) {
        chainNodeIds.push(`${org.id}-${chainElId}`);
      }

      // Connexions intra-filiale
      conns.forEach(conn => {
        allEdges.push({
          id:     `${org.id}-conn-${conn.id}`,
          source: `${org.id}-${conn.fromElementId}`,
          target: `${org.id}-${conn.toElementId}`,
          type:   "smoothstep",
          label:  conn.relationType ?? undefined,
          labelStyle:          { fontSize: 10, fill: "#475569", fontWeight: 600 },
          labelBgStyle:        { fill: "#f8fafc", stroke: "#e2e8f0", strokeWidth: 1 },
          labelBgPadding:      [6, 3] as [number, number],
          labelBgBorderRadius: 4,
          markerEnd:  { type: MarkerType.ArrowClosed, color: "#94a3b8" },
          style:      { stroke: "#94a3b8", strokeWidth: 1.5 },
        });
      });
    });

    // Liaisons automatiques (chaîne siège social ↔ agences)
    for (let i = 0; i < chainNodeIds.length - 1; i++) {
      allEdges.push({
        id: `auto-chain-${i}`, source: chainNodeIds[i], target: chainNodeIds[i + 1],
        type: "straight",
        markerEnd: { type: MarkerType.ArrowClosed, color: "#64748b" },
        style:     { stroke: "#64748b", strokeWidth: 2, strokeDasharray: "6 4" },
      });
    }

    // ── Zone panels calculés depuis les bornes réelles des cartes ────────────
    const elemNodes = allNodes.filter(n => n.type === "bioElement");
    const minElemY  = elemNodes.length > 0 ? Math.min(...elemNodes.map(n => n.position.y)) : 0;
    const maxElemY  = elemNodes.length > 0 ? Math.max(...elemNodes.map(n => n.position.y)) + NODE_H : NODE_H;
    const panelH    = (maxElemY - minElemY) + CANVAS_PAD * 2;
    const panelY    = minElemY - CANVAS_PAD;
    const zoneNodes: Node[] = [
      { id: "bg-amont",  type: "zonePanel", position: { x: 0,                 y: panelY }, data: { label: "Amont",   bgColor: "#EFF6FF", borderColor: "#BFDBFE", textColor: "#1D4ED8", height: panelH } satisfies ZonePanelData, zIndex: -10, selectable: false, draggable: false, connectable: false },
      { id: "bg-insitu", type: "zonePanel", position: { x: CANVAS_ZONE_W,     y: panelY }, data: { label: "In situ", bgColor: "#ECFDF5", borderColor: "#A7F3D0", textColor: "#065F46", height: panelH } satisfies ZonePanelData, zIndex: -10, selectable: false, draggable: false, connectable: false },
      { id: "bg-aval",   type: "zonePanel", position: { x: CANVAS_ZONE_W * 2, y: panelY }, data: { label: "Aval",    bgColor: "#F5F3FF", borderColor: "#DDD6FE", textColor: "#6D28D9", height: panelH } satisfies ZonePanelData, zIndex: -10, selectable: false, draggable: false, connectable: false },
    ];

    setNodes([...zoneNodes, ...allNodes] as BioNode[]);
    setEdges(allEdges);
    setCanvasHeight(panelH);
  }); // pas de tableau de deps — intentionnel, voir commentaire ci-dessus

  // Drag → sauvegarde position dans la DB de l'org correspondante
  const onNodeDragStop = useCallback((_: MouseEvent | TouchEvent, node: Node) => {
    // IDs zone panels (bg-*) et separateurs → ignorés
    if (!node.id.match(/^\d+-\d+$/)) return;
    const [rawOrgId, rawElId] = node.id.split("-");
    const orgId = Number(rawOrgId);
    const elId  = Number(rawElId);
    if (isNaN(orgId) || isNaN(elId)) return;
    nodePositions.current.set(node.id, node.position);
    updatePos.mutate({ orgId, id: elId, data: { x: node.position.x, y: node.position.y } });
  }, [updatePos]);

  if (isLoading) {
    return <Skeleton className="w-full rounded-xl" style={{ height: canvasHeight }} />;
  }

  const totalElements = nodes.filter(n => n.type === "bioElement").length;
  const autoChains    = edges.filter(e => String(e.id).startsWith("auto-chain")).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalElements} élément{totalElements !== 1 ? "s" : ""}
          &ensp;·&ensp;{subsidiaries.length} filiale{subsidiaries.length !== 1 ? "s" : ""}
          {autoChains > 0 && (
            <span> &ensp;·&ensp; {autoChains} liaison{autoChains !== 1 ? "s" : ""} automatique{autoChains !== 1 ? "s" : ""}</span>
          )}
        </p>
        <span className="text-xs text-muted-foreground bg-slate-100 border rounded px-2 py-1">
          Vue groupe — déplacez les éléments pour réorganiser
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border shadow-sm" style={{ height: canvasHeight }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          minZoom={0.08}
          maxZoom={2.5}
        >
          <Background gap={20} size={1} color="#cbd5e1" />
          <Controls position="bottom-left" />
          <MiniMap position="bottom-right" nodeColor="#94a3b8" pannable zoomable />
        </ReactFlow>
      </div>
    </div>
  );
}

// ─── Dispatcher principal ─────────────────────────────────────────────────────

export function TabCartoDependances({ orgId, subsidiaries }: Props) {
  if (subsidiaries && subsidiaries.length > 0) {
    return <GroupCarto subsidiaries={subsidiaries} />;
  }
  return <IndividualCarto orgId={orgId} />;
}

// ─── Vue individuelle (filiale ou org autonome) ───────────────────────────────

function IndividualCarto({ orgId }: { orgId: number }) {
  const queryClient = useQueryClient();
  const [nodes, setNodes, onNodesChange] = useNodesState<BioNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [connectDialog, setConnectDialog] = useState<{
    source: string; target: string; manual: boolean;
  } | null>(null);
  const [manualFrom,        setManualFrom]        = useState("");
  const [manualTo,          setManualTo]          = useState("");
  const [relationType,      setRelationType]      = useState("");
  const [customRelationType,setCustomRelationType]= useState("");
  const [deleteConnId,      setDeleteConnId]      = useState<number | null>(null);
  const [canvasHeight,      setCanvasHeight]      = useState(280);

  const nodePositions = useRef(new Map<number, { x: number; y: number }>());

  const { data: depsData, isLoading } = useListBioDependencies(orgId);
  const { data: connData }            = useListBioConnections(orgId);
  const elements    = depsData?.items ?? [];
  const connections = connData?.items ?? [];

  const updatePos  = useUpdateBioDependency();
  const createConn = useCreateBioConnection();
  const deleteConn = useDeleteBioConnection();

  // Sync elements → nœuds RF (zone-panels toujours en tête pour rester en fond)
  useEffect(() => {
    if (!depsData) return;
    const zoneCounts: Record<string, number> = {};
    const newNodes: BioNode[] = elements.map(el => {
      const zone = el.chainPosition ?? "amont";
      const idx  = zoneCounts[zone] ?? 0;
      zoneCounts[zone] = idx + 1;
      const def  = defaultElementPosition(zone, idx);
      return {
        id:       String(el.id),
        type:     "bioElement" as const,
        position: nodePositions.current.get(el.id) ?? { x: el.x ?? def.x, y: el.y ?? def.y },
        data: {
          name:        el.name        ?? null,
          category:    el.category    ?? null,
          subCategory: el.subCategory ?? null,
        },
      };
    });
    // Bornes réelles des cartes → zone panels et canvas dimensionnés exactement au contenu
    const minY = newNodes.length > 0 ? Math.min(...newNodes.map(n => n.position.y)) : 0;
    const maxY = newNodes.length > 0 ? Math.max(...newNodes.map(n => n.position.y)) + NODE_H : NODE_H;
    const panelH = (maxY - minY) + CANVAS_PAD * 2;
    const panelY = minY - CANVAS_PAD;
    const zoneNodes: Node[] = [
      { id: "bg-amont",  type: "zonePanel", position: { x: 0,                 y: panelY }, data: { label: "Amont",   bgColor: "#EFF6FF", borderColor: "#BFDBFE", textColor: "#1D4ED8", height: panelH } satisfies ZonePanelData, zIndex: -10, selectable: false, draggable: false, connectable: false },
      { id: "bg-insitu", type: "zonePanel", position: { x: CANVAS_ZONE_W,     y: panelY }, data: { label: "In situ", bgColor: "#ECFDF5", borderColor: "#A7F3D0", textColor: "#065F46", height: panelH } satisfies ZonePanelData, zIndex: -10, selectable: false, draggable: false, connectable: false },
      { id: "bg-aval",   type: "zonePanel", position: { x: CANVAS_ZONE_W * 2, y: panelY }, data: { label: "Aval",    bgColor: "#F5F3FF", borderColor: "#DDD6FE", textColor: "#6D28D9", height: panelH } satisfies ZonePanelData, zIndex: -10, selectable: false, draggable: false, connectable: false },
    ];
    setCanvasHeight(panelH);
    setNodes([...zoneNodes, ...newNodes] as BioNode[]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsData]);

  // Sync connections → arêtes RF
  useEffect(() => {
    if (!connData) return;
    setEdges(connections.map(connToEdge));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connData]);

  // Sauvegarde position (fire-and-forget) — ignore les nœuds de fond
  const onNodeDragStop = useCallback(
    (_: MouseEvent | TouchEvent, node: Node) => {
      const id = Number(node.id);
      if (isNaN(id)) return; // zone-panel nodes ont des IDs non-numériques
      nodePositions.current.set(id, { x: node.position.x, y: node.position.y });
      updatePos.mutate({ orgId, id, data: { x: node.position.x, y: node.position.y } });
    },
    [orgId, updatePos],
  );

  // Drag natif → dialog type relation
  const onConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target) return;
    setRelationType(""); setCustomRelationType("");
    setConnectDialog({ source: params.source, target: params.target, manual: false });
  }, []);

  // Clic arête → supprimer
  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    if (typeof edge.data?.connectionId === "number") {
      setDeleteConnId(edge.data.connectionId as number);
    }
  }, []);

  async function handleConnect() {
    const source = connectDialog?.manual ? manualFrom : (connectDialog?.source ?? "");
    const target = connectDialog?.manual ? manualTo   : (connectDialog?.target ?? "");
    if (!source || !target) return;
    const type = relationType === "Autre" ? customRelationType : relationType;
    const conn = await createConn.mutateAsync({
      orgId,
      data: { fromElementId: Number(source), toElementId: Number(target), relationType: type || null },
    });
    setEdges(prev => [...prev, connToEdge(conn)]);
    setConnectDialog(null);
    setRelationType(""); setCustomRelationType(""); setManualFrom(""); setManualTo("");
  }

  async function handleDeleteConnection() {
    if (deleteConnId === null) return;
    await deleteConn.mutateAsync({ orgId, id: deleteConnId });
    const cid = deleteConnId;
    setEdges(prev => prev.filter(e => e.data?.connectionId !== cid));
    queryClient.invalidateQueries({ queryKey: getListBioConnectionsQueryKey(orgId) });
    setDeleteConnId(null);
  }

  function openManualConnect() {
    setManualFrom(""); setManualTo(""); setRelationType(""); setCustomRelationType("");
    setConnectDialog({ source: "", target: "", manual: true });
  }

  const getElLabel = (id: string) => {
    const el = elements.find(e => String(e.id) === id);
    if (!el) return id;
    return elementLabel(el.name, el.category, el.subCategory) || `ID ${id}`;
  };

  if (!isLoading && elements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
        <Network className="h-10 w-10 opacity-30" />
        <p className="text-sm max-w-xs">
          Aucun élément à cartographier. Ajoutez-en dans l'onglet "Saisie".
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {elements.length} élément{elements.length !== 1 ? "s" : ""}&ensp;·&ensp;
          {connections.length} connexion{connections.length !== 1 ? "s" : ""}
          {connections.length > 0 && (
            <span className="text-xs"> — cliquez sur une flèche pour la supprimer</span>
          )}
        </p>
        <Button size="sm" variant="outline" onClick={openManualConnect} disabled={elements.length < 2}>
          <Plus className="h-4 w-4 mr-1" />Créer une connexion
        </Button>
      </div>

      {/* Canvas — fond AMONT/IN SITU/AVAL intégré comme nœuds ReactFlow */}
      {isLoading ? (
        <Skeleton className="w-full rounded-xl" style={{ height: canvasHeight }} />
      ) : (
        <div className="overflow-hidden rounded-xl border shadow-sm" style={{ height: canvasHeight }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={onNodeDragStop}
            onConnect={onConnect}
            onEdgeClick={onEdgeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            minZoom={0.25}
            maxZoom={2.5}
          >
            <Background gap={20} size={1} color="#cbd5e1" />
            <Controls position="bottom-left" />
            <MiniMap position="bottom-right" nodeColor="#94a3b8" pannable zoomable />
          </ReactFlow>
        </div>
      )}

      {/* Dialog connexion */}
      <Dialog open={connectDialog !== null} onOpenChange={open => !open && setConnectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer une connexion</DialogTitle>
            <DialogDescription>
              Définissez la relation entre deux éléments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {connectDialog?.manual ? (
              <>
                <div className="space-y-1.5">
                  <Label>Origine</Label>
                  <Select value={manualFrom} onValueChange={setManualFrom}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                    <SelectContent>
                      {elements.filter(e => String(e.id) !== manualTo).map(e => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {familyIcon(e.category)} {elementLabel(e.name, e.category, e.subCategory) || `ID ${e.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Destination</Label>
                  <Select value={manualTo} onValueChange={setManualTo}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                    <SelectContent>
                      {elements.filter(e => String(e.id) !== manualFrom).map(e => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {familyIcon(e.category)} {elementLabel(e.name, e.category, e.subCategory) || `ID ${e.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm p-3 bg-slate-50 rounded-lg border">
                <span className="font-semibold">{getElLabel(connectDialog?.source ?? "")}</span>
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="font-semibold">{getElLabel(connectDialog?.target ?? "")}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Type de relation <span className="text-muted-foreground font-normal text-xs">— optionnel</span></Label>
              <Select value={relationType} onValueChange={setRelationType}>
                <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>
                  {RELATION_TYPES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              {relationType === "Autre" && (
                <Input
                  className="mt-1.5"
                  placeholder="Préciser…"
                  value={customRelationType}
                  onChange={e => setCustomRelationType(e.target.value)}
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialog(null)}>Annuler</Button>
            <Button
              onClick={handleConnect}
              disabled={createConn.isPending || (connectDialog?.manual === true && (!manualFrom || !manualTo))}
            >
              {createConn.isPending ? "Création…" : "Créer la connexion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog suppression connexion */}
      <AlertDialog open={deleteConnId !== null} onOpenChange={open => !open && setDeleteConnId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette connexion ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConnection}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteConn.isPending}
            >
              {deleteConn.isPending ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
