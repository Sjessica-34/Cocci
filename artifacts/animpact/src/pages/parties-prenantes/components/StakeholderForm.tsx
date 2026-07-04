import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateStakeholder,
  useUpdateStakeholder,
  getListStakeholdersQueryKey,
} from "@workspace/api-client-react";
import type { Stakeholder } from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { STAKEHOLDER_CATEGORIES, getCategoryByKey } from "../constants";
import { RatingBarInput } from "./RatingBar";
import { Check, Loader2 } from "lucide-react";

type FormValues = {
  name: string;
  category: string;
  subcategory: string;
  influence: number;
  interest: number;
  description: string;
  notes: string;
};

function defaultValues(s?: Stakeholder): FormValues {
  return {
    name: s?.name ?? "",
    category: s?.category ?? "",
    subcategory: s?.subcategory ?? "",
    influence: s?.influence ?? 3,
    interest: s?.interest ?? 3,
    description: s?.description ?? "",
    notes: s?.notes ?? "",
  };
}

type Props = {
  orgId: number;
  stakeholder?: Stakeholder;
  open: boolean;
  onClose: () => void;
};

export function StakeholderForm({ orgId, stakeholder, open, onClose }: Props) {
  const isEdit = !!stakeholder;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState<FormValues>(defaultValues(stakeholder));
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const createMutation = useCreateStakeholder();
  const updateMutation = useUpdateStakeholder();

  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      setForm(defaultValues(stakeholder));
      setIsDirty(false);
      setSaveStatus("idle");
    }
  }, [open, stakeholder]);

  const subcategories = getCategoryByKey(form.category)?.subcategories ?? [];

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }

  const handleSave = useCallback(
    (values: FormValues = form) => {
      const payload = {
        name: values.name.trim(),
        category: values.category,
        subcategory: values.subcategory || undefined,
        influence: values.influence,
        interest: values.interest,
        description: values.description || undefined,
        notes: values.notes || undefined,
      };

      if (!payload.name || !payload.category) return;

      if (isEdit && stakeholder) {
        setSaveStatus("saving");
        updateMutation.mutate(
          { orgId, id: stakeholder.id, data: payload },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getListStakeholdersQueryKey(orgId) });
              setSaveStatus("saved");
              setTimeout(() => setSaveStatus("idle"), 2000);
            },
            onError: () => {
              setSaveStatus("idle");
              toast({ variant: "destructive", title: "Erreur lors de la sauvegarde." });
            },
          },
        );
      } else {
        createMutation.mutate(
          { orgId, data: payload },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getListStakeholdersQueryKey(orgId) });
              toast({ title: "Partie prenante ajoutée." });
              onClose();
            },
            onError: () => {
              toast({ variant: "destructive", title: "Erreur lors de la création." });
            },
          },
        );
      }
    },
    [form, isEdit, stakeholder, orgId, createMutation, updateMutation, queryClient, onClose, toast],
  );

  // Auto-save on rating change in edit mode
  useEffect(() => {
    if (!isEdit || !isDirty) return;
    const timer = setTimeout(() => {
      handleSave(form);
    }, 1200);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.influence, form.interest, isEdit, isDirty]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.category) {
      toast({ variant: "destructive", title: "Le nom et la catégorie sont obligatoires." });
      return;
    }
    handleSave(form);
    if (!isEdit) return;
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier la partie prenante" : "Ajouter une partie prenante"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-1">
          {/* Nom */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Nom <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="Ex : Comité de direction, Clients PME…"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </div>

          {/* Catégorie + Sous-catégorie */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Catégorie <span className="text-destructive">*</span>
              </label>
              <Select
                value={form.category}
                onValueChange={(v) => {
                  set("category", v);
                  set("subcategory", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir…" />
                </SelectTrigger>
                <SelectContent>
                  {STAKEHOLDER_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.key} value={cat.key}>
                      {cat.icon} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Sous-catégorie</label>
              <Select
                value={form.subcategory}
                onValueChange={(v) => set("subcategory", v)}
                disabled={subcategories.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optionnel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>
                      {getCategoryByKey(form.category)?.label ?? "Catégorie"}
                    </SelectLabel>
                    {subcategories.map((sub) => (
                      <SelectItem key={sub} value={sub}>
                        {sub}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Ratings */}
          <div className="space-y-4 bg-muted/30 rounded-lg p-4">
            <RatingBarInput
              label="Influence / Pouvoir"
              value={form.influence}
              onChange={(v) => set("influence", v)}
            />
            <RatingBarInput
              label="Intérêt pour les enjeux"
              value={form.interest}
              onChange={(v) => set("interest", v)}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Description</label>
            <Textarea
              placeholder="Décrivez brièvement cette partie prenante et son rôle…"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="resize-none h-20"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Notes internes</label>
            <Textarea
              placeholder="Notes, contexte, historique de la relation…"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className="resize-none h-16"
            />
          </div>
        </form>

        <DialogFooter className="gap-2">
          {isEdit && saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 mr-auto">
              <Check className="h-3.5 w-3.5" /> Sauvegardé
            </span>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            {isEdit ? "Fermer" : "Annuler"}
          </Button>
          <Button type="button" onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Enregistrer" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
