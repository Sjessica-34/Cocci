import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListBioDependencies,
  useListBioIssues,
  useCreateBioIssue,
  useUpdateBioIssue,
  useDeleteBioIssue,
  useGenerateBioIssues,
  getListBioIssuesQueryKey,
} from "@workspace/api-client-react";
import type { BioIssue, BioGenerateSuggestion } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Sparkles, Trash2, Pencil, Check, X } from "lucide-react";
import { CHAIN_POSITIONS, chainLabel } from "../data";

interface Props { orgId: number }

const IMPORTANCE_COLORS = ["", "bg-green-100 border-green-300 text-green-800", "bg-lime-100 border-lime-300 text-lime-800", "bg-yellow-100 border-yellow-300 text-yellow-800", "bg-orange-100 border-orange-300 text-orange-800", "bg-red-100 border-red-300 text-red-800"];

function RatingRow({ label, value, onChange }: { label: string; value: number | null | undefined; onChange: (v: number | null) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const cols = ["bg-green-200", "bg-lime-200", "bg-yellow-200", "bg-orange-300", "bg-red-400"];
          const active = value === n;
          return <button key={n} type="button" onClick={() => onChange(active ? null : n)} className={`w-9 h-9 rounded-md text-sm font-semibold border transition-all ${active ? `${cols[n - 1]} ring-2 ring-offset-1 ring-slate-400` : "border-slate-200 text-slate-500 hover:border-slate-400"}`}>{n}</button>;
        })}
        {value != null && <button type="button" onClick={() => onChange(null)} className="text-xs text-muted-foreground hover:text-destructive px-1">✕</button>}
      </div>
    </div>
  );
}

type IssueForm = { name: string | null; description: string | null; importance: number | null; comments: string | null; chainPosition: string | null; dependencyIds: number[] };
const EMPTY_FORM: IssueForm = { name: null, description: null, importance: null, comments: null, chainPosition: null, dependencyIds: [] };

export function TabCartoEnjeux({ orgId }: Props) {
  const queryClient = useQueryClient();
  const { data: depsData } = useListBioDependencies(orgId);
  const { data: issuesData, isLoading } = useListBioIssues(orgId);
  const createMut   = useCreateBioIssue();
  const updateMut   = useUpdateBioIssue();
  const deleteMut   = useDeleteBioIssue();
  const generateMut = useGenerateBioIssues();

  const [suggestions, setSuggestions]     = useState<(BioGenerateSuggestion & { accepted?: boolean })[]>([]);
  const [generating, setGenerating]       = useState(false);
  const [savingAll, setSavingAll]         = useState(false);
  const [sheetOpen, setSheetOpen]         = useState(false);
  const [editId, setEditId]               = useState<number | null>(null);
  const [form, setForm]                   = useState<IssueForm>(EMPTY_FORM);
  const [deleteId, setDeleteId]           = useState<number | null>(null);
  const [saving, setSaving]               = useState(false);
  const [editSugName, setEditSugName]     = useState<Record<number, string>>({});

  const deps   = depsData?.items ?? [];
  const issues = issuesData?.items ?? [];

  function depName(id: number) { return deps.find((d) => d.id === id)?.name ?? `Dép. #${id}`; }

  async function handleGenerate() {
    if (deps.length === 0) return;
    setGenerating(true);
    try {
      const result = await generateMut.mutateAsync({ orgId });
      setSuggestions(result.suggestions.map((s) => ({ ...s, accepted: true })));
    } finally { setGenerating(false); }
  }

  async function saveAccepted() {
    setSavingAll(true);
    try {
      const accepted = suggestions.filter((s) => s.accepted !== false);
      for (const s of accepted) {
        await createMut.mutateAsync({
          orgId,
          data: { name: editSugName[suggestions.indexOf(s)] ?? s.name, description: s.description ?? null, importance: null, comments: null, chainPosition: s.chainPosition ?? null, dependencyIds: s.dependencyIds },
        });
      }
      await queryClient.invalidateQueries({ queryKey: getListBioIssuesQueryKey(orgId) });
      setSuggestions([]);
    } finally { setSavingAll(false); }
  }

  function openCreate() { setEditId(null); setForm(EMPTY_FORM); setSheetOpen(true); }
  function openEdit(issue: BioIssue) {
    setEditId(issue.id);
    setForm({ name: issue.name ?? null, description: issue.description ?? null, importance: issue.importance ?? null, comments: issue.comments ?? null, chainPosition: issue.chainPosition ?? null, dependencyIds: issue.dependencyIds });
    setSheetOpen(true);
  }

  async function submit() {
    setSaving(true);
    try {
      if (editId !== null) await updateMut.mutateAsync({ orgId, id: editId, data: form });
      else await createMut.mutateAsync({ orgId, data: form });
      await queryClient.invalidateQueries({ queryKey: getListBioIssuesQueryKey(orgId) });
      setSheetOpen(false);
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (deleteId === null) return;
    await deleteMut.mutateAsync({ orgId, id: deleteId });
    await queryClient.invalidateQueries({ queryKey: getListBioIssuesQueryKey(orgId) });
    setDeleteId(null);
  }

  // SVG matrix positioning
  const SVG_W = 600; const SVG_H = 280;
  const PAD = { l: 60, r: 20, t: 20, b: 40 };
  const plotW = SVG_W - PAD.l - PAD.r;
  const plotH = SVG_H - PAD.t - PAD.b;
  const xPos = (pos: string | null | undefined) => {
    if (pos === "amont") return PAD.l + plotW * 0.15;
    if (pos === "in-situ") return PAD.l + plotW * 0.5;
    if (pos === "aval") return PAD.l + plotW * 0.85;
    return PAD.l + plotW * 0.5;
  };
  const yPos = (imp: number | null | undefined) => PAD.t + plotH - ((imp ?? 1) - 1) / 4 * plotH;

  return (
    <div className="space-y-6">
      {/* Generate section */}
      <div className="border rounded-lg p-4 bg-slate-50 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-sm">Génération des enjeux par l'IA</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              L'IA regroupe vos dépendances en enjeux cohérents et propose un intitulé professionnel.
              Elle ne crée aucune donnée — vous validez chaque suggestion.
            </p>
          </div>
          <Button size="sm" onClick={handleGenerate} disabled={generating || deps.length === 0}>
            <Sparkles className="h-4 w-4 mr-2" />
            {generating ? "Génération…" : "Générer les enjeux"}
          </Button>
        </div>
        {deps.length === 0 && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">Ajoutez des dépendances dans l'onglet "Cartographie des dépendances" avant de générer les enjeux.</p>}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Suggestions de l'IA — {suggestions.filter((s) => s.accepted !== false).length} enjeu{suggestions.filter((s) => s.accepted !== false).length !== 1 ? "x" : ""} sélectionné{suggestions.filter((s) => s.accepted !== false).length !== 1 ? "s" : ""}</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSuggestions([])}>Annuler</Button>
              <Button size="sm" onClick={saveAccepted} disabled={savingAll}>{savingAll ? "Enregistrement…" : "Enregistrer les enjeux"}</Button>
            </div>
          </div>
          <div className="space-y-2">
            {suggestions.map((s, i) => {
              const accepted = s.accepted !== false;
              return (
                <Card key={i} className={`transition-opacity ${accepted ? "" : "opacity-40"}`}>
                  <CardContent className="pt-4 pb-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <button onClick={() => setSuggestions((prev) => prev.map((x, j) => j === i ? { ...x, accepted: !accepted } : x))} className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center ${accepted ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300"}`}>
                        {accepted && <Check className="h-3 w-3" />}
                      </button>
                      <div className="flex-1">
                        <Input
                          className="font-semibold text-sm h-8 px-2"
                          value={editSugName[i] ?? s.name}
                          onChange={(e) => setEditSugName((prev) => ({ ...prev, [i]: e.target.value }))}
                        />
                        {s.description && <p className="text-xs text-muted-foreground mt-1">{s.description}</p>}
                        <div className="flex flex-wrap gap-1 mt-2">
                          <Badge variant="outline" className="text-xs">{chainLabel(s.chainPosition)}</Badge>
                          {s.dependencyIds.map((id) => (
                            <Badge key={id} variant="secondary" className="text-xs">{depName(id)}</Badge>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => setSuggestions((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive p-1"><X className="h-4 w-4" /></button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Existing issues */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-slate-700">{issues.length} enjeu{issues.length !== 1 ? "x" : ""} enregistré{issues.length !== 1 ? "s" : ""}</h3>
          <Button size="sm" variant="outline" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Ajouter manuellement</Button>
        </div>

        {isLoading ? <div className="text-sm text-muted-foreground py-4 text-center">Chargement…</div> :
          issues.length === 0 ? (
            <div className="border-2 border-dashed rounded-lg py-10 text-center text-muted-foreground">
              <p className="font-medium text-sm">Aucun enjeu enregistré</p>
              <p className="text-xs mt-1">Générez des enjeux avec l'IA ou ajoutez-en manuellement.</p>
            </div>
          ) : (
            <>
              {/* SVG matrix */}
              <div className="border rounded-lg p-4 bg-white overflow-x-auto">
                <h4 className="text-xs font-semibold text-slate-600 mb-2">Cartographie des enjeux</h4>
                <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full max-w-2xl" style={{ minWidth: 340 }}>
                  {/* Axes */}
                  <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + plotH} stroke="#cbd5e1" strokeWidth="1" />
                  <line x1={PAD.l} y1={PAD.t + plotH} x2={PAD.l + plotW} y2={PAD.t + plotH} stroke="#cbd5e1" strokeWidth="1" />
                  {/* Y labels */}
                  {[1, 2, 3, 4, 5].map((n) => {
                    const y = yPos(n);
                    return <g key={n}><line x1={PAD.l - 4} y1={y} x2={PAD.l} y2={y} stroke="#cbd5e1" strokeWidth="1" /><text x={PAD.l - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{n}</text></g>;
                  })}
                  {/* Y axis label */}
                  <text x={14} y={PAD.t + plotH / 2} textAnchor="middle" fontSize="10" fill="#64748b" transform={`rotate(-90, 14, ${PAD.t + plotH / 2})`}>Importance</text>
                  {/* X labels */}
                  {["Amont", "In situ", "Aval"].map((label, i) => {
                    const xv = PAD.l + plotW * [0.15, 0.5, 0.85][i];
                    return <text key={label} x={xv} y={PAD.t + plotH + 18} textAnchor="middle" fontSize="10" fill="#64748b">{label}</text>;
                  })}
                  {/* Grid lines */}
                  {[0.15, 0.5, 0.85].map((f) => (
                    <line key={f} x1={PAD.l + plotW * f} y1={PAD.t} x2={PAD.l + plotW * f} y2={PAD.t + plotH} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                  ))}
                  {/* Issue bubbles */}
                  {issues.map((issue) => {
                    const cx = xPos(issue.chainPosition);
                    const cy = yPos(issue.importance);
                    const r  = 14 + (issue.importance ?? 1) * 3;
                    const col = ["", "#bbf7d0", "#bef264", "#fde68a", "#fed7aa", "#fecaca"][issue.importance ?? 1] ?? "#e2e8f0";
                    return (
                      <g key={issue.id} onClick={() => openEdit(issue)} style={{ cursor: "pointer" }}>
                        <circle cx={cx} cy={cy} r={r} fill={col} stroke="#94a3b8" strokeWidth="1" opacity="0.85" />
                        <foreignObject x={cx - r} y={cy - r} width={r * 2} height={r * 2}>
                          <div className="flex items-center justify-center w-full h-full">
                            <span style={{ fontSize: 9, textAlign: "center", lineHeight: 1.2, color: "#1e293b", padding: "2px", wordBreak: "break-word" }}>{issue.name ?? "?"}</span>
                          </div>
                        </foreignObject>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Issue cards */}
              <div className="space-y-2">
                {issues.map((issue) => (
                  <div key={issue.id} className="border rounded-lg px-4 py-3 flex items-start gap-4 hover:bg-slate-50 cursor-pointer" onClick={() => openEdit(issue)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{issue.name ?? <span className="text-muted-foreground italic">Sans titre</span>}</p>
                        {issue.importance && <span className={`text-xs px-2 py-0.5 rounded-full border ${IMPORTANCE_COLORS[issue.importance]}`}>Importance {issue.importance}/5</span>}
                        <Badge variant="outline" className="text-xs">{chainLabel(issue.chainPosition)}</Badge>
                      </div>
                      {issue.description && <p className="text-xs text-muted-foreground mt-1">{issue.description}</p>}
                      {issue.dependencyIds.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">{issue.dependencyIds.map((id) => <Badge key={id} variant="secondary" className="text-xs">{deps.find((d) => d.id === id)?.name ?? `Dép. #${id}`}</Badge>)}</div>
                      )}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteId(issue.id); }} className="text-muted-foreground hover:text-destructive p-1 flex-shrink-0"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </>
          )
        }
      </div>

      {/* Edit sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle>{editId !== null ? "Modifier l'enjeu" : "Nouvel enjeu"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pb-6">
            <div className="space-y-1"><Label className="text-sm">Nom de l'enjeu</Label><Input placeholder="Ex : Gestion durable de la ressource en eau" value={form.name ?? ""} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value || null }))} /></div>
            <div className="space-y-1"><Label className="text-sm">Description</Label><Textarea placeholder="Description en 1-2 phrases…" value={form.description ?? ""} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value || null }))} rows={3} /></div>
            <RatingRow label="Importance (1-5)" value={form.importance} onChange={(v) => setForm((p) => ({ ...p, importance: v }))} />
            <div className="space-y-1">
              <Label className="text-sm">Position dans la chaîne</Label>
              <Select value={form.chainPosition ?? ""} onValueChange={(v) => setForm((p) => ({ ...p, chainPosition: v || null }))}>
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>{CHAIN_POSITIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-sm">Commentaires</Label><Textarea value={form.comments ?? ""} onChange={(e) => setForm((p) => ({ ...p, comments: e.target.value || null }))} rows={2} /></div>
          </div>
          <SheetFooter className="sticky bottom-0 bg-white border-t pt-4 pb-2 gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Annuler</Button>
            <Button onClick={submit} disabled={saving}>{saving ? "Enregistrement…" : editId !== null ? "Enregistrer" : "Créer"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Supprimer cet enjeu ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
