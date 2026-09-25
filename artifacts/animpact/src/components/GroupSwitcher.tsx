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
  Network,
  Building,
  BarChart3,
  Plus,
  ChevronsUpDown,
  ChevronRight,
  Settings,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCurrentOrganization, setCurrentOrg } from "@/hooks/useCurrentOrganization";
import { useAdminViewOrg, setAdminViewOrg } from "@/hooks/useAdminView";
import { cn } from "@/lib/utils";

// ── Group mode dialog ──────────────────────────────────────────────────────

function GroupModeDialog({
  group,
  open,
  onClose,
}: {
  group: Organization;
  open: boolean;
  onClose: () => void;
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
          onClose();
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
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
              <RadioGroupItem value={opt.value} id={`mode-${opt.value}`} className="mt-0.5 shrink-0" />
              <div>
                <Label htmlFor={`mode-${opt.value}`} className="font-semibold cursor-pointer leading-snug">
                  {opt.label}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
              </div>
            </div>
          ))}
        </RadioGroup>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={updateOrg.isPending}>
            Plus tard
          </Button>
          <Button onClick={handleConfirm} disabled={updateOrg.isPending}>
            {updateOrg.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add subsidiary dialog ──────────────────────────────────────────────────

function AddSubsidiaryDialog({
  group,
  open,
  onClose,
}: {
  group: Organization;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const createOrg = useCreateOrganization();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createOrg.mutate(
      { data: { name: name.trim(), type: "entreprise", parentId: group.id } },
      {
        onSuccess: (newSub) => {
          qc.invalidateQueries({ queryKey: getListOrganizationsQueryKey() });
          setCurrentOrg(newSub.id);
          setName("");
          onClose();
        },
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) { setName(""); onClose(); }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajouter une filiale</DialogTitle>
          <DialogDescription>
            La filiale sera rattachée au groupe <span className="font-medium">{group.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sub-name">Nom de la filiale</Label>
            <Input
              id="sub-name"
              placeholder="Martin Industrie"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { setName(""); onClose(); }}
              disabled={createOrg.isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={!name.trim() || createOrg.isPending}>
              {createOrg.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer la filiale
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function GroupSwitcher({ mobile = false }: { mobile?: boolean } = {}) {
  const { currentOrgId } = useCurrentOrganization();
  const adminViewOrgId = useAdminViewOrg();
  const { data: orgs = [], isLoading } = useListOrganizations(
    adminViewOrgId ? { viewAs: adminViewOrgId } : undefined,
  );
  const [, setLocation] = useLocation();
  const [addSubOpen, setAddSubOpen] = useState(false);
  const [groupModeOpen, setGroupModeOpen] = useState(false);

  // Root = top-level org (no parent) — there should be exactly 1
  const rootOrg = orgs.find((o) => !o.parentId) ?? null;
  const subsidiaries = orgs.filter((o) => rootOrg && o.parentId === rootOrg.id);

  // Auto-initialize / validate currentOrgId when orgs load or admin view changes.
  useEffect(() => {
    if (!rootOrg) return;
    if (adminViewOrgId) {
      // Admin impersonation mode: always sync to root of the viewed org.
      if (currentOrgId !== rootOrg.id) setCurrentOrg(rootOrg.id);
    } else {
      // Normal mode: reset if no org set OR if stored org doesn't belong to this user.
      const isValid = orgs.some((o) => o.id === currentOrgId);
      if (!currentOrgId || !isValid) setCurrentOrg(rootOrg.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootOrg?.id, adminViewOrgId, orgs.length]);

  // Show group mode dialog when group has subsidiaries but no mode set
  const needsGroupMode =
    rootOrg?.type === "groupe" && !rootOrg.groupMode && subsidiaries.length > 0;

  useEffect(() => {
    if (needsGroupMode) setGroupModeOpen(true);
  }, [needsGroupMode]);

  if (isLoading || !rootOrg) return null;

  // ── Enterprise: static label ──────────────────────────────────────────────
  if (rootOrg.type === "entreprise") {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md">
        <Building className="h-4 w-4 text-primary/70 shrink-0" />
        <span className={cn("text-sm font-semibold truncate flex-1", mobile ? "text-foreground" : "text-sidebar-foreground")}>
          {rootOrg.name}
        </span>
        <button
          onClick={() => setLocation(`/organizations/${rootOrg.id}/settings`)}
          className={cn(
            "h-5 w-5 flex items-center justify-center rounded transition-colors",
            mobile
              ? "hover:bg-muted text-foreground/40 hover:text-foreground/70"
              : "hover:bg-sidebar-accent/80 text-sidebar-foreground/40 hover:text-sidebar-foreground/70",
          )}
          title="Paramètres"
        >
          <Settings className="h-3 w-3" />
        </button>
      </div>
    );
  }

  // ── Group: collapsible dropdown ───────────────────────────────────────────
  const viewingGroup = currentOrgId === rootOrg.id;
  const currentSub = subsidiaries.find((s) => s.id === currentOrgId);
  const sublabel = viewingGroup ? "Vue Groupe" : (currentSub?.name ?? "Vue Groupe");

  function switchTo(id: number) {
    setCurrentOrg(id);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start px-2 h-auto py-1.5 min-w-0",
              mobile
                ? "hover:bg-muted/70 text-foreground"
                : "hover:bg-sidebar-accent/60 text-sidebar-foreground",
            )}
          >
            <Network className="h-4 w-4 mr-2 text-primary/70 shrink-0" />
            <div className="flex-1 text-left min-w-0">
              <div className={cn(
                "text-[10px] uppercase tracking-wide truncate leading-none mb-0.5",
                mobile ? "text-muted-foreground" : "text-sidebar-foreground/50",
              )}>
                {rootOrg.name}
              </div>
              <div className={cn(
                "text-sm font-semibold truncate leading-tight",
                mobile ? "text-foreground" : "text-sidebar-foreground",
              )}>
                {sublabel}
              </div>
            </div>
            <ChevronsUpDown className={cn(
              "h-3.5 w-3.5 shrink-0 ml-1",
              mobile ? "text-muted-foreground" : "text-sidebar-foreground/40",
            )} />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
            {rootOrg.name}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Vue Groupe */}
          <DropdownMenuItem
            className={cn("cursor-pointer gap-2", viewingGroup && "bg-accent")}
            onClick={() => switchTo(rootOrg.id)}
          >
            <BarChart3 className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="font-medium flex-1">Vue Groupe</span>
            {viewingGroup && <ChevronRight className="h-3 w-3 text-primary" />}
          </DropdownMenuItem>

          {subsidiaries.length > 0 && (
            <>
              <div className="mx-2 my-1 h-px bg-border/50" />
              {subsidiaries.map((sub) => (
                <DropdownMenuItem
                  key={sub.id}
                  className={cn("cursor-pointer gap-2 pl-3", sub.id === currentOrgId && "bg-accent")}
                  onClick={() => switchTo(sub.id)}
                >
                  <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{sub.name}</span>
                  {sub.id === currentOrgId && <ChevronRight className="h-3 w-3 text-primary" />}
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-primary focus:text-primary"
            onClick={() => setAddSubOpen(true)}
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span>Ajouter une filiale</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => setLocation(`/organizations/${rootOrg.id}/settings`)}
          >
            <Settings className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Paramètres du groupe</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddSubsidiaryDialog
        group={rootOrg}
        open={addSubOpen}
        onClose={() => setAddSubOpen(false)}
      />

      {groupModeOpen && (
        <GroupModeDialog
          group={rootOrg}
          open={groupModeOpen}
          onClose={() => setGroupModeOpen(false)}
        />
      )}
    </>
  );
}
