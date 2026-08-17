import { useState, useRef } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  useListPlanSlots,
  useInitializePlanSlots,
  useUpdatePlanSlot,
  useAddActionToPlan,
  getListPlanSlotsQueryKey,
  getListActionPlanQueryKey,
  customFetch,
} from "@workspace/api-client-react";
import type { PlanSlot } from "@workspace/api-client-react";
import { useAuth } from "@clerk/react";
import {
  Loader2,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Calendar,
  MessageSquare,
  RefreshCw,
  Upload,
  Paperclip,
  FileText,
  Download,
  Plus,
  Lightbulb,
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
  const { getToken } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState(slot.comment ?? "");
  const [justificationUrl, setJustificationUrl] = useState(slot.justificationUrl ?? "");
  const [justificationName, setJustificationName] = useState<string | null>(() => {
    if (!slot.justificationUrl) return null;
    const seg = decodeURIComponent(slot.justificationUrl.split("/").pop() ?? "");
    return seg || null;
  });
  const [completedAt, setCompletedAt] = useState(
    slot.completedAt ? new Date(slot.completedAt).toISOString().slice(0, 10) : "",
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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
      await updateSlot({
        orgId,
        slotId: slot.id,
        data: { justificationUrl: url },
      });
      await qc.invalidateQueries({ queryKey: getListPlanSlotsQueryKey(orgId) });
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
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = justificationName ?? "justificatif";
    a.click();
    URL.revokeObjectURL(blobUrl);
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
                <Paperclip className="h-2.5 w-2.5" />
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
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                Justificatif
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {justificationUrl && justificationName ? (
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span className="truncate max-w-[180px]">{justificationName}</span>
                    <Download className="h-3 w-3 shrink-0" />
                  </button>
                ) : justificationUrl ? (
                  <a
                    href={justificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline truncate max-w-[180px]"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0" />
                    Lien externe
                  </a>
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
                <span className="text-[10px] text-muted-foreground">photo, PDF, attestation… (max 10 Mo)</span>
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

// ─── Section Suggestions automatiques ────────────────────────────────────────

type Suggestion = {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  esgPillar: string;
  level: string;
  relevanceReason: string;
};

const PILLAR_LABEL: Record<string, string> = { E: "Environnement", S: "Social", G: "Gouvernance" };
const PILLAR_COLOR: Record<string, string> = {
  E: "bg-emerald-100 text-emerald-800 border-emerald-200",
  S: "bg-blue-100 text-blue-800 border-blue-200",
  G: "bg-purple-100 text-purple-800 border-purple-200",
};

function SuggestionsSection({ orgId }: { orgId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [adding, setAdding] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const { mutateAsync: addAction } = useAddActionToPlan();

  const { data: suggestions, isLoading } = useQuery<Suggestion[]>({
    queryKey: ["action-suggestions", orgId],
    queryFn: () => customFetch(`/api/organizations/${orgId}/actions/suggestions`),
    staleTime: 5 * 60 * 1000,
  });

  const visible = (suggestions ?? []).filter(s => !dismissed.has(s.id));

  async function handleAdd(s: Suggestion) {
    setAdding(s.id);
    try {
      await addAction({ orgId, data: { libraryActionId: s.id, source: "suggestion" } });
      setDismissed(prev => new Set([...prev, s.id]));
      await qc.invalidateQueries({ queryKey: getListActionPlanQueryKey(orgId) });
      toast({ title: "Action ajoutée au plan" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("409") || msg.includes("already")) {
        setDismissed(prev => new Set([...prev, s.id]));
        toast({ title: "Action déjà dans le plan" });
      } else {
        toast({ title: "Erreur", description: "Impossible d'ajouter l'action.", variant: "destructive" });
      }
    } finally {
      setAdding(null);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-4 w-40 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!visible.length) return null;

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Actions suggérées selon votre diagnostic ({visible.length})
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visible.map(s => (
          <div
            key={s.id}
            className="flex flex-col gap-2 rounded-lg border border-amber-100 bg-amber-50/60 p-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium leading-snug line-clamp-2">{s.name}</p>
              {s.description && (
                <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-1">{s.description}</p>
              )}
              <div className="flex flex-wrap gap-1 mt-1.5">
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${PILLAR_COLOR[s.esgPillar] ?? ""}`}>
                  {PILLAR_LABEL[s.esgPillar] ?? s.esgPillar}
                </Badge>
                {s.subcategory && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/60">
                    {s.subcategory}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] gap-1 self-end border-amber-200 hover:bg-amber-100"
              onClick={() => handleAdd(s)}
              disabled={adding === s.id}
            >
              {adding === s.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Plus className="h-2.5 w-2.5" />}
              Ajouter au plan
            </Button>
          </div>
        ))}
      </div>
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

        <SuggestionsSection orgId={orgId} />

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
