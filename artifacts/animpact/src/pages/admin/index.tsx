import { useState, useMemo } from "react";
import { Link } from "wouter";
import { AdminLayout } from "./layout";
import {
  useGetAdminStats,
  getGetAdminStatsQueryKey,
  useListAdminOrganizations,
  getListAdminOrganizationsQueryKey,
  useListAdminAlerts,
  getListAdminAlertsQueryKey,
} from "@workspace/api-client-react";
import type { AdminAlert } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Users,
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Ban,
  Activity,
  Network,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildHierarchy,
  IndepRow,
  GroupHeaderRow,
  SubsidiaryRow,
} from "./_org-rows";
import type { ClientEntry } from "./_org-rows";

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "À l'instant";
  if (diffSec < 3600) return `Il y a ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `Il y a ${Math.floor(diffSec / 3600)} h`;
  if (diffSec < 86400 * 7) return `Il y a ${Math.floor(diffSec / 86400)} j`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const KPI_CARDS = [
  { label: "Organisations", key: "organizationCount", icon: Building2, color: "text-blue-600",   bg: "bg-blue-100/50" },
  { label: "Actifs",        key: "activeCount",       icon: Activity,  color: "text-emerald-600", bg: "bg-emerald-100/50" },
  { label: "En essai",      key: "trialCount",        icon: Clock,     color: "text-amber-600",   bg: "bg-amber-100/50" },
  { label: "Suspendus",     key: "suspendedCount",    icon: Ban,       color: "text-rose-600",    bg: "bg-rose-100/50" },
  { label: "Groupes",       key: "groupCount",        icon: Network,   color: "text-violet-600",  bg: "bg-violet-100/50" },
  { label: "Filiales",      key: "subsidiaryCount",   icon: Building2, color: "text-indigo-600",  bg: "bg-indigo-100/50" },
  { label: "Utilisateurs",  key: "userCount",         icon: Users,     color: "text-sky-600",     bg: "bg-sky-100/50" },
  { label: "Alertes",       key: "alertCount",        icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-100/50" },
] as const;

function getAlertConfig(type: AdminAlert["type"]) {
  switch (type) {
    case "expired_subscription": return { icon: Ban,           color: "text-rose-600",   bg: "bg-rose-100",   label: "Abonnement expiré" };
    case "employee_overflow":    return { icon: Users,         color: "text-orange-600", bg: "bg-orange-100", label: "Dépassement d'effectif" };
    case "suspended":            return { icon: ShieldAlert,   color: "text-rose-600",   bg: "bg-rose-100",   label: "Compte suspendu" };
    case "no_admin":             return { icon: AlertTriangle, color: "text-amber-600",  bg: "bg-amber-100",  label: "Aucun administrateur" };
    case "missing_data":         return { icon: Activity,      color: "text-blue-600",   bg: "bg-blue-100",   label: "Données manquantes" };
    case "trial_expiring":       return { icon: Clock,         color: "text-indigo-600", bg: "bg-indigo-100", label: "Essai arrivant à terme" };
    default:                     return { icon: AlertTriangle, color: "text-zinc-600",   bg: "bg-zinc-100",   label: "Alerte" };
  }
}

export function AdminDashboard() {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const { data: stats, isLoading: statsLoading } = useGetAdminStats({
    query: { queryKey: getGetAdminStatsQueryKey() },
  });
  const { data: orgs, isLoading: orgsLoading } = useListAdminOrganizations({
    query: { queryKey: getListAdminOrganizationsQueryKey() },
  });
  const { data: alertsData, isLoading: alertsLoading } = useListAdminAlerts({
    query: { queryKey: getListAdminAlertsQueryKey() },
  });

  // ── Build hierarchy ───────────────────────────────────────────────────────
  const { clients } = useMemo(() => {
    if (!orgs) return { clients: [] as ClientEntry[] };
    return buildHierarchy(orgs);
  }, [orgs]);

  const isExpanded = (id: number) => expandedIds.has(id);
  function toggle(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const alerts = alertsData?.slice(0, 8) ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Cockpit de pilotage</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Vue d'ensemble de la flotte de clients et état de santé de la plateforme.
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 bg-white dark:bg-black text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            30 derniers jours
            <ChevronRight className="h-3.5 w-3.5 rotate-90" />
          </Button>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {KPI_CARDS.map((card) => (
            <Card key={card.label} className="overflow-hidden border-border/50 bg-card">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", card.bg)}>
                  <card.icon className={cn("h-5 w-5", card.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</p>
                  {statsLoading ? (
                    <Skeleton className="h-7 w-12 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold tracking-tight text-foreground leading-none mt-1">
                      {stats?.[card.key as keyof typeof stats] ?? 0}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Hierarchical org table (2/3) */}
          <div className="xl:col-span-2">
            <Card className="h-full flex flex-col overflow-hidden border-border/50">
              <CardHeader className="px-5 py-4 border-b border-border/50 flex-row items-center justify-between space-y-0 bg-muted/20">
                <CardTitle className="text-base font-semibold">Flotte client</CardTitle>
                <Link href="/admin/organizations">
                  <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground text-xs hover:text-foreground">
                    Voir tout ({orgs?.length ?? "…"})
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                {orgsLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : clients.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                    Aucune organisation enregistrée.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/10">
                          <th className="px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Client</th>
                          <th className="px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Statut</th>
                          <th className="px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Abonnement</th>
                          <th className="px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Utilisateurs</th>
                          <th className="px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Conformité</th>
                          <th className="px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Santé</th>
                          <th className="px-5 py-2.5 w-10" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {clients.map((entry) => {
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
                )}
              </CardContent>
            </Card>
          </div>

          {/* Alerts panel (1/3) */}
          <div className="xl:col-span-1">
            <Card className="h-full flex flex-col overflow-hidden border-border/50">
              <CardHeader className="px-5 py-4 border-b border-border/50 flex-row items-center justify-between space-y-0 bg-muted/20">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold">Alertes actives</CardTitle>
                  {!alertsLoading && alerts.length > 0 && (
                    <Badge className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-2 py-0 h-5 text-xs">
                      {alerts.length}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-y-auto">
                {alertsLoading ? (
                  <div className="p-4 space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex gap-3">
                        <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                        <div className="flex-1 space-y-2 py-1">
                          <Skeleton className="h-3.5 w-full" />
                          <Skeleton className="h-3 w-2/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-center px-4">
                    <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                      <ShieldAlert className="h-6 w-6 text-emerald-600" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Aucune alerte</p>
                    <p className="text-xs text-muted-foreground mt-1">Tous les indicateurs sont au vert.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {alerts.map((alert, i) => {
                      const config = getAlertConfig(alert.type);
                      return (
                        <Link key={i} href={`/admin/organizations/${alert.organizationId}`}>
                          <div className="group flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors cursor-pointer">
                            <div className={cn("h-9 w-9 rounded-full flex items-center justify-center shrink-0 mt-0.5", config.bg)}>
                              <config.icon className={cn("h-4.5 w-4.5", config.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                  {alert.organizationName}
                                </p>
                                {alert.severity === "critical" && (
                                  <Badge className="bg-rose-500/10 text-rose-600 border-rose-200/50 hover:bg-rose-500/20 text-[9px] px-1.5 py-0 h-4 shrink-0">
                                    Critique
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[13px] font-medium text-foreground mt-0.5">{config.label}</p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                {alert.message}
                              </p>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
