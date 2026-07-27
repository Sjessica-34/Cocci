import { Link, useLocation } from "wouter";
import { AdminLayout } from "./layout";
import {
  useGetAdminStats,
  getGetAdminStatsQueryKey,
  useListAdminOrganizations,
  getListAdminOrganizationsQueryKey,
  useListAdminAlerts,
  getListAdminAlertsQueryKey,
} from "@workspace/api-client-react";
import type { AdminOrganization, AdminAlert } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  Users,
  UserCheck,
  DollarSign,
  ArrowUpRight,
  MoreHorizontal,
  CalendarDays,
  ChevronRight,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Ban,
  Activity,
  Network
} from "lucide-react";
import { cn } from "@/lib/utils";

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

function orgInitials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
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

function getSubBadge(status: string | undefined) {
  switch (status) {
    case 'active':
      return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-[10px] px-1.5 py-0">Actif</Badge>;
    case 'trial':
      return <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 text-[10px] px-1.5 py-0">Essai</Badge>;
    case 'suspended':
      return <Badge className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 text-[10px] px-1.5 py-0">Suspendu</Badge>;
    case 'expired':
      return <Badge className="bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200 text-[10px] px-1.5 py-0">Expiré</Badge>;
    default:
      return <Badge className="bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200 text-[10px] px-1.5 py-0">N/A</Badge>;
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
      return <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50/50 text-[10px] font-medium h-5">Données manquantes</Badge>;
    case 'na':
    default:
      return <Badge variant="outline" className="border-border text-muted-foreground bg-muted/50 text-[10px] font-medium h-5">N/A</Badge>;
  }
}

const KPI_CARDS = [
  { label: "Organisations", key: "organizationCount", icon: Building2, color: "text-blue-600", bg: "bg-blue-100/50" },
  { label: "Actifs", key: "activeCount", icon: Activity, color: "text-emerald-600", bg: "bg-emerald-100/50" },
  { label: "En essai", key: "trialCount", icon: Clock, color: "text-amber-600", bg: "bg-amber-100/50" },
  { label: "Suspendus", key: "suspendedCount", icon: Ban, color: "text-rose-600", bg: "bg-rose-100/50" },
  { label: "Groupes", key: "groupCount", icon: Network, color: "text-violet-600", bg: "bg-violet-100/50" },
  { label: "Filiales", key: "subsidiaryCount", icon: Building2, color: "text-indigo-600", bg: "bg-indigo-100/50" },
  { label: "Utilisateurs", key: "userCount", icon: Users, color: "text-sky-600", bg: "bg-sky-100/50" },
  { label: "Alertes", key: "alertCount", icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-100/50" },
] as const;

function OrgRow({ org, index }: { org: AdminOrganization; index: number }) {
  const score = org.healthScore ?? 0;
  const [, navigate] = useLocation();
  return (
    <tr
      className={cn(
        "group transition-colors hover:bg-muted/40 cursor-pointer",
        index !== 0 && "border-t border-border",
      )}
      onClick={() => navigate(`/admin/organizations/${org.id}`)}
    >
      <td className="px-4 py-3">
        <Link href={`/admin/organizations/${org.id}`}>
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
              {orgInitials(org.name)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{org.name}</p>
                {org.type === 'groupe' && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 uppercase tracking-wider bg-violet-50 text-violet-700 border-violet-200">
                    Groupe
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{org.sector || 'Secteur non défini'}</p>
            </div>
          </div>
        </Link>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {getSubBadge(org.subscription?.status)}
      </td>
      <td className="px-4 py-3 text-sm text-foreground">
        {org.subscription?.offerName || <span className="text-muted-foreground text-xs italic">Aucune</span>}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {getComplianceBadge(org.compliance)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full", getScoreColor(score).split(' ')[0])} style={{ width: `${score}%` }} />
          </div>
          <span className={cn("text-xs font-bold", getScoreTextColor(score))}>{score}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
        {org.lastActivityAt ? formatRelative(org.lastActivityAt) : 'Jamais'}
      </td>
      <td className="px-4 py-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <Link href={`/admin/organizations/${org.id}`}>
              <DropdownMenuItem className="text-sm cursor-pointer">
                Voir la fiche
              </DropdownMenuItem>
            </Link>
            <Link href={`/admin/organizations/${org.id}?tab=utilisateurs`}>
              <DropdownMenuItem className="text-sm cursor-pointer">
                Gérer les membres
              </DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

function getAlertConfig(type: AdminAlert['type']) {
  switch (type) {
    case 'expired_subscription':
      return { icon: Ban, color: "text-rose-600", bg: "bg-rose-100", label: "Abonnement expiré" };
    case 'employee_overflow':
      return { icon: Users, color: "text-orange-600", bg: "bg-orange-100", label: "Dépassement d'effectif" };
    case 'suspended':
      return { icon: ShieldAlert, color: "text-rose-600", bg: "bg-rose-100", label: "Compte suspendu" };
    case 'no_admin':
      return { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-100", label: "Aucun administrateur" };
    case 'missing_data':
      return { icon: Activity, color: "text-blue-600", bg: "bg-blue-100", label: "Données manquantes" };
    case 'trial_expiring':
      return { icon: Clock, color: "text-indigo-600", bg: "bg-indigo-100", label: "Essai arrivant à terme" };
    default:
      return { icon: AlertTriangle, color: "text-zinc-600", bg: "bg-zinc-100", label: "Alerte" };
  }
}

export function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useGetAdminStats({
    query: { queryKey: getGetAdminStatsQueryKey() },
  });

  const { data: orgs, isLoading: orgsLoading } = useListAdminOrganizations({
    query: { queryKey: getListAdminOrganizationsQueryKey() },
  });

  const { data: alertsData, isLoading: alertsLoading } = useListAdminAlerts({
    query: { queryKey: getListAdminAlertsQueryKey() },
  });

  const recentOrgs = (orgs ?? [])
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const alerts = alertsData?.slice(0, 8) ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Cockpit de pilotage</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Vue d'ensemble de la flotte de clients et état de santé de la plateforme.</p>
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

        {/* Main Dashboard Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Organizations Table (2/3) */}
          <div className="xl:col-span-2">
            <Card className="h-full flex flex-col overflow-hidden border-border/50">
              <CardHeader className="px-5 py-4 border-b border-border/50 flex-row items-center justify-between space-y-0 bg-muted/20">
                <CardTitle className="text-base font-semibold">Dernières organisations</CardTitle>
                <Link href="/admin/organizations">
                  <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground text-xs hover:text-foreground">
                    Voir la flotte ({orgs?.length ?? "…"})
                    <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                {orgsLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/10">
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Organisation</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Statut</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Offre</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Conformité</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Santé</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Dern. Act.</th>
                          <th className="px-4 py-2.5 w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrgs.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center text-sm text-muted-foreground py-16">
                              Aucune organisation enregistrée.
                            </td>
                          </tr>
                        ) : (
                          recentOrgs.map((org, i) => (
                            <OrgRow key={org.id} org={org} index={i} />
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Alerts Panel (1/3) */}
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
                                {alert.severity === 'critical' && (
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
