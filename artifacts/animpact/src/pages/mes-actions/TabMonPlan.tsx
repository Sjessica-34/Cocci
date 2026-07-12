import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  useListPlanSlots,
  useInitializePlanSlots,
  useUpdatePlanSlot,
  getListPlanSlotsQueryKey,
} from "@workspace/api-client-react";
import type { PlanSlot } from "@workspace/api-client-react";
import {
  Loader2,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Calendar,
  MessageSquare,
  Link as LinkIcon,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  orgId: number;
}

const CATEGORY_COLOR: Record<string, string> = {
  Environnement: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Numérique responsable": "bg-sky-100 text-sky-800 border-sky-200",
  Biodiversité: "bg-lime-100 text-lime-800 border-lime-200",
  Social: "bg-blue-100 text-blue-800 border-blue-200",
  "Achats responsables": "bg-orange-100 text-orange-800 border-orange-200",
  Gouvernance: "bg-purple-100 text-purple-800 border-purple-200",
};

const CATEGORY_EMOJI: Record<string, string> = {
  Environnement: "🌍",
  "Numérique responsable": "💻",
  Biodiversité: "🌿",
  Social: "👥",
  "Achats responsables": "🤝",
  Gouvernance: "⚖️",
};

const LEVEL_LABEL: Record<string, string> = {
  quick: "Rapide",
  project: "Projet",
  engagement: "Engagement",
};

function SlotRow({ slot, orgId }: { slot: PlanSlot; orgId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState(slot.comment ?? "");
  const [justificationUrl, setJustificationUrl] = useState(slot.justificationUrl ?? "");
  const [completedAt, setCompletedAt] = useState(
    slot.completedAt ? new Date(slot.completedAt).toISOString().slice(0, 10) : "",
  );
  const [saving, setSaving] = useState(false);

  const { mutateAsync: updateSlot } = useUpdatePlanSlot();

  const name = slot.actionName ?? `Slot ${slot.slotOrder}`;
  const category = slot.actionCategory ?? null;
  const level = slot.actionLevel ?? null;

  async function handleToggle() {
    const newDone = !slot.isDone;
    try {
      await updateSlot({
        orgId,
        slotId: slot.id,
        data: {
          isDone: newDone,
          completedAt: newDone ? new Date().toISOString() : null,
        },
      });
      await qc.invalidateQueries({ queryKey: getListPlanSlotsQueryKey(orgId) });
      if (newDone) setExpanded(true);
    } catch {
      toast({ title: "Erreur", description: "Impossible de mettre à jour.", variant: "destructive" });
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateSlot({
        orgId,
        slotId: slot.id,
        data: {
          comment: comment || null,
          justificationUrl: justificationUrl || null,
          completedAt: completedAt
            ? new Date(completedAt).toISOString()
            : slot.isDone
              ? new Date().toISOString()
              : null,
        },
      });
      await qc.invalidateQueries({ queryKey: getListPlanSlotsQueryKey(orgId) });
      toast({ title: "Enregistré" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cn("rounded-lg border bg-card transition-colors", slot.isDone && "opacity-70")}>
      <div className="flex items-start gap-3 p-3">
        <button
          onClick={handleToggle}
          className={cn(
            "mt-0.5 h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors",
            slot.isDone
              ? "bg-primary border-primary text-primary-foreground"
              : "border-muted-foreground/40 hover:border-primary",
          )}
          aria-label={slot.isDone ? "Décocher" : "Cocher"}
        >
          {slot.isDone && <Check className="h-3 w-3" />}
        </button>

        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium leading-snug", slot.isDone && "line-through text-muted-foreground")}>
            {name}
          </p>
          {slot.actionDescription && !slot.isDone && (
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {slot.actionDescription}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
            {category && (
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLOR[category] ?? ""}`}
              >
                {CATEGORY_EMOJI[category]} {slot.actionSubcategory ?? category}
              </Badge>
            )}
            {level && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-700 border-slate-200">
                {LEVEL_LABEL[level] ?? level}
              </Badge>
            )}
            {slot.isDone && slot.completedAt && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Calendar className="h-2.5 w-2.5" />
                {new Date(slot.completedAt).toLocaleDateString("fr-FR")}
              </span>
            )}
            {slot.comment && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <MessageSquare className="h-2.5 w-2.5" />
                Commentaire
              </span>
            )}
            {slot.justificationUrl && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <LinkIcon className="h-2.5 w-2.5" />
                Justificatif
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
          aria-label={expanded ? "Replier" : "Détails"}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

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

export function TabMonPlan({ orgId }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: slots, isLoading } = useListPlanSlots(orgId);
  const { mutateAsync: initSlots, isPending: initializing } = useInitializePlanSlots();

  const allSlots = slots ?? [];
  const activeSlots = allSlots.filter((s) => !s.isDone);
  const doneSlots = allSlots.filter((s) => s.isDone);
  const doneCount = doneSlots.length;
  const totalCount = allSlots.length;

  const nextBatchAt = doneCount === 0 ? 5 : Math.ceil(doneCount / 5) * 5;
  const remaining = nextBatchAt - doneCount;

  async function handleInitialize() {
    try {
      await initSlots({ orgId });
      await qc.invalidateQueries({ queryKey: getListPlanSlotsQueryKey(orgId) });
      toast({ title: "Plan initialisé", description: "15 actions RSE ont été sélectionnées pour votre exercice." });
    } catch {
      toast({ title: "Erreur", description: "Impossible d'initialiser le plan.", variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (allSlots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold">Votre plan n'est pas encore initialisé</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Cocci va sélectionner 15 actions RSE équilibrées sur 6 catégories pour lancer votre démarche.
          </p>
        </div>
        <Button onClick={handleInitialize} disabled={initializing} className="gap-2">
          {initializing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Initialiser mon plan
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-4 text-sm flex-1">
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{doneCount}</span> / {totalCount} réalisée
            {doneCount !== 1 ? "s" : ""}
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: totalCount ? `${(doneCount / totalCount) * 100}%` : "0%" }}
            />
          </div>
          <span className="text-muted-foreground text-xs">
            {totalCount ? Math.round((doneCount / totalCount) * 100) : 0} %
          </span>
        </div>
      </div>

      {doneCount > 0 && remaining < 5 && (
        <div className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm">
          <RefreshCw className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-amber-800">
            Plus que{" "}
            <strong>
              {remaining} action{remaining !== 1 ? "s" : ""}
            </strong>{" "}
            à réaliser pour débloquer 5 nouvelles actions.
          </span>
        </div>
      )}

      <div className="space-y-6">
        {activeSlots.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              À réaliser ({activeSlots.length})
            </h3>
            {activeSlots.map((slot) => (
              <SlotRow key={slot.id} slot={slot} orgId={orgId} />
            ))}
          </div>
        )}

        {doneSlots.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Réalisées ({doneSlots.length})
            </h3>
            {doneSlots.map((slot) => (
              <SlotRow key={slot.id} slot={slot} orgId={orgId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
