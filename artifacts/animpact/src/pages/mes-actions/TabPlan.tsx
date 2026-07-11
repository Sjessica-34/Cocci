import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  useListActionPlan,
  useAddActionToPlan,
  useUpdateActionPlanItem,
  useDeleteActionPlanItem,
  getListActionPlanQueryKey,
} from "@workspace/api-client-react";
import {
  Loader2, Plus, Trash2, ChevronDown, ChevronUp, Check, Zap, Wrench, Anchor, Calendar, MessageSquare, Link as LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  orgId: number;
}

const LEVEL_META: Record<string, { label: string; icon: typeof Zap; bg: string }> = {
  quick: { label: "Rapide", icon: Zap, bg: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  project: { label: "Projet", icon: Wrench, bg: "bg-amber-50 border-amber-200 text-amber-700" },
  engagement: { label: "Engagement", icon: Anchor, bg: "bg-violet-50 border-violet-200 text-violet-700" },
};

const CATEGORY_COLOR: Record<string, string> = {
  "Environnement": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Numérique responsable": "bg-sky-100 text-sky-800 border-sky-200",
  "Biodiversité": "bg-lime-100 text-lime-800 border-lime-200",
  "Social": "bg-blue-100 text-blue-800 border-blue-200",
  "Achats responsables": "bg-orange-100 text-orange-800 border-orange-200",
  "Gouvernance": "bg-purple-100 text-purple-800 border-purple-200",
};

const CATEGORY_EMOJI: Record<string, string> = {
  "Environnement": "🌍",
  "Numérique responsable": "💻",
  "Biodiversité": "🌿",
  "Social": "👥",
  "Achats responsables": "🤝",
  "Gouvernance": "⚖️",
};

function ActionRow({ item, orgId }: { item: any; orgId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState(item.comment ?? "");
  const [justificationUrl, setJustificationUrl] = useState(item.justificationUrl ?? "");
  const [completedAt, setCompletedAt] = useState(
    item.completedAt ? new Date(item.completedAt).toISOString().slice(0, 10) : "",
  );
  const [saving, setSaving] = useState(false);

  const { mutateAsync: updateItem } = useUpdateActionPlanItem();
  const { mutateAsync: deleteItem, isPending: deleting } = useDeleteActionPlanItem();

  const name = item.actionName ?? item.customName ?? "Action manuelle";
  const category = item.actionCategory ?? null;
  const level = item.actionLevel ?? null;
  const levelMeta = level ? LEVEL_META[level] : null;
  const LevelIcon = levelMeta?.icon ?? Zap;

  async function handleToggle() {
    const newChecked = !item.isChecked;
    try {
      await updateItem({
        orgId,
        actionId: item.id,
        data: {
          isChecked: newChecked,
          completedAt: newChecked ? new Date().toISOString() : null,
        },
      });
      qc.invalidateQueries({ queryKey: getListActionPlanQueryKey(orgId) });
      if (newChecked) setExpanded(true);
    } catch {
      toast({ title: "Erreur", description: "Impossible de mettre à jour.", variant: "destructive" });
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateItem({
        orgId,
        actionId: item.id,
        data: {
          comment: comment || null,
          justificationUrl: justificationUrl || null,
          completedAt: completedAt ? new Date(completedAt).toISOString() : item.isChecked ? new Date().toISOString() : null,
        },
      });
      qc.invalidateQueries({ queryKey: getListActionPlanQueryKey(orgId) });
      toast({ title: "Enregistré" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await deleteItem({ orgId, actionId: item.id });
      qc.invalidateQueries({ queryKey: getListActionPlanQueryKey(orgId) });
      toast({ title: "Action retirée du plan" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer.", variant: "destructive" });
    }
  }

  return (
    <div className={cn("rounded-lg border bg-card transition-colors", item.isChecked && "opacity-70")}>
      <div className="flex items-start gap-3 p-3">
        {/* Checkbox */}
        <button
          onClick={handleToggle}
          className={cn(
            "mt-0.5 h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors",
            item.isChecked
              ? "bg-primary border-primary text-primary-foreground"
              : "border-muted-foreground/40 hover:border-primary",
          )}
          aria-label={item.isChecked ? "Décocher" : "Cocher"}
        >
          {item.isChecked && <Check className="h-3 w-3" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium", item.isChecked && "line-through text-muted-foreground")}>
            {name}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
            {category && (
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLOR[category] ?? ""}`}>
                {CATEGORY_EMOJI[category]} {item.actionSubcategory ?? category}
              </Badge>
            )}
            {!item.actionCategory && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-700 border-slate-200">
                Action manuelle
              </Badge>
            )}
            {levelMeta && (
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${levelMeta.bg} flex items-center gap-0.5`}>
                <LevelIcon className="h-2.5 w-2.5" />
                {levelMeta.label}
              </Badge>
            )}
            {item.isChecked && item.completedAt && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Calendar className="h-2.5 w-2.5" />
                {new Date(item.completedAt).toLocaleDateString("fr-FR")}
              </span>
            )}
            {item.comment && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <MessageSquare className="h-2.5 w-2.5" />
                Commentaire
              </span>
            )}
            {item.justificationUrl && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <LinkIcon className="h-2.5 w-2.5" />
                Justificatif
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label={expanded ? "Replier" : "Détails"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                aria-label="Supprimer"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Retirer cette action ?</AlertDialogTitle>
                <AlertDialogDescription>
                  L'action sera retirée du plan. Cette opération ne supprime pas l'action de la bibliothèque.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                  Retirer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t px-3 pb-3 pt-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Date de réalisation
              </label>
              <Input
                type="date"
                value={completedAt}
                onChange={(e) => setCompletedAt(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                Lien justificatif (URL)
              </label>
              <Input
                type="url"
                placeholder="https://…"
                value={justificationUrl}
                onChange={(e) => setJustificationUrl(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              Commentaire
            </label>
            <Textarea
              placeholder="Notes sur la réalisation de cette action…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="text-sm resize-none"
            />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={saving} className="h-7 text-xs gap-1">
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddManualAction({ orgId }: { orgId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const { mutateAsync: addToPlan, isPending } = useAddActionToPlan();

  async function handleAdd() {
    if (!name.trim()) return;
    try {
      await addToPlan({
        orgId,
        data: { customName: name.trim(), source: "manual" },
      });
      qc.invalidateQueries({ queryKey: getListActionPlanQueryKey(orgId) });
      toast({ title: "Action ajoutée" });
      setName("");
      setOpen(false);
    } catch {
      toast({ title: "Erreur", description: "Impossible d'ajouter l'action.", variant: "destructive" });
    }
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-xs h-8"
      >
        <Plus className="h-3.5 w-3.5" />
        Ajouter une action manuelle
      </Button>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <p className="text-xs font-medium">Nouvelle action manuelle</p>
      <div className="flex gap-2">
        <Input
          autoFocus
          placeholder="Nom de l'action…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setOpen(false); }}
          className="h-8 text-sm flex-1"
        />
        <Button size="sm" onClick={handleAdd} disabled={isPending || !name.trim()} className="h-8 px-3 text-xs gap-1">
          {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
          Ajouter
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="h-8 px-3 text-xs">
          Annuler
        </Button>
      </div>
    </div>
  );
}

export function TabPlan({ orgId }: Props) {
  const { data: planItems = [], isLoading } = useListActionPlan(orgId);

  const items = planItems as any[];
  const checked = items.filter((i) => i.isChecked);
  const unchecked = items.filter((i) => !i.isChecked);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      {/* Stats */}
      {items.length > 0 && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{checked.length}</span> / {items.length} réalisée{checked.length !== 1 ? "s" : ""}
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: items.length ? `${(checked.length / items.length) * 100}%` : "0%" }}
            />
          </div>
          <span className="text-muted-foreground text-xs">
            {items.length ? Math.round((checked.length / items.length) * 100) : 0} %
          </span>
        </div>
      )}

      {/* Bouton ajouter action manuelle */}
      <AddManualAction orgId={orgId} />

      {items.length === 0 ? (
        <div className="text-center py-16 space-y-2 text-muted-foreground">
          <p className="text-sm">Votre plan d'actions est vide.</p>
          <p className="text-xs">Parcourez la <strong>Bibliothèque d'actions</strong> pour ajouter des actions à votre plan.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Actions à faire */}
          {unchecked.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                À réaliser ({unchecked.length})
              </h3>
              {unchecked.map((item) => (
                <ActionRow key={item.id} item={item} orgId={orgId} />
              ))}
            </div>
          )}

          {/* Actions réalisées */}
          {checked.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Réalisées ({checked.length})
              </h3>
              {checked.map((item) => (
                <ActionRow key={item.id} item={item} orgId={orgId} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
