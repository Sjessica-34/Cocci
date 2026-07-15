import { useState } from "react";
import { Link } from "wouter";
import {
  useListOrganizations,
  useListSubsidiaries,
  useUpdateOrganization,
  getListOrganizationsQueryKey,
} from "@workspace/api-client-react";
import type { Organization } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Building, ChevronsUpDown, Plus, ChevronRight, Network } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useCurrentOrganization, setCurrentOrg } from "@/hooks/useCurrentOrganization";
import { cn } from "@/lib/utils";

// ── Helpers ────────────────────────────────────────────────────────────────

function OrgIcon({ type, className }: { type: string | null | undefined; className?: string }) {
  if (type === "groupe") return <Network className={cn("shrink-0", className)} />;
  return <Building className={cn("shrink-0", className)} />;
}

function entityLabel(org: Organization): string {
  return org.name;
}

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
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            Votre groupe possède désormais des filiales.
          </DialogTitle>
          <DialogDescription>
            Comment souhaitez-vous calculer les résultats du groupe ?
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={mode} onValueChange={(v) => setMode(v as "manual" | "auto")} className="space-y-3 my-2">
          <div className={cn(
            "flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors",
            mode === "manual" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30",
          )} onClick={() => setMode("manual")}>
            <RadioGroupItem value="manual" id="mode-manual" className="mt-0.5 shrink-0" />
            <div>
              <Label htmlFor="mode-manual" className="font-semibold cursor-pointer">Je renseigne les résultats du groupe manuellement.</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Le groupe continue à fonctionner comme aujourd'hui. Toutes les données sont renseignées directement au niveau du groupe. Les données des filiales restent totalement indépendantes.
              </p>
            </div>
          </div>
          <div className={cn(
            "flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors",
            mode === "auto" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30",
          )} onClick={() => setMode("auto")}>
            <RadioGroupItem value="auto" id="mode-auto" className="mt-0.5 shrink-0" />
            <div>
              <Label htmlFor="mode-auto" className="font-semibold cursor-pointer">Les résultats du groupe sont calculés automatiquement à partir des filiales.</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Le tableau de bord du groupe devient une vue consolidée. Les indicateurs sont mis à jour automatiquement dès qu'une filiale est modifiée.
              </p>
            </div>
          </div>
        </RadioGroup>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={updateOrg.isPending}>Plus tard</Button>
          <Button onClick={handleConfirm} disabled={updateOrg.isPending}>
            {updateOrg.isPending ? "Enregistrement…" : "Confirmer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Dropdown item ─────────────────────────────────────────────────────────

function OrgItem({
  org,
  active,
  indented,
  onClick,
}: {
  org: Organization;
  active: boolean;
  indented?: boolean;
  onClick: () => void;
}) {
  return (
    <DropdownMenuItem
      className={cn(
        "cursor-pointer gap-2",
        active && "bg-accent",
        indented && "pl-7",
      )}
      onClick={onClick}
    >
      <OrgIcon type={org.type} className={cn("h-3.5 w-3.5", org.type === "groupe" ? "text-primary" : "text-muted-foreground")} />
      <span className={cn("truncate flex-1", org.type === "groupe" && "font-semibold")}>{org.name}</span>
      {active && <ChevronRight className="h-3 w-3 text-primary shrink-0" />}
    </DropdownMenuItem>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function EntitySelector() {
  const { currentOrgId } = useCurrentOrganization();
  const { data: orgs = [] } = useListOrganizations();
  const qc = useQueryClient();
  const [groupModeOrg, setGroupModeOrg] = useState<Organization | null>(null);

  const currentOrg = orgs.find((o) => o.id === currentOrgId) ?? null;

  // Build hierarchy: groups + their subsidiaries + standalone enterprises
  const groups = orgs.filter((o) => o.type === "groupe");
  const standalone = orgs.filter((o) => o.type !== "groupe" && !o.parentId);
  const subsidiariesOf = (groupId: number) => orgs.filter((o) => o.parentId === groupId);

  function switchEntity(org: Organization) {
    if (org.id === currentOrgId) return;
    setCurrentOrg(org.id);
    qc.invalidateQueries();

    // If switching to a group that has subsidiaries but no groupMode set, prompt
    if (org.type === "groupe" && !org.groupMode) {
      const subs = subsidiariesOf(org.id);
      if (subs.length > 0) {
        setGroupModeOrg(org);
      }
    }
  }

  // Check if current group needs the mode dialog (e.g. after a new subsidiary was created)
  const currentIsGroupWithoutMode =
    currentOrg?.type === "groupe" &&
    !currentOrg.groupMode &&
    subsidiariesOf(currentOrg.id).length > 0;

  const displayLabel = currentOrg
    ? currentOrg.type === "groupe"
      ? `Groupe — ${currentOrg.name}`
      : currentOrg.name
    : "Entité";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex-1 justify-start px-2 h-9 hover:bg-sidebar-accent/60 text-sidebar-foreground min-w-0"
          >
            <OrgIcon
              type={currentOrg?.type}
              className="h-4 w-4 mr-2 text-sidebar-foreground/60"
            />
            <span className="text-sm font-medium truncate flex-1 text-left">{displayLabel}</span>
            {currentIsGroupWithoutMode && (
              <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0 mr-1" title="Configuration requise" />
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 text-sidebar-foreground/40 shrink-0" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Changer d'entité</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Groups with their subsidiaries */}
          {groups.map((group) => {
            const subs = subsidiariesOf(group.id);
            return (
              <div key={group.id}>
                <OrgItem org={group} active={group.id === currentOrgId} onClick={() => switchEntity(group)} />
                {subs.length > 0 && (
                  <>
                    <div className="mx-3 my-0.5 h-px bg-border/50" />
                    {subs.map((sub) => (
                      <OrgItem key={sub.id} org={sub} active={sub.id === currentOrgId} indented onClick={() => switchEntity(sub)} />
                    ))}
                    <div className="mx-3 mt-0.5 mb-1 h-px bg-border/30" />
                  </>
                )}
              </div>
            );
          })}

          {/* Standalone enterprises */}
          {standalone.map((org) => (
            <OrgItem key={org.id} org={org} active={org.id === currentOrgId} onClick={() => switchEntity(org)} />
          ))}

          <DropdownMenuSeparator />
          <Link href="/organizations/new">
            <DropdownMenuItem className="cursor-pointer gap-2">
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm">Nouvelle entité…</span>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Group mode dialog — shown when switching to a group that needs config */}
      {groupModeOrg && (
        <GroupModeDialog
          group={groupModeOrg}
          open={!!groupModeOrg}
          onClose={() => setGroupModeOrg(null)}
        />
      )}

      {/* Also prompt if current group needs config (e.g. after page refresh) */}
      {currentIsGroupWithoutMode && !groupModeOrg && currentOrg && (
        <GroupModeDialog
          group={currentOrg}
          open={true}
          onClose={() => {
            /* groupMode will be set — dialog won't re-appear */
          }}
        />
      )}
    </>
  );
}
