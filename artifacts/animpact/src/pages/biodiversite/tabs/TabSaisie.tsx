import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListBioDependencies,
  useCreateBioDependency,
  useUpdateBioDependency,
  useDeleteBioDependency,
  getListBioDependenciesQueryKey,
  type BioDependency,
  type BioDependencyInput,
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Leaf } from "lucide-react";
import {
  CATEGORIES_SUBCATEGORIES, CHAIN_POSITIONS, chainLabel,
  getCategoryEmoji, categoryBorderColor, depDotColor,
} from "../data";

interface Props { orgId: number; }

const EMPTY: BioDependencyInput = {
  name: null, category: null, subCategory: null, chainPosition: null,
  dependencyLevel: null, masteryLevel: null, comments: null, documentIds: [],
};

export function TabSaisie({ orgId }: Props) {
  const queryClient = useQueryClient();
  const { data: depsData, isLoading } = useListBioDependencies(orgId);
  const elements = depsData?.items ?? [];

  const createMut = useCreateBioDependency();
  const updateMut = useUpdateBioDependency();
  const deleteMut = useDeleteBioDependency();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingEl, setEditingEl] = useState<BioDependency | null>(null);
  const [form, setForm] = useState<BioDependencyInput>(EMPTY);
  const [catFreeText, setCatFreeText] = useState("");
  const [subCatFreeText, setSubCatFreeText] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  function openCreate() {
    setEditingEl(null);
    setForm(EMPTY);
    setCatFreeText("");
    setSubCatFreeText("");
    setSheetOpen(true);
  }

  function openEdit(el: BioDependency) {
    setEditingEl(el);
    setForm({
      name: el.name, category: el.category, subCategory: el.subCategory,
      chainPosition: el.chainPosition, dependencyLevel: el.dependencyLevel,
      masteryLevel: el.masteryLevel, comments: el.comments, documentIds: el.documentIds,
    });
    setCatFreeText("");
    setSubCatFreeText("");
    setSheetOpen(true);
  }

  function set<K extends keyof BioDependencyInput>(key: K, value: BioDependencyInput[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    const finalCat    = form.category    === "Autre" ? (catFreeText    || "Autre") : form.category;
    const finalSubCat = form.subCategory === "Autre" ? (subCatFreeText || "Autre") : form.subCategory;
    const payload = { ...form, category: finalCat, subCategory: finalSubCat };
    if (editingEl) {
      await updateMut.mutateAsync({ orgId, id: editingEl.id, data: payload });
    } else {
      await createMut.mutateAsync({ orgId, data: payload });
    }
    queryClient.invalidateQueries({ queryKey: getListBioDependenciesQueryKey(orgId) });
    setSheetOpen(false);
  }

  async function handleDelete() {
    if (deleteId === null) return;
    await deleteMut.mutateAsync({ orgId, id: deleteId });
    queryClient.invalidateQueries({ queryKey: getListBioDependenciesQueryKey(orgId) });
    setDeleteId(null);
  }

  const subCategories = CATEGORIES_SUBCATEGORIES[form.category ?? ""] ?? [];
  const isSaving = createMut.isPending || updateMut.isPending;

  const grouped: Record<string, BioDependency[]> = {
    amont:     elements.filter(e => e.chainPosition === "amont"),
    "in-situ": elements.filter(e => e.chainPosition === "in-situ"),
    aval:      elements.filter(e => e.chainPosition === "aval"),
    other:     elements.filter(e => !["amont", "in-situ", "aval"].includes(e.chainPosition ?? "")),
  };

  const ZONE_STYLES: Record<string, { badge: string }> = {
    amont:     { badge: "bg-blue-50 border-blue-200 text-blue-800" },
    "in-situ": { badge: "bg-emerald-50 border-emerald-200 text-emerald-800" },
    aval:      { badge: "bg-purple-50 border-purple-200 text-purple-800" },
    other:     { badge: "bg-slate-50 border-slate-200 text-slate-700" },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "Chargement…"
            : `${elements.length} élément${elements.length !== 1 ? "s" : ""} renseigné${elements.length !== 1 ? "s" : ""}`}
        </p>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Ajouter un élément
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : elements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
          <Leaf className="h-10 w-10 opacity-30" />
          <p className="text-sm max-w-xs">
            Aucun élément encore. Cliquez sur "Ajouter un élément" pour commencer à cartographier vos dépendances à la biodiversité.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {(["amont", "in-situ", "aval", "other"] as const).map(pos => {
            const group = grouped[pos];
            if (!group || group.length === 0) return null;
            const label = pos === "other" ? "Position non définie" : chainLabel(pos);
            return (
              <div key={pos}>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border mb-3 ${ZONE_STYLES[pos]?.badge ?? ""}`}>
                  {label} ({group.length})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {group.map(el => (
                    <ElementCard
                      key={el.id}
                      element={el}
                      onEdit={() => openEdit(el)}
                      onDelete={() => setDeleteId(el.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sheet création / édition */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{editingEl ? "Modifier l'élément" : "Nouvel élément"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">

            <div className="space-y-1.5">
              <Label>Nom de l'élément</Label>
              <Input
                placeholder="Ex : Eau souterraine, Pollinisateurs…"
                value={form.name ?? ""}
                onChange={e => set("name", e.target.value || null)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Position sur la chaîne de valeur</Label>
              <Select value={form.chainPosition ?? ""} onValueChange={v => set("chainPosition", v || null)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>
                  {CHAIN_POSITIONS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Catégorie de service écosystémique</Label>
              <Select
                value={form.category ?? ""}
                onValueChange={v => {
                  set("category", v || null);
                  set("subCategory", null);
                  setCatFreeText("");
                }}
              >
                <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>
                  {Object.keys(CATEGORIES_SUBCATEGORIES).map(c => (
                    <SelectItem key={c} value={c}>{getCategoryEmoji(c)} {c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.category === "Autre" && (
                <Input
                  className="mt-1.5"
                  placeholder="Préciser la catégorie…"
                  value={catFreeText}
                  onChange={e => setCatFreeText(e.target.value)}
                />
              )}
            </div>

            {subCategories.length > 0 && (
              <div className="space-y-1.5">
                <Label>Sous-catégorie</Label>
                <Select
                  value={form.subCategory ?? ""}
                  onValueChange={v => { set("subCategory", v || null); setSubCatFreeText(""); }}
                >
                  <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                  <SelectContent>
                    {subCategories.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.subCategory === "Autre" && (
                  <Input
                    className="mt-1.5"
                    placeholder="Préciser la sous-catégorie…"
                    value={subCatFreeText}
                    onChange={e => setSubCatFreeText(e.target.value)}
                  />
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Niveau de dépendance</Label>
              <p className="text-xs text-muted-foreground">
                Dans quelle mesure votre activité dépend-elle de ce service ?
              </p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => set("dependencyLevel", form.dependencyLevel === n ? null : n)}
                    className={`flex-1 h-9 rounded-md text-sm font-medium border transition-colors ${
                      form.dependencyLevel === n
                        ? n <= 2 ? "bg-green-100 border-green-400 text-green-800"
                          : n === 3 ? "bg-yellow-100 border-yellow-400 text-yellow-800"
                          : "bg-red-100 border-red-400 text-red-800"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">1 = Faible &nbsp;·&nbsp; 5 = Critique</p>
            </div>

            <div className="space-y-2">
              <Label>Niveau de maîtrise</Label>
              <p className="text-xs text-muted-foreground">
                Dans quelle mesure maîtrisez-vous l'impact sur ce service ?
              </p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => set("masteryLevel", form.masteryLevel === n ? null : n)}
                    className={`flex-1 h-9 rounded-md text-sm font-medium border transition-colors ${
                      form.masteryLevel === n
                        ? "bg-blue-100 border-blue-400 text-blue-800"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">1 = Non maîtrisé &nbsp;·&nbsp; 5 = Totalement maîtrisé</p>
            </div>

            <div className="space-y-1.5">
              <Label>Commentaires</Label>
              <Textarea
                placeholder="Observations, contexte, sources…"
                rows={3}
                value={form.comments ?? ""}
                onChange={e => set("comments", e.target.value || null)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={isSaving} className="flex-1">
                {isSaving ? "Enregistrement…" : "Enregistrer"}
              </Button>
              <Button variant="outline" onClick={() => setSheetOpen(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialogue de suppression */}
      <AlertDialog open={deleteId !== null} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet élément ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les connexions liées à cet élément seront également supprimées.
            </AlertDialogDescription>
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

function ElementCard({
  element,
  onEdit,
  onDelete,
}: {
  element: BioDependency;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="relative bg-white rounded-xl border shadow-sm p-3 flex flex-col gap-2 hover:shadow-md transition-shadow"
      style={{ borderLeft: `4px solid ${categoryBorderColor(element.category)}` }}
    >
      <div className="flex items-start gap-2">
        <span className="text-base mt-0.5 shrink-0">{getCategoryEmoji(element.category)}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">
            {element.name ?? "Sans nom"}
          </p>
          {element.category && (
            <p className="text-xs text-muted-foreground truncate">
              {element.category}{element.subCategory ? ` › ${element.subCategory}` : ""}
            </p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Dép.</span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
              <div key={n} className={`w-2.5 h-2.5 rounded-full ${depDotColor(element.dependencyLevel, n)}`} />
            ))}
          </div>
        </div>
        {element.masteryLevel != null && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">Maît.</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(n => (
                <div
                  key={n}
                  className={`w-2.5 h-2.5 rounded-full ${n <= element.masteryLevel! ? "bg-blue-400" : "bg-slate-200"}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
