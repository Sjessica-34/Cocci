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
import { ArrowRight, Building2, Network, Plus } from "lucide-react";
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

// ─── Nœud en-tête d'organisation (vue groupe) ────────────────────────────────

type OrgHeaderData = { name: string; isMaisonMere: boolean; count: number };

const OrgHeaderNodeComp = memo(function OrgHeaderNodeComp({
  data,
}: NodeProps<Node<OrgHeaderData>>) {
  return (
    <div
      className={`px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow border select-none pointer-events-none whitespace-nowrap ${
        data.isMaisonMere
          ? "bg-amber-50 border-amber-300 text-amber-800"
          : "bg-white border-slate-300 text-slate-700"
      }`}
      style={{ minWidth: 260 }}
    >
      <Building2 className="h-4 w-4 shrink-0" />
      <span>{data.name}</span>
      {data.isMaisonMere && (
        <span className="ml-1 text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-medium">
          Maison mère
        </span>
      )}
      <span className="ml-auto text-xs opacity-50 pl-4">
        {data.count} élément{data.count !== 1 ? "s" : ""}
      </span>
    </div>
  );
});

const nodeTypes: NodeTypes = {
  bioElement: BioElementNode,
  orgHeader:  OrgHeaderNodeComp as NodeTypes[string],
};

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
// Tous les éléments de toutes les filiales sont affichés dans un seul ReactFlow.
// Chaque filiale a un nœud en-tête + ses éléments décalés verticalement.
// La Maison mère est placée au milieu de l'empilement vertical.

const SECTION_H = 520; // hauteur réservée par filiale (px)
const HEADER_H  = 54;  // hauteur du nœud en-tête d'org

function isMaisonMere(org: Organization): boolean {
  return /m[eè]re/i.test(org.name) || /si[eè]ge/i.test(org.name);
}

function GroupCarto({ subsidiaries }: { subsidiaries: Organization[] }) {
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

  const { nodes, edges } = useMemo(() => {
    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];

    ordered.forEach((org, orgIdx) => {
      const yOffset  = orgIdx * SECTION_H;
      const elements = depsResults[orgIdx]?.data?.items ?? [];
      const conns    = connResults[orgIdx]?.data?.items ?? [];
      const isMM     = isMaisonMere(org);

      // Nœud en-tête de l'organisation
      allNodes.push({
        id:       `header-${org.id}`,
        type:     "orgHeader",
        position: { x: 0, y: yOffset },
        data:     { name: org.name, isMaisonMere: isMM, count: elements.length } satisfies OrgHeaderData,
        selectable:  false,
        draggable:   false,
        connectable: false,
      });

      // Nœuds des éléments (positions sauvegardées + offset vertical)
      const zoneCounts: Record<string, number> = {};
      elements.forEach((el) => {
        const zone = el.chainPosition ?? "amont";
        let pos: { x: number; y: number };
        if (el.x != null && el.y != null) {
          pos = { x: el.x, y: el.y + yOffset + HEADER_H };
        } else {
          const idx = (zoneCounts[zone] = (zoneCounts[zone] ?? -1) + 1);
          const def  = defaultElementPosition(zone, idx);
          pos = { x: def.x, y: def.y + yOffset + HEADER_H };
        }
        allNodes.push({
          id:       `${org.id}-${el.id}`,
          type:     "bioElement",
          position: pos,
          data: {
            name:        el.name        ?? null,
            category:    el.category    ?? null,
            subCategory: el.subCategory ?? null,
          } satisfies BioNodeData,
          draggable:   false,
          selectable:  false,
          connectable: false,
        });
      });

      // Connexions de la filiale (IDs préfixés pour éviter les collisions)
      conns.forEach((conn) => {
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

    return { nodes: allNodes, edges: allEdges };
  }, [ordered, depsResults, connResults]);

  if (isLoading) {
    return <Skeleton className="h-[700px] w-full rounded-xl" />;
  }

  const totalElements = nodes.filter(n => n.type === "bioElement").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalElements} élément{totalElements !== 1 ? "s" : ""}
          &ensp;·&ensp;{edges.length} connexion{edges.length !== 1 ? "s" : ""}
          &ensp;·&ensp;{subsidiaries.length} filiale{subsidiaries.length !== 1 ? "s" : ""}
        </p>
        <span className="text-xs text-muted-foreground bg-slate-100 border rounded px-2 py-1">
          Lecture seule — modifiez depuis chaque filiale
        </span>
      </div>

      <div className="flex flex-col overflow-hidden rounded-xl border shadow-sm" style={{ height: 700 }}>
        {/* En-têtes de zones (partagés pour toutes les filiales) */}
        <div className="grid grid-cols-3 border-b shrink-0">
          <div className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-blue-700 bg-blue-50 border-r border-blue-200">Amont</div>
          <div className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border-r border-emerald-200">In situ</div>
          <div className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-purple-700 bg-purple-50">Aval</div>
        </div>

        <div style={{ flex: 1 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.1 }}
            minZoom={0.08}
            maxZoom={2.5}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
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
