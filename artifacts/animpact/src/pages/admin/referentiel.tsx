import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { AdminLayout } from "./layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Lock,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  ChevronDown,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type LibraryAction = {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  esgPillar: string;
  level: string;
  isSystem: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
};

type ActionFormData = {
  name: string;
  description: string;
  category: string;
  subcategory: string;
  esgPillar: string;
  level: string;
  sortOrder: string;
};

const EMPTY_FORM: ActionFormData = {
  name: "",
  description: "",
  category: "",
  subcategory: "",
  esgPillar: "E",
  level: "starter",
  sortOrder: "999",
};

// ─── Constantes ───────────────────────────────────────────────────────────────

const PILLAR_OPTS = [
  { value: "E", label: "🌿 Environnement" },
  { value: "S", label: "👥 Social" },
  { value: "G", label: "⚖️ Gouvernance" },
];

const LEVEL_OPTS = [
  { value: "starter", label: "Rapide / Débutant" },
  { value: "intermediate", label: "Intermédiaire / Projet" },
  { value: "advanced", label: "Avancé / Engagement" },
];

const PILLAR_COLOR: Record<string, string> = {
  E: "bg-emerald-100 text-emerald-800 border-emerald-200",
  S: "bg-blue-100 text-blue-800 border-blue-200",
  G: "bg-purple-100 text-purple-800 border-purple-200",
};
const PILLAR_LABEL: Record<string, string> = { E: "Environnement", S: "Social", G: "Gouvernance" };
const LEVEL_LABEL: Record<string, string> = {
  starter: "Rapide",
  quick: "Rapide",
  intermediate: "Projet",
  project: "Projet",
  advanced: "Engagement",
  engagement: "Engagement",
};

// ─── Formulaire action ────────────────────────────────────────────────────────

function ActionForm({
  initial,
  onSubmit,
  submitting,
}: {
  initial: ActionFormData;
  onSubmit: (data: ActionFormData) => void;
  submitting: boolean;
}) {
  const [form, setForm] = useState<ActionFormData>(initial);
  const set = (field: keyof ActionFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Nom de l'action *</label>
        <Input value={form.name} onChange={set("name")} placeholder="Ex: Réduire la consommation d'énergie" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Description</label>
        <Textarea
          value={form.description}
          onChange={set("description")}
          placeholder="Décrivez l'action en détail…"
          rows={3}
          className="resize-none text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Pilier ESG *</label>
          <select
            value={form.esgPillar}
            onChange={set("esgPillar")}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {PILLAR_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Niveau *</label>
          <select
            value={form.level}
            onChange={set("level")}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {LEVEL_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Catégorie</label>
          <Input value={form.category} onChange={set("category")} placeholder="Ex: Environnement" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Sous-catégorie</label>
          <Input value={form.subcategory} onChange={set("subcategory")} placeholder="Ex: Énergie" />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Ordre d'affichage</label>
        <Input
          type="number"
          value={form.sortOrder}
          onChange={set("sortOrder")}
          placeholder="999"
          className="w-32"
        />
      </div>
      <Button
        className="w-full"
        disabled={!form.name.trim() || submitting}
        onClick={() => onSubmit(form)}
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Enregistrer
      </Button>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function AdminReferentiel() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filterPillar, setFilterPillar] = useState<string>("all");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAction, setEditAction] = useState<LibraryAction | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const QK = ["admin-action-library"];

  const { data: actions = [], isLoading } = useQuery<LibraryAction[]>({
    queryKey: QK,
    queryFn: () => customFetch("/api/admin/action-library"),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<LibraryAction>) =>
      customFetch("/api/admin/action-library", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      toast({ title: "Action créée" });
      setDialogOpen(false);
    },
    onError: () => toast({ title: "Erreur", description: "Impossible de créer l'action.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<LibraryAction> }) =>
      customFetch(`/api/admin/action-library/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      toast({ title: "Action mise à jour" });
      setDialogOpen(false);
      setEditAction(null);
    },
    onError: () => toast({ title: "Erreur", description: "Impossible de modifier l'action.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      customFetch(`/api/admin/action-library/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      toast({ title: "Action supprimée" });
    },
    onError: () => toast({ title: "Erreur", description: "Action système ou erreur réseau.", variant: "destructive" }),
  });

  const filtered = actions.filter(a => {
    if (!showInactive && !a.isActive) return false;
    if (filterPillar !== "all" && a.esgPillar !== filterPillar) return false;
    if (filterLevel !== "all" && !a.level.startsWith(filterLevel)) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const systemCount = actions.filter(a => a.isSystem).length;
  const adminCount = actions.filter(a => !a.isSystem).length;

  function openCreate() {
    setEditAction(null);
    setDialogOpen(true);
  }

  function openEdit(a: LibraryAction) {
    setEditAction(a);
    setDialogOpen(true);
  }

  function handleSubmit(form: ActionFormData) {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category.trim() || null,
      subcategory: form.subcategory.trim() || null,
      esgPillar: form.esgPillar,
      level: form.level,
      sortOrder: Number(form.sortOrder) || 999,
    };
    if (editAction) {
      updateMutation.mutate({ id: editAction.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">Référentiel d'actions RSE</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {systemCount} actions système · {adminCount} actions admin
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" />
            Nouvelle action
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {["E", "S", "G"].map(pillar => {
            const count = actions.filter(a => a.esgPillar === pillar && a.isActive).length;
            return (
              <Card key={pillar} className="cursor-pointer hover:shadow-sm transition-all" onClick={() => setFilterPillar(filterPillar === pillar ? "all" : pillar)}>
                <CardContent className="p-4">
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{PILLAR_LABEL[pillar]}</p>
                </CardContent>
              </Card>
            );
          })}
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{actions.filter(a => a.isActive).length}</p>
              <p className="text-xs text-muted-foreground">Total actives</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <div className="flex items-center gap-1">
              <select
                value={filterPillar}
                onChange={e => setFilterPillar(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">Tous les piliers</option>
                {PILLAR_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <select
                value={filterLevel}
                onChange={e => setFilterLevel(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">Tous les niveaux</option>
                <option value="starter">Rapide</option>
                <option value="intermediate">Projet</option>
                <option value="advanced">Engagement</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={e => setShowInactive(e.target.checked)}
                className="rounded border-input"
              />
              Afficher inactives
            </label>
            <span className="text-xs text-muted-foreground ml-auto">
              {filtered.length} action{filtered.length !== 1 ? "s" : ""}
            </span>
          </CardContent>
        </Card>

        {/* Liste */}
        <div className="space-y-2">
          {isLoading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground text-sm">
                Aucune action trouvée.
              </CardContent>
            </Card>
          ) : (
            filtered.map(action => (
              <Card
                key={action.id}
                className={`transition-all ${!action.isActive ? "opacity-50" : ""}`}
              >
                <CardHeader
                  className="p-4 pb-0 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === action.id ? null : action.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-sm font-medium leading-snug">
                          {action.name}
                        </CardTitle>
                        {action.isSystem && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-600 gap-0.5">
                            <Lock className="h-2.5 w-2.5" /> Système
                          </Badge>
                        )}
                        {!action.isActive && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${PILLAR_COLOR[action.esgPillar] ?? ""}`}>
                          {PILLAR_LABEL[action.esgPillar] ?? action.esgPillar}
                        </Badge>
                        {action.subcategory && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {action.subcategory}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-50">
                          {LEVEL_LABEL[action.level] ?? action.level}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!action.isSystem && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title={action.isActive ? "Désactiver" : "Activer"}
                            onClick={e => {
                              e.stopPropagation();
                              updateMutation.mutate({ id: action.id, data: { isActive: !action.isActive } });
                            }}
                          >
                            {action.isActive
                              ? <ToggleRight className="h-4 w-4 text-emerald-600" />
                              : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Modifier"
                            onClick={e => { e.stopPropagation(); openEdit(action); }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            title="Supprimer"
                            onClick={e => {
                              e.stopPropagation();
                              if (confirm(`Supprimer "${action.name}" ?`)) {
                                deleteMutation.mutate(action.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform ${expandedId === action.id ? "rotate-180" : ""}`}
                      />
                    </div>
                  </div>
                </CardHeader>
                {expandedId === action.id && (
                  <CardContent className="px-4 pb-4 pt-3">
                    {action.description ? (
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Aucune description.</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Ordre : {action.sortOrder} · ID : {action.id}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Dialogue création / édition */}
      <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) setEditAction(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editAction ? "Modifier l'action" : "Nouvelle action RSE"}</DialogTitle>
          </DialogHeader>
          <ActionForm
            initial={editAction ? {
              name: editAction.name,
              description: editAction.description ?? "",
              category: editAction.category ?? "",
              subcategory: editAction.subcategory ?? "",
              esgPillar: editAction.esgPillar,
              level: editAction.level,
              sortOrder: String(editAction.sortOrder),
            } : EMPTY_FORM}
            onSubmit={handleSubmit}
            submitting={isSubmitting}
          />
          <DialogFooter />
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
