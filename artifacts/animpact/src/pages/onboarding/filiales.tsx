import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useListOrganizations,
  useCreateOrganization,
  useUpdateOrganization,
  getListOrganizationsQueryKey,
} from "@workspace/api-client-react";
import type { Organization } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Leaf,
  Building,
  Plus,
  Loader2,
  Network,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useCurrentOrganization, setCurrentOrg } from "@/hooks/useCurrentOrganization";

// ── Group mode dialog ──────────────────────────────────────────────────────

function GroupModeDialog({
  group,
  open,
  onDone,
}: {
  group: Organization;
  open: boolean;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"manual" | "auto">("manual");
  const updateOrg = useUpdateOrganization();

  function handleConfirm() {
    updateOrg.mutate(
      { id: group.id, data: { groupMode: mode } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListOrganizationsQueryKey() });
          onDone();
        },
      },
    );
  }

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Network className="h-5 w-5 text-primary shrink-0" />
            Votre groupe possède désormais des filiales.
          </DialogTitle>
          <DialogDescription>
            Comment souhaitez-vous calculer les résultats du groupe ?
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as "manual" | "auto")}
          className="space-y-3 my-1"
        >
          {(
            [
              {
                value: "manual",
                label: "Je renseigne les résultats du groupe manuellement.",
                desc: "Le groupe fonctionne comme une entreprise indépendante. Les données des filiales restent totalement séparées.",
              },
              {
                value: "auto",
                label: "Les résultats du groupe sont calculés automatiquement à partir des filiales.",
                desc: "Le tableau de bord du groupe devient une vue consolidée mise à jour dès qu'une filiale est modifiée.",
              },
            ] as const
          ).map((opt) => (
            <div
              key={opt.value}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors",
                mode === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/30",
              )}
              onClick={() => setMode(opt.value)}
            >
              <RadioGroupItem value={opt.value} id={`wiz-mode-${opt.value}`} className="mt-0.5 shrink-0" />
              <div>
                <Label
                  htmlFor={`wiz-mode-${opt.value}`}
                  className="font-semibold cursor-pointer leading-snug"
                >
                  {opt.label}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
              </div>
            </div>
          ))}
        </RadioGroup>

        <DialogFooter>
          <Button onClick={handleConfirm} disabled={updateOrg.isPending}>
            {updateOrg.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Wizard ─────────────────────────────────────────────────────────────────

export function OnboardingFiliales() {
  const [, setLocation] = useLocation();
  const { currentOrgId } = useCurrentOrganization();
  const { data: orgs = [], isLoading } = useListOrganizations();
  const qc = useQueryClient();
  const createOrg = useCreateOrganization();

  const [subName, setSubName] = useState("");
  const [subError, setSubError] = useState("");
  const [showModeDialog, setShowModeDialog] = useState(false);
  const [modeSet, setModeSet] = useState(false);

  const rootOrg = orgs.find((o) => !o.parentId && o.type === "groupe") ?? null;
  const subsidiaries = orgs.filter((o) => rootOrg && o.parentId === rootOrg.id);
  const isFirstSub = subsidiaries.length === 0;

  // After mode is confirmed, go to dashboard
  function handleModeDone() {
    setModeSet(true);
    setShowModeDialog(false);
    // Switch to the group view
    if (rootOrg) setCurrentOrg(rootOrg.id);
    setLocation("/dashboard");
  }

  async function handleAddSub(e: React.FormEvent) {
    e.preventDefault();
    if (subName.trim().length < 2) {
      setSubError("Le nom doit contenir au moins 2 caractères.");
      return;
    }
    if (!rootOrg) return;
    setSubError("");

    await createOrg.mutateAsync({
      data: { name: subName.trim(), type: "entreprise", parentId: rootOrg.id },
    });
    await qc.invalidateQueries({ queryKey: getListOrganizationsQueryKey() });
    setSubName("");

    // Show mode dialog after first subsidiary
    if (isFirstSub && !modeSet) {
      setShowModeDialog(true);
    }
  }

  function handleContinue() {
    if (rootOrg) setCurrentOrg(rootOrg.id);
    setLocation("/dashboard");
  }

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!rootOrg) {
    setLocation("/onboarding");
    return null;
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-muted/30 px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <Leaf className="h-7 w-7 text-primary" />
        <span className="text-2xl font-bold tracking-tight text-foreground">cocci</span>
      </div>

      <div className="w-full max-w-md bg-white rounded-xl border border-border shadow-sm p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Network className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xs text-muted-foreground uppercase tracking-wide">{rootOrg.name}</h2>
            <h1 className="text-lg font-bold leading-tight">
              {subsidiaries.length === 0
                ? "Votre groupe est vide."
                : `${subsidiaries.length} filiale${subsidiaries.length > 1 ? "s" : ""} créée${subsidiaries.length > 1 ? "s" : ""}`}
            </h1>
            {subsidiaries.length === 0 && (
              <p className="text-sm text-muted-foreground">Commençons par créer vos filiales.</p>
            )}
          </div>
        </div>

        {/* Subsidiaries list */}
        {subsidiaries.length > 0 && (
          <ul className="space-y-1.5">
            {subsidiaries.map((sub) => (
              <li
                key={sub.id}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/40 border border-border/50"
              >
                <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium flex-1 truncate">{sub.name}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Add subsidiary form */}
        <form onSubmit={handleAddSub} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="sub-name">Nom de la filiale</Label>
            <div className="flex gap-2">
              <Input
                id="sub-name"
                placeholder="Martin Industrie"
                value={subName}
                onChange={(e) => { setSubName(e.target.value); setSubError(""); }}
              />
              <Button
                type="submit"
                variant="outline"
                size="icon"
                disabled={!subName.trim() || createOrg.isPending}
                className="shrink-0"
              >
                {createOrg.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
            {subError && <p className="text-xs text-destructive">{subError}</p>}
          </div>
        </form>

        {/* Continue */}
        {subsidiaries.length > 0 && (
          <Button className="w-full" onClick={handleContinue}>
            Continuer
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Group mode dialog */}
      {showModeDialog && rootOrg && (
        <GroupModeDialog
          group={rootOrg}
          open={showModeDialog}
          onDone={handleModeDone}
        />
      )}
    </div>
  );
}
