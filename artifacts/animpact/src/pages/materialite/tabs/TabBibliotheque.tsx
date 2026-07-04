import { useState, useCallback } from "react";
import type { IssueRatedItem, IssueRatingInputTendance } from "@workspace/api-client-react";
import {
  useGetIssues,
  useUpsertIssueRating,
  useCreateCustomIssue,
  useDeleteCustomIssue,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Search, Info } from "lucide-react";
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
];

function computePriorite(item: IssueRatedItem): { label: string; color: string } | null {
  const scores = [item.stakeholderScore, item.companyScore, item.impactScore].filter(
    (s): s is number => s != null,
  );
  if (scores.length === 0) return null;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg >= 4) return { label: "Critique", color: "text-red-600 bg-red-50 border-red-200" };
  if (avg >= 3) return { label: "Majeur", color: "text-amber-600 bg-amber-50 border-amber-200" };
  return { label: "Modéré", color: "text-emerald-600 bg-emerald-50 border-emerald-200" };
}

function ScorePicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(value === n ? null : n)}
          className={cn(
            "h-7 w-7 rounded text-xs font-bold border transition-all",
            value != null && n <= value
              ? "bg-slate-800 text-white border-slate-800"
              : "bg-slate-100 text-slate-400 border-slate-200 hover:border-slate-400 hover:text-slate-600",
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

const TENDANCE_OPTS: { v: IssueRatingInputTendance & string; label: string; active: string }[] = [
  { v: "+", label: "+", active: "bg-emerald-100 text-emerald-700 border-emerald-300 font-bold" },
  { v: "=", label: "=", active: "bg-blue-100 text-blue-700 border-blue-300 font-bold" },
  { v: "-", label: "−", active: "bg-red-100 text-red-700 border-red-300 font-bold" },
];

function TendancePicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: IssueRatingInputTendance) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {TENDANCE_OPTS.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(value === o.v ? null : o.v)}
          className={cn(
            "h-7 w-8 rounded text-xs border transition-all",
            value === o.v ? o.active : "bg-slate-100 text-slate-400 border-slate-200 hover:border-slate-400 hover:text-slate-600",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

type IssueRowProps = {
  index: number;
  item: IssueRatedItem;
  orgId: number;
  onDelete?: () => void;
};

function IssueRow({ index, item, orgId, onDelete }: IssueRowProps) {
  const qc = useQueryClient();
  const { mutate: upsert } = useUpsertIssueRating();

  const save = useCallback(
    (patch: Partial<{
      stakeholderScore: number | null;
      companyScore: number | null;
      impactScore: number | null;
      tendance: IssueRatingInputTendance;
    }>) => {
      upsert(
        {
          orgId,
          data: {
            issueKey: item.key,
            stakeholderScore: item.stakeholderScore ?? null,
            companyScore: item.companyScore ?? null,
            impactScore: item.impactScore ?? null,
            tendance: (item.tendance ?? null) as IssueRatingInputTendance,
            ...patch,
          },
        },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: [`/api/organizations/${orgId}/issues`] });
          },
        },
      );
    },
    [upsert, orgId, item, qc],
  );

  const priorite = computePriorite(item);

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors group">
      <td className="pl-4 pr-2 py-3 text-xs text-slate-400 font-medium w-8 select-none">{index}</td>
      <td className="px-3 py-3 min-w-[180px]">
        <span className="text-sm text-slate-800 font-medium leading-snug">{item.label}</span>
        {item.isCustom && (
          <span className="ml-1.5 text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
            Personnalisé
          </span>
        )}
        <p className="text-[10px] text-slate-400 mt-0.5">{item.category}</p>
      </td>
      <td className="px-3 py-3">
        <ScorePicker
          value={item.stakeholderScore ?? null}
          onChange={(v) => save({ stakeholderScore: v })}
        />
      </td>
      <td className="px-3 py-3">
        <ScorePicker
          value={item.companyScore ?? null}
          onChange={(v) => save({ companyScore: v })}
        />
      </td>
      <td className="px-3 py-3">
        <ScorePicker
          value={item.impactScore ?? null}
          onChange={(v) => save({ impactScore: v })}
        />
      </td>
      <td className="px-3 py-3">
        <TendancePicker
          value={item.tendance ?? null}
          onChange={(v) => save({ tendance: v })}
        />
      </td>
      <td className="px-3 py-3 w-24 text-right">
        {priorite ? (
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold",
              priorite.color,
            )}
          >
            {priorite.label}
          </span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </td>
      <td className="pr-3 py-3 w-8">
        {item.isCustom && onDelete && (
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </td>
    </tr>
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
  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const items = data?.items ?? [];
  const ratedCount = items.filter(
    (i) => i.stakeholderScore != null || i.companyScore != null || i.impactScore != null,
  ).length;

  const filtered = search.trim()
    ? items.filter(
        (i) =>
          i.label.toLowerCase().includes(search.toLowerCase()) ||
          i.category.toLowerCase().includes(search.toLowerCase()),
      )
    : items;

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
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Évaluation des enjeux — {filtered.length} entrées
          </h2>
          <p className="text-sm text-muted-foreground">{ratedCount} enjeux avec au moins une note</p>
        </div>
        <Button onClick={() => setAddOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Ajouter un enjeu
        </Button>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
        <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          Notez chaque enjeu de 1 à 5 sur trois axes : importance pour vos <strong>parties prenantes</strong>, pour votre <strong>entreprise</strong>, et l'<strong>impact</strong> potentiel. La <strong>tendance</strong> (+/=/−) indique si l'enjeu progresse, est stable ou se dégrade.
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

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="pl-4 pr-2 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-widest w-8">#</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Enjeu</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-widest whitespace-nowrap">Parties prenantes</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Entreprise</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Impact</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Tendance</th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Priorité</th>
                <th className="pr-3 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-50">
              {filtered.map((item, i) => (
                <IssueRow
                  key={item.key}
                  index={i + 1}
                  item={item}
                  orgId={orgId}
                  onDelete={item.isCustom ? () => handleDelete(item) : undefined}
                />
              ))}
            </tbody>
          </table>
        </div>
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
                  {ISSUE_CATEGORIES_ORDER.map((c) => (
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
