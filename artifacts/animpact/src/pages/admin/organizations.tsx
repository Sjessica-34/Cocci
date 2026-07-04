import { useState } from "react";
import { AdminLayout } from "./layout";
import {
  useListAdminOrganizations,
  getListAdminOrganizationsQueryKey,
  useListAdminOrgMembers,
  getListAdminOrgMembersQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building2, Search, Users, ChevronRight, Shield, ExternalLink } from "lucide-react";
import { Link } from "wouter";

const SIZE_COLORS: Record<string, string> = {
  TPE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PME: "bg-blue-50 text-blue-700 border-blue-200",
  ETI: "bg-violet-50 text-violet-700 border-violet-200",
  GE: "bg-orange-50 text-orange-700 border-orange-200",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  member: "Membre",
  viewer: "Lecteur",
};

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-primary/10 text-primary border-primary/20",
  admin: "bg-blue-50 text-blue-700 border-blue-200",
  member: "bg-green-50 text-green-700 border-green-200",
  viewer: "bg-muted text-muted-foreground border-border",
};

function OrgMembersDialog({ orgId, orgName, open, onClose }: { orgId: number; orgName: string; open: boolean; onClose: () => void }) {
  const { data: members, isLoading } = useListAdminOrgMembers(orgId, {
    query: { enabled: open && !!orgId, queryKey: getListAdminOrgMembersQueryKey(orgId) },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Membres — {orgName}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : !members?.length ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucun membre.</p>
        ) : (
          <div className="divide-y divide-border">
            {members.map((m) => {
              const displayName = [m.user.firstName, m.user.lastName].filter(Boolean).join(" ") || m.user.email;
              return (
                <div key={m.id} className="flex items-center gap-3 py-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={m.user.avatarUrl || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate flex items-center gap-1.5">
                      {displayName}
                      {m.user.isSuperAdmin && (
                        <Shield className="h-3 w-3 text-destructive shrink-0" />
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                  </div>
                  <Badge variant="outline" className={`text-xs shrink-0 ${ROLE_COLORS[m.role] ?? ""}`}>
                    {ROLE_LABELS[m.role] ?? m.role}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AdminOrganizations() {
  const [search, setSearch] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<{ id: number; name: string } | null>(null);

  const { data: orgs, isLoading } = useListAdminOrganizations({
    query: { queryKey: getListAdminOrganizationsQueryKey() },
  });

  const filtered = orgs?.filter((o) =>
    [o.name, o.legalName, o.siret, o.sector].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Organisations</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {orgs?.length ?? 0} organisation{(orgs?.length ?? 0) > 1 ? "s" : ""} sur la plateforme
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : !filtered?.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <Building2 className="mx-auto h-10 w-10 opacity-30 mb-3" />
            <p className="text-sm">Aucune organisation trouvée.</p>
          </div>
        ) : (
          <Card>
            <div className="divide-y divide-border">
              {filtered.map((org) => (
                <div key={org.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors">
                  <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                    {org.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground truncate">{org.name}</p>
                      {org.size && (
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${SIZE_COLORS[org.size] ?? ""}`}>
                          {org.size}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {org.sector || "Secteur non renseigné"}
                      {org.siret ? ` · SIRET ${org.siret}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span className="font-medium">{org.memberCount}</span>
                      <span>siège{org.memberCount > 1 ? "s" : ""}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setSelectedOrg({ id: org.id, name: org.name })}
                    >
                      Membres <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                    <Link href={`/admin/organizations/${org.id}`}>
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        Fiche <ExternalLink className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {selectedOrg && (
        <OrgMembersDialog
          orgId={selectedOrg.id}
          orgName={selectedOrg.name}
          open={!!selectedOrg}
          onClose={() => setSelectedOrg(null)}
        />
      )}
    </AdminLayout>
  );
}
