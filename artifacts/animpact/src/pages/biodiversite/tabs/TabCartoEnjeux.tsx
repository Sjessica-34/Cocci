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
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, ChevronDown, ChevronUp, Layers, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import {
  CHAIN_POSITIONS, ISSUE_TYPES, ISSUE_FAMILIES,
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
  name: null, family: null, description: null, issueType: null,
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
  1: "Faible", 2: "Modérée", 3: "Importante", 4: "Élevée", 5: "Critique",
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

// ─── Static cartography grid ──────────────────────────────────────────────────

const GRID_POSITIONS = ["amont", "in-situ", "aval"] as const;
const GRID_POS_LABELS: Record<string, string> = { "amont": "Amont", "in-situ": "In situ", "aval": "Aval" };
const GRID_POS_COLORS: Record<string, { header: string; bg: string; border: string }> = {
  "amont":   { header: "text-blue-700 bg-blue-50",    bg: "bg-blue-50/40",    border: "border-blue-100" },
  "in-situ": { header: "text-emerald-700 bg-emerald-50", bg: "bg-emerald-50/40", border: "border-emerald-100" },
  "aval":    { header: "text-purple-700 bg-purple-50",  bg: "bg-purple-50/40",  border: "border-purple-100" },
};

/**
 * Matrice des enjeux (X = position chaîne, Y = importance)
 * Extensible vers une double matérialité : ajouter un second axe vertical
 * (importance parties prenantes) sans changer l'architecture de base.
 */
function IssueMatrix({ issues, onClickIssue }: {
  issues: BioIssue[];
  onClickIssue: (issue: BioIssue) => void;
}) {
  function cellIssues(pos: string, importance: number) {
    return issues.filter(i => {
      const matchPos = i.chainPosition
        ? i.chainPosition === pos
        : pos === "in-situ";
      return matchPos && i.importance === importance;
    });
  }

  function groupChips(cellItems: BioIssue[]) {
    const grouped: Map<string, BioIssue[]> = new Map();
    for (const issue of cellItems) {
      const key = issue.family ?? "\0";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(issue);
    }
    return Array.from(grouped.entries());
  }

  if (issues.length === 0) return null;

  return (
    <div className="rounded-xl border shadow-sm overflow-hidden">
      {/* Column headers */}
      <div className="grid grid-cols-[56px_1fr_1fr_1fr] border-b">
        <div className="bg-slate-50" />
        {GRID_POSITIONS.map(pos => {
          const c = GRID_POS_COLORS[pos];
          return (
            <div
              key={pos}
              className={`py-2.5 text-center text-[11px] font-bold uppercase tracking-wide border-l ${c.header} ${c.border}`}
            >
              {GRID_POS_LABELS[pos]}
            </div>
          );
        })}
      </div>

      {/* Rows: importance 5 → 1 */}
      {[5, 4, 3, 2, 1].map(imp => {
        const rowColors = importanceBg(imp);
        return (
          <div key={imp} className="grid grid-cols-[56px_1fr_1fr_1fr] border-b last:border-b-0 min-h-[64px]">
            {/* Y-axis label */}
            <div
              className="flex flex-col items-center justify-center py-2 border-r shrink-0"
              style={{ backgroundColor: rowColors.bg }}
            >
              <span className="text-[11px] font-bold" style={{ color: rowColors.text }}>{imp}</span>
              <span className="text-[9px] leading-tight text-center px-0.5" style={{ color: rowColors.text, opacity: 0.75 }}>
                {IMPORTANCE_LABELS[imp]}
              </span>
            </div>

            {/* Cells */}
            {GRID_POSITIONS.map(pos => {
              const c = GRID_POS_COLORS[pos];
              const items = cellIssues(pos, imp);
              const chips = groupChips(items);
              return (
                <div
                  key={pos}
                  className={`p-1.5 border-l ${c.border} flex flex-wrap gap-1 content-start`}
                  style={{ minHeight: 64 }}
                >
                  {chips.map(([family, grpIssues]) => {
                    if (family !== "\0") {
                      return (
                        <button
                          key={family}
                          onClick={() => onClickIssue(grpIssues[0])}
                          className="text-[10px] font-semibold rounded-lg px-2 py-1 border-2 transition-all hover:shadow-sm cursor-pointer"
                          style={{
                            backgroundColor: rowColors.bg,
                            borderColor: rowColors.border,
                            color: rowColors.text,
                          }}
                          title={grpIssues.map(i => i.name ?? "Sans nom").join(", ")}
                        >
                          {family}
                          {grpIssues.length > 1 && (
                            <span className="ml-1 opacity-60">×{grpIssues.length}</span>
                          )}
                        </button>
                      );
                    }
                    return grpIssues.map(issue => (
                      <button
                        key={issue.id}
                        onClick={() => onClickIssue(issue)}
                        className="text-[10px] rounded-lg px-2 py-1 border-2 transition-all hover:shadow-sm cursor-pointer text-left"
                        style={{
                          backgroundColor: rowColors.bg,
                          borderColor: rowColors.border,
                          color: rowColors.text,
                        }}
                      >
                        {issue.name ?? "Enjeu sans nom"}
                      </button>
                    ));
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Priority issues section ──────────────────────────────────────────────────

function PriorityIssues({ issues, onEdit }: { issues: BioIssue[]; onEdit: (i: BioIssue) => void }) {
  const priority = issues.filter(i => (i.importance ?? 0) >= 4)
    .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0));

  if (priority.length === 0) return null;

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-base">🔴</span>
        <h3 className="text-sm font-bold text-orange-900">
          Enjeux prioritaires
          <span className="ml-2 text-xs font-normal text-orange-700">
            ({priority.length} enjeu{priority.length !== 1 ? "x" : ""} — importance ≥ 4)
          </span>
        </h3>
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
              {issue.family && (
                <span className="text-[10px] opacity-70">· {issue.family}</span>
              )}
              <span
                className="ml-1 text-[10px] rounded-full px-1.5 py-0.5 font-bold"
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

  const [sheetOpen, setSheetOpen]       = useState(false);
  const [editingIssue, setEditingIssue] = useState<BioIssue | null>(null);
  const [form, setForm]                 = useState<BioIssueInput>(EMPTY_ISSUE);
  const [deleteId, setDeleteId]         = useState<number | null>(null);
  const [showReactFlow, setShowReactFlow] = useState(false);

  // ── Suggestions (AI generate) ──
  const [suggestionsDialog, setSuggestionsDialog] = useState(false);
  const [suggestions, setSuggestions]             = useState<Suggestion[]>([]);
  const [accepted, setAccepted]                   = useState<Set<number>>(new Set());

  // ── Groups (AI group) ──
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
        id:       String(issue.id),
        type:     "bioIssue" as const,
        position: nodePositions.current.get(issue.id) ?? { x: issue.x ?? def.x, y: issue.y ?? def.y },
        data: {
          id:           issue.id,
          name:         issue.name        ?? null,
          description:  issue.description ?? null,
          issueType:    issue.issueType    ?? null,
          importance:   issue.importance  ?? null,
          probability:  issue.probability ?? null,
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
  const criticite  = form.importance && form.probability ? form.importance * form.probability : null;

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!isLoading && issueCount === 0) {
    return (
      <div className="space-y-3">
        <ToolBar
          issueCount={0} elementCount={elements.length}
          isGenerating={generateMut.isPending} isGrouping={groupMut.isPending}
          onGenerate={handleGenerate} onGroup={handleGroupAI} onCreateIssue={openCreate}
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

            {/* Famille / Thème */}
            <div className="space-y-1.5">
              <Label>Famille / Thème</Label>
              <Select value={form.family ?? ""} onValueChange={v => setF("family", v || null)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un thème…" /></SelectTrigger>
                <SelectContent>
                  {ISSUE_FAMILIES.map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            {/* Importance de l'enjeu */}
            <div className="space-y-1.5">
              <Label>
                Importance de l'enjeu{" "}
                <span className="text-muted-foreground font-normal text-xs">— de 1 (Faible) à 5 (Critique)</span>
              </Label>
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
                  <p className="text-[11px] text-muted-foreground">Importance × Probabilité</p>
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
    <div className="space-y-4">
      <ToolBar
        issueCount={issueCount} elementCount={elements.length}
        isGenerating={generateMut.isPending} isGrouping={groupMut.isPending}
        onGenerate={handleGenerate} onGroup={handleGroupAI} onCreateIssue={openCreate}
      />

      {isLoading ? (
        <Skeleton className="h-[400px] w-full rounded-xl" />
      ) : (
        <>
          {/* ── Cartographie statique des enjeux ───────────────────── */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              Cartographie des enjeux
              <span className="text-xs font-normal text-muted-foreground">
                — position chaîne × importance
              </span>
            </h2>
            <IssueMatrix issues={issues} onClickIssue={openEdit} />
          </section>

          {/* ── Enjeux prioritaires ────────────────────────────────── */}
          <PriorityIssues issues={issues} onEdit={openEdit} />

          {/* ── Vue interactive (ReactFlow) ────────────────────────── */}
          <section className="space-y-2">
            <button
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
              onClick={() => setShowReactFlow(v => !v)}
            >
              Vue interactive (carte libre)
              {showReactFlow
                ? <ChevronUp className="h-4 w-4" />
                : <ChevronDown className="h-4 w-4" />}
            </button>

            {showReactFlow && (
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
                  <div className="flex-1 relative">
                    <ReactFlow
                      nodes={nodes}
                      edges={[]}
                      onNodesChange={onNodesChange}
                      onEdgesChange={onEdgesChange}
                      nodeTypes={nodeTypes}
                      onNodeDragStop={onNodeDragStop}
                      onNodeClick={onNodeClick}
                      fitView
                      fitViewOptions={{ padding: 0.2 }}
                      minZoom={0.3}
                      maxZoom={1.5}
                    >
                      <Background gap={40} color="#f1f5f9" />
                      <Controls showInteractive={false} />
                      <MiniMap nodeColor={(n) => {
                        const d = n.data as BioIssueData;
                        return importanceBg(d.importance).border;
                      }} />
                    </ReactFlow>
                  </div>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {renderSheet()}

      {/* ── AI grouping dialog ─────────────────────────────────────────── */}
      <Dialog open={groupDialog} onOpenChange={open => !open && setGroupDialog(false)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>✨ Regroupement automatique des enjeux</DialogTitle>
            <DialogDescription>
              L'IA a regroupé vos enjeux par thématique. Modifiez les noms si nécessaire, puis acceptez.
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
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun regroupement proposé.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialog(false)}>Annuler</Button>
            {proposedGroups.length > 0 && (
              <Button
                onClick={applyGroups}
                disabled={updateMut.isPending}
              >
                {updateMut.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Application…</>
                ) : (
                  <><Check className="h-4 w-4 mr-2" /> Appliquer les groupes</>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Suggestions dialog (generate) ─────────────────────────────── */}
      <Dialog open={suggestionsDialog} onOpenChange={open => !open && closeSuggestions()}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>✨ Suggestions d'enjeux par l'IA</DialogTitle>
            <DialogDescription>
              Sélectionnez les enjeux à ajouter à votre analyse.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {suggestions.map((s, idx) => {
              const isAccepted = accepted.has(idx);
              const colors = importanceBg(s.importance);
              return (
                <div
                  key={idx}
                  className="rounded-xl border p-3 space-y-1.5 transition-all"
                  style={{ backgroundColor: isAccepted ? "#F0FDF4" : "white", borderColor: isAccepted ? "#86EFAC" : "#E2E8F0" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                      {s.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.description}</p>}
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        {s.chainPosition && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                            {s.chainPosition === "amont" ? "Amont" : s.chainPosition === "aval" ? "Aval" : "In situ"}
                          </span>
                        )}
                        {s.importance && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                            style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                          >
                            Importance {s.importance}/5
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isAccepted ? "secondary" : "default"}
                      onClick={() => acceptSuggestion(s, idx)}
                      disabled={isAccepted}
                      className="shrink-0"
                    >
                      {isAccepted ? <><Check className="h-3.5 w-3.5 mr-1" /> Ajouté</> : "Ajouter"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeSuggestions}>Fermer</Button>
            {suggestions.some((_, i) => !accepted.has(i)) && (
              <Button onClick={acceptAllSuggestions} disabled={createMut.isPending}>
                {createMut.isPending ? "Ajout en cours…" : "Tout ajouter"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ─────────────────────────────────────────────── */}
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
  issueCount, elementCount, isGenerating, isGrouping,
  onGenerate, onGroup, onCreateIssue,
}: {
  issueCount: number;
  elementCount: number;
  isGenerating: boolean;
  isGrouping: boolean;
  onGenerate: () => void;
  onGroup: () => void;
  onCreateIssue: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground mr-auto">
        {issueCount} enjeu{issueCount !== 1 ? "x" : ""}
      </span>
      {elementCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={onGenerate}
          disabled={isGenerating}
          className="gap-1.5"
        >
          {isGenerating
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Génération…</>
            : <><Sparkles className="h-4 w-4" /> Générer avec l'IA</>}
        </Button>
      )}
      {issueCount >= 2 && (
        <Button
          variant="outline"
          size="sm"
          onClick={onGroup}
          disabled={isGrouping}
          className="gap-1.5"
        >
          {isGrouping
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Regroupement…</>
            : <><Sparkles className="h-4 w-4" /> Regrouper automatiquement</>}
        </Button>
      )}
      <Button size="sm" onClick={onCreateIssue} className="gap-1.5">
        <Plus className="h-4 w-4" />
        Ajouter un enjeu
      </Button>
    </div>
  );
}
