import { useState, useMemo, useRef } from "react";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  useListActionLibrary,
  useListActionPlan,
  useAddActionToPlan,
  useUpdateActionPlanItem,
  useDeleteActionPlanItem,
  getListActionPlanQueryKey,
} from "@workspace/api-client-react";
import {
  Search, Zap, Wrench, Anchor, Loader2, Upload, FileText,
  Download, Calendar, MessageSquare, Paperclip, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  orgId: number;
}

const CATEGORIES = [
  "Environnement",
  "Numérique responsable",
  "Biodiversité",
  "Social",
  "Achats responsables",
  "Gouvernance",
];

const LEVEL_META: Record<string, { label: string; icon: typeof Zap; bg: string }> = {
  quick:      { label: "Rapide",      icon: Zap,    bg: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  project:    { label: "Projet",      icon: Wrench, bg: "bg-amber-50 border-amber-200 text-amber-700" },
  engagement: { label: "Engagement",  icon: Anchor, bg: "bg-violet-50 border-violet-200 text-violet-700" },
};

const CATEGORY_COLOR: Record<string, string> = {
  "Environnement":          "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Numérique responsable":  "bg-sky-100 text-sky-800 border-sky-200",
  "Biodiversité":           "bg-lime-100 text-lime-800 border-lime-200",
  "Social":                 "bg-blue-100 text-blue-800 border-blue-200",
  "Achats responsables":    "bg-orange-100 text-orange-800 border-orange-200",
  "Gouvernance":            "bg-purple-100 text-purple-800 border-purple-200",
};

const CATEGORY_EMOJI: Record<string, string> = {
  "Environnement":          "🌍",
  "Numérique responsable":  "💻",
  "Biodiversité":           "🌿",
  "Social":                 "👥",
  "Achats responsables":    "🤝",
  "Gouvernance":            "⚖️",
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function toInputDate(iso: string | null | undefined): string {
  if (!iso) return new Date().toISOString().slice(0, 10);
  return iso.slice(0, 10);
}

// ── Inline form shown when an action is checked ──────────────────────────────

interface InlineFormProps {
  planItem: any;
  orgId: number;
}

function InlineForm({ planItem, orgId }: InlineFormProps) {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { mutateAsync: updateItem } = useUpdateActionPlanItem();

  const [completedAt, setCompletedAt] = useState(toInputDate(planItem.completedAt));
  const [comment, setComment] = useState(planItem.comment ?? "");
  const [justificationUrl, setJustificationUrl] = useState(planItem.justificationUrl ?? "");
  const [justificationName, setJustificationName] = useState<string | null>(
    planItem.justificationUrl ? decodeURIComponent(planItem.justificationUrl.split("/").pop() ?? "") : null,
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateItem({
        orgId,
        actionId: planItem.id,
        data: {
          completedAt: completedAt ? new Date(completedAt).toISOString() : null,
          comment: comment.trim() || null,
          justificationUrl: justificationUrl || null,
        },
      });
      qc.invalidateQueries({ queryKey: getListActionPlanQueryKey(orgId) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "Maximum 10 Mo.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const token = await getToken();
      const form = new FormData();
      form.append("file", file);
      form.append("category", "mes-actions");
      const res = await fetch(`/api/organizations/${orgId}/documents`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      const doc = await res.json();
      const url = `/api/organizations/${orgId}/documents/${doc.id}/download`;
      setJustificationUrl(url);
      setJustificationName(file.name);
      await updateItem({
        orgId,
        actionId: planItem.id,
        data: {
          completedAt: completedAt ? new Date(completedAt).toISOString() : null,
          comment: comment.trim() || null,
          justificationUrl: url,
        },
      });
      qc.invalidateQueries({ queryKey: getListActionPlanQueryKey(orgId) });
      toast({ title: "Justificatif ajouté", description: "Disponible dans Mes documents → Mes actions RSE." });
    } catch {
      toast({ title: "Erreur upload", description: "Impossible d'uploader le fichier.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload() {
    if (!justificationUrl) return;
    const token = await getToken();
    const res = await fetch(justificationUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = justificationName ?? "justificatif";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-3 ml-8 space-y-3 border-l-2 border-emerald-200 pl-4">
      {/* Date */}
      <div className="flex items-center gap-2">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <label className="text-xs text-muted-foreground w-32 shrink-0">Date de réalisation</label>
        <input
          type="date"
          value={completedAt}
          onChange={(e) => setCompletedAt(e.target.value)}
          className="h-7 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Commentaire */}
      <div className="flex items-start gap-2">
        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1.5" />
        <label className="text-xs text-muted-foreground w-32 shrink-0 mt-1.5">Commentaire</label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={`"Tous les gobelets ont été remplacés."\n"Formation réalisée pour 12 collaborateurs."`}
          className="min-h-[60px] text-xs resize-none flex-1"
          rows={2}
        />
      </div>

      {/* Justificatif */}
      <div className="flex items-center gap-2">
        <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <label className="text-xs text-muted-foreground w-32 shrink-0">Justificatif</label>
        <div className="flex items-center gap-2 flex-1">
          {justificationUrl && justificationName ? (
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="truncate max-w-[200px]">{justificationName}</span>
              <Download className="h-3 w-3 shrink-0" />
            </button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            {justificationUrl ? "Remplacer" : "Importer"}
          </Button>
          <span className="text-[10px] text-muted-foreground">photo, facture, attestation, PDF… (max 10 Mo)</span>
        </div>
        <input
          ref={fileRef}
          type="file"
          className="sr-only"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.png,.jpg,.jpeg,.webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
            if (fileRef.current) fileRef.current.value = "";
          }}
        />
      </div>

      {/* Bouton sauvegarder */}
      <div className="flex justify-end">
        <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          {saved ? "✓ Enregistré" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}

// ── Single action card ────────────────────────────────────────────────────────

interface ActionCardProps {
  action: any;
  planItem: any | null;
  orgId: number;
}

function ActionCard({ action, planItem, orgId }: ActionCardProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [toggling, setToggling] = useState(false);
  const [expanded, setExpanded] = useState(planItem?.isChecked ?? false);

  const { mutateAsync: addToPlan } = useAddActionToPlan();
  const { mutateAsync: deleteItem } = useDeleteActionPlanItem();

  const isChecked = planItem?.isChecked ?? false;
  const levelMeta = LEVEL_META[action.level];
  const LevelIcon = levelMeta?.icon ?? Zap;

  async function handleToggle() {
    if (toggling) return;
    setToggling(true);
    try {
      if (!planItem) {
        await addToPlan({
          orgId,
          data: {
            libraryActionId: action.id,
            source: "library",
            isChecked: true,
            completedAt: new Date().toISOString(),
          },
        });
        setExpanded(true);
      } else {
        await deleteItem({ orgId, actionId: planItem.id });
        setExpanded(false);
      }
      qc.invalidateQueries({ queryKey: getListActionPlanQueryKey(orgId) });
    } catch {
      toast({ title: "Erreur", description: "Impossible de mettre à jour.", variant: "destructive" });
    } finally {
      setToggling(false);
    }
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-4 transition-colors",
        isChecked && "border-emerald-200 bg-emerald-50/30",
      )}
    >
      {/* Row: checkbox + content + expand toggle */}
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {toggling ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Checkbox
              checked={isChecked}
              onCheckedChange={handleToggle}
              className={cn(isChecked && "border-emerald-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500")}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium leading-snug", isChecked && "line-through text-muted-foreground")}>
            {action.name}
          </p>
          {action.description && !isChecked && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
              {action.description}
            </p>
          )}
          {isChecked && planItem?.completedAt && (
            <p className="text-xs text-emerald-700 mt-0.5">
              ✓ {formatDate(planItem.completedAt)}
              {planItem.comment && <span className="text-muted-foreground ml-1">— {planItem.comment}</span>}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 items-center mt-2">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLOR[action.category] ?? ""}`}>
              {CATEGORY_EMOJI[action.category]} {action.subcategory ?? action.category}
            </Badge>
            {levelMeta && (
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${levelMeta.bg} flex items-center gap-0.5`}>
                <LevelIcon className="h-2.5 w-2.5" />
                {levelMeta.label}
              </Badge>
            )}
            {action.odd && (
              <span className="text-[10px] text-muted-foreground">ODD {action.odd}</span>
            )}
          </div>
        </div>

        {isChecked && (
          <button
            onClick={() => setExpanded((v: boolean) => !v)}
            className="ml-1 text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
            title={expanded ? "Masquer les détails" : "Modifier les détails"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Inline form */}
      {isChecked && expanded && planItem && (
        <InlineForm planItem={planItem} orgId={orgId} />
      )}
    </div>
  );
}

// ── Main checklist ────────────────────────────────────────────────────────────

export function ActionChecklist({ orgId }: Props) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [showCheckedOnly, setShowCheckedOnly] = useState(false);

  const { data: library = [], isLoading: libLoading } = useListActionLibrary(orgId);
  const { data: planItems = [] } = useListActionPlan(orgId);

  const planByLibraryId = useMemo(() => {
    const map = new Map<number, any>();
    (planItems as any[]).forEach((p) => {
      if (p.libraryActionId) map.set(p.libraryActionId, p);
    });
    return map;
  }, [planItems]);

  const checkedCount = useMemo(
    () => (planItems as any[]).filter((p) => p.isChecked).length,
    [planItems],
  );

  const subcategories = useMemo(() => {
    if (!selectedCategory) return [];
    const subs = new Set<string>();
    (library as any[])
      .filter((a) => a.category === selectedCategory && a.subcategory)
      .forEach((a) => subs.add(a.subcategory));
    return Array.from(subs);
  }, [library, selectedCategory]);

  const filtered = useMemo(() => {
    return (library as any[]).filter((action) => {
      if (showCheckedOnly && !planByLibraryId.get(action.id)?.isChecked) return false;
      if (selectedCategory && action.category !== selectedCategory) return false;
      if (selectedSubcategory && action.subcategory !== selectedSubcategory) return false;
      if (selectedLevel && action.level !== selectedLevel) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !action.name.toLowerCase().includes(q) &&
          !(action.description ?? "").toLowerCase().includes(q) &&
          !(action.subcategory ?? "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [library, selectedCategory, selectedSubcategory, selectedLevel, search, showCheckedOnly, planByLibraryId]);

  function clearFilters() {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedLevel(null);
    setSearch("");
    setShowCheckedOnly(false);
  }

  const hasFilters = selectedCategory || selectedLevel || search.trim() || showCheckedOnly;
  const total = (library as any[]).length;

  if (libLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      {total > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${Math.round((checkedCount / total) * 100)}%` }}
            />
          </div>
          <span className="text-sm font-medium text-foreground shrink-0">
            {checkedCount} / {total}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">actions réalisées</span>
        </div>
      )}

      {/* Filtres catégorie */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              if (selectedCategory === cat) { setSelectedCategory(null); setSelectedSubcategory(null); }
              else { setSelectedCategory(cat); setSelectedSubcategory(null); }
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              selectedCategory === cat
                ? CATEGORY_COLOR[cat]
                : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted",
            )}
          >
            <span>{CATEGORY_EMOJI[cat]}</span>
            {cat}
          </button>
        ))}
      </div>

      {/* Sous-catégories */}
      {selectedCategory && subcategories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-1">
          {subcategories.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubcategory(selectedSubcategory === sub ? null : sub)}
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                selectedSubcategory === sub
                  ? "bg-foreground text-background border-foreground"
                  : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted",
              )}
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {/* Niveau + recherche + filtre réalisées */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher une action…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex gap-1.5">
          {Object.entries(LEVEL_META).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setSelectedLevel(selectedLevel === key ? null : key)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                selectedLevel === key
                  ? meta.bg
                  : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted",
              )}
            >
              <meta.icon className="h-3 w-3" />
              {meta.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCheckedOnly((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
            showCheckedOnly
              ? "bg-emerald-50 border-emerald-300 text-emerald-700"
              : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted",
          )}
        >
          ✓ Réalisées seulement
        </button>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground underline">
            Effacer
          </button>
        )}
      </div>

      {/* Nombre de résultats */}
      <div className="text-xs text-muted-foreground">
        {filtered.length} action{filtered.length !== 1 ? "s" : ""} affichée{filtered.length !== 1 ? "s" : ""}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Aucune action ne correspond aux filtres sélectionnés.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((action: any) => (
            <ActionCard
              key={action.id}
              action={action}
              planItem={planByLibraryId.get(action.id) ?? null}
              orgId={orgId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
