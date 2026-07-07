import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListBioDependencies,
  useCreateBioDependency,
  useUpdateBioDependency,
  useDeleteBioDependency,
  getListBioDependenciesQueryKey,
} from "@workspace/api-client-react";
import type { BioDependency, BioDependencyInput } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Leaf } from "lucide-react";
import { CATEGORIES_SUBCATEGORIES, CHAIN_POSITIONS, dependencyColor, masteryColor, chainLabel } from "../data";

interface Props { orgId: number }

const EMPTY: BioDependencyInput = {
  name: null, category: null, subCategory: null, chainPosition: null,
  element: null, description: null, dependencyLevel: null, masteryLevel: null, comments: null,
};

function RatingRow({ label, desc, value, onChange }: { label: string; desc: string; value: number | null | undefined; onChange: (v: number | null) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">{label}</Label>
      <p className="text-xs text-muted-foreground">{desc}</p>
      <div className="flex gap-1 mt-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const colors = ["bg-green-200", "bg-lime-200", "bg-yellow-200", "bg-orange-300", "bg-red-400"];
          const active = value === n;
          return (
            <button key={n} type="button" onClick={() => onChange(active ? null : n)}
              className={`w-9 h-9 rounded-md text-sm font-semibold border transition-all
                ${active ? `${colors[n - 1]} border-transparent ring-2 ring-offset-1 ring-slate-400 text-slate-800` : "border-slate-200 text-slate-500 hover:border-slate-400"}`}>
              {n}
            </button>
          );
        })}
        {value != null && <button type="button" onClick={() => onChange(null)} className="text-xs text-muted-foreground hover:text-destructive px-1">✕</button>}
      </div>
    </div>
  );
}

export function TabCartoDependances({ orgId }: Props) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useListBioDependencies(orgId);
  const createMut  = useCreateBioDependency();
  const updateMut  = useUpdateBioDependency();
  const deleteMut  = useDeleteBioDependency();

  const [open, setOpen]         = useState(false);
  const [editId, setEditId]     = useState<number | null>(null);
  const [form, setForm]         = useState<BioDependencyInput>(EMPTY);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saving, setSaving]     = useState(false);

  const deps = data?.items ?? [];

  const subCats = form.category ? (CATEGORIES_SUBCATEGORIES[form.category] ?? []) : [];

  function openCreate() { setEditId(null); setForm(EMPTY); setOpen(true); }
  function openEdit(d: BioDependency) {
    setEditId(d.id);
    setForm({ name: d.name, category: d.category, subCategory: d.subCategory, chainPosition: d.chainPosition, element: d.element, description: d.description, dependencyLevel: d.dependencyLevel, masteryLevel: d.masteryLevel, comments: d.comments });
    setOpen(true);
  }
  function set<K extends keyof BioDependencyInput>(k: K, v: BioDependencyInput[K]) {
    setForm((prev) => {
      const next = { ...prev, [k]: v };
      if (k === "category") next.subCategory = null;
      return next;
    });
  }

  async function submit() {
    setSaving(true);
    try {
      if (editId !== null) await updateMut.mutateAsync({ orgId, id: editId, data: form });
      else await createMut.mutateAsync({ orgId, data: form });
      await queryClient.invalidateQueries({ queryKey: getListBioDependenciesQueryKey(orgId) });
      setOpen(false);
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (deleteId === null) return;
    await deleteMut.mutateAsync({ orgId, id: deleteId });
    await queryClient.invalidateQueries({ queryKey: getListBioDependenciesQueryKey(orgId) });
    setDeleteId(null);
  }

  const byPosition: Record<string, BioDependency[]> = { amont: [], "in-situ": [], aval: [] };
  for (const d of deps) { byPosition[d.chainPosition ?? "amont"] = [...(byPosition[d.chainPosition ?? "amont"] ?? []), d]; }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{deps.length} dépendance{deps.length !== 1 ? "s" : ""} enregistrée{deps.length !== 1 ? "s" : ""}</p>
        <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-2" />Ajouter une dépendance</Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Chargement…</div>
      ) : deps.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg py-16 flex flex-col items-center gap-3 text-muted-foreground">
          <Leaf className="h-10 w-10 opacity-30" />
          <p className="font-medium">Aucune dépendance enregistrée</p>
          <p className="text-sm">Commencez par identifier vos premières dépendances à la nature.</p>
          <Button onClick={openCreate} variant="outline" size="sm"><Plus className="h-4 w-4 mr-2" />Ajouter une dépendance</Button>
        </div>
      ) : (
        <>
          {/* SVG-style 3-column cartography */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-slate-700">Cartographie de la chaîne de valeur</h3>
            <div className="grid grid-cols-3 gap-3 min-h-[200px]">
              {(["amont", "in-situ", "aval"] as const).map((pos) => (
                <div key={pos} className="flex flex-col">
                  <div className={`text-center text-xs font-bold py-2 px-3 rounded-t-md uppercase tracking-wide
                    ${pos === "amont" ? "bg-blue-100 text-blue-800" : pos === "in-situ" ? "bg-emerald-100 text-emerald-800" : "bg-purple-100 text-purple-800"}`}>
                    {chainLabel(pos)}
                  </div>
                  <div className={`flex-1 border-x border-b rounded-b-md p-2 space-y-2 min-h-[120px]
                    ${pos === "amont" ? "border-blue-200 bg-blue-50/40" : pos === "in-situ" ? "border-emerald-200 bg-emerald-50/40" : "border-purple-200 bg-purple-50/40"}`}>
                    {(byPosition[pos] ?? []).map((d) => (
                      <div key={d.id}
                        className={`border rounded-md px-2 py-1.5 text-xs cursor-pointer hover:shadow-sm transition-shadow ${dependencyColor(d.dependencyLevel)}`}
                        onClick={() => openEdit(d)}>
                        <p className="font-semibold truncate">{d.name ?? <span className="italic opacity-60">Sans nom</span>}</p>
                        <p className="opacity-70 truncate">{d.category}{d.subCategory ? ` › ${d.subCategory}` : ""}</p>
                        {d.dependencyLevel && <p className="mt-0.5">Dép. {d.dependencyLevel}/5{d.masteryLevel ? <span className={`ml-1 ${masteryColor(d.masteryLevel)}`}>· Maît. {d.masteryLevel}/5</span> : ""}</p>}
                      </div>
                    ))}
                    {(byPosition[pos] ?? []).length === 0 && (
                      <div className="flex items-center justify-center h-full py-4">
                        <p className="text-xs opacity-40 italic">Aucune dépendance</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Full list */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-slate-700">Liste complète</h3>
            <div className="space-y-2">
              {deps.map((d) => (
                <div key={d.id} className="border rounded-lg px-4 py-3 flex items-center gap-4 hover:bg-slate-50 cursor-pointer" onClick={() => openEdit(d)}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{d.name ?? <span className="text-muted-foreground italic">Sans nom</span>}</p>
                    <p className="text-xs text-muted-foreground">{d.category}{d.subCategory ? ` › ${d.subCategory}` : ""} · {chainLabel(d.chainPosition)}</p>
                  </div>
                  {d.dependencyLevel && <span className={`text-xs px-2 py-0.5 rounded-full border ${dependencyColor(d.dependencyLevel)}`}>Dép. {d.dependencyLevel}/5</span>}
                  <button onClick={(e) => { e.stopPropagation(); setDeleteId(d.id); }} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              {editId !== null ? "Modifier la dépendance" : "Nouvelle dépendance"}
            </SheetTitle>
            <p className="text-sm text-muted-foreground">Tous les champs sont facultatifs.</p>
          </SheetHeader>

          <div className="space-y-5 pb-6">
            <div className="space-y-1">
              <Label className="text-sm">Nom</Label>
              <Input placeholder="Ex : Disponibilité en eau douce" value={form.name ?? ""} onChange={(e) => set("name", e.target.value || null)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Catégorie</Label>
                <Select value={form.category ?? ""} onValueChange={(v) => set("category", v || null)}>
                  <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                  <SelectContent>{Object.keys(CATEGORIES_SUBCATEGORIES).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Sous-catégorie</Label>
                <Select value={form.subCategory ?? ""} onValueChange={(v) => set("subCategory", v || null)} disabled={!form.category}>
                  <SelectTrigger><SelectValue placeholder={form.category ? "Choisir…" : "Choisir une catégorie d'abord"} /></SelectTrigger>
                  <SelectContent>{subCats.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Position dans la chaîne de valeur</Label>
              <Select value={form.chainPosition ?? ""} onValueChange={(v) => set("chainPosition", v || null)}>
                <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                <SelectContent>{CHAIN_POSITIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Élément concerné</Label>
              <p className="text-xs text-muted-foreground">Ex : fournisseurs, production, transport, locaux…</p>
              <Input placeholder="Ex : Fournisseurs de matières premières" value={form.element ?? ""} onChange={(e) => set("element", e.target.value || null)} />
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Description</Label>
              <Textarea placeholder="Décrivez cette dépendance et son importance pour votre activité…" value={form.description ?? ""} onChange={(e) => set("description", e.target.value || null)} rows={3} />
            </div>

            <RatingRow label="Niveau de dépendance" desc="Dans quelle mesure votre activité dépend-elle de ce service naturel ? (1 = faible, 5 = critique)" value={form.dependencyLevel} onChange={(v) => set("dependencyLevel", v)} />
            <RatingRow label="Niveau de maîtrise" desc="Dans quelle mesure maîtrisez-vous ou pouvez-vous agir sur cette dépendance ? (1 = aucune maîtrise, 5 = forte maîtrise)" value={form.masteryLevel} onChange={(v) => set("masteryLevel", v)} />

            <div className="space-y-1">
              <Label className="text-sm">Commentaires</Label>
              <Textarea placeholder="Notes internes…" value={form.comments ?? ""} onChange={(e) => set("comments", e.target.value || null)} rows={2} />
            </div>
          </div>

          <SheetFooter className="sticky bottom-0 bg-white border-t pt-4 pb-2 gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={submit} disabled={saving}>{saving ? "Enregistrement…" : editId !== null ? "Enregistrer" : "Créer"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette dépendance ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
