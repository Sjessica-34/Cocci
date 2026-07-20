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
  type Organization,
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
import { ArrowRight, Leaf, Pencil, Plus, Trash2 } from "lucide-react";
import {
  ECOSYS_SERVICES, CRITICITY_LABELS, RELATION_TYPES,
  importanceBg, elementLabel,
  type EcosysServiceValue,
} from "../data";

interface Props { orgId: number; subsidiaries?: Organization[]; }

// ─── Formulaire vide ──────────────────────────────────────────────────────────

const EMPTY: BioDependencyInput = {
  name: null,
  category: "Ressource",
  subCategory: null,
  chainPosition: null,
  dependencyLevel: null,
  masteryLevel: null,
  comments: null,
  documentIds: [],
};

// ─── Score buttons (criticité) ────────────────────────────────────────────────

function CriticityButtons({
  value,
  onChange,
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(n => {
          const colors = importanceBg(n);
          const isSelected = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(value === n ? null : n)}
              className="flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-all"
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
      {value && CRITICITY_LABELS[value] && (
        <p className="text-[11px] text-muted-foreground text-center">{CRITICITY_LABELS[value]}</p>
      )}
    </div>
  );
}

// ─── Carte dépendance ─────────────────────────────────────────────────────────

function DependencyCard({
  dep,
  onEdit,
  onDelete,
}: {
  dep: BioDependency;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const svc    = ECOSYS_SERVICES.find(s => s.value === dep.subCategory);
  const colors = importanceBg(dep.dependencyLevel);
  const label  = dep.name ?? dep.subCategory ?? dep.category ?? "Dépendance";

  return (
    <div className="rounded-xl border bg-white p-3 space-y-2 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-2">
        <span className="text-xl leading-none shrink-0 mt-0.5">{svc?.icon ?? "🔗"}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{label}</p>
          {svc && dep.subCategory !== dep.name && (
            <p className="text-[11px] text-slate-500">{svc.value}</p>
          )}
          {dep.comments && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{dep.comments}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {dep.dependencyLevel && (
            <span
              className="text-[10px] font-bold rounded-full px-2 py-0.5"
              style={{ backgroundColor: colors.bg, color: colors.text, border: `1.5px solid ${colors.border}` }}
              title={`Criticité : ${dep.dependencyLevel}/5`}
            >
              C{dep.dependencyLevel}
            </span>
          )}
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── TabSaisie ────────────────────────────────────────────────────────────────

export function TabSaisie({ orgId, subsidiaries }: Props) {
  if (subsidiaries && subsidiaries.length > 0) {
    return <GroupSaisie subsidiaries={subsidiaries} />;
  }
  return <IndividualSaisie orgId={orgId} />;
}

function IndividualSaisie({ orgId }: { orgId: number }) {
  const queryClient = useQueryClient();

  const { data: depsData, isLoading } = useListBioDependencies(orgId);
  const { data: connData }            = useListBioConnections(orgId);
  const elements    = depsData?.items ?? [];
  const connections = connData?.items ?? [];

  const createEl   = useCreateBioDependency();
  const updateEl   = useUpdateBioDependency();
  const deleteEl   = useDeleteBioDependency();
  const createConn = useCreateBioConnection();
  const deleteConn = useDeleteBioConnection();

  // ── Sheet dépendance ─────────────────────────────────────────────────────────
  const [sheetOpen, setSheetOpen]     = useState(false);
  const [editingEl, setEditingEl]     = useState<BioDependency | null>(null);
  const [form, setForm]               = useState<BioDependencyInput>(EMPTY);
  const [deleteElId, setDeleteElId]   = useState<number | null>(null);

  // ── Connexions ───────────────────────────────────────────────────────────────
  const [connDialog, setConnDialog]       = useState(false);
  const [connFrom, setConnFrom]           = useState("");
  const [connTo, setConnTo]               = useState("");
  const [connType, setConnType]           = useState("");
  const [connTypeFree, setConnTypeFree]   = useState("");
  const [deleteConnId, setDeleteConnId]   = useState<number | null>(null);

  function setF<K extends keyof BioDependencyInput>(k: K, v: BioDependencyInput[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function openCreate() {
    setEditingEl(null);
    setForm(EMPTY);
    setSheetOpen(true);
  }

  function openEdit(el: BioDependency) {
    setEditingEl(el);
    setForm({
      name: el.name, category: el.category ?? "Ressource",
      subCategory: el.subCategory, chainPosition: el.chainPosition,
      dependencyLevel: el.dependencyLevel, masteryLevel: el.masteryLevel,
      comments: el.comments, documentIds: el.documentIds,
    });
    setSheetOpen(true);
  }

  async function handleSaveEl() {
    const payload = { ...form, category: "Ressource" };
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

  const isSavingEl     = createEl.isPending || updateEl.isPending;
  const isCreatingConn = createConn.isPending;

  function getElLabel(id: number | string) {
    const el = elements.find(e => e.id === Number(id));
    if (!el) return `ID ${id}`;
    return el.name ?? el.subCategory ?? el.category ?? `ID ${id}`;
  }

  const selectedSvc = ECOSYS_SERVICES.find(s => s.value === (form.subCategory as EcosysServiceValue));

  return (
    <div className="space-y-8">

      {/* ── Dépendances ───────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">
              Dépendances aux services écosystémiques
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {isLoading ? "…" : `${elements.length} dépendance${elements.length !== 1 ? "s" : ""}`}
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Identifiez les services écosystémiques dont votre organisation dépend.
            </p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter une dépendance
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : elements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-3">
            <Leaf className="h-10 w-10 opacity-25" />
            <p className="text-sm max-w-xs">
              Aucune dépendance. Cliquez sur "Ajouter une dépendance" pour identifier les services
              écosystémiques dont vous dépendez.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {elements.map(el => (
              <DependencyCard
                key={el.id}
                dep={el}
                onEdit={() => openEdit(el)}
                onDelete={() => setDeleteElId(el.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Connexions ────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">
              Relations entre dépendances
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {connections.length} connexion{connections.length !== 1 ? "s" : ""}
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Reliez les dépendances entre elles pour enrichir l'analyse IA.
            </p>
          </div>
          <Button
            size="sm" variant="outline"
            onClick={() => setConnDialog(true)}
            disabled={elements.length < 2}
          >
            <Plus className="h-4 w-4 mr-1" />
            Créer une relation
          </Button>
        </div>

        {connections.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Aucune relation. Créez au moins 2 dépendances pour les relier.
          </p>
        ) : (
          <div className="space-y-2">
            {connections.map(conn => (
              <div
                key={conn.id}
                className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border text-sm"
              >
                <span className="font-medium text-slate-700 truncate max-w-[8rem]">
                  {getElLabel(conn.fromElementId)}
                </span>
                {conn.relationType && (
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                    {conn.relationType}
                  </span>
                )}
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="font-medium text-slate-700 truncate max-w-[8rem] flex-1">
                  {getElLabel(conn.toElementId)}
                </span>
                <button
                  onClick={() => setDeleteConnId(conn.id)}
                  className="ml-auto p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Sheet dépendance ──────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {editingEl ? "Modifier la dépendance" : "Nouvelle dépendance"}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-6 mt-6">

            {/* Service écosystémique */}
            <div className="space-y-2">
              <Label>Service écosystémique <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-1 gap-1.5">
                {ECOSYS_SERVICES.map(svc => {
                  const active = form.subCategory === svc.value;
                  return (
                    <button
                      key={svc.value}
                      type="button"
                      onClick={() => setF("subCategory", svc.value)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                        active
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-xl leading-none shrink-0">{svc.icon}</span>
                      <div>
                        <p className={`text-sm font-semibold ${active ? "text-emerald-800" : "text-slate-700"}`}>
                          {svc.value}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-tight">{svc.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nom */}
            <div className="space-y-1.5">
              <Label>
                Nom de la dépendance{" "}
                <span className="text-muted-foreground font-normal text-xs">— facultatif</span>
              </Label>
              <Input
                placeholder={
                  selectedSvc
                    ? `Ex : ${selectedSvc.value} de la rivière Garonne…`
                    : "Ex : Eau de la rivière Garonne, Pollinisation des vergers…"
                }
                value={form.name ?? ""}
                onChange={e => setF("name", e.target.value || null)}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>
                Description{" "}
                <span className="text-muted-foreground font-normal text-xs">— facultatif</span>
              </Label>
              <Textarea
                placeholder="Contexte, usage, sources d'information…"
                rows={3}
                value={form.comments ?? ""}
                onChange={e => setF("comments", e.target.value || null)}
              />
            </div>

            {/* Criticité */}
            <div className="space-y-2">
              <Label>
                Criticité de la dépendance{" "}
                <span className="text-muted-foreground font-normal text-xs">— de 1 (faible) à 5 (vitale)</span>
              </Label>
              <CriticityButtons
                value={form.dependencyLevel}
                onChange={v => setF("dependencyLevel", v)}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleSaveEl}
                disabled={isSavingEl || !form.subCategory}
                className="flex-1"
              >
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

      {/* ── Dialog connexion ──────────────────────────────────────────────── */}
      <Dialog open={connDialog} onOpenChange={open => !open && setConnDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer une relation</DialogTitle>
            <DialogDescription>
              Reliez deux dépendances entre elles pour enrichir l'analyse IA.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Dépendance source</Label>
              <Select value={connFrom} onValueChange={setConnFrom}>
                <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>
                  {elements.filter(e => String(e.id) !== connTo).map(e => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {ECOSYS_SERVICES.find(s => s.value === e.subCategory)?.icon ?? "🔗"}{" "}
                      {e.name ?? e.subCategory ?? `Dépendance ${e.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>
                Type de relation{" "}
                <span className="text-muted-foreground font-normal text-xs">— optionnel</span>
              </Label>
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
              <Label>Dépendance cible</Label>
              <Select value={connTo} onValueChange={setConnTo}>
                <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>
                  {elements.filter(e => String(e.id) !== connFrom).map(e => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {ECOSYS_SERVICES.find(s => s.value === e.subCategory)?.icon ?? "🔗"}{" "}
                      {e.name ?? e.subCategory ?? `Dépendance ${e.id}`}
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

      {/* ── Confirm delete dépendance ─────────────────────────────────────── */}
      <AlertDialog open={deleteElId !== null} onOpenChange={open => !open && setDeleteElId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette dépendance ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les relations liées seront également supprimées.
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

      {/* ── Confirm delete connexion ──────────────────────────────────────── */}
      <AlertDialog open={deleteConnId !== null} onOpenChange={open => !open && setDeleteConnId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette relation ?</AlertDialogTitle>
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

// ─── Vue groupe (agrégation filiales) ─────────────────────────────────────────

function GroupSaisie({ subsidiaries }: { subsidiaries: Organization[] }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Vue groupe — dépendances de {subsidiaries.length} filiale{subsidiaries.length !== 1 ? "s" : ""} :
      </p>
      {subsidiaries.map(sub => (
        <div key={sub.id} className="rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">🏢 {sub.name}</h3>
          <IndividualSaisie orgId={sub.id} />
        </div>
      ))}
    </div>
  );
}
