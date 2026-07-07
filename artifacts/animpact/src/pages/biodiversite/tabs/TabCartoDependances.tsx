import "@xyflow/react/dist/style.css";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  Handle, Position, MarkerType,
  type Node, type Edge, type Connection, type NodeProps, type NodeTypes,
} from "@xyflow/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListBioDependencies,
  useUpdateBioDependency,
  useListBioConnections,
  useCreateBioConnection,
  useDeleteBioConnection,
  getListBioDependenciesQueryKey,
  getListBioConnectionsQueryKey,
  type BioDependency,
  type BioConnection,
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
  RELATION_TYPES, getCategoryEmoji, categoryBorderColor, depDotColor, defaultElementPosition,
} from "../data";

// ─── Types ────────────────────────────────────────────────────────────────────

type BioNodeData = {
  name: string | null;
  category: string | null;
  subCategory: string | null;
  dependencyLevel: number | null;
  masteryLevel: number | null;
};
type BioNode = Node<BioNodeData, "bioElement">;

// ─── Custom node (MUST be outside component) ──────────────────────────────────

const BioElementNode = memo(function BioElementNode({ data }: NodeProps<BioNode>) {
  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: "#94a3b8", width: 10, height: 10, border: "2px solid white" }}
      />
      <div
        className="bg-white rounded-xl shadow-md border-2 p-3"
        style={{ minWidth: 160, maxWidth: 200, borderColor: categoryBorderColor(data.category) }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <span style={{ fontSize: 15, lineHeight: 1 }}>{getCategoryEmoji(data.category)}</span>
          <p className="text-xs font-bold truncate flex-1 leading-tight">
            {data.name || "Sans nom"}
          </p>
        </div>
        {data.category && (
          <p className="text-[10px] text-slate-500 truncate mb-2">
            {data.category}{data.subCategory ? ` › ${data.subCategory}` : ""}
          </p>
        )}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-slate-400" style={{ width: 28 }}>Dép.</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(n => (
                <div
                  key={n}
                  className={`rounded-full ${depDotColor(data.dependencyLevel, n)}`}
                  style={{ width: 8, height: 8 }}
                />
              ))}
            </div>
          </div>
          {data.masteryLevel != null && (
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-slate-400" style={{ width: 28 }}>Maît.</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(n => (
                  <div
                    key={n}
                    className={`rounded-full ${n <= data.masteryLevel! ? "bg-blue-400" : "bg-slate-200"}`}
                    style={{ width: 8, height: 8 }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: "#94a3b8", width: 10, height: 10, border: "2px solid white" }}
      />
    </div>
  );
});

const nodeTypes: NodeTypes = { bioElement: BioElementNode };

// ─── Edge helper ──────────────────────────────────────────────────────────────

function connToEdge(conn: BioConnection): Edge {
  return {
    id: `e${conn.id}`,
    source: String(conn.fromElementId),
    target: String(conn.toElementId),
    type: "smoothstep",
    label: conn.relationType ?? undefined,
    labelStyle: { fontSize: 10, fill: "#475569", fontWeight: 600 },
    labelBgStyle: { fill: "#f8fafc", stroke: "#e2e8f0", strokeWidth: 1 },
    labelBgPadding: [6, 3] as [number, number],
    labelBgBorderRadius: 4,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
    style: { stroke: "#94a3b8", strokeWidth: 1.5 },
    data: { connectionId: conn.id },
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props { orgId: number; }

export function TabCartoDependances({ orgId }: Props) {
  const queryClient = useQueryClient();
  const [nodes, setNodes, onNodesChange] = useNodesState<BioNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [connectDialog, setConnectDialog] = useState<{
    source: string; target: string; manual: boolean;
  } | null>(null);
  const [manualFrom, setManualFrom] = useState("");
  const [manualTo, setManualTo] = useState("");
  const [relationType, setRelationType] = useState("");
  const [customRelationType, setCustomRelationType] = useState("");
  const [deleteConnId, setDeleteConnId] = useState<number | null>(null);

  const nodePositions = useRef(new Map<number, { x: number; y: number }>());

  const { data: depsData, isLoading } = useListBioDependencies(orgId);
  const { data: connData } = useListBioConnections(orgId);
  const elements  = depsData?.items ?? [];
  const connections = connData?.items ?? [];

  const updatePos  = useUpdateBioDependency();
  const createConn = useCreateBioConnection();
  const deleteConn = useDeleteBioConnection();

  // Sync elements → RF nodes (preserving dragged positions)
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
          name:            el.name            ?? null,
          category:        el.category        ?? null,
          subCategory:     el.subCategory     ?? null,
          dependencyLevel: el.dependencyLevel ?? null,
          masteryLevel:    el.masteryLevel    ?? null,
        },
      };
    });
    setNodes(newNodes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsData]);

  // Sync connections → RF edges
  useEffect(() => {
    if (!connData) return;
    setEdges(connections.map(connToEdge));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connData]);

  // Fire-and-forget position save (no invalidation → preserves positions on refetch)
  const onNodeDragStop = useCallback(
    (_: MouseEvent | TouchEvent, node: Node) => {
      nodePositions.current.set(Number(node.id), { x: node.position.x, y: node.position.y });
      updatePos.mutate({ orgId, id: Number(node.id), data: { x: node.position.x, y: node.position.y } });
    },
    [orgId, updatePos],
  );

  // Native drag-to-connect → open relation type dialog
  const onConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target) return;
    setRelationType("");
    setCustomRelationType("");
    setConnectDialog({ source: params.source, target: params.target, manual: false });
  }, []);

  // Edge click → delete confirmation
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
    setRelationType("");
    setCustomRelationType("");
    setManualFrom("");
    setManualTo("");
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
    setManualFrom("");
    setManualTo("");
    setRelationType("");
    setCustomRelationType("");
    setConnectDialog({ source: "", target: "", manual: true });
  }

  const getElName = (id: string) =>
    elements.find(e => String(e.id) === id)?.name ?? `Élément ${id}`;

  const elementCount   = elements.length;
  const connectionCount = connections.length;

  if (!isLoading && elementCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
        <Network className="h-10 w-10 opacity-30" />
        <p className="text-sm max-w-xs">
          Aucun élément à cartographier. Commencez par en ajouter dans l'onglet "Saisie".
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {elementCount} élément{elementCount !== 1 ? "s" : ""}&ensp;·&ensp;
          {connectionCount} connexion{connectionCount !== 1 ? "s" : ""}
          {connectionCount > 0 && <span className="text-xs"> — cliquez sur une flèche pour la supprimer</span>}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={openManualConnect}
          disabled={elementCount < 2}
        >
          <Plus className="h-4 w-4 mr-1" />
          Créer une connexion
        </Button>
      </div>

      {/* Canvas */}
      {isLoading ? (
        <Skeleton className="h-[612px] w-full rounded-xl" />
      ) : (
        <div className="flex flex-col overflow-hidden rounded-xl border shadow-sm" style={{ height: 612 }}>
          {/* Zone headers */}
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
                background: "linear-gradient(to right, #EFF6FF 0%, #EFF6FF 33.33%, #ECFDF5 33.33%, #ECFDF5 66.67%, #F5F3FF 66.67%, #F5F3FF 100%)",
              }}
            >
              <Background gap={20} size={1} color="#cbd5e1" />
              <Controls position="bottom-left" />
              <MiniMap position="bottom-right" nodeColor="#94a3b8" pannable zoomable />
            </ReactFlow>
          </div>
        </div>
      )}

      {/* Connect dialog */}
      <Dialog open={connectDialog !== null} onOpenChange={open => !open && setConnectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer une connexion</DialogTitle>
            <DialogDescription>
              Définissez la relation entre deux éléments de la cartographie.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {connectDialog?.manual ? (
              <>
                <div className="space-y-1.5">
                  <Label>Origine</Label>
                  <Select value={manualFrom} onValueChange={setManualFrom}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un élément…" /></SelectTrigger>
                    <SelectContent>
                      {elements
                        .filter(e => String(e.id) !== manualTo)
                        .map(e => (
                          <SelectItem key={e.id} value={String(e.id)}>
                            {e.name ?? `Élément ${e.id}`}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Destination</Label>
                  <Select value={manualTo} onValueChange={setManualTo}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un élément…" /></SelectTrigger>
                    <SelectContent>
                      {elements
                        .filter(e => String(e.id) !== manualFrom)
                        .map(e => (
                          <SelectItem key={e.id} value={String(e.id)}>
                            {e.name ?? `Élément ${e.id}`}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm p-3 bg-slate-50 rounded-lg border">
                <span className="font-semibold">{getElName(connectDialog?.source ?? "")}</span>
                <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="font-semibold">{getElName(connectDialog?.target ?? "")}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Type de relation <span className="text-muted-foreground font-normal">(optionnel)</span></Label>
              <Select value={relationType} onValueChange={setRelationType}>
                <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>
                  {RELATION_TYPES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              {relationType === "Autre" && (
                <Input
                  className="mt-1.5"
                  placeholder="Préciser le type de relation…"
                  value={customRelationType}
                  onChange={e => setCustomRelationType(e.target.value)}
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialog(null)}>
              Annuler
            </Button>
            <Button
              onClick={handleConnect}
              disabled={
                createConn.isPending ||
                (connectDialog?.manual === true && (!manualFrom || !manualTo))
              }
            >
              {createConn.isPending ? "Création…" : "Créer la connexion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete connection dialog */}
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
