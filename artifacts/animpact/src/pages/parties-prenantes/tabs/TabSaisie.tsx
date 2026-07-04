import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDeleteStakeholder, getListStakeholdersQueryKey } from "@workspace/api-client-react";
import type { Stakeholder } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, Users2 } from "lucide-react";
import { StakeholderForm } from "../components/StakeholderForm";
import { RatingBar } from "../components/RatingBar";
import {
  STAKEHOLDER_CATEGORIES,
  CATEGORY_COLORS,
  getCategoryByKey,
  getQuadrant,
  getQuadrantColor,
} from "../constants";
import { cn } from "@/lib/utils";

type Props = {
  orgId: number;
  stakeholders: Stakeholder[];
};

function CategoryBadge({ categoryKey }: { categoryKey: string }) {
  const cat = getCategoryByKey(categoryKey);
  const color = CATEGORY_COLORS[categoryKey] ?? "#94a3b8";
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-xs text-muted-foreground truncate max-w-[120px]">
        {cat ? `${cat.icon} ${cat.label}` : categoryKey}
      </span>
    </div>
  );
}

export function TabSaisie({ orgId, stakeholders }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Stakeholder | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Stakeholder | undefined>(undefined);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const deleteMutation = useDeleteStakeholder();

  const filtered = stakeholders.filter((s) => {
    const matchSearch =
      search === "" ||
      (s.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.subcategory ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "all" || s.category === filterCategory;
    return matchSearch && matchCat;
  });

  function openCreate() {
    setEditTarget(undefined);
    setFormOpen(true);
  }

  function openEdit(s: Stakeholder) {
    setEditTarget(s);
    setFormOpen(true);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(
      { orgId, id: deleteTarget.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStakeholdersQueryKey(orgId) });
          toast({ title: "Partie prenante supprimée." });
          setDeleteTarget(undefined);
        },
        onError: () => {
          toast({ variant: "destructive", title: "Erreur lors de la suppression." });
        },
      },
    );
  }

  const activeCategories = STAKEHOLDER_CATEGORIES.filter((c) =>
    stakeholders.some((s) => s.category === c.key),
  );

  const grouped = STAKEHOLDER_CATEGORIES
    .filter((cat) => filtered.some((s) => s.category === cat.key))
    .map((cat) => ({
      cat,
      color: CATEGORY_COLORS[cat.key] ?? "#94a3b8",
      items: filtered.filter((s) => s.category === cat.key),
    }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {stakeholders.length === 0
              ? "Aucune partie prenante"
              : `${stakeholders.length} partie${stakeholders.length > 1 ? "s" : ""} prenante${stakeholders.length > 1 ? "s" : ""}`}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Identifiez et évaluez les acteurs clés de votre écosystème.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter
        </Button>
      </div>

      {stakeholders.length > 0 && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <Button
                variant={filterCategory === "all" ? "default" : "outline"}
                size="sm"
                className="h-9 text-xs"
                onClick={() => setFilterCategory("all")}
              >
                Tous
              </Button>
              {activeCategories.map((cat) => (
                <Button
                  key={cat.key}
                  variant={filterCategory === cat.key ? "default" : "outline"}
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => setFilterCategory(cat.key)}
                >
                  {cat.icon} {cat.label.split(" ")[0]}
                </Button>
              ))}
            </div>
          </div>

          {/* Grouped list */}
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              Aucun résultat pour cette recherche.
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(({ cat, color, items }) => (
                <div key={cat.key} className="rounded-lg border border-border overflow-hidden">
                  {/* Category header */}
                  <div
                    className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border"
                    style={{ backgroundColor: color + "18" }}
                  >
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-sm font-semibold text-foreground">
                      {cat.icon} {cat.label}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground font-medium">
                      {items.length}
                    </span>
                  </div>

                  {/* Rows */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/20 border-b border-border">
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                          Partie prenante
                        </th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                          Influence
                        </th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                          Intérêt
                        </th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden lg:table-cell">
                          Positionnement
                        </th>
                        <th className="px-4 py-2 w-20" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {items.map((s) => {
                        const quadrant = getQuadrant(s.influence, s.interest);
                        const quadrantColor = getQuadrantColor(s.influence, s.interest);
                        return (
                          <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="h-7 w-7 rounded flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                                  style={{ backgroundColor: color }}
                                >
                                  {((s.subcategory ?? s.category)[0] ?? "?").toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-foreground leading-tight">
                                    {s.subcategory ?? <span className="italic text-muted-foreground text-xs">—</span>}
                                  </p>
                                  {s.name && (
                                    <p className="text-xs text-muted-foreground">{s.name}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <RatingBar value={s.influence} size="sm" />
                            </td>
                            <td className="px-4 py-3">
                              <RatingBar value={s.interest} size="sm" />
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell">
                              <span
                                className={cn(
                                  "inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border font-medium",
                                  quadrantColor,
                                )}
                              >
                                {quadrant}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => openEdit(s)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteTarget(s)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {stakeholders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-xl">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Users2 className="h-7 w-7 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Commencez par ajouter vos parties prenantes</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-sm">
            Identifiez les acteurs clés de votre écosystème — internes, clients, partenaires, institutions…
          </p>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une partie prenante
          </Button>
        </div>
      )}

      {/* Form dialog */}
      <StakeholderForm
        orgId={orgId}
        stakeholder={editTarget}
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette partie prenante ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.subcategory ?? deleteTarget?.name ?? "Cette partie prenante"}</strong> sera définitivement supprimée. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
