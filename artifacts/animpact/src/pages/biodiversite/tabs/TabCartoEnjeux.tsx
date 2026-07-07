import "@xyflow/react/dist/style.css";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  type Node, type NodeProps, type NodeTypes,
} from "@xyflow/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListBioDependencies,
  useListBioIssues,
  useCreateBioIssue,
  useUpdateBioIssue,
  useDeleteBioIssue,
  useGenerateBioIssues,
  getListBioIssuesQueryKey,
  type BioDependency,
  type BioIssue,
  type BioIssueInput,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Layers, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import {
  CHAIN_POSITIONS, importanceBg, importanceLabel, defaultIssuePosition,
} from "../data";

// ─── Types ────────────────────────────────────────────────────────────────────

type BioIssueData = {
  id: number;
  name: string | null;
  description: string | null;
  importance: number | null;
  elementCount: number;
};
type BioIssueNode = Node<BioIssueData, "bioIssue">;

// ─── Custom node (MUST be outside component) ──────────────────────────────────

const BioIssueNodeComp = memo(function BioIssueNodeComp({ data }: NodeProps<BioIssueNode>) {
  const colors = importanceBg(data.importance);
  return (
    <div
      className="rounded-xl shadow-md border-2 p-3 cursor-pointer hover:shadow-lg transition-shadow select-none"
      style={{
        minWidth: 160,
        maxWidth: 220,
        backgroundColor: colors.bg,
        borderColor:     colors.border,
      }}
    >
      <div className="flex items-start gap-1.5 mb-1">
        <p className="text-sm font-bold leading-tight flex-1" style={{ color: colors.text }}>
          {data.name || "Enjeu sans nom"}
        </p>
        {data.importance && (
          <span
            className="text-[10px] font-bold rounded-full px-1.5 py-0.5 shrink-0"
            style={{ backgroundColor: colors.border, color: "white" }}
          >
            {data.importance}
          </span>
        )}
      </div>
      {data.description && (
        <p
          className="text-[10px] line-clamp-2 mb-1.5 opacity-75"
          style={{ color: colors.text }}
        >
          {data.description}
        </p>
      )}
      {data.elementCount > 0 && (
        <p className="text-[9px] opacity-55" style={{ color: colors.text }}>
          {data.elementCount} élément{data.elementCount !== 1 ? "s" : ""} lié{data.elementCount !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
});

const nodeTypes: NodeTypes = { bioIssue: BioIssueNodeComp };

// ─── EMPTY form ───────────────────────────────────────────────────────────────

const EMPTY_ISSUE: BioIssueInput = {
  name: null, description: null, importance: null,
  comments: null, chainPosition: null, elementIds: [],
};

// ─── Suggestion type ──────────────────────────────────────────────────────────

type Suggestion = {
  name: string;
  description?: string | null;
  elementIds: number[];
  chainPosition?: string | null;
  importance?: number | null;
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props { orgId: number; }

export function TabCartoEnjeux({ orgId }: Props) {
  const queryClient = useQueryClient();
  const [nodes, setNodes, onNodesChange] = useNodesState<BioIssueNode>([]);
  const [, setEdges, onEdgesChange] = useEdgesState([]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<BioIssue | null>(null);
  const [form, setForm] = useState<BioIssueInput>(EMPTY_ISSUE);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [suggestionsDialog, setSuggestionsDialog] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [accepted, setAccepted] = useState<Set<number>>(new Set());

  const nodePositions = useRef(new Map<number, { x: number; y: number }>());

  // API
  const { data: depsData } = useListBioDependencies(orgId);
  const { data: issuesData, isLoading } = useListBioIssues(orgId);
  const elements = depsData?.items ?? [];
  const issues   = issuesData?.items ?? [];

  const createMut   = useCreateBioIssue();
  const updateMut   = useUpdateBioIssue();
  const deleteMut   = useDeleteBioIssue();
  const generateMut = useGenerateBioIssues();

  // Sync issues → nodes
  useEffect(() => {
    if (!issuesData) return;
    const newNodes: BioIssueNode[] = issues.map((issue, idx) => {
      const def = defaultIssuePosition(issue.chainPosition, issue.importance, idx);
      return {
        id:       String(issue.id),
        type:     "bioIssue" as const,
        position: nodePositions.current.get(issue.id) ?? { x: issue.x ?? def.x, y: issue.y ?? def.y },
        data: {
          id:           issue.id,
          name:         issue.name         ?? null,
          description:  issue.description  ?? null,
          importance:   issue.importance   ?? null,
          elementCount: issue.elementIds.length,
        },
      };
    });
    setNodes(newNodes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issuesData]);

  // Position saving (fire-and-forget)
  const onNodeDragStop = useCallback(
    (_: MouseEvent | TouchEvent, node: Node) => {
      nodePositions.current.set(Number(node.id), { x: node.position.x, y: node.position.y });
      updateMut.mutate({ orgId, id: Number(node.id), data: { x: node.position.x, y: node.position.y } });
    },
    [orgId, updateMut],
  );

  // Click on node → open edit sheet
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const issue = issues.find(i => String(i.id) === node.id);
      if (issue) openEdit(issue);
    },
    [issues],
  );

  function openCreate() {
    setEditingIssue(null);
    setForm(EMPTY_ISSUE);
    setSheetOpen(true);
  }

  function openEdit(issue: BioIssue) {
    setEditingIssue(issue);
    setForm({
      name: issue.name, description: issue.description,
      importance: issue.importance, comments: issue.comments,
      chainPosition: issue.chainPosition, elementIds: issue.elementIds,
    });
    setSheetOpen(true);
  }

  function setF<K extends keyof BioIssueInput>(key: K, value: BioIssueInput[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (editingIssue) {
      await updateMut.mutateAsync({ orgId, id: editingIssue.id, data: form });
    } else {
      await createMut.mutateAsync({ orgId, data: form });
    }
    queryClient.invalidateQueries({ queryKey: getListBioIssuesQueryKey(orgId) });
    setSheetOpen(false);
  }

  async function handleDelete() {
    if (deleteId === null) return;
    await deleteMut.mutateAsync({ orgId, id: deleteId });
    nodePositions.current.delete(deleteId);
    queryClient.invalidateQueries({ queryKey: getListBioIssuesQueryKey(orgId) });
    setDeleteId(null);
  }

  async function handleGenerate() {
    const result = await generateMut.mutateAsync({ orgId });
    setSuggestions(result.suggestions ?? []);
    setAccepted(new Set());
    setSuggestionsDialog(true);
  }

  async function acceptSuggestion(s: Suggestion, idx: number) {
    if (accepted.has(idx)) return;
    await createMut.mutateAsync({
      orgId,
      data: {
        name:          s.name,
        description:   s.description ?? null,
        importance:    s.importance   ?? null,
        chainPosition: s.chainPosition ?? null,
        elementIds:    s.elementIds,
      },
    });
    setAccepted(prev => new Set(prev).add(idx));
  }

  async function acceptAllSuggestions() {
    for (let i = 0; i < suggestions.length; i++) {
      if (!accepted.has(i)) await acceptSuggestion(suggestions[i], i);
    }
    queryClient.invalidateQueries({ queryKey: getListBioIssuesQueryKey(orgId) });
    setSuggestionsDialog(false);
  }

  function closeSuggestions() {
    if (accepted.size > 0) {
      queryClient.invalidateQueries({ queryKey: getListBioIssuesQueryKey(orgId) });
    }
    setSuggestionsDialog(false);
  }

  const isSaving = createMut.isPending || updateMut.isPending;
  const issueCount = issues.length;

  // Toggle element in elementIds
  function toggleElement(id: number) {
    const cur = form.elementIds ?? [];
    if (cur.includes(id)) {
      setF("elementIds", cur.filter(x => x !== id));
    } else {
      setF("elementIds", [...cur, id]);
    }
  }

  if (!isLoading && issueCount === 0) {
    return (
      <div className="space-y-3">
        <ToolBar
          issueCount={0}
          elementCount={elements.length}
          isGenerating={generateMut.isPending}
          onGenerate={handleGenerate}
          onCreateIssue={openCreate}
        />
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
          <Layers className="h-10 w-10 opacity-30" />
          <p className="text-sm max-w-xs">
            Aucun enjeu encore. Utilisez l'IA pour les générer depuis vos éléments, ou créez-en un manuellement.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ToolBar
        issueCount={issueCount}
        elementCount={elements.length}
        isGenerating={generateMut.isPending}
        onGenerate={handleGenerate}
        onCreateIssue={openCreate}
      />

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
          {/* Importance axis labels + ReactFlow */}
          <div className="flex flex-1 overflow-hidden">
            {/* Y-axis labels */}
            <div
              className="flex flex-col justify-around text-right pr-2 pl-1 bg-slate-50/80 border-r shrink-0"
              style={{ width: 72 }}
            >
              {[5, 4, 3, 2, 1].map(n => (
                <div key={n} className="flex flex-col items-end">
                  <span className="text-[10px] font-semibold text-slate-500">{n}</span>
                  <span className="text-[9px] text-slate-400 leading-tight">{importanceLabel(n)}</span>
                </div>
              ))}
            </div>
            {/* ReactFlow */}
            <div style={{ flex: 1 }}>
              <ReactFlow
                nodes={nodes}
                edges={[]}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeDragStop={onNodeDragStop}
                onNodeClick={onNodeClick}
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
        </div>
      )}

      {/* AI suggestions dialog */}
      <Dialog open={suggestionsDialog} onOpenChange={open => !open && closeSuggestions()}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Suggestions d'enjeux IA ({suggestions.length})</DialogTitle>
            <DialogDescription>
              Acceptez les enjeux pertinents pour les ajouter à votre cartographie.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            {suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucune suggestion générée. Ajoutez plus d'éléments dans l'onglet "Saisie".
              </p>
            ) : suggestions.map((s, idx) => {
              const colors = importanceBg(s.importance);
              const isAcc = accepted.has(idx);
              const linkedNames = s.elementIds
                .map(id => elements.find(e => e.id === id)?.name ?? `ID ${id}`)
                .filter(Boolean);
              return (
                <div
                  key={idx}
                  className="rounded-xl border p-4 flex gap-3 transition-opacity"
                  style={{
                    borderColor: colors.border,
                    backgroundColor: isAcc ? colors.bg : "white",
                    opacity: isAcc ? 0.75 : 1,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm">{s.name}</p>
                      {s.importance && (
                        <span
                          className="text-[10px] font-bold rounded-full px-1.5 py-0.5 shrink-0"
                          style={{ backgroundColor: colors.border, color: "white" }}
                        >
                          {importanceLabel(s.importance)}
                        </span>
                      )}
                      {s.chainPosition && (
                        <Badge variant="outline" className="text-[10px] py-0">
                          {s.chainPosition}
                        </Badge>
                      )}
                    </div>
                    {s.description && (
                      <p className="text-xs text-muted-foreground mb-2">{s.description}</p>
                    )}
                    {linkedNames.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {linkedNames.map(name => (
                          <span key={name} className="text-[10px] bg-slate-100 rounded px-1.5 py-0.5">
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (!isAcc) {
                        void acceptSuggestion(s, idx).then(() =>
                          queryClient.invalidateQueries({ queryKey: getListBioIssuesQueryKey(orgId) })
                        );
                      }
                    }}
                    disabled={isAcc || createMut.isPending}
                    className={`flex items-center justify-center rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-colors shrink-0 ${
                      isAcc
                        ? "border-green-300 bg-green-50 text-green-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-green-300 hover:bg-green-50 hover:text-green-700"
                    }`}
                  >
                    {isAcc ? <Check className="h-4 w-4" /> : "Accepter"}
                  </button>
                </div>
              );
            })}
          </div>
          <DialogFooter className="gap-2 pt-2 border-t">
            <Button variant="outline" onClick={closeSuggestions}>
              Fermer
            </Button>
            {suggestions.length > 0 && accepted.size < suggestions.length && (
              <Button onClick={acceptAllSuggestions} disabled={createMut.isPending}>
                {createMut.isPending ? "Acceptation…" : "Tout accepter"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit issue sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{editingIssue ? "Modifier l'enjeu" : "Nouvel enjeu"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-1.5">
              <Label>Nom de l'enjeu</Label>
              <Input
                placeholder="Ex : Dépendance à la ressource en eau"
                value={form.name ?? ""}
                onChange={e => setF("name", e.target.value || null)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Décrivez l'enjeu RSE…"
                rows={3}
                value={form.description ?? ""}
                onChange={e => setF("description", e.target.value || null)}
              />
            </div>

            <div className="space-y-2">
              <Label>Niveau d'importance</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => {
                  const colors = importanceBg(n);
                  const isSelected = form.importance === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setF("importance", form.importance === n ? null : n)}
                      className="flex-1 py-2 rounded-lg border-2 text-xs font-semibold transition-all"
                      style={{
                        borderColor: isSelected ? colors.border : "#e2e8f0",
                        backgroundColor: isSelected ? colors.bg : "#f8fafc",
                        color: isSelected ? colors.text : "#94a3b8",
                      }}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">1 = Faible &nbsp;·&nbsp; 5 = Critique</p>
            </div>

            <div className="space-y-1.5">
              <Label>Position sur la chaîne de valeur</Label>
              <Select value={form.chainPosition ?? ""} onValueChange={v => setF("chainPosition", v || null)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>
                  {CHAIN_POSITIONS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {elements.length > 0 && (
              <div className="space-y-2">
                <Label>Éléments liés</Label>
                <div className="flex flex-wrap gap-2">
                  {elements.map(el => {
                    const linked = (form.elementIds ?? []).includes(el.id);
                    return (
                      <button
                        key={el.id}
                        type="button"
                        onClick={() => toggleElement(el.id)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          linked
                            ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {linked && <span className="mr-0.5">✓</span>}
                        {el.name ?? `Élément ${el.id}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Commentaires</Label>
              <Textarea
                placeholder="Notes, contexte, sources…"
                rows={2}
                value={form.comments ?? ""}
                onChange={e => setF("comments", e.target.value || null)}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                {isSaving ? "Enregistrement…" : "Enregistrer"}
              </Button>
              {editingIssue && (
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => { setSheetOpen(false); setDeleteId(editingIssue.id); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button variant="outline" onClick={() => setSheetOpen(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete issue dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet enjeu ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Toolbar sub-component ────────────────────────────────────────────────────

function ToolBar({
  issueCount,
  elementCount,
  isGenerating,
  onGenerate,
  onCreateIssue,
}: {
  issueCount: number;
  elementCount: number;
  isGenerating: boolean;
  onGenerate: () => void;
  onCreateIssue: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        {issueCount} enjeu{issueCount !== 1 ? "x" : ""}
        {issueCount > 0 && " — cliquez sur un enjeu pour le modifier"}
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onGenerate}
          disabled={isGenerating || elementCount === 0}
        >
          {isGenerating
            ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            : <Sparkles className="h-4 w-4 mr-1" />}
          {isGenerating ? "Génération…" : "Générer avec l'IA"}
        </Button>
        <Button size="sm" onClick={onCreateIssue}>
          <Plus className="h-4 w-4 mr-1" />
          Ajouter un enjeu
        </Button>
      </div>
    </div>
  );
}
