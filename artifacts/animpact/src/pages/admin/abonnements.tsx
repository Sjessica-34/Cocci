import { useState, useMemo, useEffect } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "./layout";
import {
  customFetch,
  useListAdminOrganizations,
  getListAdminOrganizationsQueryKey,
  useUpsertAdminSubscription,
  getGetAdminSubscriptionQueryKey,
  getGetAdminOrganizationQueryKey,
} from "@workspace/api-client-react";
import type { AdminOrganization } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  ExternalLink,
  Activity,
  Clock,
  Ban,
  CreditCard,
  Gift,
  Monitor,
  FileText,
  Building2,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const MODE_LABELS: Record<string, string> = {
  stripe: "Stripe",
  invoice: "Facture",
  free: "Gratuit",
  demo: "Démo",
};

const MODE_COLORS: Record<string, string> = {
  stripe: "bg-[#635BFF]/10 text-[#635BFF] border-[#635BFF]/20",
  invoice: "bg-blue-50 text-blue-700 border-blue-200",
  free: "bg-emerald-50 text-emerald-700 border-emerald-200",
  demo: "bg-violet-50 text-violet-700 border-violet-200",
};

const MODE_ICONS: Record<string, typeof CreditCard> = {
  stripe: CreditCard,
  invoice: FileText,
  free: Gift,
  demo: Monitor,
};

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  trial: "Essai",
  suspended: "Suspendu",
  expired: "Expiré",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  trial: "bg-amber-50 text-amber-700 border-amber-200",
  suspended: "bg-rose-50 text-rose-700 border-rose-200",
  expired: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

const STATUS_ICONS: Record<string, typeof Activity> = {
  active: Activity,
  trial: Clock,
  suspended: Ban,
  expired: Ban,
};

type FilterMode = "all" | "stripe" | "invoice" | "free" | "demo";
type FilterStatus = "all" | "active" | "trial" | "suspended" | "expired" | "none";

// ─── Stripe dashboard URL ─────────────────────────────────────────────────────

function stripeCustomerUrl(customerId: string): string {
  return `https://dashboard.stripe.com/customers/${customerId}`;
}

function stripeSubscriptionUrl(subId: string): string {
  return `https://dashboard.stripe.com/subscriptions/${subId}`;
}

// ─── Edit Dialog ──────────────────────────────────────────────────────────────

interface EditDialogProps {
  org: AdminOrganization;
  open: boolean;
  onClose: () => void;
}

function EditDialog({ org, open, onClose }: EditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const upsertSub = useUpsertAdminSubscription();
  const sub = org.subscription;

  const [form, setForm] = useState({
    mode: sub?.mode ?? "free",
    status: sub?.status ?? "active",
    offerName: sub?.offerName ?? "",
    maxEmployees: sub?.maxEmployees != null ? String(sub.maxEmployees) : "",
    maxUsers: sub?.maxUsers != null ? String(sub.maxUsers) : "",
    startAt: sub?.startAt?.split("T")[0] ?? "",
    endAt: sub?.endAt?.split("T")[0] ?? "",
    trialStartAt: sub?.trialStartAt?.split("T")[0] ?? "",
    trialEndAt: sub?.trialEndAt?.split("T")[0] ?? "",
    notes: sub?.notes ?? "",
  });

  const isStripe = form.mode === "stripe";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: Record<string, unknown> = {
      ...form,
      maxEmployees: form.maxEmployees ? Number(form.maxEmployees) : null,
      maxUsers: form.maxUsers ? Number(form.maxUsers) : null,
      startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
      endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
      trialStartAt: form.trialStartAt ? new Date(form.trialStartAt).toISOString() : null,
      trialEndAt: form.trialEndAt ? new Date(form.trialEndAt).toISOString() : null,
    };
    Object.keys(data).forEach((k) => { if (data[k] === "") data[k] = null; });

    upsertSub.mutate(
      { id: org.id, data: data as any },
      {
        onSuccess: () => {
          toast({ title: "Abonnement mis à jour." });
          queryClient.invalidateQueries({ queryKey: getListAdminOrganizationsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAdminSubscriptionQueryKey(org.id) });
          queryClient.invalidateQueries({ queryKey: getGetAdminOrganizationQueryKey(org.id) });
          onClose();
        },
        onError: () => toast({ variant: "destructive", title: "Erreur de mise à jour." }),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Abonnement — {org.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Mode</Label>
              <Select value={form.mode} onValueChange={(v) => setForm((f) => ({ ...f, mode: v as typeof f.mode }))} disabled={isStripe}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="invoice">Facture</SelectItem>
                  <SelectItem value="free">Gratuit</SelectItem>
                  <SelectItem value="demo">Démo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Statut</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as typeof f.status }))} disabled={isStripe}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="trial">En essai</SelectItem>
                  <SelectItem value="suspended">Suspendu</SelectItem>
                  <SelectItem value="expired">Expiré</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Nom de l'offre</Label>
            <Input value={form.offerName} onChange={(e) => setForm((f) => ({ ...f, offerName: e.target.value }))} disabled={isStripe} className="bg-background" placeholder="Ex : Starter, Pro, Entreprise…" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Sièges max</Label>
              <Input type="number" min={0} value={form.maxUsers} onChange={(e) => setForm((f) => ({ ...f, maxUsers: e.target.value }))} disabled={isStripe} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Effectif max</Label>
              <Input type="number" min={0} value={form.maxEmployees} onChange={(e) => setForm((f) => ({ ...f, maxEmployees: e.target.value }))} disabled={isStripe} className="bg-background" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Début</Label>
              <Input type="date" value={form.startAt} onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))} disabled={isStripe} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Fin</Label>
              <Input type="date" value={form.endAt} onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))} disabled={isStripe} className="bg-background" />
            </div>
          </div>

          {(form.status === "trial" || form.trialStartAt || form.trialEndAt) && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Début essai</Label>
                <Input type="date" value={form.trialStartAt} onChange={(e) => setForm((f) => ({ ...f, trialStartAt: e.target.value }))} disabled={isStripe} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Fin essai</Label>
                <Input type="date" value={form.trialEndAt} onChange={(e) => setForm((f) => ({ ...f, trialEndAt: e.target.value }))} disabled={isStripe} className="bg-background" />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Notes internes</Label>
            <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="bg-background" placeholder="Commentaire admin…" />
          </div>

          {isStripe && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              Cet abonnement est géré par Stripe. Les champs verrouillés se mettent à jour automatiquement via webhook.
            </p>
          )}

          {sub?.stripeCustomerId && (
            <div className="flex items-center gap-2 pt-1">
              <a
                href={stripeCustomerUrl(sub.stripeCustomerId)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#635BFF] hover:underline font-medium"
              >
                <CreditCard className="h-3.5 w-3.5" />
                Voir le client dans Stripe
                <ExternalLink className="h-3 w-3" />
              </a>
              {sub.stripeSubscriptionId && (
                <a
                  href={stripeSubscriptionUrl(sub.stripeSubscriptionId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#635BFF] hover:underline font-medium"
                >
                  · Voir l'abonnement
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={upsertSub.isPending}>
              {upsertSub.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Quick Status/Mode selects (inline) ───────────────────────────────────────

interface QuickSelectProps {
  orgId: number;
  field: "mode" | "status";
  value: string;
  disabled?: boolean;
  onSaved: () => void;
}

function QuickSelect({ orgId, field, value, disabled, onSaved }: QuickSelectProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const upsertSub = useUpsertAdminSubscription();
  const [current, setCurrent] = useState(value);

  function handleChange(v: string) {
    setCurrent(v);
    upsertSub.mutate(
      { id: orgId, data: { [field]: v } as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAdminOrganizationsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAdminOrganizationQueryKey(orgId) });
          onSaved();
        },
        onError: () => {
          setCurrent(value);
          toast({ variant: "destructive", title: "Erreur de mise à jour." });
        },
      },
    );
  }

  const colors = field === "mode" ? MODE_COLORS : STATUS_COLORS;
  const labels = field === "mode" ? MODE_LABELS : STATUS_LABELS;

  return (
    <Select value={current} onValueChange={handleChange} disabled={disabled || upsertSub.isPending}>
      <SelectTrigger
        className={cn(
          "h-7 text-xs border px-2 py-0 w-28 font-medium rounded-md",
          colors[current] ?? "bg-muted text-muted-foreground border-border",
          "focus:ring-0 focus:ring-offset-0",
        )}
      >
        <SelectValue>{labels[current] ?? current}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {field === "mode" ? (
          <>
            <SelectItem value="stripe">Stripe</SelectItem>
            <SelectItem value="invoice">Facture</SelectItem>
            <SelectItem value="free">Gratuit</SelectItem>
            <SelectItem value="demo">Démo</SelectItem>
          </>
        ) : (
          <>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="trial">Essai</SelectItem>
            <SelectItem value="suspended">Suspendu</SelectItem>
            <SelectItem value="expired">Expiré</SelectItem>
          </>
        )}
      </SelectContent>
    </Select>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function OrgSubRow({ org, onEdit }: { org: AdminOrganization; onEdit: (org: AdminOrganization) => void }) {
  const sub = org.subscription;
  const mode = sub?.mode ?? "free";
  const status = sub?.status ?? "active";
  const ModeIcon = MODE_ICONS[mode] ?? Gift;
  const StatusIcon = STATUS_ICONS[status] ?? Activity;

  const endAt = sub?.endAt
    ? new Date(sub.endAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
    : null;

  const trialEndAt = sub?.trialEndAt
    ? new Date(sub.trialEndAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
    : null;

  const isStripe = mode === "stripe";

  // Days left for trial
  let trialDaysLeft: number | null = null;
  if (status === "trial" && sub?.trialEndAt) {
    trialDaysLeft = Math.ceil((new Date(sub.trialEndAt).getTime() - Date.now()) / 86400000);
  }

  return (
    <tr className="border-b border-border/50 hover:bg-muted/20 transition-colors group">
      {/* Organisation */}
      <td className="px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/5 border border-border/60 flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4 text-primary/70" />
          </div>
          <div>
            <Link href={`/admin/organizations/${org.id}`}>
              <span className="text-sm font-semibold text-foreground hover:text-primary transition-colors cursor-pointer">
                {org.name}
              </span>
            </Link>
            {org.contactEmail && (
              <p className="text-xs text-muted-foreground truncate max-w-[180px]">{org.contactEmail}</p>
            )}
          </div>
        </div>
      </td>

      {/* Mode */}
      <td className="px-5 py-3">
        <div className="flex items-center gap-1.5">
          <ModeIcon className={cn("h-3.5 w-3.5 shrink-0", MODE_COLORS[mode]?.split(" ")[1] ?? "text-muted-foreground")} />
          <QuickSelect
            orgId={org.id}
            field="mode"
            value={mode}
            disabled={isStripe}
            onSaved={() => {}}
          />
        </div>
      </td>

      {/* Statut */}
      <td className="px-5 py-3">
        <div className="flex items-center gap-1.5">
          <StatusIcon className={cn("h-3.5 w-3.5 shrink-0", STATUS_COLORS[status]?.split(" ")[1] ?? "text-muted-foreground")} />
          <QuickSelect
            orgId={org.id}
            field="status"
            value={status}
            disabled={isStripe}
            onSaved={() => {}}
          />
        </div>
      </td>

      {/* Offre */}
      <td className="px-5 py-3">
        <span className="text-sm text-foreground">{sub?.offerName || <span className="text-muted-foreground/50 italic text-xs">—</span>}</span>
      </td>

      {/* Expiration */}
      <td className="px-5 py-3">
        {status === "trial" && trialEndAt ? (
          <div>
            <span className={cn("text-xs font-medium", trialDaysLeft !== null && trialDaysLeft <= 3 ? "text-rose-600" : trialDaysLeft !== null && trialDaysLeft <= 7 ? "text-amber-600" : "text-foreground")}>
              {trialEndAt}
            </span>
            {trialDaysLeft !== null && trialDaysLeft >= 0 && (
              <p className="text-[10px] text-muted-foreground">encore {trialDaysLeft}j</p>
            )}
          </div>
        ) : endAt ? (
          <span className="text-xs text-foreground">{endAt}</span>
        ) : (
          <span className="text-muted-foreground/50 italic text-xs">—</span>
        )}
      </td>

      {/* Stripe */}
      <td className="px-5 py-3">
        {sub?.stripeCustomerId ? (
          <a
            href={stripeCustomerUrl(sub.stripeCustomerId)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[#635BFF] hover:underline font-medium group/stripe"
          >
            <span className="font-mono text-[11px] text-muted-foreground group-hover/stripe:text-[#635BFF]">
              {sub.stripeCustomerId.slice(0, 14)}…
            </span>
            <ExternalLink className="h-3 w-3 opacity-0 group-hover/stripe:opacity-100 transition-opacity" />
          </a>
        ) : (
          <span className="text-muted-foreground/50 italic text-xs">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2.5 text-xs"
            onClick={() => onEdit(org)}
          >
            Modifier
          </Button>
          <Link href={`/admin/organizations/${org.id}`}>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </td>
    </tr>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ orgs }: { orgs: AdminOrganization[] }) {
  const stats = useMemo(() => {
    let active = 0, trial = 0, suspended = 0, expired = 0, none = 0, stripe = 0;
    for (const org of orgs) {
      const sub = org.subscription;
      if (!sub) { none++; continue; }
      if (sub.mode === "stripe") stripe++;
      if (sub.status === "active") active++;
      else if (sub.status === "trial") trial++;
      else if (sub.status === "suspended") suspended++;
      else if (sub.status === "expired") expired++;
    }
    return { active, trial, suspended, expired, none, stripe };
  }, [orgs]);

  const items = [
    { label: "Actifs", value: stats.active, color: "text-emerald-600", bg: "bg-emerald-100/60" },
    { label: "Essai", value: stats.trial, color: "text-amber-600", bg: "bg-amber-100/60" },
    { label: "Suspendus", value: stats.suspended, color: "text-rose-600", bg: "bg-rose-100/60" },
    { label: "Expirés", value: stats.expired, color: "text-zinc-500", bg: "bg-zinc-100/60" },
    { label: "Sans abonnement", value: stats.none, color: "text-muted-foreground", bg: "bg-muted/60" },
    { label: "Via Stripe", value: stats.stripe, color: "text-[#635BFF]", bg: "bg-[#635BFF]/10" },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {items.map(({ label, value, color, bg }) => (
        <div key={label} className={cn("rounded-xl px-4 py-3 flex flex-col gap-0.5", bg)}>
          <span className={cn("text-2xl font-bold tracking-tight", color)}>{value}</span>
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function AdminAbonnements() {
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [editOrg, setEditOrg] = useState<AdminOrganization | null>(null);
  const [giftEmail, setGiftEmail] = useState("");
  const [giftEffectif, setGiftEffectif] = useState("1-5");
  const [giftDuration, setGiftDuration] = useState("1");
  const [giftSendEmail, setGiftSendEmail] = useState(true);
  const [giftLink, setGiftLink] = useState("");
  const [giftError, setGiftError] = useState("");
  const [giftBusy, setGiftBusy] = useState(false);
  const [giftInvites, setGiftInvites] = useState<Array<{id:number;email:string;offerName:string;durationMonths:number|null;expiresAt:string;claimedAt:string|null;revokedAt:string|null}>>([]);

  const { data: orgs, isLoading, refetch } = useListAdminOrganizations({
    query: { queryKey: getListAdminOrganizationsQueryKey() },
  });

  const refreshGiftInvites = async () => {
    try { setGiftInvites(await customFetch<typeof giftInvites>("/api/admin/gift-invitations")); }
    catch { setGiftError("Impossible de charger les invitations."); }
  };
  useEffect(() => { void refreshGiftInvites(); }, []);

  const createGiftInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setGiftBusy(true);
    setGiftError("");
    try {
      const result = await customFetch<{url:string;emailSent:boolean}>("/api/admin/gift-invitations", {
        method: "POST",
        body: JSON.stringify({
          email: giftEmail,
          effectifKey: giftEffectif,
          durationMonths: giftDuration === "unlimited" ? null : Number(giftDuration),
          sendEmail: giftSendEmail,
        }),
      });
      setGiftLink(result.url);
      setGiftEmail("");
      await refreshGiftInvites();
      if (giftSendEmail && !result.emailSent) setGiftError("Invitation créée, mais l’e-mail n’a pas pu être envoyé. Copiez le lien.");
    } catch { setGiftError("Impossible de créer l’invitation. Vérifiez l’adresse e-mail et réessayez."); }
    finally { setGiftBusy(false); }
  };

  const revokeGiftInvite = async (id: number) => {
    try {
      await customFetch(`/api/admin/gift-invitations/${id}`, { method: "DELETE" });
      await refreshGiftInvites();
    } catch { setGiftError("Cette invitation ne peut plus être révoquée."); }
  };

  const filtered = useMemo(() => {
    if (!orgs) return [];
    const q = search.toLowerCase().trim();
    return orgs.filter((org) => {
      const sub = org.subscription;
      const mode = sub?.mode ?? "free";
      const status = sub?.status ?? "active";

      if (q && ![org.name, org.contactEmail, sub?.offerName, sub?.stripeCustomerId].some((v) => v?.toLowerCase().includes(q))) return false;
      if (filterMode !== "all" && mode !== filterMode) return false;
      if (filterStatus === "none" && sub !== null) return false;
      if (filterStatus !== "all" && filterStatus !== "none" && status !== filterStatus) return false;
      return true;
    });
  }, [orgs, search, filterMode, filterStatus]);

  const FILTER_MODE_OPTS: { value: FilterMode; label: string }[] = [
    { value: "all", label: "Tous les modes" },
    { value: "stripe", label: "Stripe" },
    { value: "invoice", label: "Facture" },
    { value: "free", label: "Gratuit" },
    { value: "demo", label: "Démo" },
  ];

  const FILTER_STATUS_OPTS: { value: FilterStatus; label: string }[] = [
    { value: "all", label: "Tous les statuts" },
    { value: "active", label: "Actifs" },
    { value: "trial", label: "En essai" },
    { value: "suspended", label: "Suspendus" },
    { value: "expired", label: "Expirés" },
    { value: "none", label: "Sans abonnement" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Invitation à une offre gratuite</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={createGiftInvite} className="grid gap-3 md:grid-cols-5">
              <Input type="email" required value={giftEmail} onChange={(e) => setGiftEmail(e.target.value)} placeholder="Adresse e-mail du bénéficiaire" />
              <Select value={giftEffectif} onValueChange={setGiftEffectif}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["1-5","6-10","11-25","26-50","51-100","101-250","250+"].map((v) => <SelectItem key={v} value={v}>{v} salariés</SelectItem>)}</SelectContent>
              </Select>
              <Select value={giftDuration} onValueChange={setGiftDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[["1","1 mois"],["3","3 mois"],["6","6 mois"],["12","12 mois"],["unlimited","Illimitée"]].map(([v,label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}</SelectContent>
              </Select>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={giftSendEmail} onChange={(e) => setGiftSendEmail(e.target.checked)} />Envoyer par e-mail</label>
              <Button disabled={giftBusy}>{giftBusy ? "Création…" : "Créer l’invitation"}</Button>
            </form>
            <p className="text-xs text-muted-foreground">Les liens expirent après 30 jours. L’offre démarre lorsque le bénéficiaire l’active.</p>
            {giftLink && <div className="flex flex-wrap items-center gap-2 text-sm"><span className="break-all">{giftLink}</span><Button type="button" variant="outline" size="sm" onClick={() => void navigator.clipboard.writeText(giftLink)}>Copier le lien</Button></div>}
            {giftError && <p role="alert" className="text-sm text-destructive">{giftError}</p>}
            <div className="space-y-2">
              {giftInvites.map((invite) => {
                const status = invite.revokedAt ? "Révoquée" : invite.claimedAt ? "Utilisée" : new Date(invite.expiresAt) <= new Date() ? "Expirée" : "En attente";
                return <div key={invite.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-sm">
                  <span>{invite.email} · {invite.offerName} · {invite.durationMonths ? `${invite.durationMonths} mois` : "illimitée"} · {status}</span>
                  {!invite.claimedAt && !invite.revokedAt && status === "En attente" && <Button variant="ghost" size="sm" onClick={() => void revokeGiftInvite(invite.id)}>Révoquer</Button>}
                </div>;
              })}
            </div>
          </CardContent>
        </Card>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Abonnements</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gérez les offres et statuts d'abonnement de chaque organisation.
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
            Actualiser
          </Button>
        </div>

        {/* Stats */}
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : orgs ? (
          <StatsBar orgs={orgs} />
        ) : null}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48 max-w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Rechercher une organisation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm bg-background"
            />
          </div>
          <Select value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
            <SelectTrigger className="h-9 w-40 text-sm bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTER_MODE_OPTS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
            <SelectTrigger className="h-9 w-44 text-sm bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FILTER_STATUS_OPTS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filterMode !== "all" || filterStatus !== "all" || search) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-muted-foreground"
              onClick={() => { setFilterMode("all"); setFilterStatus("all"); setSearch(""); }}
            >
              Réinitialiser
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {isLoading ? "…" : `${filtered.length} organisation${filtered.length > 1 ? "s" : ""}`}
          </span>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground bg-muted/20 border border-dashed border-border/50 rounded-xl">
            <p className="text-sm font-medium">Aucune organisation trouvée.</p>
            <p className="text-xs mt-1 opacity-70">Modifiez vos filtres ou votre recherche.</p>
          </div>
        ) : (
          <Card className="overflow-hidden border-border/50 bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/10 text-muted-foreground text-xs uppercase tracking-wider font-medium">
                    <th className="px-5 py-3">Organisation</th>
                    <th className="px-5 py-3">Mode</th>
                    <th className="px-5 py-3">Statut</th>
                    <th className="px-5 py-3">Offre</th>
                    <th className="px-5 py-3">Expiration</th>
                    <th className="px-5 py-3">Client Stripe</th>
                    <th className="px-4 py-3 w-28" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filtered.map((org) => (
                    <OrgSubRow key={org.id} org={org} onEdit={setEditOrg} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      {editOrg && (
        <EditDialog
          org={editOrg}
          open={!!editOrg}
          onClose={() => setEditOrg(null)}
        />
      )}
    </AdminLayout>
  );
}
