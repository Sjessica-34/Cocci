import { useState, useRef } from "react";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  useListActionPlan,
  useUpdateActionPlanItem,
  useDeleteActionPlanItem,
  getListActionPlanQueryKey,
} from "@workspace/api-client-react";
import {
  Calendar, MessageSquare, Paperclip, FileText, Download,
  Upload, Loader2, Trash2, ChevronDown, ChevronUp, CheckCircle2,
} from "lucide-react";

interface Props {
  orgId: number;
}

const CATEGORY_COLOR: Record<string, string> = {
  "Environnement":          "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Numérique responsable":  "bg-sky-100 text-sky-800 border-sky-200",
  "Biodiversité":           "bg-lime-100 text-lime-800 border-lime-200",
  "Social":                 "bg-blue-100 text-blue-800 border-blue-200",
  "Achats responsables":    "bg-orange-100 text-orange-800 border-orange-200",
  "Gouvernance":            "bg-purple-100 text-purple-800 border-purple-200",
};

const CATEGORY_EMOJI: Record<string, string> = {
  "Environnement": "🌍", "Numérique responsable": "💻", "Biodiversité": "🌿",
  "Social": "👥", "Achats responsables": "🤝", "Gouvernance": "⚖️",
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function toInputDate(iso: string | null | undefined): string {
  if (!iso) return new Date().toISOString().slice(0, 10);
  return iso.slice(0, 10);
}

interface PlanItemRowProps {
  item: any;
  orgId: number;
}

function PlanItemRow({ item, orgId }: PlanItemRowProps) {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  const { mutateAsync: updateItem } = useUpdateActionPlanItem();
  const { mutateAsync: deleteItem } = useDeleteActionPlanItem();

  const [completedAt, setCompletedAt] = useState(toInputDate(item.completedAt));
  const [comment, setComment] = useState(item.comment ?? "");
  const [justificationUrl, setJustificationUrl] = useState(item.justificationUrl ?? "");
  const [justificationName, setJustificationName] = useState<string | null>(
    item.justificationUrl
      ? decodeURIComponent(item.justificationUrl.split("/").pop() ?? "Justificatif")
      : null,
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [removing, setRemoving] = useState(false);

  const actionName = item.actionName ?? item.customName ?? "Action personnalisée";
  const category = item.actionCategory;

  async function handleSave() {
    setSaving(true);
    try {
      await updateItem({
        orgId,
        actionId: item.id,
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

  async function handleRemove() {
    setRemoving(true);
    try {
      await deleteItem({ orgId, actionId: item.id });
      qc.invalidateQueries({ queryKey: getListActionPlanQueryKey(orgId) });
      toast({ title: "Action retirée du plan" });
    } catch {
      toast({ title: "Erreur", description: "Impossible de retirer l'action.", variant: "destructive" });
      setRemoving(false);
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
        actionId: item.id,
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
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Header row */}
      <div className="flex items-start gap-3 p-4">
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{actionName}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {category && (
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLOR[category] ?? ""}`}>
                {CATEGORY_EMOJI[category]} {item.actionSubcategory ?? category}
              </Badge>
            )}
            <span className="text-xs text-emerald-700 font-medium">
              📅 {formatDate(item.completedAt)}
            </span>
            {item.comment && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                📝 {item.comment}
              </span>
            )}
            {justificationUrl && (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <Paperclip className="h-3 w-3" /> Justificatif
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-muted-foreground hover:text-foreground shrink-0"
          title={open ? "Masquer" : "Modifier"}
        >
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Edit form */}
      {open && (
        <div className="border-t bg-muted/20 px-4 py-4 space-y-3">
          {/* Date */}
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <label className="text-xs text-muted-foreground w-40 shrink-0">Date de réalisation</label>
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
            <label className="text-xs text-muted-foreground w-40 shrink-0 mt-1.5">Commentaire / Résultat</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={`"Tous les gobelets ont été remplacés."\n"Formation réalisée pour 12 collaborateurs."`}
              className="min-h-[56px] text-xs resize-none flex-1"
              rows={2}
            />
          </div>

          {/* Justificatif */}
          <div className="flex items-center gap-2">
            <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <label className="text-xs text-muted-foreground w-40 shrink-0">Justificatif</label>
            <div className="flex items-center gap-2 flex-1 flex-wrap">
              {justificationUrl && justificationName && (
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[180px]">{justificationName}</span>
                  <Download className="h-3 w-3 shrink-0" />
                </button>
              )}
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
              <span className="text-[10px] text-muted-foreground">photo, facture, PDF… (max 10 Mo)</span>
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

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 gap-1.5"
              onClick={handleRemove}
              disabled={removing}
            >
              {removing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              Retirer du plan
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              {saved ? "✓ Enregistré" : "Enregistrer"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TabMonPlan({ orgId }: Props) {
  const { data: planItems = [], isLoading } = useListActionPlan(orgId);

  const checkedItems = (planItems as any[]).filter((p) => p.isChecked);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (checkedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
        <CheckCircle2 className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm font-medium text-muted-foreground">Aucune action réalisée pour l'instant.</p>
        <p className="text-xs text-muted-foreground max-w-sm">
          Rendez-vous dans l'onglet <strong>Mes actions</strong> pour cocher vos premières réalisations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{checkedItems.length}</span>{" "}
          action{checkedItems.length !== 1 ? "s" : ""} réalisée{checkedItems.length !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="space-y-2">
        {checkedItems.map((item: any) => (
          <PlanItemRow key={item.id} item={item} orgId={orgId} />
        ))}
      </div>
    </div>
  );
}
