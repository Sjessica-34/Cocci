import { useState } from "react";
import { useLocation } from "wouter";
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
  Building2,
  Search,
  Users,
  ChevronRight,
  ExternalLink,
  Filter,
  Activity,
  Network
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const SIZE_COLORS: Record<string, string> = {
  TPE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PME: "bg-blue-50 text-blue-700 border-blue-200",
  ETI: "bg-violet-50 text-violet-700 border-violet-200",
  GE: "bg-orange-50 text-orange-700 border-orange-200",
};

function getSubBadge(status: string | undefined) {
  switch (status) {
    case 'active':
      return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-[10px] px-1.5 py-0 font-medium">Actif</Badge>;
    case 'trial':
      return <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 text-[10px] px-1.5 py-0 font-medium">Essai</Badge>;
    case 'suspended':
      return <Badge className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 text-[10px] px-1.5 py-0 font-medium">Suspendu</Badge>;
    case 'expired':
      return <Badge className="bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200 text-[10px] px-1.5 py-0 font-medium">Expiré</Badge>;
    default:
      return <Badge className="bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200 text-[10px] px-1.5 py-0 font-medium">N/A</Badge>;
  }
}

function getComplianceBadge(compliance: AdminOrganization['compliance']) {
  if (!compliance) return <span className="text-muted-foreground">—</span>;
  
  switch (compliance.status) {
    case 'ok':
      return <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50/50 text-[10px] font-medium h-5">Conforme</Badge>;
    case 'overflow':
      return <Badge variant="outline" className="border-rose-200 text-rose-700 bg-rose-50/50 text-[10px] font-medium h-5">Dépassement (+{compliance.overflow})</Badge>;
    case 'missing':
      return <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50/50 text-[10px] font-medium h-5">Incomplet</Badge>;
    case 'na':
    default:
      return <Badge variant="outline" className="border-border text-muted-foreground bg-muted/50 text-[10px] font-medium h-5">N/A</Badge>;
  }
}

function getScoreColor(score: number) {
  if (score >= 80) return "bg-emerald-500 text-white border-emerald-600";
  if (score >= 50) return "bg-amber-500 text-white border-amber-600";
  return "bg-rose-500 text-white border-rose-600";
}

function getScoreTextColor(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-rose-600";
}

type FilterStatus = "all" | "active" | "trial" | "suspended" | "expired" | "overflow";

export function AdminOrganizations() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [, navigate] = useLocation();

  const { data: orgs, isLoading } = useListAdminOrganizations({
    query: { queryKey: getListAdminOrganizationsQueryKey() },
  });

  const filtered = orgs?.filter((o) => {
    // Text search
    const matchesSearch = !search || [o.name, o.legalName, o.siret, o.sector].some((v) => v?.toLowerCase().includes(search.toLowerCase()));
    
    // Status filter
    let matchesFilter = true;
    if (filter === "active") matchesFilter = o.subscription?.status === "active";
    if (filter === "trial") matchesFilter = o.subscription?.status === "trial";
    if (filter === "suspended") matchesFilter = o.subscription?.status === "suspended";
    if (filter === "expired") matchesFilter = o.subscription?.status === "expired";
    if (filter === "overflow") matchesFilter = o.compliance?.status === "overflow";

    return matchesSearch && matchesFilter;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Flotte client</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Pilotez les {orgs?.length ?? 0} organisation{(orgs?.length ?? 0) > 1 ? "s" : ""} de la plateforme.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher (Nom, Secteur, SIREN)…"
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
            { id: "all", label: "Toutes" },
            { id: "active", label: "Actives" },
            { id: "trial", label: "En essai" },
            { id: "suspended", label: "Suspendues" },
            { id: "expired", label: "Expirées" },
            { id: "overflow", label: "Non conformes" },
          ].map((f) => (
            <Button
              key={f.id}
              variant={filter === f.id ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "rounded-full h-8 text-xs font-medium px-4 shrink-0 transition-colors",
                filter === f.id ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-muted/50"
              )}
              onClick={() => setFilter(f.id as FilterStatus)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : !filtered?.length ? (
          <div className="text-center py-20 text-muted-foreground bg-muted/20 border border-dashed border-border/50 rounded-xl">
            <Building2 className="mx-auto h-12 w-12 opacity-20 mb-4" />
            <p className="text-sm font-medium">Aucune organisation trouvée.</p>
            <p className="text-xs mt-1 opacity-70">Modifiez vos filtres ou votre recherche.</p>
          </div>
        ) : (
          <Card className="overflow-hidden border-border/50 bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/10 text-muted-foreground text-xs uppercase tracking-wider font-medium">
                    <th className="px-5 py-3 font-medium">Organisation</th>
                    <th className="px-5 py-3 font-medium">Statut</th>
                    <th className="px-5 py-3 font-medium">Abonnement</th>
                    <th className="px-5 py-3 font-medium">Sièges</th>
                    <th className="px-5 py-3 font-medium">Conformité</th>
                    <th className="px-5 py-3 font-medium">Santé</th>
                    <th className="px-5 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filtered.map((org) => {
                    const score = org.healthScore ?? 0;
                    return (
                      <tr key={org.id} className="group hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/admin/organizations/${org.id}`)}>
                        <td className="px-5 py-4">
                          <Link href={`/admin/organizations/${org.id}`}>
                            <div className="flex items-center gap-3 cursor-pointer">
                              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                                {org.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{org.name}</span>
                                  {org.type === 'groupe' ? (
                                    <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 uppercase tracking-wider bg-violet-50 text-violet-700 border-violet-200">
                                      Groupe
                                    </Badge>
                                  ) : null}
                                  {org.size && (
                                    <Badge variant="outline" className={cn("text-[9px] h-4 px-1 py-0 uppercase tracking-wider", SIZE_COLORS[org.size])}>
                                      {org.size}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground truncate mt-0.5">
                                  {org.sector || "Secteur non défini"}
                                  {org.siret ? <span className="opacity-50 mx-1.5">•</span> : ""}
                                  {org.siret ? <span className="font-mono text-[10px]">{org.siret}</span> : ""}
                                </div>
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {getSubBadge(org.subscription?.status)}
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
                            <span className="text-muted-foreground text-xs">/ {org.subscription?.maxUsers ?? '∞'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {getComplianceBadge(org.compliance)}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              <span className={cn("text-xs font-bold w-6 text-right", getScoreTextColor(score))}>{score}</span>
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className={cn("h-full rounded-full", getScoreColor(score).split(' ')[0])} style={{ width: `${score}%` }} />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link href={`/admin/organizations/${org.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-black">
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
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
