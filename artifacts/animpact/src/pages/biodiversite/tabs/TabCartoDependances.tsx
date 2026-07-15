import "@xyflow/react/dist/style.css";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  getListBioConnectionsQueryKey,
  getListBioDependenciesQueryKey,
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

const nodeTypes: NodeTypes = { bioElement: BioElementNode };

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

// ─── Vue groupe : cartographies empilées ──────────────────────────────────────
// Chaque filiale conserve sa propre cartographie (positions, connexions, couleurs).
// La Maison mère est placée au milieu. Les autres filiales sont réparties
// équitablement au-dessus et en dessous.

function isMaisonMere(org: Organization): boolean {
  return /m[eè]re/i.test(org.name) || /si[eè]ge/i.test(org.name);
}

function GroupCarto({ subsidiaries }: { subsidiaries: Organization[] }) {
  // Tri : Maison mère au milieu, autres réparties équitablement
  const maisonMereIdx = subsidiaries.findIndex(isMaisonMere);
  let ordered: Organization[];

  if (maisonMereIdx >= 0) {
    const maisonMere = subsidiaries[maisonMereIdx];
    const others     = subsidiaries.filter((_, i) => i !== maisonMereIdx);
    const half       = Math.ceil(others.length / 2);
    ordered = [...others.slice(0, half), maisonMere, ...others.slice(half)];
  } else {
    ordered = subsidiaries;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 px-1 pb-3 border-b text-xs text-muted-foreground">
        <span>📊</span>
        <span>
          Vue groupe — {subsidiaries.length} filiale{subsidiaries.length !== 1 ? "s" : ""} · Lecture seule · Modifiez depuis chaque filiale
        </span>
      </div>

      {ordered.map((org, idx) => {
        const isMM = isMaisonMere(org);
        const isCenter = maisonMereIdx >= 0 && isMM;
        return (
          <div key={org.id}>
            <SubCartoBlock org={org} highlight={isCenter} />
            {isCenter && idx < ordered.length - 1 && (
              <div className="flex items-center gap-2 py-2 px-1 mt-4">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Filiales rattachées</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Bloc cartographie d'une filiale (lecture seule) ──────────────────────────

function SubCartoBlock({ org, highlight }: { org: Organization; highlight?: boolean }) {
  const { data: depsData, isLoading: loadingDeps } = useListBioDependencies(org.id);
  const { data: connData, isLoading: loadingConns } = useListBioConnections(org.id);

  const elements    = depsData?.items ?? [];
  const connections = connData?.items ?? [];
  const isLoading   = loadingDeps || loadingConns;

  const nodes = useMemo<BioNode[]>(() => {
    const zoneCounts: Record<string, number> = {};
    return elements.map((el) => {
      const zone = el.chainPosition ?? "amont";
      // Utilise la position sauvegardée si elle existe, sinon position par défaut
      let pos: { x: number; y: number };
      if (el.x != null && el.y != null) {
        pos = { x: el.x, y: el.y };
      } else {
        const idx = (zoneCounts[zone] = (zoneCounts[zone] ?? -1) + 1);
        pos = defaultElementPosition(zone, idx);
      }
      return {
        id:       String(el.id),
        type:     "bioElement" as const,
        position: pos,
        data: {
          name:        el.name        ?? null,
          category:    el.category    ?? null,
          subCategory: el.subCategory ?? null,
        },
      };
    });
  }, [elements]);

  const edges = useMemo<Edge[]>(() => {
    return connections.map((conn) => ({
      id:     `e${conn.id}`,
      source: String(conn.fromElementId),
      target: String(conn.toElementId),
      type:   "smoothstep",
      label:  conn.relationType ?? undefined,
      labelStyle:          { fontSize: 10, fill: "#475569", fontWeight: 600 },
      labelBgStyle:        { fill: "#f8fafc", stroke: "#e2e8f0", strokeWidth: 1 },
      labelBgPadding:      [6, 3] as [number, number],
      labelBgBorderRadius: 4,
      markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8" },
      style:     { stroke: "#94a3b8", strokeWidth: 1.5 },
    }));
  }, [connections]);

  return (
    <div className={`rounded-xl border shadow-sm overflow-hidden ${highlight ? "border-amber-300 ring-1 ring-amber-200" : "border-slate-200"}`}>
      {/* En-tête filiale */}
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${highlight ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
        <Building2 className={`h-4 w-4 shrink-0 ${highlight ? "text-amber-600" : "text-slate-500"}`} />
        <span className={`text-sm font-semibold ${highlight ? "text-amber-800" : "text-slate-700"}`}>{org.name}</span>
        {highlight && (
          <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 font-medium">
            Maison mère
          </span>
        )}
        {!isLoading && (
          <span className="ml-auto text-xs text-muted-foreground">
            {elements.length} élément{elements.length !== 1 ? "s" : ""} · {connections.length} connexion{connections.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-none" />
      ) : elements.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-24 gap-2 text-muted-foreground">
          <Network className="h-5 w-5 opacity-30" />
          <p className="text-xs">Aucun élément dans cette filiale</p>
        </div>
      ) : (
        <div className="flex flex-col" style={{ height: 380 }}>
          {/* En-têtes de zone */}
          <div className="grid grid-cols-3 border-b shrink-0">
            <div className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-blue-700 bg-blue-50 border-r border-blue-200">Amont</div>
            <div className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border-r border-emerald-200">In situ</div>
            <div className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-purple-700 bg-purple-50">Aval</div>
          </div>
          {/* ReactFlow */}
          <div style={{ flex: 1 }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.2}
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
      )}
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
