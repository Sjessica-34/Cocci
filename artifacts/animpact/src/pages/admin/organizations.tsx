import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { setCurrentOrg } from "@/hooks/useCurrentOrganization";
import { AdminLayout } from "./layout";
import {
  useListAdminOrganizations,
  getListAdminOrganizationsQueryKey,
} from "@workspace/api-client-react";
import type { AdminOrganization } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Users,
  ChevronRight,
  ChevronDown,
  Filter,
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

// ─── Badge helpers ────────────────────────────────────────────────────────────

const SIZE_COLORS: Record<string, string> = {
  TPE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PME: "bg-blue-50 text-blue-700 border-blue-200",
  ETI: "bg-violet-50 text-violet-700 border-violet-200",
  GE: "bg-orange-50 text-orange-700 border-orange-200",
};

function SubBadge({ status }: { status?: string }) {
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

function ComplianceBadge({ compliance }: { compliance: AdminOrganization["compliance"] }) {
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

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-rose-500";
  const text = score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-rose-600";
  return (
    <div className="flex items-center gap-2">
      <span className={cn("text-xs font-bold w-6 text-right", text)}>{score}</span>
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterStatus = "all" | "active" | "trial" | "suspended" | "expired" | "overflow";

interface GroupEntry {
  kind: "group";
  org: AdminOrganization;
  children: AdminOrganization[]; // subsidiaries
}
interface IndepEntry {
  kind: "indep";
  org: AdminOrganization;
}
type ClientEntry = GroupEntry | IndepEntry;

// ─── Row: independent company ─────────────────────────────────────────────────

function IndepRow({ org }: { org: AdminOrganization }) {
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
      <td className="px-5 py-4 whitespace-nowrap">
        <SubBadge status={org.subscription?.status} />
      </td>
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

// ─── Row: group header ────────────────────────────────────────────────────────

function GroupHeaderRow({
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

  // Consolidated numbers
  const allMembers = children.reduce((s, c) => s + (c.memberCount ?? 0), org.memberCount ?? 0);
  const allEmployees = children.reduce((s, c) => s + (c.employeeCount ?? 0), org.employeeCount ?? 0);
  const score = org.healthScore ?? 0;

  function handleRowClick(e: React.MouseEvent) {
    // If click is on the chevron button, just toggle — don't navigate
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
          {/* Toggle */}
          <button
            data-toggle
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors shrink-0 text-muted-foreground hover:text-foreground"
            aria-label={expanded ? "Replier" : "Développer"}
          >
            {expanded
              ? <ChevronDown className="h-4 w-4" />
              : <ChevronRight className="h-4 w-4" />}
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
              {allEmployees > 0 ? `${allEmployees.toLocaleString("fr-FR")} salariés (consolidé)` : "Effectif non renseigné"}
            </p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4 whitespace-nowrap">
        <SubBadge status={org.subscription?.status} />
      </td>

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

// ─── Row: subsidiary ──────────────────────────────────────────────────────────

function SubsidiaryRow({ org }: { org: AdminOrganization }) {
  const [, navigate] = useLocation();
  return (
    <tr
      className="group hover:bg-muted/20 transition-colors cursor-pointer"
      onClick={() => { setCurrentOrg(org.id); navigate(`/admin/organizations/${org.id}`); }}
    >
      <td className="px-5 py-3">
        {/* Indented with left border */}
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

      {/* Status */}
      <td className="px-5 py-3 whitespace-nowrap">
        <SubBadge status={org.subscription?.status} />
      </td>

      {/* Offer — blank for subsidiaries (managed by parent) */}
      <td className="px-5 py-3">
        <span className="text-xs text-muted-foreground italic">Filiale</span>
      </td>

      {/* Users */}
      <td className="px-5 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-foreground">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">{org.memberCount}</span>
        </div>
      </td>

      {/* No compliance / health for subsidiaries */}
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

// ─── Main page ────────────────────────────────────────────────────────────────

export function AdminOrganizations() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const { data: orgs, isLoading } = useListAdminOrganizations({
    query: { queryKey: getListAdminOrganizationsQueryKey() },
  });

  // ── Build hierarchical structure ──────────────────────────────────────────
  const { clients, stats } = useMemo(() => {
    if (!orgs) return { clients: [] as ClientEntry[], stats: { clients: 0, groups: 0, indeps: 0, subsidiaries: 0 } };

    const byId = new Map(orgs.map((o) => [o.id, o]));
    const subsidiaryIds = new Set(orgs.filter((o) => o.parentId != null).map((o) => o.id));
    const roots = orgs.filter((o) => o.parentId == null);

    const groups = roots.filter((o) => o.type === "groupe");
    const indeps = roots.filter((o) => o.type !== "groupe");

    const entries: ClientEntry[] = roots.map((root) => {
      if (root.type === "groupe") {
        const children = orgs.filter((o) => o.parentId === root.id);
        return { kind: "group", org: root, children } satisfies GroupEntry;
      }
      return { kind: "indep", org: root } satisfies IndepEntry;
    });

    return {
      clients: entries,
      stats: {
        clients: roots.length,
        groups: groups.length,
        indeps: indeps.length,
        subsidiaries: subsidiaryIds.size,
      },
    };
  }, [orgs]);

  // ── Filter + search ───────────────────────────────────────────────────────
  const { filteredClients, autoExpanded } = useMemo(() => {
    const q = search.toLowerCase().trim();

    const matchOrg = (o: AdminOrganization) => {
      const textMatch = !q || [o.name, o.legalName, o.siret, o.sector].some((v) => v?.toLowerCase().includes(q));
      let statusMatch = true;
      if (filter === "active") statusMatch = o.subscription?.status === "active";
      if (filter === "trial") statusMatch = o.subscription?.status === "trial";
      if (filter === "suspended") statusMatch = o.subscription?.status === "suspended";
      if (filter === "expired") statusMatch = o.subscription?.status === "expired";
      if (filter === "overflow") statusMatch = o.compliance?.status === "overflow";
      return textMatch && statusMatch;
    };

    const newAutoExpanded = new Set<number>();
    const result: ClientEntry[] = [];

    for (const entry of clients) {
      if (entry.kind === "indep") {
        if (matchOrg(entry.org)) result.push(entry);
      } else {
        const matchingChildren = entry.children.filter(matchOrg);
        const groupMatches = matchOrg(entry.org);
        if (groupMatches || matchingChildren.length > 0) {
          // If any child matches and group itself doesn't, auto-expand
          if (!groupMatches && matchingChildren.length > 0) {
            newAutoExpanded.add(entry.org.id);
          }
          const visibleChildren = groupMatches ? entry.children : matchingChildren;
          result.push({ kind: "group", org: entry.org, children: visibleChildren });
        }
      }
    }

    return { filteredClients: result, autoExpanded: newAutoExpanded };
  }, [clients, search, filter]);

  // ── Expand state ──────────────────────────────────────────────────────────
  const isExpanded = (id: number) => expandedIds.has(id) || autoExpanded.has(id);

  function toggle(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (isExpanded(id)) { next.delete(id); autoExpanded.delete(id); }
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    const groupIds = filteredClients.filter((e) => e.kind === "group").map((e) => e.org.id);
    setExpandedIds(new Set(groupIds));
  }

  function collapseAll() {
    setExpandedIds(new Set());
    autoExpanded.clear();
  }

  const hasGroups = filteredClients.some((e) => e.kind === "group");
  const allExpanded = filteredClients.filter((e) => e.kind === "group").every((e) => isExpanded(e.org.id));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Flotte client</h1>
            {isLoading ? (
              <Skeleton className="h-4 w-56 mt-1" />
            ) : (
              <p className="text-muted-foreground text-sm mt-1">
                <span className="font-semibold text-foreground">{stats.clients}</span> clients
                <span className="mx-1.5 text-border">·</span>
                <span>{stats.indeps} indépendant{stats.indeps !== 1 ? "s" : ""}</span>
                <span className="mx-1.5 text-border">·</span>
                <span>{stats.groups} groupe{stats.groups !== 1 ? "s" : ""}</span>
                <span className="mx-1.5 text-border">·</span>
                <span>{stats.subsidiaries} filiale{stats.subsidiaries !== 1 ? "s" : ""}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {hasGroups && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs shrink-0"
                onClick={allExpanded ? collapseAll : expandAll}
              >
                {allExpanded ? "Tout replier" : "Tout développer"}
              </Button>
            )}
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher (nom, secteur, SIREN)…"
                className="pl-9 bg-white dark:bg-black"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2 no-scrollbar">
          <Filter className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
          {[
            { id: "all", label: "Tous" },
            { id: "active", label: "Actifs" },
            { id: "trial", label: "En essai" },
            { id: "suspended", label: "Suspendus" },
            { id: "expired", label: "Expirés" },
            { id: "overflow", label: "Non conformes" },
          ].map((f) => (
            <Button
              key={f.id}
              variant={filter === f.id ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "rounded-full h-8 text-xs font-medium px-4 shrink-0 transition-colors",
                filter === f.id ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-muted/50",
              )}
              onClick={() => setFilter(f.id as FilterStatus)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground bg-muted/20 border border-dashed border-border/50 rounded-xl">
            <p className="text-sm font-medium">Aucun client trouvé.</p>
            <p className="text-xs mt-1 opacity-70">Modifiez vos filtres ou votre recherche.</p>
          </div>
        ) : (
          <Card className="overflow-hidden border-border/50 bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/10 text-muted-foreground text-xs uppercase tracking-wider font-medium">
                    <th className="px-5 py-3 font-medium">Client</th>
                    <th className="px-5 py-3 font-medium">Statut</th>
                    <th className="px-5 py-3 font-medium">Abonnement</th>
                    <th className="px-5 py-3 font-medium">Utilisateurs</th>
                    <th className="px-5 py-3 font-medium">Conformité</th>
                    <th className="px-5 py-3 font-medium">Santé</th>
                    <th className="px-5 py-3 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredClients.map((entry) => {
                    if (entry.kind === "indep") {
                      return <IndepRow key={entry.org.id} org={entry.org} />;
                    }
                    const open = isExpanded(entry.org.id);
                    return [
                      <GroupHeaderRow
                        key={`g-${entry.org.id}`}
                        org={entry.org}
                        children={entry.children}
                        expanded={open}
                        onToggle={() => toggle(entry.org.id)}
                      />,
                      ...(open
                        ? entry.children.map((child) => (
                            <SubsidiaryRow key={`s-${child.id}`} org={child} />
                          ))
                        : []),
                    ];
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
