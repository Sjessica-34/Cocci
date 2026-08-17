/**
 * Shared row components for the hierarchical org list.
 * Used by both the admin dashboard (index.tsx) and the full fleet page (organizations.tsx).
 */
import { useLocation } from "wouter";
import { setCurrentOrg } from "@/hooks/useCurrentOrganization";
import type { AdminOrganization } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Badge helpers ─────────────────────────────────────────────────────────────

export const SIZE_COLORS: Record<string, string> = {
  TPE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PME: "bg-blue-50 text-blue-700 border-blue-200",
  ETI: "bg-violet-50 text-violet-700 border-violet-200",
  GE:  "bg-orange-50 text-orange-700 border-orange-200",
};

export function SubBadge({ status }: { status?: string }) {
  switch (status) {
    case "active":
      return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-[10px] px-1.5 py-0 font-medium">Actif</Badge>;
    case "trial":
      return <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 text-[10px] px-1.5 py-0 font-medium">Essai</Badge>;
    case "suspended":
      return <Badge className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 text-[10px] px-1.5 py-0 font-medium">Suspendu</Badge>;
    case "expired":
      return <Badge className="bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200 text-[10px] px-1.5 py-0 font-medium">Expiré</Badge>;
    default:
      return <Badge className="bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200 text-[10px] px-1.5 py-0 font-medium">N/A</Badge>;
  }
}

export function ComplianceBadge({ compliance }: { compliance: AdminOrganization["compliance"] }) {
  if (!compliance) return <span className="text-muted-foreground">—</span>;
  switch (compliance.status) {
    case "ok":
      return <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50/50 text-[10px] font-medium h-5">Conforme</Badge>;
    case "overflow":
      return <Badge variant="outline" className="border-rose-200 text-rose-700 bg-rose-50/50 text-[10px] font-medium h-5">Dépassement (+{compliance.overflow})</Badge>;
    case "missing":
      return <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50/50 text-[10px] font-medium h-5">Incomplet</Badge>;
    default:
      return <Badge variant="outline" className="border-border text-muted-foreground bg-muted/50 text-[10px] font-medium h-5">N/A</Badge>;
  }
}

export function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-rose-500";
  const text  = score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-rose-600";
  return (
    <div className="flex items-center gap-2">
      <span className={cn("text-xs font-bold w-6 text-right", text)}>{score}</span>
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface GroupEntry {
  kind: "group";
  org: AdminOrganization;
  children: AdminOrganization[];
}
export interface IndepEntry {
  kind: "indep";
  org: AdminOrganization;
}
export type ClientEntry = GroupEntry | IndepEntry;

// ─── Row: independent ──────────────────────────────────────────────────────────

export function IndepRow({ org }: { org: AdminOrganization }) {
  const [, navigate] = useLocation();
  const score = org.healthScore ?? 0;
  return (
    <tr
      className="group hover:bg-muted/30 transition-colors cursor-pointer"
      onClick={() => { setCurrentOrg(org.id); navigate(`/admin/organizations/${org.id}`); }}
    >
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
            {org.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{org.name}</span>
              {org.size && (
                <Badge variant="outline" className={cn("text-[9px] h-4 px-1 py-0 uppercase tracking-wider", SIZE_COLORS[org.size])}>
                  {org.size}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {org.sector || "Secteur non défini"}
              {org.siret ? <span className="opacity-50 mx-1.5">•</span> : ""}
              {org.siret ? <span className="font-mono text-[10px]">{org.siret}</span> : ""}
            </p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4 whitespace-nowrap"><SubBadge status={org.subscription?.status} /></td>
      <td className="px-5 py-4">
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{org.subscription?.offerName || "—"}</span>
          <span className="text-xs text-muted-foreground capitalize">{org.subscription?.mode || "—"}</span>
        </div>
      </td>
      <td className="px-5 py-4 whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-foreground">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{org.memberCount}</span>
          <span className="text-muted-foreground text-xs">/ {org.subscription?.maxUsers ?? "∞"}</span>
        </div>
      </td>
      <td className="px-5 py-4 whitespace-nowrap"><ComplianceBadge compliance={org.compliance} /></td>
      <td className="px-5 py-4 whitespace-nowrap"><ScoreBar score={score} /></td>
      <td className="px-5 py-4 text-right">
        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Button>
      </td>
    </tr>
  );
}

// ─── Row: group header ─────────────────────────────────────────────────────────

export function GroupHeaderRow({
  org,
  children,
  expanded,
  onToggle,
}: {
  org: AdminOrganization;
  children: AdminOrganization[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const [, navigate] = useLocation();
  const allMembers   = children.reduce((s, c) => s + (c.memberCount ?? 0), org.memberCount ?? 0);
  const allEmployees = children.reduce((s, c) => s + (c.employeeCount ?? 0), org.employeeCount ?? 0);
  const score = org.healthScore ?? 0;

  function handleRowClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("[data-toggle]")) return;
    setCurrentOrg(org.id);
    navigate(`/admin/organizations/${org.id}`);
  }

  return (
    <tr
      className="group hover:bg-muted/30 transition-colors cursor-pointer bg-muted/5"
      onClick={handleRowClick}
    >
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <button
            data-toggle
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors shrink-0 text-muted-foreground hover:text-foreground"
            aria-label={expanded ? "Replier" : "Développer"}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <div className="h-9 w-9 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">
            {org.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{org.name}</span>
              <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 uppercase tracking-wider bg-violet-50 text-violet-700 border-violet-200">
                Groupe
              </Badge>
              <span className="text-xs text-muted-foreground">
                {children.length} filiale{children.length !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {allEmployees > 0
                ? `${allEmployees.toLocaleString("fr-FR")} salariés (consolidé)`
                : "Effectif non renseigné"}
            </p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4 whitespace-nowrap"><SubBadge status={org.subscription?.status} /></td>
      <td className="px-5 py-4">
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{org.subscription?.offerName || "—"}</span>
          <span className="text-xs text-muted-foreground capitalize">{org.subscription?.mode || "—"}</span>
        </div>
      </td>
      <td className="px-5 py-4 whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-foreground">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{allMembers}</span>
          <span className="text-muted-foreground text-xs">/ {org.subscription?.maxUsers ?? "∞"}</span>
        </div>
      </td>
      <td className="px-5 py-4 whitespace-nowrap"><ComplianceBadge compliance={org.compliance} /></td>
      <td className="px-5 py-4 whitespace-nowrap"><ScoreBar score={score} /></td>
      <td className="px-5 py-4 text-right">
        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Button>
      </td>
    </tr>
  );
}

// ─── Row: subsidiary ───────────────────────────────────────────────────────────

export function SubsidiaryRow({ org }: { org: AdminOrganization }) {
  const [, navigate] = useLocation();
  return (
    <tr
      className="group hover:bg-muted/20 transition-colors cursor-pointer"
      onClick={() => { setCurrentOrg(org.id); navigate(`/admin/organizations/${org.id}`); }}
    >
      <td className="px-5 py-3">
        <div className="flex items-center gap-2 pl-8 relative before:absolute before:left-[2.75rem] before:top-0 before:bottom-0 before:w-px before:bg-border/50">
          <div className="h-7 w-7 rounded bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
            {org.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate block">
              {org.name}
            </span>
            <p className="text-xs text-muted-foreground truncate">
              {org.sector || "—"}
              {org.employeeCount ? <span className="opacity-50 mx-1.5">·</span> : ""}
              {org.employeeCount ? `${org.employeeCount.toLocaleString("fr-FR")} salariés` : ""}
            </p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3 whitespace-nowrap"><SubBadge status={org.subscription?.status} /></td>
      <td className="px-5 py-3"><span className="text-xs text-muted-foreground italic">Filiale</span></td>
      <td className="px-5 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-foreground">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">{org.memberCount}</span>
        </div>
      </td>
      <td className="px-5 py-3" />
      <td className="px-5 py-3" />
      <td className="px-5 py-3 text-right">
        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </td>
    </tr>
  );
}

// ─── Hook: build hierarchy from flat list ──────────────────────────────────────

export function buildHierarchy(orgs: AdminOrganization[]): {
  clients: ClientEntry[];
  stats: { clients: number; groups: number; indeps: number; subsidiaries: number };
} {
  const subsidiaryIds = new Set(orgs.filter((o) => o.parentId != null).map((o) => o.id));
  const roots = orgs.filter((o) => o.parentId == null);
  const groups = roots.filter((o) => o.type === "groupe");
  const indeps = roots.filter((o) => o.type !== "groupe");

  const clients: ClientEntry[] = roots.map((root) => {
    if (root.type === "groupe") {
      const children = orgs.filter((o) => o.parentId === root.id);
      return { kind: "group", org: root, children } satisfies GroupEntry;
    }
    return { kind: "indep", org: root } satisfies IndepEntry;
  });

  return {
    clients,
    stats: {
      clients: roots.length,
      groups: groups.length,
      indeps: indeps.length,
      subsidiaries: subsidiaryIds.size,
    },
  };
}
