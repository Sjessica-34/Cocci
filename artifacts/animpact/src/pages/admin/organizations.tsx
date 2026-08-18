import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "./layout";
import {
  useListAdminOrganizations,
  getListAdminOrganizationsQueryKey,
  useCreateAdminOrganization,
} from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildHierarchy,
  IndepRow,
  GroupHeaderRow,
  SubsidiaryRow,
} from "./_org-rows";
import type { AdminOrganization } from "@workspace/api-client-react";
import type { ClientEntry } from "./_org-rows";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterStatus = "all" | "active" | "trial" | "suspended" | "expired" | "overflow";

interface CreateOrgForm {
  name: string;
  siren: string;
  sector: string;
  size: string;
}

const EMPTY_FORM: CreateOrgForm = { name: "", siren: "", sector: "", size: "" };

// ─── Create Organisation Modal ────────────────────────────────────────────────

function CreateOrgModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CreateOrgForm>(EMPTY_FORM);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createOrg = useCreateAdminOrganization({
    mutation: {
      onSuccess: (newOrg) => {
        queryClient.invalidateQueries({ queryKey: getListAdminOrganizationsQueryKey() });
        toast({ title: `Organisation « ${newOrg.name} » créée avec succès.` });
        setForm(EMPTY_FORM);
        onClose();
        navigate(`/admin/organizations/${newOrg.id}`);
      },
      onError: () => {
        toast({ variant: "destructive", title: "Erreur lors de la création de l'organisation." });
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    createOrg.mutate({
      data: {
        name: form.name.trim(),
        ...(form.siren.trim() ? { siren: form.siren.trim() } : {}),
        ...(form.sector.trim() ? { sector: form.sector.trim() } : {}),
        ...(form.size ? { size: form.size } : {}),
      },
    });
  }

  function handleClose() {
    if (createOrg.isPending) return;
    setForm(EMPTY_FORM);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle organisation</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Nom */}
          <div className="space-y-2">
            <Label htmlFor="org-name" className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Nom <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="org-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Acme SAS"
              autoFocus
              required
              className="bg-background"
            />
          </div>

          {/* SIREN */}
          <div className="space-y-2">
            <Label htmlFor="org-siren" className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              SIREN <span className="text-muted-foreground/60 font-normal normal-case">(optionnel)</span>
            </Label>
            <Input
              id="org-siren"
              value={form.siren}
              onChange={(e) => setForm((f) => ({ ...f, siren: e.target.value }))}
              placeholder="123 456 789"
              className="bg-background font-mono"
              maxLength={14}
            />
          </div>

          {/* Secteur + Taille */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="org-sector" className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Secteur
              </Label>
              <Input
                id="org-sector"
                value={form.sector}
                onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
                placeholder="Industrie, IT…"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Taille
              </Label>
              <Select value={form.size} onValueChange={(v) => setForm((f) => ({ ...f, size: v }))}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TPE">TPE</SelectItem>
                  <SelectItem value="PME">PME</SelectItem>
                  <SelectItem value="ETI">ETI</SelectItem>
                  <SelectItem value="GE">GE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={createOrg.isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={!form.name.trim() || createOrg.isPending}>
              {createOrg.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer l'organisation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function AdminOrganizations() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);

  const { data: orgs, isLoading } = useListAdminOrganizations({
    query: { queryKey: getListAdminOrganizationsQueryKey() },
  });

  // ── Build hierarchical structure ──────────────────────────────────────────
  const { clients, stats } = useMemo(() => {
    if (!orgs) return { clients: [] as ClientEntry[], stats: { clients: 0, groups: 0, indeps: 0, subsidiaries: 0 } };
    return buildHierarchy(orgs);
  }, [orgs]);

  // ── Filter + search ───────────────────────────────────────────────────────
  const { filteredClients, autoExpanded } = useMemo(() => {
    const q = search.toLowerCase().trim();

    const matchOrg = (o: AdminOrganization) => {
      const textMatch = !q || [o.name, o.legalName, o.siret, o.sector].some((v) => v?.toLowerCase().includes(q));
      let statusMatch = true;
      if (filter === "active")    statusMatch = o.subscription?.status === "active";
      if (filter === "trial")     statusMatch = o.subscription?.status === "trial";
      if (filter === "suspended") statusMatch = o.subscription?.status === "suspended";
      if (filter === "expired")   statusMatch = o.subscription?.status === "expired";
      if (filter === "overflow")  statusMatch = o.compliance?.status === "overflow";
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
          if (!groupMatches && matchingChildren.length > 0) newAutoExpanded.add(entry.org.id);
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
    setExpandedIds(new Set(filteredClients.filter((e) => e.kind === "group").map((e) => e.org.id)));
  }

  function collapseAll() {
    setExpandedIds(new Set());
    autoExpanded.clear();
  }

  const hasGroups  = filteredClients.some((e) => e.kind === "group");
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
            <Button
              size="sm"
              className="shrink-0"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Nouvelle organisation
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2 no-scrollbar">
          <Filter className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
          {[
            { id: "all",       label: "Tous" },
            { id: "active",    label: "Actifs" },
            { id: "trial",     label: "En essai" },
            { id: "suspended", label: "Suspendus" },
            { id: "expired",   label: "Expirés" },
            { id: "overflow",  label: "Non conformes" },
          ].map((f) => (
            <Button
              key={f.id}
              variant={filter === f.id ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "rounded-full h-8 text-xs font-medium px-4 shrink-0 transition-colors",
                filter === f.id
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-muted/50",
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

      {/* Create organisation modal */}
      <CreateOrgModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </AdminLayout>
  );
}
