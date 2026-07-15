import "@xyflow/react/dist/style.css";
import { memo, useCallback, useEffect, useRef, useState } from "react";
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
  type BioDependency,
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
import { ArrowRight, Building2, Network, Plus } from "lucide-react";
import {
  RELATION_TYPES, elementLabel, familyIcon, familyColor, familyBg, defaultElementPosition,
} from "../data";

// ─── Types ────────────────────────────────────────────────────────────────────

type BioNodeData = {
  name: string | null;
  category: string | null;    // famille
  subCategory: string | null; // type spécifique
};
type BioNode = Node<BioNodeData, "bioElement">;

// ─── Custom node — DOIT être hors du composant ────────────────────────────────

const BioElementNode = memo(function BioElementNode({ data }: NodeProps<BioNode>) {
  const label = elementLabel(data.name, data.category, data.subCategory);
  const icon  = familyIcon(data.category);
  const color = familyColor(data.category);
  const bg    = familyBg(data.category);

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
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: color, width: 10, height: 10, border: "2px solid white" }}
      />
    </div>
  );
});

const nodeTypes: NodeTypes = { bioElement: BioElementNode };

// ─── Vue groupe — constantes ──────────────────────────────────────────────────

const MAISON_MERE_NAME = "Maison mère / Siège social";

// Approximations de taille d'un nœud bio-élément (px)
const NODE_W   = 200;
const NODE_H   = 65;
const ORG_PAD  = 80;   // padding autour de la carto de chaque org
const H_GAP    = 140;  // espace horizontal entre deux orgs sur la même ligne
const V_GAP    = 160;  // espace vertical entre les lignes

// ─── Vue groupe — étiquette d'organisation ────────────────────────────────────

type OrgLabelData = { orgName: string; isCenter: boolean; elemCount: number };
type OrgLabelNode = Node<OrgLabelData, "orgLabel">;

const OrgLabelNodeComp = memo(function OrgLabelNodeComp({ data }: NodeProps<OrgLabelNode>) {
  return (
    <div
      className="px-4 py-2 rounded-xl shadow border-2 select-none text-center"
      style={{
        minWidth: 180,
        backgroundColor: data.isCenter ? "#ecfdf5" : "#f0f9ff",
        borderColor:     data.isCenter ? "#34d399" : "#7dd3fc",
      }}
    >
      <Handle type="target" position={Position.Bottom}
        style={{ background: data.isCenter ? "#34d399" : "#7dd3fc", width: 9, height: 9, border: "2px solid white" }} />
      <Handle type="source" position={Position.Top}
        style={{ background: data.isCenter ? "#34d399" : "#7dd3fc", width: 9, height: 9, border: "2px solid white" }} />
      <Handle type="target" id="right-t" position={Position.Right}
        style={{ background: data.isCenter ? "#34d399" : "#7dd3fc", width: 9, height: 9, border: "2px solid white" }} />
      <Handle type="source" id="left-s"  position={Position.Left}
        style={{ background: data.isCenter ? "#34d399" : "#7dd3fc", width: 9, height: 9, border: "2px solid white" }} />
      <Building2 className="h-4 w-4 mx-auto mb-0.5"
        style={{ color: data.isCenter ? "#059669" : "#0284c7" }} />
      <p className="text-xs font-bold leading-tight"
        style={{ color: data.isCenter ? "#065f46" : "#0c4a6e" }}>
        {data.orgName}
      </p>
      {data.elemCount === 0 ? (
        <p className="text-[10px] mt-0.5 opacity-60"
          style={{ color: data.isCenter ? "#059669" : "#0284c7" }}>
          Aucun élément
        </p>
      ) : (
        <p className="text-[10px] mt-0.5 opacity-70"
          style={{ color: data.isCenter ? "#059669" : "#0284c7" }}>
          {data.elemCount} élément{data.elemCount !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
});

// bioElement + orgLabel sur le même canvas
const groupAllNodeTypes: NodeTypes = { bioElement: BioElementNode, orgLabel: OrgLabelNodeComp };

// ─── Vue groupe — calcul des positions ───────────────────────────────────────

/** Retourne les positions effectives (stockées ou par défaut) de chaque élément. */
function resolvePositions(elements: BioDependency[]): { x: number; y: number }[] {
  const zoneCounts: Record<string, number> = {};
  return elements.map((el) => {
    const zone = el.chainPosition ?? "amont";
    const idx  = zoneCounts[zone] ?? 0;
    zoneCounts[zone] = idx + 1;
    const def = defaultElementPosition(zone, idx);
    return { x: el.x ?? def.x, y: el.y ?? def.y };
  });
}

/** Bounding-box d'une cartographie (positions réelles + padding). */
function computeBounds(elements: BioDependency[], positions: { x: number; y: number }[]) {
  if (elements.length === 0) {
    return { minX: 0, minY: 0, width: 420, height: 280 };
  }
  const minX = Math.min(...positions.map((p) => p.x)) - ORG_PAD;
  const minY = Math.min(...positions.map((p) => p.y)) - ORG_PAD;
  const maxX = Math.max(...positions.map((p) => p.x)) + NODE_W + ORG_PAD;
  const maxY = Math.max(...positions.map((p) => p.y)) + NODE_H + ORG_PAD;
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

type OrgData = { org: Organization; elements: BioDependency[]; connections: BioConnection[] };

/**
 * Assemble tous les nœuds et arêtes pour la vue groupe.
 * - Chaque cartographie est décalée pour ne pas chevaucher les autres.
 * - La Maison mère est au centre.
 * - Les filiales sont réparties au-dessus et en dessous.
 * - Seules les connexions inter-orgs (filiale → Maison mère) sont ajoutées.
 */
function buildGroupCartoLayout(orgsData: OrgData[]): {
  nodes: (BioNode | OrgLabelNode)[];
  edges: Edge[];
} {
  const center  = orgsData.find((o) => o.org.name === MAISON_MERE_NAME) ?? orgsData[0];
  const others  = orgsData.filter((o) => o.org.id !== center.org.id);
  const half    = Math.ceil(others.length / 2);
  const above   = others.slice(0, half);
  const below   = others.slice(half);

  // Positions et bornes pré-calculées par org
  const posMap    = new Map<number, { x: number; y: number }[]>();
  const boundsMap = new Map<number, { minX: number; minY: number; width: number; height: number }>();
  for (const od of orgsData) {
    const positions = resolvePositions(od.elements);
    posMap.set(od.org.id, positions);
    boundsMap.set(od.org.id, computeBounds(od.elements, positions));
  }

  const cb = boundsMap.get(center.org.id)!;

  // Hauteur max de chaque rangée
  const aboveH = above.length > 0 ? Math.max(...above.map((o) => boundsMap.get(o.org.id)!.height)) : 0;
  const belowH = below.length > 0 ? Math.max(...below.map((o) => boundsMap.get(o.org.id)!.height)) : 0;

  // Ordonnées (bord supérieur de chaque rangée)
  const centerTop = aboveH > 0 ? aboveH + V_GAP : 0;
  const aboveTop  = aboveH > 0 ? centerTop - aboveH - V_GAP : 0;
  const belowTop  = centerTop + cb.height + V_GAP;

  // Abscisse pivot pour centrer horizontalement
  const pivot = cb.width / 2; // aligné sur le centre de la Maison mère

  function layoutRow(
    row: OrgData[],
    rowTop: number,
  ): { orgId: number; layoutX: number; layoutY: number }[] {
    const totalW = row.reduce((s, o) => s + boundsMap.get(o.org.id)!.width, 0)
                 + (row.length - 1) * H_GAP;
    let curX = pivot - totalW / 2;
    return row.map((o) => {
      const b = boundsMap.get(o.org.id)!;
      const pos = { orgId: o.org.id, layoutX: curX, layoutY: rowTop };
      curX += b.width + H_GAP;
      return pos;
    });
  }

  const layouts = [
    { orgId: center.org.id, layoutX: 0, layoutY: centerTop },
    ...layoutRow(above, aboveTop),
    ...layoutRow(below, belowTop),
  ];

  const allNodes: (BioNode | OrgLabelNode)[] = [];
  const allEdges: Edge[] = [];
  const labelCenterById = new Map<number, { x: number; y: number }>();

  for (const layout of layouts) {
    const od      = orgsData.find((o) => o.org.id === layout.orgId)!;
    const bounds  = boundsMap.get(layout.orgId)!;
    const positions = posMap.get(layout.orgId)!;
    const offset  = { x: layout.layoutX - bounds.minX, y: layout.layoutY - bounds.minY };
    const isCenter = od.org.id === center.org.id;

    // Nœuds bio-éléments décalés
    od.elements.forEach((el, idx) => {
      const pos = positions[idx];
      allNodes.push({
        id:       `g-${layout.orgId}-el-${el.id}`,
        type:     "bioElement" as const,
        position: { x: pos.x + offset.x, y: pos.y + offset.y },
        data:     { name: el.name ?? null, category: el.category ?? null, subCategory: el.subCategory ?? null },
      } as BioNode);
    });

    // Arêtes internes (connexions de la filiale, positions namespaced)
    od.connections.forEach((conn) => {
      allEdges.push({
        id:     `g-${layout.orgId}-conn-${conn.id}`,
        source: `g-${layout.orgId}-el-${conn.fromElementId}`,
        target: `g-${layout.orgId}-el-${conn.toElementId}`,
        type:   "smoothstep",
        label:  conn.relationType ?? undefined,
        labelStyle:          { fontSize: 10, fill: "#475569", fontWeight: 600 },
        labelBgStyle:        { fill: "#f8fafc", stroke: "#e2e8f0", strokeWidth: 1 },
        labelBgPadding:      [6, 3] as [number, number],
        labelBgBorderRadius: 4,
        markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
        style:     { stroke: "#94a3b8", strokeWidth: 1.5 },
      });
    });

    // Étiquette d'organisation — positionnée au-dessus de la carto
    const labelX = layout.layoutX + bounds.width / 2 - 90; // largeur étiquette ~180px
    const labelY = layout.layoutY - 56;
    const labelCenter = { x: labelX + 90, y: labelY + 28 };
    labelCenterById.set(layout.orgId, labelCenter);

    allNodes.push({
      id:       `g-${layout.orgId}-label`,
      type:     "orgLabel" as const,
      position: { x: labelX, y: labelY },
      data:     { orgName: od.org.name, isCenter, elemCount: od.elements.length },
    } as OrgLabelNode);
  }

  // Connexions inter-orgs : chaque filiale → Maison mère
  for (const od of others) {
    allEdges.push({
      id:        `interorg-${od.org.id}-${center.org.id}`,
      source:    `g-${od.org.id}-label`,
      target:    `g-${center.org.id}-label`,
      type:      "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: "#6366f1" },
      style:     { stroke: "#6366f1", strokeWidth: 1.5, strokeDasharray: "6,4" },
    });
  }

  return { nodes: allNodes, edges: allEdges };
}

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

// ─── Vue groupe — récupération et rendu ──────────────────────────────────────

function GroupCarto({ subsidiaries }: { subsidiaries: Organization[] }) {
  const orgIds = subsidiaries.map((s) => s.id);

  // Récupération parallèle des dépendances et connexions de chaque entité
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

  const isLoading = depsResults.some((q) => q.isLoading) || connResults.some((q) => q.isLoading);

  const orgsData: OrgData[] = subsidiaries.map((org, i) => ({
    org,
    elements:    depsResults[i]?.data?.items ?? [],
    connections: connResults[i]?.data?.items ?? [],
  }));

  const { nodes: gNodes, edges: gEdges } = buildGroupCartoLayout(orgsData);

  const totalElements = orgsData.reduce((s, o) => s + o.elements.length, 0);

  if (isLoading) {
    return <Skeleton className="h-[640px] w-full rounded-xl" />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {subsidiaries.length} entité{subsidiaries.length !== 1 ? "s" : ""}
          &ensp;·&ensp;{totalElements} élément{totalElements !== 1 ? "s" : ""}
          &ensp;·&ensp;Vue consolidée du groupe
        </p>
        <span className="text-xs text-muted-foreground bg-slate-100 border rounded px-2 py-1">
          Lecture seule — modifiez chaque filiale séparément
        </span>
      </div>
      <div
        className="flex flex-col overflow-hidden rounded-xl border shadow-sm"
        style={{ height: 640 }}
      >
        <ReactFlow
          nodes={gNodes}
          edges={gEdges}
          nodeTypes={groupAllNodeTypes}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          minZoom={0.05}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          style={{ background: "#f8fafc" }}
        >
          <Background gap={24} size={1} color="#e2e8f0" />
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

  const nodePositions = useRef(new Map<number, { x: number; y: number }>());

  const { data: depsData, isLoading } = useListBioDependencies(orgId);
  const { data: connData }            = useListBioConnections(orgId);
  const elements    = depsData?.items ?? [];
  const connections = connData?.items ?? [];

  const updatePos  = useUpdateBioDependency();
  const createConn = useCreateBioConnection();
  const deleteConn = useDeleteBioConnection();

  // Sync elements → nœuds RF
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
    setNodes(newNodes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsData]);

  // Sync connections → arêtes RF
  useEffect(() => {
    if (!connData) return;
    setEdges(connections.map(connToEdge));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connData]);

  // Sauvegarde position (fire-and-forget)
  const onNodeDragStop = useCallback(
    (_: MouseEvent | TouchEvent, node: Node) => {
      nodePositions.current.set(Number(node.id), { x: node.position.x, y: node.position.y });
      updatePos.mutate({ orgId, id: Number(node.id), data: { x: node.position.x, y: node.position.y } });
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

      {/* Canvas */}
      {isLoading ? (
        <Skeleton className="h-[620px] w-full rounded-xl" />
      ) : (
        <div className="flex flex-col overflow-hidden rounded-xl border shadow-sm" style={{ height: 620 }}>
          {/* En-têtes de zone */}
          <div className="grid grid-cols-3 border-b shrink-0">
            <div className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-blue-700 bg-blue-50 border-r border-blue-200">
              Amont
            </div>
            <div className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border-r border-emerald-200">
              In situ
            </div>
            <div className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-purple-700 bg-purple-50">
              Aval
            </div>
          </div>
          {/* ReactFlow */}
          <div style={{ flex: 1 }}>
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
              style={{
                background:
                  "linear-gradient(to right, #EFF6FF 0%, #EFF6FF 33.33%, #ECFDF5 33.33%, #ECFDF5 66.67%, #F5F3FF 66.67%, #F5F3FF 100%)",
              }}
            >
              <Background gap={20} size={1} color="#cbd5e1" />
              <Controls position="bottom-left" />
              <MiniMap position="bottom-right" nodeColor="#94a3b8" pannable zoomable />
            </ReactFlow>
          </div>
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
