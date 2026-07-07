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
  CHAIN_POSITIONS, ISSUE_TYPES,
  importanceBg, importanceLabel, issueTypeData, defaultIssuePosition, elementLabel,
} from "../data";

// ─── Types ────────────────────────────────────────────────────────────────────

type BioIssueData = {
  id: number;
  name: string | null;
  description: string | null;
  issueType: string | null;
  importance: number | null;
  probability: number | null;
  elementCount: number;
};
type BioIssueNode = Node<BioIssueData, "bioIssue">;

// ─── Custom node (MUST be outside component) ──────────────────────────────────

const BioIssueNodeComp = memo(function BioIssueNodeComp({ data }: NodeProps<BioIssueNode>) {
  const colors  = importanceBg(data.importance);
  const itData  = issueTypeData(data.issueType);
  const criticite = data.importance && data.probability ? data.importance * data.probability : null;

  return (
    <div
      className="rounded-xl shadow-md border-2 p-3 cursor-pointer hover:shadow-lg transition-shadow select-none"
      style={{
        minWidth: 165,
        maxWidth: 230,
        backgroundColor: colors.bg,
        borderColor:     colors.border,
      }}
    >
      {/* Header: type badge + criticité */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        {itData ? (
          <span
            className="text-[9px] font-bold rounded-full px-1.5 py-0.5 truncate"
            style={{ backgroundColor: itData.color + "20", color: itData.color }}
          >
            {itData.icon} {itData.label}
          </span>
        ) : <span />}
        {criticite !== null && (
          <span
            className="text-[9px] font-bold rounded-full px-1.5 py-0.5 shrink-0"
            style={{ backgroundColor: colors.border, color: "white" }}
            title="Criticité = Impact × Probabilité"
          >
            ★{criticite}
          </span>
        )}
      </div>

      <div className="flex items-start gap-1.5">
        <p className="text-sm font-bold leading-tight flex-1" style={{ color: colors.text }}>
          {data.name || "Enjeu sans nom"}
        </p>
        {data.importance && !criticite && (
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
          className="text-[10px] line-clamp-2 mt-1 opacity-75"
          style={{ color: colors.text }}
        >
          {data.description}
        </p>
      )}
      {data.elementCount > 0 && (
        <p className="text-[9px] opacity-55 mt-1" style={{ color: colors.text }}>
          {data.elementCount} élément{data.elementCount !== 1 ? "s" : ""} lié{data.elementCount !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
});

const nodeTypes: NodeTypes = { bioIssue: BioIssueNodeComp };

// ─── EMPTY form ───────────────────────────────────────────────────────────────

const EMPTY_ISSUE: BioIssueInput = {
  name: null, description: null, issueType: null,
  importance: null, probability: null, urgency: null, reversibility: null,
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

// ─── Score buttons (réutilisable) ─────────────────────────────────────────────

function ScoreButtons({
  value,
  onChange,
  labels,
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  labels?: Record<number, string>;
}) {
  return (
    <div className="space-y-1">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(n => {
          const colors = importanceBg(n);
          const isSelected = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(value === n ? null : n)}
              className="flex-1 py-2 rounded-lg border-2 text-xs font-bold transition-all"
              style={{
                borderColor:     isSelected ? colors.border : "#e2e8f0",
                backgroundColor: isSelected ? colors.bg    : "#f8fafc",
                color:           isSelected ? colors.text  : "#94a3b8",
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
      {labels && value && labels[value] && (
        <p className="text-[11px] text-muted-foreground text-center">{labels[value]}</p>
      )}
    </div>
  );
}

const IMPORTANCE_LABELS: Record<number, string> = {
  1: "Faible", 2: "Moyenne", 3: "Forte", 4: "Très forte", 5: "Critique",
};
const PROBABILITY_LABELS: Record<number, string> = {
  1: "Très improbable", 2: "Improbable", 3: "Possible", 4: "Probable", 5: "Très probable",
};
const URGENCY_LABELS: Record<number, string> = {
  1: "Très faible", 2: "Faible", 3: "Modérée", 4: "Forte", 5: "Immédiate",
};
const REVERSIBILITY_LABELS: Record<number, string> = {
  1: "Totalement réversible", 2: "Réversible", 3: "Partiellement réversible",
  4: "Difficilement réversible", 5: "Irréversible",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props { orgId: number; }

export function TabCartoEnjeux({ orgId }: Props) {
  const queryClient = useQueryClient();
  const [nodes, setNodes, onNodesChange] = useNodesState<BioIssueNode>([]);
  const [, , onEdgesChange] = useEdgesState([]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<BioIssue | null>(null);
  const [form, setForm] = useState<BioIssueInput>(EMPTY_ISSUE);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [suggestionsDialog, setSuggestionsDialog] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [accepted, setAccepted] = useState<Set<number>>(new Set());

  const nodePositions = useRef(new Map<number, { x: number; y: number }>());

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
          issueType:    issue.issueType     ?? null,
          importance:   issue.importance   ?? null,
          probability:  issue.probability  ?? null,
          elementCount: issue.elementIds.length,
        },
      };
    });
    setNodes(newNodes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issuesData]);

  const onNodeDragStop = useCallback(
    (_: MouseEvent | TouchEvent, node: Node) => {
      nodePositions.current.set(Number(node.id), { x: node.position.x, y: node.position.y });
      updateMut.mutate({ orgId, id: Number(node.id), data: { x: node.position.x, y: node.position.y } });
    },
    [orgId, updateMut],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const issue = issues.find(i => String(i.id) === node.id);
      if (issue) openEdit(issue);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      issueType: issue.issueType ?? null,
      importance: issue.importance, probability: issue.probability ?? null,
      urgency: issue.urgency ?? null, reversibility: issue.reversibility ?? null,
      comments: issue.comments, chainPosition: issue.chainPosition,
      elementIds: issue.elementIds,
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
        name: s.name, description: s.description ?? null,
        importance: s.importance ?? null, chainPosition: s.chainPosition ?? null,
        elementIds: s.elementIds,
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

  function toggleElement(id: number) {
    const cur = form.elementIds ?? [];
    setF("elementIds", cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
  }

  const isSaving   = createMut.isPending || updateMut.isPending;
  const issueCount = issues.length;

  // Criticité calculée
  const criticite = form.importance && form.probability
    ? form.importance * form.probability
    : null;

  if (!isLoading && issueCount === 0) {
    return (
      <div className="space-y-3">
        <ToolBar
          issueCount={0} elementCount={elements.length}
          isGenerating={generateMut.isPending}
          onGenerate={handleGenerate} onCreateIssue={openCreate}
        />
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
          <Layers className="h-10 w-10 opacity-30" />
          <p className="text-sm max-w-xs">
            Aucun enjeu. Utilisez l'IA pour les générer, ou créez-en un manuellement.
          </p>
        </div>
        {renderSheet()}
      </div>
    );
  }

  function renderSheet() {
    return (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{editingIssue ? "Modifier l'enjeu" : "Nouvel enjeu"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 mt-6">

            {/* Nom */}
            <div className="space-y-1.5">
              <Label>Nom de l'enjeu</Label>
              <Input
                placeholder="Ex : Dépendance à la ressource en eau"
                value={form.name ?? ""}
                onChange={e => setF("name", e.target.value || null)}
              />
            </div>

            {/* Type d'enjeu */}
            <div className="space-y-2">
              <Label>Type d'enjeu</Label>
              <div className="grid grid-cols-2 gap-2">
                {ISSUE_TYPES.map(t => {
                  const active = form.issueType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setF("issueType", active ? null : t.value)}
                      className="flex items-center gap-2 p-2.5 rounded-xl border-2 text-left transition-all text-xs font-semibold"
                      style={{
                        borderColor:     active ? t.color : "#E2E8F0",
                        backgroundColor: active ? t.bg   : "white",
                        color:           active ? t.color : "#64748B",
                      }}
                    >
                      <span className="text-base leading-none">{t.icon}</span>
                      <span className="leading-tight">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Décrivez l'enjeu RSE…"
                rows={2}
                value={form.description ?? ""}
                onChange={e => setF("description", e.target.value || null)}
              />
            </div>

            {/* Impact */}
            <div className="space-y-1.5">
              <Label>Impact <span className="text-muted-foreground font-normal text-xs">— gravité de l'enjeu</span></Label>
              <ScoreButtons
                value={form.importance}
                onChange={v => setF("importance", v)}
                labels={IMPORTANCE_LABELS}
              />
            </div>

            {/* Probabilité */}
            <div className="space-y-1.5">
              <Label>Probabilité <span className="text-muted-foreground font-normal text-xs">— d'occurrence</span></Label>
              <ScoreButtons
                value={form.probability}
                onChange={v => setF("probability", v)}
                labels={PROBABILITY_LABELS}
              />
            </div>

            {/* Criticité calculée */}
            {criticite !== null && (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-slate-50">
                <div>
                  <p className="text-xs font-semibold text-slate-700">Criticité calculée</p>
                  <p className="text-[11px] text-muted-foreground">Impact × Probabilité</p>
                </div>
                <div
                  className="ml-auto text-2xl font-bold rounded-xl px-4 py-2"
                  style={{
                    backgroundColor: importanceBg(Math.min(5, Math.ceil(criticite / 5))).bg,
                    color:           importanceBg(Math.min(5, Math.ceil(criticite / 5))).text,
                  }}
                >
                  {criticite}<span className="text-sm font-normal opacity-60">/25</span>
                </div>
              </div>
            )}

            {/* Urgence */}
            <div className="space-y-1.5">
              <Label>Urgence <span className="text-muted-foreground font-normal text-xs">— de traitement</span></Label>
              <ScoreButtons
                value={form.urgency}
                onChange={v => setF("urgency", v)}
                labels={URGENCY_LABELS}
              />
            </div>

            {/* Réversibilité */}
            <div className="space-y-1.5">
              <Label>Réversibilité <span className="text-muted-foreground font-normal text-xs">— de l'impact</span></Label>
              <ScoreButtons
                value={form.reversibility}
                onChange={v => setF("reversibility", v)}
                labels={REVERSIBILITY_LABELS}
              />
            </div>

            {/* Position chaîne */}
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

            {/* Éléments liés */}
            {elements.length > 0 && (
              <div className="space-y-2">
                <Label>Éléments liés</Label>
                <div className="flex flex-wrap gap-2">
                  {elements.map(el => {
                    const linked = (form.elementIds ?? []).includes(el.id);
                    const lbl    = elementLabel(el.name, el.category, el.subCategory) || `Élément ${el.id}`;
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
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Commentaires */}
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
              <Button variant="outline" onClick={() => setSheetOpen(false)}>Annuler</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="space-y-3">
      <ToolBar
        issueCount={issueCount} elementCount={elements.length}
        isGenerating={generateMut.isPending}
        onGenerate={handleGenerate} onCreateIssue={openCreate}
      />

      {isLoading ? (
        <Skeleton className="h-[612px] w-full rounded-xl" />
      ) : (
        <div className="flex flex-col overflow-hidden rounded-xl border shadow-sm" style={{ height: 612 }}>
          {/* Zone headers */}
          <div className="grid grid-cols-3 border-b shrink-0">
            <div className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-blue-700 bg-blue-50 border-r border-blue-200">Amont</div>
            <div className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border-r border-emerald-200">In situ</div>
            <div className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-purple-700 bg-purple-50">Aval</div>
          </div>
          {/* Importance axis + ReactFlow */}
          <div className="flex flex-1 overflow-hidden">
            {/* Y-axis */}
            <div className="flex flex-col justify-around text-right pr-2 pl-1 bg-slate-50/80 border-r shrink-0" style={{ width: 72 }}>
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
                fitView fitViewOptions={{ padding: 0.15 }}
                minZoom={0.25} maxZoom={2.5}
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
            <DialogDescription>Acceptez les enjeux pertinents pour les ajouter à votre cartographie.</DialogDescription>
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
                .map(id => {
                  const el = elements.find(e => e.id === id);
                  return el ? elementLabel(el.name, el.category, el.subCategory) || `ID ${id}` : `ID ${id}`;
                })
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
                        <Badge variant="outline" className="text-[10px] py-0">{s.chainPosition}</Badge>
                      )}
                    </div>
                    {s.description && (
                      <p className="text-xs text-muted-foreground mb-2">{s.description}</p>
                    )}
                    {linkedNames.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {linkedNames.map(name => (
                          <span key={name} className="text-[10px] bg-slate-100 rounded px-1.5 py-0.5">{name}</span>
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
            <Button variant="outline" onClick={closeSuggestions}>Fermer</Button>
            {suggestions.length > 0 && accepted.size < suggestions.length && (
              <Button onClick={acceptAllSuggestions} disabled={createMut.isPending}>
                {createMut.isPending ? "Acceptation…" : "Tout accepter"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit sheet */}
      {renderSheet()}

      {/* Delete dialog */}
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

// ─── ToolBar ──────────────────────────────────────────────────────────────────

function ToolBar({
  issueCount, elementCount, isGenerating, onGenerate, onCreateIssue,
}: {
  issueCount: number; elementCount: number;
  isGenerating: boolean;
  onGenerate: () => void; onCreateIssue: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">
        {issueCount} enjeu{issueCount !== 1 ? "x" : ""}
        {issueCount > 0 && " — cliquez sur un enjeu pour le modifier"}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline" size="sm"
          onClick={onGenerate}
          disabled={isGenerating || elementCount === 0}
          title={elementCount === 0 ? "Ajoutez des éléments dans Saisie d'abord" : undefined}
        >
          {isGenerating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
          Générer avec l'IA
        </Button>
        <Button size="sm" onClick={onCreateIssue}>
          <Plus className="h-4 w-4 mr-1" />Créer un enjeu
        </Button>
      </div>
    </div>
  );
}
