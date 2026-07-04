import { useState, useCallback } from "react";
import type { IssueRatedItem } from "@workspace/api-client-react";
import {
  useGetIssues,
  useUpsertIssueRating,
  useCreateCustomIssue,
  useDeleteCustomIssue,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ChevronDown, ChevronRight, Search, Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ISSUE_CATEGORIES_ORDER = [
  "Changements climatiques",
  "Biodiversité",
  "Communication / Marketing",
  "Pratiques responsables des affaires",
  "Diversité, égalité et inclusion",
  "Santé et sécurité",
  "Économie circulaire",
  "Bien-être et vie quotidienne",
  "Excellence opérationnelle",
  "Création de valeur locale",
  "Patrimoine et ancrage territorial",
  "Personnalisés",
];

const CATEGORY_COLORS: Record<string, string> = {
  "Changements climatiques": "#14b8a6",
  "Biodiversité": "#22c55e",
  "Communication / Marketing": "#f97316",
  "Pratiques responsables des affaires": "#6366f1",
  "Diversité, égalité et inclusion": "#ec4899",
  "Santé et sécurité": "#ef4444",
  "Économie circulaire": "#84cc16",
  "Bien-être et vie quotidienne": "#8b5cf6",
  "Excellence opérationnelle": "#3b82f6",
  "Création de valeur locale": "#f59e0b",
  "Patrimoine et ancrage territorial": "#10b981",
  "Personnalisés": "#94a3b8",
};

function RatingPicker({
  value,
  onChange,
  label,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-muted-foreground w-24 text-right shrink-0">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(value === n ? null : n)}
            className={cn(
              "h-5 w-5 rounded text-[10px] font-semibold border transition-colors",
              value === n
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/40 text-muted-foreground border-border hover:border-primary hover:text-primary",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

type IssueRowProps = {
  item: IssueRatedItem;
  orgId: number;
  onDelete?: () => void;
};

function IssueRow({ item, orgId, onDelete }: IssueRowProps) {
  const qc = useQueryClient();
  const { mutate: upsert } = useUpsertIssueRating();

  const save = useCallback(
    (stakeholderScore: number | null, companyScore: number | null) => {
      upsert(
        {
          orgId,
          data: { issueKey: item.key, stakeholderScore, companyScore },
        },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: [`/api/organizations/${orgId}/issues`] });
          },
        },
      );
    },
    [upsert, orgId, item.key, qc],
  );

  const isRated = item.stakeholderScore != null && item.companyScore != null;

  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2.5 border-b border-border last:border-0 hover:bg-muted/10 transition-colors", isRated && "bg-emerald-50/50 dark:bg-emerald-950/20")}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {isRated && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />}
        {!isRated && <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/20 shrink-0" />}
        <p className="text-xs text-foreground truncate">{item.label}</p>
        {item.isCustom && onDelete && (
          <button
            onClick={onDelete}
            className="ml-auto shrink-0 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        <RatingPicker
          label="Parties prenantes"
          value={item.stakeholderScore ?? null}
          onChange={(v) => save(v, item.companyScore ?? null)}
        />
        <RatingPicker
          label="Entreprise"
          value={item.companyScore ?? null}
          onChange={(v) => save(item.stakeholderScore ?? null, v)}
        />
      </div>
    </div>
  );
}

type Props = { orgId: number };

export function TabBibliotheque({ orgId }: Props) {
  const qc = useQueryClient();
  const { data, isLoading } = useGetIssues(orgId, {
    query: { queryKey: [`/api/organizations/${orgId}/issues`] },
  });
  const { mutate: createCustom } = useCreateCustomIssue();
  const { mutate: deleteCustom } = useDeleteCustomIssue();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const items = data?.items ?? [];
  const ratedCount = items.filter((i) => i.stakeholderScore != null && i.companyScore != null).length;

  const toggleCat = (cat: string) =>
    setCollapsed((s) => {
      const n = new Set(s);
      n.has(cat) ? n.delete(cat) : n.add(cat);
      return n;
    });

  const filtered = search.trim()
    ? items.filter((i) => i.label.toLowerCase().includes(search.toLowerCase()))
    : items;

  const grouped = ISSUE_CATEGORIES_ORDER.map((cat) => {
    const catItems =
      cat === "Personnalisés"
        ? filtered.filter((i) => i.isCustom)
        : filtered.filter((i) => i.category === cat && !i.isCustom);
    return { cat, items: catItems };
  }).filter((g) => g.items.length > 0);

  function handleAddCustom() {
    if (!newLabel.trim() || !newCategory) return;
    createCustom(
      { orgId, data: { category: newCategory, label: newLabel.trim() } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: [`/api/organizations/${orgId}/issues`] });
          setNewLabel("");
          setNewCategory("");
          setAddOpen(false);
        },
        onError: () => toast({ variant: "destructive", title: "Erreur lors de l'ajout." }),
      },
    );
  }

  function handleDelete(item: IssueRatedItem) {
    if (!item.customId) return;
    deleteCustom(
      { orgId, issueId: item.customId },
      {
        onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/organizations/${orgId}/issues`] }),
        onError: () => toast({ variant: "destructive", title: "Erreur lors de la suppression." }),
      },
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Bibliothèque d'enjeux</h2>
          <p className="text-sm text-muted-foreground">
            {ratedCount} / {items.length} enjeux notés
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Ajouter un enjeu
        </Button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
          style={{ width: items.length ? `${(ratedCount / items.length) * 100}%` : "0%" }}
        />
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Notez l'importance de chaque enjeu de 1 (peu important) à 5 (très important). Les 12 enjeux avec la meilleure moyenne seront analysés par l'IA.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un enjeu…"
          className="pl-9 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Groups */}
      <div className="space-y-2">
        {grouped.map(({ cat, items: catItems }) => {
          const color = CATEGORY_COLORS[cat] ?? "#94a3b8";
          const isCollapsed = collapsed.has(cat);
          const ratedInCat = catItems.filter((i) => i.stakeholderScore != null && i.companyScore != null).length;
          return (
            <div key={cat} className="rounded-lg border border-border overflow-hidden">
              <button
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-muted/20 transition-colors"
                style={{ backgroundColor: color + "12" }}
                onClick={() => toggleCat(cat)}
              >
                <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-sm font-semibold text-foreground flex-1">{cat}</span>
                <span className="text-xs text-muted-foreground">
                  {ratedInCat}/{catItems.length}
                </span>
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {!isCollapsed && (
                <div>
                  {catItems.map((item) => (
                    <IssueRow
                      key={item.key}
                      item={item}
                      orgId={orgId}
                      onDelete={item.isCustom ? () => handleDelete(item) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add custom issue dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ajouter un enjeu personnalisé</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Thématique</label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une thématique…" />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_CATEGORIES_ORDER.filter((c) => c !== "Personnalisés").map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Libellé de l'enjeu</label>
              <Input
                placeholder="Ex : Bien-être animal dans la chaîne d'approvisionnement"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Annuler</Button>
            <Button onClick={handleAddCustom} disabled={!newLabel.trim() || !newCategory}>
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
