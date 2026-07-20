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
  useGroupBioIssues,
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
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp, Info, Layers, Loader2, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import {
  CHAIN_POSITIONS,
  importanceBg, importanceLabel, defaultIssuePosition,
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
  const colors = importanceBg(data.importance);
  return (
    <div
      className="rounded-xl shadow-md border-2 p-3 cursor-pointer hover:shadow-lg transition-shadow select-none"
      style={{ minWidth: 150, maxWidth: 220, backgroundColor: colors.bg, borderColor: colors.border }}
    >
      <div className="flex items-start gap-1.5">
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
        <p className="text-[10px] line-clamp-2 mt-1 opacity-75" style={{ color: colors.text }}>
          {data.description}
        </p>
      )}
    </div>
  );
});

const nodeTypes: NodeTypes = { bioIssue: BioIssueNodeComp };

// ─── EMPTY form ───────────────────────────────────────────────────────────────

const EMPTY_ISSUE: BioIssueInput = {
  name: null, family: null, description: null, issueType: null,
  importance: null, probability: null, urgency: null, reversibility: null,
  comments: null, chainPosition: null, elementIds: [],
};

// ─── Score buttons ────────────────────────────────────────────────────────────

function ScoreButtons({
  value, onChange, labels,
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
              key={n} type="button"
              onClick={() => onChange(value === n ? null : n)}
              className="flex-1 py-2 rounded-lg border-2 text-xs font-bold transition-all"
              style={{
                borderColor:     isSelected ? colors.border : "#e2e8f0",
                backgroundColor: isSelected ? colors.bg    : "#f8fafc",
                color:           isSelected ? colors.text  : "#94a3b8",
              }}
            >{n}</button>
          );
        })}
      </div>
      {labels && value && labels[value] && (
        <p className="text-[11px] text-muted-foreground text-center">{labels[value]}</p>
      )}
    </div>
  );
}

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

// ─── Static cartography grid ──────────────────────────────────────────────────

const GRID_POSITIONS = ["amont", "in-situ", "aval"] as const;
const GRID_POS_LABELS: Record<string, string> = { "amont": "Amont", "in-situ": "In situ", "aval": "Aval" };
const GRID_POS_COLORS: Record<string, { header: string; border: string }> = {
  "amont":   { header: "text-blue-700 bg-blue-50 border-blue-200",       border: "border-blue-100" },
  "in-situ": { header: "text-emerald-700 bg-emerald-50 border-emerald-200", border: "border-emerald-100" },
  "aval":    { header: "text-purple-700 bg-purple-50 border-purple-200",  border: "border-purple-100" },
};

const IMPORTANCE_LABELS: Record<number, string> = {
  1: "Faible", 2: "Modérée", 3: "Importante", 4: "Élevée", 5: "Critique",
};

/**
 * Matrice des enjeux biodiversité (extensible vers double matérialité CSRD).
 * Axe X = position chaîne de valeur, Axe Y = importance de l'enjeu.
 * Pour évoluer vers la double matérialité : ajouter un 2e axe vertical
 * (importance pour les parties prenantes) sans modifier l'architecture de base.
 */
function IssueMatrix({ issues, onEdit }: { issues: BioIssue[]; onEdit: (i: BioIssue) => void }) {
  function cellIssues(pos: string, importance: number) {
    return issues.filter(i => {
      const matchPos = i.chainPosition ? i.chainPosition === pos : pos === "in-situ";
      return matchPos && i.importance === importance;
    });
  }

  if (issues.length === 0) return null;

  return (
    <div className="rounded-xl border shadow-sm overflow-hidden bg-white">
      {/* En-têtes colonnes */}
      <div className="grid grid-cols-[64px_1fr_1fr_1fr] border-b bg-slate-50">
        <div className="py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wide border-r">
          Importance
        </div>
        {GRID_POSITIONS.map(pos => {
          const c = GRID_POS_COLORS[pos];
          return (
            <div
              key={pos}
              className={`py-3 text-center text-[11px] font-bold uppercase tracking-wide border-l ${c.header}`}
            >
              {GRID_POS_LABELS[pos]}
            </div>
          );
        })}
      </div>

      {/* Lignes : importance 5 → 1 */}
      {[5, 4, 3, 2, 1].map(imp => {
        const rc = importanceBg(imp);
        const isPriority = imp >= 4;
        return (
          <div
            key={imp}
            className={`grid grid-cols-[64px_1fr_1fr_1fr] border-b last:border-b-0 ${isPriority ? "bg-orange-50/30" : ""}`}
            style={{ minHeight: 72 }}
          >
            {/* Libellé Y */}
            <div
              className="flex flex-col items-center justify-center py-2 border-r shrink-0"
              style={{ backgroundColor: rc.bg }}
            >
              <span className="text-[12px] font-bold" style={{ color: rc.text }}>{imp}</span>
              <span className="text-[9px] leading-tight text-center px-1" style={{ color: rc.text, opacity: 0.75 }}>
                {IMPORTANCE_LABELS[imp]}
              </span>
              {isPriority && <span className="text-[8px] mt-0.5" title="Enjeu prioritaire">🔴</span>}
            </div>

            {/* Cellules */}
            {GRID_POSITIONS.map(pos => {
              const c = GRID_POS_COLORS[pos];
              const items = cellIssues(pos, imp);
              return (
                <div
                  key={pos}
                  className={`p-1.5 border-l ${c.border} flex flex-wrap gap-1.5 content-start`}
                >
                  {items.map(issue => (
                    <button
                      key={issue.id}
                      onClick={() => onEdit(issue)}
                      className="text-[11px] font-medium rounded-lg px-2.5 py-1.5 border-2 transition-all hover:shadow-sm text-left"
                      style={{ backgroundColor: rc.bg, borderColor: rc.border, color: rc.text }}
                    >
                      {issue.name ?? "Enjeu sans nom"}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Légende enjeux prioritaires */}
      <div className="flex items-center gap-1.5 px-4 py-2 bg-orange-50 border-t border-orange-100 text-[11px] text-orange-700">
        <span>🔴</span>
        <span className="font-medium">Zone prioritaire</span>
        <span className="text-orange-500">— enjeux d'importance élevée ou critique (4–5)</span>
      </div>
    </div>
  );
}

// ─── Priority issues ──────────────────────────────────────────────────────────

function PriorityIssues({ issues, onEdit }: { issues: BioIssue[]; onEdit: (i: BioIssue) => void }) {
  const priority = issues
    .filter(i => (i.importance ?? 0) >= 4)
    .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0));

  if (priority.length === 0) return null;

  return (
    <div className="rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-red-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">🔴</span>
        <div>
          <h3 className="text-sm font-bold text-orange-900">Enjeux prioritaires</h3>
          <p className="text-[11px] text-orange-700">
            {priority.length} enjeu{priority.length !== 1 ? "x" : ""} d'importance élevée ou critique — à traiter en priorité
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {priority.map(issue => {
          const c = importanceBg(issue.importance);
          return (
            <button
              key={issue.id}
              onClick={() => onEdit(issue)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all hover:shadow-sm"
              style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}
            >
              <span>{issue.importance === 5 ? "⚠️" : "🔶"}</span>
              <span>{issue.name ?? "Enjeu sans nom"}</span>
              <span
                className="ml-1 text-[10px] rounded-full px-1.5 py-0.5 font-bold shrink-0"
                style={{ backgroundColor: c.border, color: "white" }}
              >
                {issue.importance === 5 ? "Critique" : "Élevée"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props { orgId: number; }

export function TabCartoEnjeux({ orgId }: Props) {
  const queryClient = useQueryClient();
  const [nodes, setNodes, onNodesChange] = useNodesState<BioIssueNode>([]);
  const [, , onEdgesChange] = useEdgesState([]);

  // ── Sheet enjeu (création / édition) ────────────────────────────────────────
  const [sheetOpen, setSheetOpen]       = useState(false);
  const [editingIssue, setEditingIssue] = useState<BioIssue | null>(null);
  const [form, setForm]                 = useState<BioIssueInput>(EMPTY_ISSUE);
  const [deleteId, setDeleteId]         = useState<number | null>(null);

  // ── Vue interactive ──────────────────────────────────────────────────────────
  const [showReactFlow, setShowReactFlow] = useState(false);

  // ── AI group ────────────────────────────────────────────────────────────────
  const [groupDialog, setGroupDialog]       = useState(false);
  const [proposedGroups, setProposedGroups] = useState<{ name: string; issueIds: number[] }[]>([]);
  const [editGroupNames, setEditGroupNames] = useState<string[]>([]);

  const nodePositions = useRef(new Map<number, { x: number; y: number }>());

  const { data: depsData }              = useListBioDependencies(orgId);
  const { data: issuesData, isLoading } = useListBioIssues(orgId);
  const elements = depsData?.items ?? [];
  const issues   = issuesData?.items ?? [];

  const createMut   = useCreateBioIssue();
  const updateMut   = useUpdateBioIssue();
  const deleteMut   = useDeleteBioIssue();
  const generateMut = useGenerateBioIssues();
  const groupMut    = useGroupBioIssues();

  // Sync issues → ReactFlow nodes
  useEffect(() => {
    if (!issuesData) return;
    const newNodes: BioIssueNode[] = issues.map((issue, idx) => {
      const def = defaultIssuePosition(issue.chainPosition, issue.importance, idx);
      return {
        id:   String(issue.id),
        type: "bioIssue" as const,
        position: nodePositions.current.get(issue.id) ?? { x: issue.x ?? def.x, y: issue.y ?? def.y },
        data: {
          id:          issue.id,
          name:        issue.name        ?? null,
          description: issue.description ?? null,
          issueType:   issue.issueType    ?? null,
          importance:  issue.importance  ?? null,
          probability: issue.probability ?? null,
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
      name: issue.name, family: issue.family ?? null,
      description: issue.description,
      issueType: issue.issueType ?? null,
      importance: issue.importance, probability: issue.probability ?? null,
      urgency: issue.urgency ?? null, reversibility: issue.reversibility ?? null,
      comments: issue.comments ?? null, chainPosition: issue.chainPosition,
      elementIds: issue.elementIds,
    });
    setSheetOpen(true);
  }

  function setF<K extends keyof BioIssueInput>(key: K, value: BioIssueInput[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function toggleElement(id: number) {
    const cur = form.elementIds ?? [];
    setF("elementIds", cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
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
    await generateMut.mutateAsync({ orgId });
    queryClient.invalidateQueries({ queryKey: getListBioIssuesQueryKey(orgId) });
  }

  async function handleGroupAI() {
    const result = await groupMut.mutateAsync({ orgId });
    const groups = result.groups ?? [];
    setProposedGroups(groups);
    setEditGroupNames(groups.map(g => g.name));
    setGroupDialog(true);
  }

  async function applyGroups() {
    for (let i = 0; i < proposedGroups.length; i++) {
      const familyName = editGroupNames[i] ?? proposedGroups[i].name;
      for (const id of proposedGroups[i].issueIds) {
        await updateMut.mutateAsync({ orgId, id, data: { family: familyName } });
      }
    }
    queryClient.invalidateQueries({ queryKey: getListBioIssuesQueryKey(orgId) });
    setGroupDialog(false);
  }

  const isSaving  = createMut.isPending || updateMut.isPending;
  const hasIssues = issues.length > 0;
  const hasDeps   = elements.length > 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Chargement…" : hasIssues
              ? `${issues.length} enjeu${issues.length !== 1 ? "x" : ""} identifié${issues.length !== 1 ? "s" : ""}`
              : "Aucun enjeu — utilisez l'IA ou ajoutez-en manuellement"}
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" />Ajouter un enjeu
        </Button>

        {hasIssues && issues.length >= 2 && (
          <Button
            variant="outline" size="sm"
            onClick={handleGroupAI}
            disabled={groupMut.isPending}
            className="gap-1.5"
          >
            {groupMut.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" />Regroupement…</>
              : <><Sparkles className="h-4 w-4" />Regrouper les enjeux</>}
          </Button>
        )}

        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={generateMut.isPending || !hasDeps}
          className="gap-1.5"
          title={!hasDeps ? "Ajoutez d'abord des dépendances dans l'onglet Saisie" : undefined}
        >
          {generateMut.isPending
            ? <><Loader2 className="h-4 w-4 animate-spin" />Génération…</>
            : hasIssues
              ? <><RefreshCw className="h-4 w-4" />Regénérer</>
              : <><Sparkles className="h-4 w-4" />Générer les enjeux</>}
        </Button>
      </div>

      {/* ── État vide ────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <Skeleton className="h-80 w-full rounded-xl" />
      ) : !hasIssues ? (
        <div className="rounded-xl border border-dashed bg-slate-50/50 flex flex-col items-center justify-center py-16 text-center gap-4">
          <Layers className="h-12 w-12 text-slate-300" />
          <div>
            <p className="text-sm font-medium text-slate-700">Aucun enjeu généré</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              {hasDeps
                ? "Cliquez sur « Générer les enjeux » — l'IA analysera vos dépendances et produira automatiquement la cartographie."
                : "Commencez par identifier vos dépendances dans l'onglet « Saisie », puis revenez ici pour générer les enjeux."}
            </p>
          </div>
          {hasDeps && (
            <Button size="sm" onClick={handleGenerate} disabled={generateMut.isPending} className="gap-1.5">
              {generateMut.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" />Génération…</>
                : <><Sparkles className="h-4 w-4" />Générer les enjeux</>}
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* ── Cartographie statique des enjeux ────────────────────────────── */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              Cartographie des enjeux
              <span className="text-xs font-normal text-muted-foreground">
                — cliquez sur un enjeu pour le modifier
              </span>
            </h2>
            <IssueMatrix issues={issues} onEdit={openEdit} />
          </section>

          {/* ── Enjeux prioritaires ──────────────────────────────────────────── */}
          <PriorityIssues issues={issues} onEdit={openEdit} />

          {/* ── Vue interactive (ReactFlow) ──────────────────────────────────── */}
          <section className="space-y-2">
            <button
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
              onClick={() => setShowReactFlow(v => !v)}
            >
              Vue interactive (carte libre)
              {showReactFlow ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showReactFlow && (
              <div className="flex flex-col overflow-hidden rounded-xl border shadow-sm" style={{ height: 580 }}>
                <div className="grid grid-cols-3 border-b shrink-0">
                  <div className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-blue-700 bg-blue-50 border-r border-blue-200">Amont</div>
                  <div className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border-r border-emerald-200">In situ</div>
                  <div className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-purple-700 bg-purple-50">Aval</div>
                </div>
                <div className="flex flex-1 overflow-hidden">
                  <div className="flex flex-col justify-around text-right pr-2 pl-1 bg-slate-50/80 border-r shrink-0" style={{ width: 72 }}>
                    {[5, 4, 3, 2, 1].map(n => (
                      <div key={n} className="flex flex-col items-end">
                        <span className="text-[10px] font-semibold text-slate-500">{n}</span>
                        <span className="text-[9px] text-slate-400 leading-tight">{importanceLabel(n)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 relative">
                    <ReactFlow
                      nodes={nodes} edges={[]}
                      onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
                      nodeTypes={nodeTypes}
                      onNodeDragStop={onNodeDragStop} onNodeClick={onNodeClick}
                      fitView fitViewOptions={{ padding: 0.2 }}
                      minZoom={0.3} maxZoom={1.5}
                    >
                      <Background gap={40} color="#f1f5f9" />
                      <Controls showInteractive={false} />
                      <MiniMap nodeColor={(n) => importanceBg((n.data as BioIssueData).importance).border} />
                    </ReactFlow>
                  </div>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {/* ── Sheet enjeu (création / édition) ──────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editingIssue ? "Modifier l'enjeu" : "Nouvel enjeu"}</SheetTitle>
            <SheetDescription>
              {editingIssue
                ? "Ajustez les caractéristiques de l'enjeu."
                : "Ajoutez manuellement un enjeu biodiversité."}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-5 mt-6">

            <div className="space-y-1.5">
              <Label>Nom de l'enjeu *</Label>
              <Input
                placeholder="Ex : Perte d'habitats forestiers"
                value={form.name ?? ""}
                onChange={e => setF("name", e.target.value || null)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Famille / Thématique</Label>
              <Input
                placeholder="Ex : Habitats, Espèces, Eau…"
                value={form.family ?? ""}
                onChange={e => setF("family", e.target.value || null)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                placeholder="Décrivez l'enjeu…"
                value={form.description ?? ""}
                onChange={e => setF("description", e.target.value || null)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Position sur la chaîne de valeur</Label>
              <Select
                value={form.chainPosition ?? ""}
                onValueChange={v => setF("chainPosition", v || null)}
              >
                <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>
                  {CHAIN_POSITIONS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Importance <span className="text-muted-foreground font-normal text-xs">— position sur la cartographie</span></Label>
              <ScoreButtons
                value={form.importance}
                onChange={v => setF("importance", v)}
                labels={IMPORTANCE_LABELS}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Probabilité d'occurrence</Label>
              <ScoreButtons
                value={form.probability}
                onChange={v => setF("probability", v)}
                labels={PROBABILITY_LABELS}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Urgence</Label>
              <ScoreButtons
                value={form.urgency}
                onChange={v => setF("urgency", v)}
                labels={URGENCY_LABELS}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Réversibilité</Label>
              <ScoreButtons
                value={form.reversibility}
                onChange={v => setF("reversibility", v)}
                labels={REVERSIBILITY_LABELS}
              />
            </div>

            {elements.length > 0 && (
              <div className="space-y-1.5">
                <Label>Dépendances liées</Label>
                <div className="max-h-36 overflow-y-auto rounded-lg border p-2 space-y-1">
                  {elements.map(el => {
                    const linked = (form.elementIds ?? []).includes(el.id);
                    return (
                      <button
                        key={el.id}
                        type="button"
                        onClick={() => toggleElement(el.id)}
                        className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                          linked
                            ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-medium"
                            : "bg-white border-border text-muted-foreground hover:bg-slate-50"
                        }`}
                      >
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
                rows={2}
                placeholder="Notes complémentaires…"
                value={form.comments ?? ""}
                onChange={e => setF("comments", e.target.value || null)}
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                {isSaving ? "Enregistrement…" : editingIssue ? "Enregistrer" : "Créer"}
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

      {/* ── Dialog regroupement IA ─────────────────────────────────────────── */}
      <Dialog open={groupDialog} onOpenChange={(open: boolean) => !open && setGroupDialog(false)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>✨ Regroupement automatique</DialogTitle>
            <DialogDescription>
              L'IA a regroupé vos enjeux par thématique. Modifiez les noms si nécessaire.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {proposedGroups.map((group, idx) => {
              const names = group.issueIds
                .map(id => issues.find(i => i.id === id)?.name ?? `Enjeu ${id}`)
                .filter(Boolean);
              return (
                <div key={idx} className="rounded-xl border p-3 space-y-2 bg-slate-50">
                  <Input
                    value={editGroupNames[idx] ?? group.name}
                    onChange={e => setEditGroupNames(prev => {
                      const next = [...prev];
                      next[idx] = e.target.value;
                      return next;
                    })}
                    className="font-semibold text-sm"
                  />
                  <div className="flex flex-wrap gap-1">
                    {names.map((n, ni) => (
                      <span key={ni} className="text-[11px] bg-white border rounded-full px-2 py-0.5 text-slate-600">
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            {proposedGroups.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun regroupement proposé.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialog(false)}>Annuler</Button>
            {proposedGroups.length > 0 && (
              <Button onClick={applyGroups} disabled={updateMut.isPending}>
                {updateMut.isPending
                  ? "Application…"
                  : "Appliquer les groupes"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ─────────────────────────────────────────────────── */}
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
