import { Link } from "wouter";
import { AdminLayout } from "./layout";
import {
  useGetAdminStats,
  getGetAdminStatsQueryKey,
  useListAdminOrganizations,
  getListAdminOrganizationsQueryKey,
} from "@workspace/api-client-react";
import type { AdminOrganization } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

const ORG_COLORS = [
  "bg-teal-100 text-teal-700",
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-emerald-100 text-emerald-700",
  "bg-orange-100 text-orange-700",
  "bg-sky-100 text-sky-700",
];

function orgColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i);
  return ORG_COLORS[Math.abs(hash) % ORG_COLORS.length];
}

const KPI_CARDS = [
  {
    label: "Organisations",
    description: "Entreprises actives sur la plateforme",
    key: "organizationCount" as const,
    icon: Building2,
    bg: "bg-emerald-100",
    text: "text-emerald-600",
  },
  {
    label: "Utilisateurs",
    description: "Utilisateurs inscrits",
    key: "userCount" as const,
    icon: Users,
    bg: "bg-blue-100",
    text: "text-blue-600",
  },
  {
    label: "Sièges actifs",
    description: "Sièges facturables actifs",
    key: "memberCount" as const,
    icon: UserCheck,
    bg: "bg-amber-100",
    text: "text-amber-600",
  },
  {
    label: "Revenus",
    description: "Revenus générés",
    key: null,
    icon: DollarSign,
    bg: "bg-red-100",
    text: "text-red-500",
  },
] as const;

type StatKey = "organizationCount" | "userCount" | "memberCount";

function StatValue({
  statsLoading,
  statKey,
  stats,
}: {
  statsLoading: boolean;
  statKey: StatKey | null;
  stats: { organizationCount: number; userCount: number; memberCount: number } | undefined;
}) {
  if (!statKey) return <span className="text-3xl font-bold tracking-tight text-foreground">—</span>;
  if (statsLoading) return <Skeleton className="h-9 w-16 mt-1" />;
  return <span className="text-3xl font-bold tracking-tight text-foreground">{stats?.[statKey] ?? 0}</span>;
}

function OrgRow({ org, index }: { org: AdminOrganization; index: number }) {
  const color = orgColor(org.name);
  return (
    <tr
      className={cn(
        "group transition-colors hover:bg-muted/40",
        index !== 0 && "border-t border-border",
      )}
    >
      {/* Organisation */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0", color)}>
            {orgInitials(org.name)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{org.name}</p>
            {org.legalName && org.legalName !== org.name && (
              <p className="text-xs text-muted-foreground truncate">{org.legalName}</p>
            )}
          </div>
        </div>
      </td>
      {/* Statut */}
      <td className="px-4 py-3">
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-medium px-2 py-0.5 border">
          Actif
        </Badge>
      </td>
      {/* Utilisateurs */}
      <td className="px-4 py-3 text-sm text-foreground font-medium text-center">
        {org.memberCount}
      </td>
      {/* Sièges */}
      <td className="px-4 py-3 text-sm text-foreground font-medium text-center">
        {org.memberCount}
      </td>
      {/* Revenus */}
      <td className="px-4 py-3 text-sm text-muted-foreground text-center">—</td>
      {/* Dernière activité */}
      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
        {formatRelative(org.createdAt)}
      </td>
      {/* Actions */}
      <td className="px-4 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <Link href={`/admin/organizations/${org.id}`}>
              <DropdownMenuItem className="text-sm cursor-pointer">
                Voir la fiche
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem className="text-sm cursor-pointer">
              Membres
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

type ActivityItem = {
  id: number;
  label: string;
  sub: string;
  time: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
};

function ActivityFeed({ orgs }: { orgs: AdminOrganization[] | undefined }) {
  const items: ActivityItem[] = (orgs ?? [])
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)
    .map((org) => ({
      id: org.id,
      label: `${org.name} a été créée`,
      sub: org.sector ?? org.size ?? "Nouvelle organisation",
      time: formatRelative(org.createdAt),
      icon: Building2,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    }));

  if (!items.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">Aucune activité récente.</p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-3 py-3 px-1">
          <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", item.iconBg)}>
            <item.icon className={cn("h-4 w-4", item.iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-foreground leading-snug line-clamp-2">
              {item.label}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
          </div>
          <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
            {item.time}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useGetAdminStats({
    query: { queryKey: getGetAdminStatsQueryKey() },
  });

  const { data: orgs, isLoading: orgsLoading } = useListAdminOrganizations({
    query: { queryKey: getListAdminOrganizationsQueryKey() },
  });

  const recentOrgs = (orgs ?? [])
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Vue d'ensemble</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Statistiques globales de la plateforme cocci.</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            30 derniers jours
            <ChevronRight className="h-3.5 w-3.5 rotate-90" />
          </Button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI_CARDS.map((card) => (
            <Card key={card.label} className="overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                    <div className="mt-1.5">
                      <StatValue
                        statsLoading={statsLoading}
                        statKey={card.key ?? null}
                        stats={stats}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                  <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", card.bg)}>
                    <card.icon className={cn("h-5 w-5", card.text)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Org table — 2/3 */}
          <div className="xl:col-span-2">
            <Card className="overflow-hidden">
              <CardHeader className="px-4 py-4 border-b border-border flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base font-semibold">Organisations récentes</CardTitle>
                <Link href="/admin/organizations">
                  <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground text-xs">
                    Voir toutes ({orgs?.length ?? "…"})
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {orgsLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Organisation</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Statut</th>
                          <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">Utilisateurs</th>
                          <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">Sièges</th>
                          <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">Revenus</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Dernière activité</th>
                          <th className="px-4 py-2.5 w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrgs.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center text-sm text-muted-foreground py-12">
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
                    {recentOrgs.length > 0 && (
                      <div className="border-t border-border px-4 py-3 text-center">
                        <Link href="/admin/organizations">
                          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1">
                            Voir toutes les organisations
                            <ArrowUpRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Activity feed — 1/3 */}
          <div>
            <Card className="overflow-hidden">
              <CardHeader className="px-4 py-4 border-b border-border flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base font-semibold">Activité récente</CardTitle>
                {!orgsLoading && (
                  <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground text-xs">
                    Voir tout
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-4">
                {orgsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex gap-3">
                        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-3.5 w-full" />
                          <Skeleton className="h-3 w-2/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <ActivityFeed orgs={orgs} />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
