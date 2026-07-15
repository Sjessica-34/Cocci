import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListBioDependencies,
  useCreateBioDependency,
  useUpdateBioDependency,
  useDeleteBioDependency,
  useListBioConnections,
  useCreateBioConnection,
  useDeleteBioConnection,
  getListBioDependenciesQueryKey,
  getListBioConnectionsQueryKey,
  type BioDependency,
  type BioDependencyInput,
  type BioConnection,
  type Organization,
} from "@workspace/api-client-react";
import {
  useConsolidatedBio,
  type ConsolidatedElement,
} from "../useConsolidatedBio";
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
import { ArrowRight, Leaf, Pencil, Plus, Trash2 } from "lucide-react";
import {
  FAMILIES, SUBTYPES, RELATION_TYPES, CHAIN_POSITIONS,
  type ElementFamily,
  elementLabel, familyIcon, familyColor, familyBg, chainLabel,
} from "../data";

interface Props { orgId: number; subsidiaries?: Organization[]; }

const EMPTY: BioDependencyInput = {
  name: null, category: null, subCategory: null, chainPosition: null,
  dependencyLevel: null, masteryLevel: null, comments: null, documentIds: [],
};

export function TabSaisie({ orgId, subsidiaries }: Props) {
  if (subsidiaries && subsidiaries.length > 0) {
    return <GroupSaisie subsidiaries={subsidiaries} />;
  }
  return <IndividualSaisie orgId={orgId} />;
}

function IndividualSaisie({ orgId }: { orgId: number }) {
  const queryClient = useQueryClient();

  const { data: depsData, isLoading } = useListBioDependencies(orgId);
  const { data: connData } = useListBioConnections(orgId);
  const elements    = depsData?.items ?? [];
  const connections = connData?.items ?? [];

  const createEl  = useCreateBioDependency();
  const updateEl  = useUpdateBioDependency();
  const deleteEl  = useDeleteBioDependency();
  const createConn = useCreateBioConnection();
  const deleteConn = useDeleteBioConnection();

  // ─── Element Sheet ──────────────────────────────────────────────────────────
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingEl, setEditingEl] = useState<BioDependency | null>(null);
  const [form, setForm] = useState<BioDependencyInput>(EMPTY);
  const [subFreeText, setSubFreeText] = useState("");

  // ─── Element filter ─────────────────────────────────────────────────────────
  const [filterFamily, setFilterFamily] = useState<ElementFamily | "all">("all");

  // ─── Delete element ─────────────────────────────────────────────────────────
  const [deleteElId, setDeleteElId] = useState<number | null>(null);

  // ─── Connection dialog ──────────────────────────────────────────────────────
  const [connDialog, setConnDialog] = useState(false);
  const [connFrom, setConnFrom] = useState("");
  const [connTo, setConnTo] = useState("");
  const [connType, setConnType] = useState("");
  const [connTypeFree, setConnTypeFree] = useState("");
  const [deleteConnId, setDeleteConnId] = useState<number | null>(null);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function setF<K extends keyof BioDependencyInput>(k: K, v: BioDependencyInput[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function openCreate() {
    setEditingEl(null);
    setForm(EMPTY);
    setSubFreeText("");
    setSheetOpen(true);
  }

  function openEdit(el: BioDependency) {
    setEditingEl(el);
    setForm({
      name: el.name, category: el.category, subCategory: el.subCategory,
      chainPosition: el.chainPosition, dependencyLevel: el.dependencyLevel,
      masteryLevel: el.masteryLevel, comments: el.comments, documentIds: el.documentIds,
    });
    setSubFreeText("");
    setSheetOpen(true);
  }

  async function handleSaveEl() {
    const finalSub = form.subCategory === "Autre" ? (subFreeText || "Autre") : form.subCategory;
    // Lieux → toujours in-situ
    const finalPos = form.category === "Lieu" ? "in-situ" : form.chainPosition;
    const payload  = { ...form, subCategory: finalSub, chainPosition: finalPos, x: null, y: null };
    if (editingEl) {
      await updateEl.mutateAsync({ orgId, id: editingEl.id, data: payload });
    } else {
      await createEl.mutateAsync({ orgId, data: payload });
    }
    queryClient.invalidateQueries({ queryKey: getListBioDependenciesQueryKey(orgId) });
    setSheetOpen(false);
  }

  async function handleDeleteEl() {
    if (deleteElId === null) return;
    await deleteEl.mutateAsync({ orgId, id: deleteElId });
    queryClient.invalidateQueries({ queryKey: getListBioDependenciesQueryKey(orgId) });
    setDeleteElId(null);
  }

  async function handleCreateConn() {
    if (!connFrom || !connTo) return;
    const type = connType === "Autre" ? (connTypeFree || "Autre") : (connType || null);
    await createConn.mutateAsync({
      orgId,
      data: { fromElementId: Number(connFrom), toElementId: Number(connTo), relationType: type },
    });
    queryClient.invalidateQueries({ queryKey: getListBioConnectionsQueryKey(orgId) });
    setConnDialog(false);
    setConnFrom(""); setConnTo(""); setConnType(""); setConnTypeFree("");
  }

  async function handleDeleteConn() {
    if (deleteConnId === null) return;
    await deleteConn.mutateAsync({ orgId, id: deleteConnId });
    queryClient.invalidateQueries({ queryKey: getListBioConnectionsQueryKey(orgId) });
    setDeleteConnId(null);
  }

  const isSavingEl   = createEl.isPending || updateEl.isPending;
  const isCreatingConn = createConn.isPending;

  // ─── Filter & group ──────────────────────────────────────────────────────────

  const filtered = filterFamily === "all"
    ? elements
    : elements.filter(e => e.category === filterFamily);

  const subtypes: string[] = SUBTYPES[(form.category as ElementFamily) ?? "Ressource"] ?? [];
  const isLieu = form.category === "Lieu";

  function getElLabel(id: number | string) {
    const el = elements.find(e => e.id === Number(id));
    if (!el) return `ID ${id}`;
    return elementLabel(el.name, el.category, el.subCategory) || `ID ${id}`;
  }

  return (
    <div className="space-y-8">

      {/* ── Éléments ─────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            Éléments de la chaîne de valeur
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {isLoading ? "…" : `${elements.length} élément${elements.length !== 1 ? "s" : ""}`}
            </span>
          </h2>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter un élément
          </Button>
        </div>

        {/* Filtres famille */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterFamily("all")}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              filterFamily === "all"
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Tous ({elements.length})
          </button>
          {FAMILIES.map(f => {
            const count = elements.filter(e => e.category === f.value).length;
            const active = filterFamily === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilterFamily(active ? "all" : f.value)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors flex items-center gap-1 ${
                  active ? "text-white border-transparent" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
                style={active ? { backgroundColor: f.color, borderColor: f.color } : {}}
              >
                <span>{f.icon}</span>
                {f.value} ({count})
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-3">
            <Leaf className="h-10 w-10 opacity-25" />
            <p className="text-sm max-w-xs">
              {elements.length === 0
                ? "Aucun élément. Cliquez sur \"Ajouter un élément\" pour construire votre chaîne de valeur."
                : "Aucun élément dans cette famille."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(el => (
              <ElementCard
                key={el.id}
                element={el}
                onEdit={() => openEdit(el)}
                onDelete={() => setDeleteElId(el.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Connexions ───────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            Connexions
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {connections.length} connexion{connections.length !== 1 ? "s" : ""}
            </span>
          </h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConnDialog(true)}
            disabled={elements.length < 2}
          >
            <Plus className="h-4 w-4 mr-1" />
            Créer une connexion
          </Button>
        </div>

        {connections.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Aucune connexion. Créez au moins 2 éléments pour les relier.
          </p>
        ) : (
          <div className="space-y-2">
            {connections.map(conn => {
              const fromLabel = getElLabel(conn.fromElementId);
              const toLabel   = getElLabel(conn.toElementId);
              return (
                <div
                  key={conn.id}
                  className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border text-sm"
                >
                  <span className="font-medium text-slate-700 truncate max-w-[8rem]">{fromLabel}</span>
                  {conn.relationType && (
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                      {conn.relationType}
                    </span>
                  )}
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-700 truncate max-w-[8rem] flex-1">{toLabel}</span>
                  <button
                    onClick={() => setDeleteConnId(conn.id)}
                    className="ml-auto p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Sheet création / édition élément ─────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editingEl ? "Modifier l'élément" : "Ajouter un élément"}</SheetTitle>
          </SheetHeader>

          <div className="space-y-5 mt-6">
            {/* Famille */}
            <div className="space-y-2">
              <Label>Famille</Label>
              <div className="grid grid-cols-2 gap-2">
                {FAMILIES.map(f => {
                  const active = form.category === f.value;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => {
                        setF("category", f.value);
                        setF("subCategory", null);
                        setSubFreeText("");
                        if (f.value === "Lieu") setF("chainPosition", "in-situ");
                      }}
                      className="flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all"
                      style={{
                        borderColor: active ? f.color : "#E2E8F0",
                        backgroundColor: active ? f.bg : "white",
                        color: active ? f.color : "#64748B",
                      }}
                    >
                      <span className="text-xl leading-none">{f.icon}</span>
                      <span className="text-xs font-semibold leading-tight">{f.value}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sous-type */}
            {form.category && (
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={form.subCategory ?? ""}
                  onValueChange={v => { setF("subCategory", v || null); setSubFreeText(""); }}
                >
                  <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                  <SelectContent>
                    {subtypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.subCategory === "Autre" && (
                  <Input
                    className="mt-1.5"
                    placeholder="Préciser le type…"
                    value={subFreeText}
                    onChange={e => setSubFreeText(e.target.value)}
                  />
                )}
              </div>
            )}

            {/* Nom (facultatif) */}
            <div className="space-y-1.5">
              <Label>Nom <span className="text-muted-foreground font-normal text-xs">— facultatif</span></Label>
              <Input
                placeholder="Ex : Eau de la Garonne, Usine de Rouen…"
                value={form.name ?? ""}
                onChange={e => setF("name", e.target.value || null)}
              />
            </div>

            {/* Position chaîne */}
            <div className="space-y-1.5">
              <Label>Position sur la chaîne de valeur</Label>
              {isLieu ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  <span>📍</span>
                  <span>Les lieux sont toujours positionnés <strong>In situ</strong>.</span>
                </div>
              ) : (
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
              )}
            </div>

            {/* Commentaires */}
            <div className="space-y-1.5">
              <Label>Commentaires</Label>
              <Textarea
                placeholder="Observations, contexte, sources…"
                rows={3}
                value={form.comments ?? ""}
                onChange={e => setF("comments", e.target.value || null)}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={handleSaveEl} disabled={isSavingEl} className="flex-1">
                {isSavingEl ? "Enregistrement…" : "Enregistrer"}
              </Button>
              {editingEl && (
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => { setSheetOpen(false); setDeleteElId(editingEl.id); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button variant="outline" onClick={() => setSheetOpen(false)}>Annuler</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Dialog connexion ─────────────────────────────────────────────── */}
      <Dialog open={connDialog} onOpenChange={open => !open && setConnDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer une connexion</DialogTitle>
            <DialogDescription>
              Définissez la relation entre deux éléments de votre chaîne de valeur.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Origine</Label>
              <Select value={connFrom} onValueChange={setConnFrom}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un élément…" /></SelectTrigger>
                <SelectContent>
                  {elements.filter(e => String(e.id) !== connTo).map(e => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {familyIcon(e.category)} {elementLabel(e.name, e.category, e.subCategory) || `Élément ${e.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type de relation <span className="text-muted-foreground font-normal text-xs">— optionnel</span></Label>
              <Select value={connType} onValueChange={setConnType}>
                <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>
                  {RELATION_TYPES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              {connType === "Autre" && (
                <Input
                  className="mt-1.5"
                  placeholder="Préciser le type de relation…"
                  value={connTypeFree}
                  onChange={e => setConnTypeFree(e.target.value)}
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Destination</Label>
              <Select value={connTo} onValueChange={setConnTo}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un élément…" /></SelectTrigger>
                <SelectContent>
                  {elements.filter(e => String(e.id) !== connFrom).map(e => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {familyIcon(e.category)} {elementLabel(e.name, e.category, e.subCategory) || `Élément ${e.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnDialog(false)}>Annuler</Button>
            <Button
              onClick={handleCreateConn}
              disabled={isCreatingConn || !connFrom || !connTo}
            >
              {isCreatingConn ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm delete élément ───────────────────────────────────────── */}
      <AlertDialog open={deleteElId !== null} onOpenChange={open => !open && setDeleteElId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet élément ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les connexions liées à cet élément seront également supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEl}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteEl.isPending}
            >
              {deleteEl.isPending ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Confirm delete connexion ─────────────────────────────────────── */}
      <AlertDialog open={deleteConnId !== null} onOpenChange={open => !open && setDeleteConnId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette connexion ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConn}
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

// ─── Vue groupe consolidée (Saisie) ──────────────────────────────────────────

function GroupSaisie({ subsidiaries }: { subsidiaries: Organization[] }) {
  const { elements, connections, isLoading } = useConsolidatedBio(subsidiaries);
  const [filterFamily, setFilterFamily] = useState<ElementFamily | "all">("all");

  const filtered = filterFamily === "all"
    ? elements
    : elements.filter(e => e.category === filterFamily);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
        <span>📊</span>
        <span>Vue consolidée — {subsidiaries.length} filiale{subsidiaries.length !== 1 ? "s" : ""} · Lecture seule. Modifiez les données depuis chaque filiale.</span>
      </div>

      {/* ── Éléments ─────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">
          Éléments de la chaîne de valeur
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {elements.length} élément{elements.length !== 1 ? "s" : ""}
          </span>
        </h2>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterFamily("all")}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              filterFamily === "all"
                ? "bg-slate-800 text-white border-slate-800"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Tous ({elements.length})
          </button>
          {FAMILIES.map(f => {
            const count  = elements.filter(e => e.category === f.value).length;
            const active = filterFamily === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setFilterFamily(active ? "all" : f.value)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors flex items-center gap-1 ${
                  active ? "text-white border-transparent" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
                style={active ? { backgroundColor: f.color, borderColor: f.color } : {}}
              >
                <span>{f.icon}</span>
                {f.value} ({count})
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-3">
            <Leaf className="h-10 w-10 opacity-25" />
            <p className="text-sm max-w-xs">
              {elements.length === 0
                ? "Aucun élément dans les filiales."
                : "Aucun élément dans cette famille."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(el => (
              <GroupElementCard key={el.virtualId} element={el} />
            ))}
          </div>
        )}
      </section>

      {/* ── Connexions ───────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">
          Connexions
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {connections.length} connexion{connections.length !== 1 ? "s" : ""}
          </span>
        </h2>

        {connections.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Aucune connexion dans les filiales.</p>
        ) : (
          <div className="space-y-2">
            {connections.map(conn => {
              const fromEl    = elements.find(e => e.virtualId === conn.fromVirtualId);
              const toEl      = elements.find(e => e.virtualId === conn.toVirtualId);
              const fromLabel = elementLabel(fromEl?.name, fromEl?.category, fromEl?.subCategory) || "?";
              const toLabel   = elementLabel(toEl?.name, toEl?.category, toEl?.subCategory) || "?";
              return (
                <div
                  key={conn.virtualId}
                  className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border text-sm"
                >
                  <span className="font-medium text-slate-700 truncate max-w-[8rem]">{fromLabel}</span>
                  {conn.relationType && (
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                      {conn.relationType}
                    </span>
                  )}
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-700 truncate max-w-[8rem] flex-1">{toLabel}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Carte élément groupe ─────────────────────────────────────────────────────

function GroupElementCard({ element }: { element: ConsolidatedElement }) {
  const label = elementLabel(element.name, element.category, element.subCategory);
  const icon  = familyIcon(element.category);
  const color = familyColor(element.category);
  const bg    = familyBg(element.category);

  const originsText =
    element.origins.length === 1
      ? element.origins[0].orgName
      : `${element.origins.length} filiales`;
  const originsTitle =
    element.origins.length > 1
      ? element.origins.map(o => o.orgName).join(", ")
      : undefined;

  return (
    <div
      className="bg-white rounded-xl border-2 shadow-sm p-3 flex flex-col gap-2.5"
      style={{ borderColor: color }}
    >
      <div className="flex items-start gap-2">
        <span
          className="text-2xl leading-none mt-0.5 shrink-0 rounded-lg flex items-center justify-center"
          style={{ width: 36, height: 36, backgroundColor: bg }}
        >
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          {label ? (
            <p className="font-semibold text-sm leading-tight text-slate-800 truncate">{label}</p>
          ) : (
            <p className="text-sm text-slate-400 italic leading-tight">—</p>
          )}
          {element.name && element.subCategory && (
            <p className="text-[10px] text-slate-500 mt-0.5">{element.subCategory}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
          style={{ backgroundColor: bg, color }}
        >
          {element.category}
        </span>
        {element.chainPosition && (
          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
            {chainLabel(element.chainPosition)}
          </span>
        )}
      </div>

      <p className="text-[10px] text-slate-400 leading-tight" title={originsTitle}>
        📍 {originsText}
      </p>
    </div>
  );
}

// ─── Carte élément ────────────────────────────────────────────────────────────

function ElementCard({
  element,
  onEdit,
  onDelete,
}: {
  element: BioDependency;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const label  = elementLabel(element.name, element.category, element.subCategory);
  const icon   = familyIcon(element.category);
  const color  = familyColor(element.category);
  const bg     = familyBg(element.category);

  return (
    <div
      className="relative bg-white rounded-xl border-2 shadow-sm p-3 flex flex-col gap-2.5 hover:shadow-md transition-shadow"
      style={{ borderColor: color }}
    >
      {/* Actions */}
      <div className="absolute top-2 right-2 flex gap-1">
        <button
          onClick={onEdit}
          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          onClick={onDelete}
          className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Icon + label */}
      <div className="flex items-start gap-2 pr-12">
        <span
          className="text-2xl leading-none mt-0.5 shrink-0 rounded-lg flex items-center justify-center"
          style={{ width: 36, height: 36, backgroundColor: bg }}
        >
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          {label ? (
            <p className="font-semibold text-sm leading-tight text-slate-800 truncate">{label}</p>
          ) : (
            <p className="text-sm text-slate-400 italic leading-tight">—</p>
          )}
          {element.name && element.subCategory && (
            <p className="text-[10px] text-slate-500 mt-0.5">{element.subCategory}</p>
          )}
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
          style={{ backgroundColor: bg, color }}
        >
          {element.category}
        </span>
        {element.chainPosition && (
          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
            {chainLabel(element.chainPosition)}
          </span>
        )}
      </div>
    </div>
  );
}
