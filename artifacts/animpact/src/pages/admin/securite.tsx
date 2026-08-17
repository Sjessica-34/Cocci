import { useState } from "react";
import { AdminLayout } from "./layout";
import { useAuditLogs, useAuditLogActions, type AuditLogsParams } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, ChevronLeft, ChevronRight, Filter, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// ─── Labels et couleurs des actions ──────────────────────────────────────────
const ACTION_LABELS: Record<string, string> = {
  "user.export_data": "Export données",
  "user.delete_request": "Demande suppression",
  "user.update_profile": "Modif. profil",
  "user.consent_recorded": "Consentement",
  "org.create": "Création org.",
  "org.update": "Modif. org.",
  "org.delete": "Suppression org.",
  "member.role_change": "Changement rôle",
  "member.remove": "Retrait membre",
  "resource.create": "Création ressource",
  "resource.update": "Modif. ressource",
  "resource.delete": "Suppression ressource",
  "admin.view_audit_logs": "Consultation logs",
  "admin.update_subscription": "Modif. abonnement",
  "admin.update_org": "Modif. org. (admin)",
};

const ACTION_CATEGORIES: Record<string, "security" | "rgpd" | "admin" | "org" | "default"> = {
  "user.export_data": "rgpd",
  "user.delete_request": "rgpd",
  "user.consent_recorded": "rgpd",
  "member.role_change": "security",
  "admin.view_audit_logs": "admin",
  "admin.update_subscription": "admin",
  "admin.update_org": "admin",
};

function actionBadge(action: string) {
  const cat = ACTION_CATEGORIES[action] ?? "default";
  const variants: Record<string, string> = {
    security: "bg-red-50 text-red-700 border-red-200",
    rgpd: "bg-blue-50 text-blue-700 border-blue-200",
    admin: "bg-purple-50 text-purple-700 border-purple-200",
    org: "bg-amber-50 text-amber-700 border-amber-200",
    default: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${variants[cat]}`}
    >
      {ACTION_LABELS[action] ?? action}
    </span>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function AdminSecurite() {
  const [params, setParams] = useState<AuditLogsParams>({ page: 1, limit: 50 });
  const [filters, setFilters] = useState({
    action: "",
    success: "" as "" | "true" | "false",
    orgId: "",
    userId: "",
  });

  const { data, isLoading, refetch } = useAuditLogs(params);
  const { data: actions } = useAuditLogActions();

  function applyFilters() {
    setParams({
      page: 1,
      limit: 50,
      action: filters.action || undefined,
      success: filters.success === "" ? undefined : filters.success === "true",
      orgId: filters.orgId ? Number(filters.orgId) : undefined,
      userId: filters.userId ? Number(filters.userId) : undefined,
    });
  }

  function resetFilters() {
    setFilters({ action: "", success: "", orgId: "", userId: "" });
    setParams({ page: 1, limit: 50 });
  }

  const totalPages = data?.pages ?? 1;
  const currentPage = data?.page ?? 1;

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* En-tête */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Sécurité & journalisation</h1>
            <p className="text-sm text-muted-foreground">
              Journal d'audit des événements importants — accès réservé aux superadmins
            </p>
          </div>
        </div>

        {/* Métriques rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Événements total", value: data?.total ?? "—" },
            {
              label: "Exports RGPD",
              value:
                data?.data?.filter((l) => l.action === "user.export_data").length ?? "—",
            },
            {
              label: "Demandes suppression",
              value:
                data?.data?.filter((l) => l.action === "user.delete_request").length ?? "—",
            },
            {
              label: "Échecs",
              value: data?.data?.filter((l) => !l.success).length ?? "—",
            },
          ].map((m) => (
            <Card key={m.label} className="shadow-none">
              <CardContent className="pt-4 pb-4">
                <p className="text-2xl font-bold">{m.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filtres */}
        <Card className="shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Action */}
              <Select
                value={filters.action}
                onValueChange={(v) => setFilters((f) => ({ ...f, action: v === "all" ? "" : v }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Toutes les actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les actions</SelectItem>
                  {actions?.map((a) => (
                    <SelectItem key={a} value={a}>
                      {ACTION_LABELS[a] ?? a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Succès */}
              <Select
                value={filters.success}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, success: v === "all" ? "" : (v as "true" | "false") }))
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Succès / Échec" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="true">Succès</SelectItem>
                  <SelectItem value="false">Échec</SelectItem>
                </SelectContent>
              </Select>

              {/* Org */}
              <Input
                className="h-8 text-xs"
                placeholder="ID organisation"
                value={filters.orgId}
                onChange={(e) => setFilters((f) => ({ ...f, orgId: e.target.value }))}
                type="number"
              />

              {/* User */}
              <Input
                className="h-8 text-xs"
                placeholder="ID utilisateur"
                value={filters.userId}
                onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
                type="number"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={applyFilters} className="h-7 text-xs">
                Appliquer
              </Button>
              <Button size="sm" variant="ghost" onClick={resetFilters} className="h-7 text-xs">
                Réinitialiser
              </Button>
              <Button size="sm" variant="ghost" onClick={() => refetch()} className="h-7 text-xs gap-1 ml-auto">
                <RefreshCw className="h-3.5 w-3.5" />
                Actualiser
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tableau */}
        <Card className="shadow-none">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 text-center text-muted-foreground text-sm">Chargement…</div>
            ) : !data?.data?.length ? (
              <div className="py-16 text-center text-muted-foreground text-sm">
                Aucun événement trouvé.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b">
                    <tr className="text-muted-foreground">
                      <th className="text-left px-4 py-2.5 font-medium w-36">Date</th>
                      <th className="text-left px-4 py-2.5 font-medium">Action</th>
                      <th className="text-left px-4 py-2.5 font-medium w-16">User</th>
                      <th className="text-left px-4 py-2.5 font-medium w-16">Org</th>
                      <th className="text-left px-4 py-2.5 font-medium w-20">Résultat</th>
                      <th className="text-left px-4 py-2.5 font-medium">Détails</th>
                      <th className="text-left px-4 py-2.5 font-medium w-28">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.map((log) => (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.createdAt), "dd MMM HH:mm:ss", { locale: fr })}
                        </td>
                        <td className="px-4 py-2.5">{actionBadge(log.action)}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {log.userId ?? <span className="italic">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {log.organizationId ?? <span className="italic">—</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          {log.success ? (
                            <span className="flex items-center gap-1 text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" /> OK
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600">
                              <XCircle className="h-3.5 w-3.5" /> Échec
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground max-w-xs truncate">
                          {log.metadata
                            ? (() => {
                                try {
                                  const m = JSON.parse(log.metadata);
                                  return Object.entries(m)
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join(" · ");
                                } catch {
                                  return log.metadata;
                                }
                              })()
                            : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground font-mono">
                          {log.ipAddress ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t px-4 py-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {data?.total ?? 0} événements · page {currentPage} / {totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={currentPage <= 1}
                  onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={currentPage >= totalPages}
                  onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
