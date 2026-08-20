import { useState, useRef, useEffect } from "react";
import { useStorageUpload } from "@/hooks/useStorageUpload";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "./layout";
import {
  useListAdminOrganizations,
  getListAdminOrganizationsQueryKey,
  useGetAdminOrganization,
  getGetAdminOrganizationQueryKey,
  useGetAdminSubscription,
  getGetAdminSubscriptionQueryKey,
  useListAdminOrgMembers,
  getListAdminOrgMembersQueryKey,
  useUpdateAdminOrganization,
  useUpsertAdminSubscription,
  useSuspendAdminOrganization,
  useReactivateAdminOrganization,
  useUpdateAdminMember,
  useDeleteAdminMember,
  useListAdminOrgResources,
  getListAdminOrgResourcesQueryKey,
  useCreateAdminResource,
  useUpdateAdminResource,
  useDeleteAdminResource,
  usePublishAdminResource,
} from "@workspace/api-client-react";
import type { Resource, AdminOrganization, AdminSubscription, AdminMember, AdminOrgUpdate, AdminSubscriptionUpsert } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Building2,
  Users,
  CreditCard,
  Activity,
  Clock,
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  FileText,
  Link as LinkIcon,
  Shield,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EFFECTIF_OPTIONS, effectifToPlan, type EffectifKey } from "@/pages/onboarding/plans";
import { ReportGenerationCredits } from "./report-generation-credits";

// --- Types & Constants ---

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

const SIZE_COLORS: Record<string, string> = {
  TPE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PME: "bg-blue-50 text-blue-700 border-blue-200",
  ETI: "bg-violet-50 text-violet-700 border-violet-200",
  GE: "bg-orange-50 text-orange-700 border-orange-200",
};

const DOC_TYPES = ["PDF", "Word", "Excel", "Vidéo", "Lien", "Autre"] as const;

const DOC_TYPE_COLORS: Record<string, string> = {
  PDF: "bg-red-50 text-red-700 border-red-200",
  Word: "bg-blue-50 text-blue-700 border-blue-200",
  Excel: "bg-green-50 text-green-700 border-green-200",
  Vidéo: "bg-violet-50 text-violet-700 border-violet-200",
  Lien: "bg-amber-50 text-amber-700 border-amber-200",
  Autre: "bg-muted text-muted-foreground border-border",
};


// --- Forms & Tabs Components ---

function InfoForm({ org }: { org: AdminOrganization }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateOrg = useUpdateAdminOrganization();
  const initialized = useRef(false);

  const [form, setForm] = useState<AdminOrgUpdate>({
    name: "",
    legalName: "",
    siren: "",
    address: "",
    sector: "",
    size: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    employeeCount: 0,
  });

  useEffect(() => {
    if (org && !initialized.current) {
      initialized.current = true;
      setForm({
        name: org.name,
        legalName: org.legalName ?? "",
        siren: org.siren ?? "",
        address: org.address ?? "",
        sector: org.sector ?? "",
        size: org.size ?? "",
        contactName: org.contactName ?? "",
        contactEmail: org.contactEmail ?? "",
        contactPhone: org.contactPhone ?? "",
        employeeCount: org.employeeCount ?? 0,
      });
    }
  }, [org]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateOrg.mutate(
      { id: org.id, data: { ...form, employeeCount: Number(form.employeeCount) || null } },
      {
        onSuccess: () => {
          toast({ title: "Informations mises à jour avec succès." });
          queryClient.invalidateQueries({ queryKey: getGetAdminOrganizationQueryKey(org.id) });
          queryClient.invalidateQueries({ queryKey: getListAdminOrganizationsQueryKey() });
        },
        onError: () => toast({ variant: "destructive", title: "Erreur de mise à jour." })
      }
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="bg-muted/20 border-b border-border/50">
        <CardTitle className="text-base font-semibold">Informations générales</CardTitle>
        <CardDescription>Coordonnées et identification légale de l'entreprise.</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Nom commercial</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Raison sociale</Label>
              <Input value={form.legalName || ""} onChange={(e) => setForm(f => ({ ...f, legalName: e.target.value }))} className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Numéro SIREN</Label>
              <Input value={form.siren || ""} onChange={(e) => setForm(f => ({ ...f, siren: e.target.value }))} className="bg-background font-mono" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Taille</Label>
              <Select value={form.size || ""} onValueChange={(v) => setForm(f => ({ ...f, size: v }))}>
                <SelectTrigger className="bg-background"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TPE">TPE</SelectItem>
                  <SelectItem value="PME">PME</SelectItem>
                  <SelectItem value="ETI">ETI</SelectItem>
                  <SelectItem value="GE">GE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Secteur</Label>
              <Input value={form.sector || ""} onChange={(e) => setForm(f => ({ ...f, sector: e.target.value }))} className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Effectif déclaré</Label>
              <Input type="number" value={form.employeeCount || ""} onChange={(e) => setForm(f => ({ ...f, employeeCount: e.target.value ? Number(e.target.value) : undefined }))} className="bg-background" />
            </div>
          </div>
          
          <div className="border-t border-border/50 pt-6">
            <h3 className="text-sm font-semibold mb-4 text-foreground">Contact principal</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Nom</Label>
                <Input value={form.contactName || ""} onChange={(e) => setForm(f => ({ ...f, contactName: e.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Email</Label>
                <Input type="email" value={form.contactEmail || ""} onChange={(e) => setForm(f => ({ ...f, contactEmail: e.target.value }))} className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Téléphone</Label>
                <Input value={form.contactPhone || ""} onChange={(e) => setForm(f => ({ ...f, contactPhone: e.target.value }))} className="bg-background" />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={updateOrg.isPending}>
              {updateOrg.isPending ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SubForm({ orgId }: { orgId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: sub, isLoading } = useGetAdminSubscription(orgId, { query: { enabled: !!orgId, queryKey: getGetAdminSubscriptionQueryKey(orgId) } });
  const upsertSub = useUpsertAdminSubscription();
  const init = useRef(false);

  // ── Formule gratuite — activation rapide ────────────────────────────────
  const [freeKey, setFreeKey] = useState<EffectifKey | "">("");

  function handleActivateFree() {
    if (!freeKey) return;
    const plan = effectifToPlan(freeKey);
    const data: AdminSubscriptionUpsert = {
      mode: "free" as const,
      status: "active" as const,
      offerName: plan.effectifLabel,
      maxUsers: 1,
      maxEmployees: plan.maxEmployees ?? null,
      startAt: new Date().toISOString(),
      endAt: null,
      trialStartAt: null,
      trialEndAt: null,
      autoRenew: false,
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      overrideMaxEmployees: null,
      overrideMaxUsers: null,
      overrideNote: null,
      overrideExpiresAt: null,
    };
    upsertSub.mutate(
      { id: orgId, data },
      {
        onSuccess: () => {
          toast({ title: "Formule gratuite activée." });
          // Mettre à jour le formulaire détaillé pour refléter les nouvelles valeurs
          init.current = false;
          setForm((f: any) => ({
            ...f,
            mode: "free",
            status: "active",
            offerName: plan.effectifLabel,
            maxUsers: 1,
            maxEmployees: plan.maxEmployees ?? "",
            startAt: new Date().toISOString().split("T")[0],
            endAt: "",
          }));
          queryClient.invalidateQueries({ queryKey: getGetAdminSubscriptionQueryKey(orgId) });
          queryClient.invalidateQueries({ queryKey: getGetAdminOrganizationQueryKey(orgId) });
        },
        onError: () => toast({ variant: "destructive", title: "Erreur d'activation." }),
      },
    );
  }
  // ────────────────────────────────────────────────────────────────────────

  const [form, setForm] = useState<any>({
    mode: "free",
    status: "active",
    offerName: "",
    maxEmployees: "",
    maxUsers: "",
    startAt: "",
    endAt: "",
    trialStartAt: "",
    trialEndAt: "",
    autoRenew: false,
    overrideMaxEmployees: "",
    overrideMaxUsers: "",
    overrideNote: "",
    overrideExpiresAt: "",
  });

  useEffect(() => {
    if (sub && !init.current) {
      init.current = true;
      setForm({
        mode: sub.mode ?? "free",
        status: sub.status ?? "active",
        offerName: sub.offerName ?? "",
        maxEmployees: sub.maxEmployees ?? "",
        maxUsers: sub.maxUsers ?? "",
        startAt: sub.startAt?.split('T')[0] ?? "",
        endAt: sub.endAt?.split('T')[0] ?? "",
        trialStartAt: sub.trialStartAt?.split('T')[0] ?? "",
        trialEndAt: sub.trialEndAt?.split('T')[0] ?? "",
        autoRenew: sub.autoRenew ?? false,
        overrideMaxEmployees: sub.overrideMaxEmployees ?? "",
        overrideMaxUsers: sub.overrideMaxUsers ?? "",
        overrideNote: sub.overrideNote ?? "",
        overrideExpiresAt: sub.overrideExpiresAt?.split('T')[0] ?? "",
      });
    }
  }, [sub]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      ...form,
      maxEmployees: form.maxEmployees ? Number(form.maxEmployees) : null,
      maxUsers: form.maxUsers ? Number(form.maxUsers) : null,
      overrideMaxEmployees: form.overrideMaxEmployees ? Number(form.overrideMaxEmployees) : null,
      overrideMaxUsers: form.overrideMaxUsers ? Number(form.overrideMaxUsers) : null,
      startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
      endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
      trialStartAt: form.trialStartAt ? new Date(form.trialStartAt).toISOString() : null,
      trialEndAt: form.trialEndAt ? new Date(form.trialEndAt).toISOString() : null,
      overrideExpiresAt: form.overrideExpiresAt ? new Date(form.overrideExpiresAt).toISOString() : null,
    };
    
    // Cleanup empty strings
    Object.keys(data).forEach(key => { if (data[key] === "") data[key] = null; });

    upsertSub.mutate(
      { id: orgId, data },
      {
        onSuccess: () => {
          toast({ title: "Abonnement mis à jour." });
          queryClient.invalidateQueries({ queryKey: getGetAdminSubscriptionQueryKey(orgId) });
          queryClient.invalidateQueries({ queryKey: getGetAdminOrganizationQueryKey(orgId) });
        },
        onError: () => toast({ variant: "destructive", title: "Erreur de mise à jour." })
      }
    );
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  const isStripe = form.mode === "stripe";

  return (
    <Card className="border-border/50">
      <CardHeader className="bg-muted/20 border-b border-border/50 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold">Abonnement & Droits</CardTitle>
          <CardDescription>Gérez la facturation et les limites de la flotte.</CardDescription>
        </div>
        {sub?.stripeSubscriptionId && (
          <Badge className="bg-[#635BFF]/10 text-[#635BFF] border-[#635BFF]/20 gap-1.5 px-3 py-1">
            <CreditCard className="h-3.5 w-3.5" />
            Géré par Stripe
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-6 space-y-6">

        {/* ── Activation rapide — Formule gratuite ─────────────────────── */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary shrink-0" />
            <p className="text-sm font-semibold text-foreground">Activer une formule gratuite</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Choisissez la tranche d'effectif — le compte est immédiatement actif en mode <code className="bg-muted px-1 rounded text-[11px]">free</code>, sans Stripe.
          </p>
          <div className="flex items-center gap-2">
            <Select value={freeKey} onValueChange={(v) => setFreeKey(v as EffectifKey)}>
              <SelectTrigger className="bg-background flex-1">
                <SelectValue placeholder="Choisir une formule…" />
              </SelectTrigger>
              <SelectContent>
                {EFFECTIF_OPTIONS.map((opt) => (
                  <SelectItem key={opt.key} value={opt.key}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              disabled={!freeKey || upsertSub.isPending}
              onClick={handleActivateFree}
              className="shrink-0"
            >
              <Zap className="h-4 w-4 mr-1.5" />
              Activer
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Contrat principal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Mode de facturation</Label>
                <Select value={form.mode} onValueChange={(v) => setForm((f: any) => ({ ...f, mode: v }))} disabled={isStripe}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="invoice">Facture</SelectItem>
                    <SelectItem value="free">Gratuit</SelectItem>
                    <SelectItem value="demo">Demo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Statut actuel</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f: any) => ({ ...f, status: v }))} disabled={isStripe}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="trial">En essai</SelectItem>
                    <SelectItem value="suspended">Suspendu</SelectItem>
                    <SelectItem value="expired">Expiré</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Nom de l'offre</Label>
                <Input value={form.offerName || ""} onChange={(e) => setForm((f: any) => ({ ...f, offerName: e.target.value }))} disabled={isStripe} className="bg-background" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Sièges Max</Label>
                  <Input type="number" value={form.maxUsers || ""} onChange={(e) => setForm((f: any) => ({ ...f, maxUsers: e.target.value }))} disabled={isStripe} className="bg-background" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Effectif Max</Label>
                  <Input type="number" value={form.maxEmployees || ""} onChange={(e) => setForm((f: any) => ({ ...f, maxEmployees: e.target.value }))} disabled={isStripe} className="bg-background" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Date de début</Label>
                <Input type="date" value={form.startAt || ""} onChange={(e) => setForm((f: any) => ({ ...f, startAt: e.target.value }))} disabled={isStripe} className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Date de fin</Label>
                <Input type="date" value={form.endAt || ""} onChange={(e) => setForm((f: any) => ({ ...f, endAt: e.target.value }))} disabled={isStripe} className="bg-background" />
              </div>
            </div>
          </div>

          <div className="space-y-4 bg-muted/20 p-5 rounded-xl border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-orange-500" />
              <h3 className="text-sm font-semibold text-foreground">Dérogations (Overrides Admin)</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Ces valeurs outrepassent les limites du contrat (utile pour dépanner un client sans changer son offre).</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold text-orange-600 dark:text-orange-400">Sièges Max dérogatoire</Label>
                <Input type="number" value={form.overrideMaxUsers || ""} onChange={(e) => setForm((f: any) => ({ ...f, overrideMaxUsers: e.target.value }))} className="bg-background border-orange-200 dark:border-orange-900" placeholder="Ex: 50" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold text-orange-600 dark:text-orange-400">Effectif Max dérogatoire</Label>
                <Input type="number" value={form.overrideMaxEmployees || ""} onChange={(e) => setForm((f: any) => ({ ...f, overrideMaxEmployees: e.target.value }))} className="bg-background border-orange-200 dark:border-orange-900" placeholder="Ex: 1000" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold text-orange-600 dark:text-orange-400">Note justificative</Label>
                <Input value={form.overrideNote || ""} onChange={(e) => setForm((f: any) => ({ ...f, overrideNote: e.target.value }))} className="bg-background border-orange-200 dark:border-orange-900" placeholder="Raison de la dérogation..." />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold text-orange-600 dark:text-orange-400">Expiration de la dérogation</Label>
                <Input type="date" value={form.overrideExpiresAt || ""} onChange={(e) => setForm((f: any) => ({ ...f, overrideExpiresAt: e.target.value }))} className="bg-background border-orange-200 dark:border-orange-900" />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={upsertSub.isPending}>
              {upsertSub.isPending ? "Enregistrement..." : "Enregistrer l'abonnement"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function MembersTab({ orgId }: { orgId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: members, isLoading } = useListAdminOrgMembers(orgId, { query: { queryKey: getListAdminOrgMembersQueryKey(orgId) } });
  const updateMember = useUpdateAdminMember();
  const deleteMember = useDeleteAdminMember();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  if (!members?.length) {
    return (
      <div className="text-center py-16 text-muted-foreground border border-dashed border-border/50 rounded-xl bg-muted/10">
        <Users className="mx-auto h-10 w-10 opacity-30 mb-3" />
        <p className="text-sm font-medium">Aucun membre dans cette organisation.</p>
      </div>
    );
  }

  return (
    <Card className="border-border/50 overflow-hidden">
      <div className="divide-y divide-border/50">
        {members.map((m) => {
          const realEmail = m.user.email?.endsWith("@pending.local") ? null : m.user.email;
          const displayName = [m.user.firstName, m.user.lastName].filter(Boolean).join(" ") || realEmail || "—";
          const isSuspended = m.status === 'suspended';
          return (
            <div key={m.id} className={cn("flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-4 transition-colors", isSuspended ? "bg-rose-50/30" : "hover:bg-muted/30")}>
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <Avatar className={cn("h-10 w-10 shrink-0 border", isSuspended ? "opacity-50 grayscale" : "border-border")}>
                  <AvatarImage src={m.user.avatarUrl || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
                    <span className={cn(isSuspended && "line-through text-muted-foreground")}>{displayName}</span>
                    {m.user.isSuperAdmin && <Shield className="h-3 w-3 text-destructive shrink-0" />}
                    {isSuspended && <Badge variant="outline" className="text-[9px] h-4 px-1 py-0 border-rose-200 text-rose-600 bg-rose-50">Suspendu</Badge>}
                  </div>
                  {realEmail && <p className="text-xs text-muted-foreground truncate mt-0.5">{realEmail}</p>}
                </div>
              </div>

              <div className="flex items-center gap-3 sm:shrink-0 ml-14 sm:ml-0">
                <Select
                  value={m.role}
                  onValueChange={(v: any) => {
                    updateMember.mutate(
                      { memberId: m.id, data: { role: v } },
                      {
                        onSuccess: () => {
                          toast({ title: "Rôle mis à jour." });
                          queryClient.invalidateQueries({ queryKey: getListAdminOrgMembersQueryKey(orgId) });
                        }
                      }
                    );
                  }}
                  disabled={updateMember.isPending}
                >
                  <SelectTrigger className="h-8 w-32 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Propriétaire</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                    <SelectItem value="member">Membre</SelectItem>
                    <SelectItem value="viewer">Lecteur</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="icon"
                  className={cn("h-8 w-8", isSuspended ? "text-emerald-600 border-emerald-200 hover:bg-emerald-50" : "text-amber-600 border-amber-200 hover:bg-amber-50")}
                  title={isSuspended ? "Réactiver l'accès" : "Suspendre l'accès"}
                  onClick={() => {
                    updateMember.mutate(
                      { memberId: m.id, data: { status: isSuspended ? 'active' : 'suspended' } },
                      {
                        onSuccess: () => {
                          toast({ title: isSuspended ? "Accès réactivé." : "Accès suspendu." });
                          queryClient.invalidateQueries({ queryKey: getListAdminOrgMembersQueryKey(orgId) });
                        }
                      }
                    );
                  }}
                >
                  {isSuspended ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8 text-rose-600 border-rose-200 hover:bg-rose-50" title="Retirer de l'organisation">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Retirer l'utilisateur ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        <strong>{displayName}</strong> perdra l'accès à cette organisation.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => {
                          deleteMember.mutate(
                            { memberId: m.id },
                            {
                              onSuccess: () => {
                                toast({ title: "Utilisateur retiré." });
                                queryClient.invalidateQueries({ queryKey: getListAdminOrgMembersQueryKey(orgId) });
                              }
                            }
                          );
                        }}
                      >
                        Retirer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ComplianceTab({ org }: { org: AdminOrganization }) {
  if (!org.compliance) {
    return (
      <div className="text-center py-16 text-muted-foreground border border-dashed border-border/50 rounded-xl bg-muted/10">
        <Activity className="mx-auto h-10 w-10 opacity-30 mb-3" />
        <p className="text-sm font-medium">Aucune donnée de conformité.</p>
      </div>
    );
  }

  const { status, message, overflow } = org.compliance;
  const isOk = status === 'ok';
  
  return (
    <Card className={cn("border", isOk ? "border-emerald-200 bg-emerald-50/30" : "border-rose-200 bg-rose-50/30")}>
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          {isOk ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-rose-600" />}
          Statut de Conformité
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Message système</Label>
            <p className="text-sm font-medium mt-1">{message || "Conforme aux limites du contrat."}</p>
          </div>
          {overflow && overflow > 0 && (
            <div>
              <Label className="text-xs text-rose-600 uppercase tracking-wider font-semibold">Dépassement effectif</Label>
              <p className="text-xl font-bold text-rose-700 mt-1">+{overflow} employés</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function HistoryTab({ org }: { org: AdminOrganization }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="bg-muted/20 border-b border-border/50">
        <CardTitle className="text-base font-semibold">Historique</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Date de création</Label>
            <p className="text-sm font-medium mt-1">{new Date(org.createdAt).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Dernière activité</Label>
            <p className="text-sm font-medium mt-1">{org.lastActivityAt ? new Date(org.lastActivityAt).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" }) : "Jamais"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


// --- Keep Resources implementation ---
// (Truncated but intact logic for resources)

function ResourceDialog({ orgId, resource, open, onClose }: { orgId: number; resource: Resource | null; open: boolean; onClose: () => void; }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<any>({
    title: "", description: "", category: "", documentType: "", fileUrl: "", imageUrl: "",
  });

  useEffect(() => {
    if (open) {
      setForm(resource ? {
        title: resource.title, description: resource.description ?? "", category: resource.category ?? "",
        documentType: resource.documentType ?? "", fileUrl: resource.fileUrl ?? "", imageUrl: resource.imageUrl ?? "",
      } : { title: "", description: "", category: "", documentType: "", fileUrl: "", imageUrl: "" });
    }
  }, [open, resource]);

  const createResource = useCreateAdminResource();
  const updateResource = useUpdateAdminResource();
  const isEditing = !!resource;
  const isPending = createResource.isPending || updateResource.isPending;

  const { uploadFile, isUploading, progress } = useStorageUpload({
    onSuccess: (res) => {
      setForm((f: any) => ({ ...f, fileUrl: res.fileUrl }));
      toast({ title: "Fichier téléversé." });
    },
    onError: () => toast({ title: "Échec du téléversement.", variant: "destructive" }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const data = {
      title: form.title.trim(), description: form.description.trim() || undefined,
      category: form.category.trim() || undefined, documentType: form.documentType || undefined,
      fileUrl: form.fileUrl.trim() || undefined, imageUrl: form.imageUrl.trim() || undefined,
    };
    const onSuccess = () => {
      toast({ title: isEditing ? "Document modifié." : "Document ajouté." });
      queryClient.invalidateQueries({ queryKey: getListAdminOrgResourcesQueryKey(orgId) });
      onClose();
    };
    if (isEditing) updateResource.mutate({ id: resource.id, data }, { onSuccess });
    else createResource.mutate({ orgId, data }, { onSuccess });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEditing ? "Modifier le document" : "Ajouter un document"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5"><Label>Titre *</Label><Input value={form.title} onChange={(e) => setForm((f: any) => ({...f, title: e.target.value}))} required /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((f: any) => ({...f, description: e.target.value}))} rows={3} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Catégorie</Label><Input value={form.category} onChange={(e) => setForm((f: any) => ({...f, category: e.target.value}))} /></div>
            <div className="space-y-1.5"><Label>Type</Label>
              <Select value={form.documentType} onValueChange={(v) => setForm((f: any) => ({...f, documentType: v}))}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Fichier</Label>
            <div className="flex gap-2">
              <Input
                value={form.fileUrl}
                onChange={(e) => setForm((f: any) => ({...f, fileUrl: e.target.value}))}
                placeholder="Coller une URL ou téléverser ci-dessous"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 relative overflow-hidden"
                disabled={isUploading}
              >
                {isUploading ? `${progress}%` : "Téléverser"}
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
                  disabled={isUploading}
                />
              </Button>
            </div>
            {isUploading && (
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all rounded-full" style={{ width: `${progress}%` }} />
              </div>
            )}
            {form.fileUrl && !isUploading && (
              <p className="text-xs text-muted-foreground truncate">{form.fileUrl}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Annuler</Button>
            <Button type="submit" disabled={isPending || isUploading || !form.title.trim()}>{isPending ? "Enregistrement..." : "Enregistrer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResourcesTab({ orgId }: { orgId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  const { data: resources, isLoading } = useListAdminOrgResources(orgId, { query: { queryKey: getListAdminOrgResourcesQueryKey(orgId) } });
  const deleteResource = useDeleteAdminResource();
  const publishResource = usePublishAdminResource();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setEditingResource(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Ajouter un document
        </Button>
      </div>
      {isLoading ? <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div> : !resources?.length ? (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl bg-muted/10">
          <BookOpen className="mx-auto h-10 w-10 opacity-30 mb-3" />
          <p className="text-sm font-medium">Aucun document partagé.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {resources.map(r => (
            <Card key={r.id} className="overflow-hidden border-border/50">
              <CardContent className="p-4 flex gap-4 items-start">
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{r.title}</p>
                    <Badge variant="outline" className={r.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-muted"}>
                      {r.isPublished ? "Publié" : "Brouillon"}
                    </Badge>
                  </div>
                  {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{r.description}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                    publishResource.mutate({ id: r.id, data: { isPublished: !r.isPublished } }, {
                      onSuccess: () => {
                        toast({ title: r.isPublished ? "Dépublié" : "Publié" });
                        queryClient.invalidateQueries({ queryKey: getListAdminOrgResourcesQueryKey(orgId) });
                      }
                    });
                  }}>
                    {r.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingResource(r); setDialogOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => {
                    if (confirm("Supprimer ce document ?")) {
                      deleteResource.mutate({ id: r.id }, {
                        onSuccess: () => {
                          toast({ title: "Supprimé" });
                          queryClient.invalidateQueries({ queryKey: getListAdminOrgResourcesQueryKey(orgId) });
                        }
                      });
                    }
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <ResourceDialog orgId={orgId} resource={editingResource} open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}


// --- Main Page Component ---

export function AdminOrganizationDetail() {
  const { id } = useParams<{ id: string }>();
  const orgId = Number(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: org, isLoading } = useGetAdminOrganization(orgId, { query: { enabled: !!orgId, queryKey: getGetAdminOrganizationQueryKey(orgId) } });
  
  const suspendOrg = useSuspendAdminOrganization();
  const reactivateOrg = useReactivateAdminOrganization();

  function handleSuspend() {
    suspendOrg.mutate({ id: orgId }, {
      onSuccess: () => {
        toast({ title: "Compte suspendu" });
        queryClient.invalidateQueries({ queryKey: getGetAdminOrganizationQueryKey(orgId) });
      }
    });
  }

  function handleReactivate() {
    reactivateOrg.mutate({ id: orgId }, {
      onSuccess: () => {
        toast({ title: "Compte réactivé" });
        queryClient.invalidateQueries({ queryKey: getGetAdminOrganizationQueryKey(orgId) });
      }
    });
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!org) {
    return (
      <AdminLayout>
        <div className="text-center py-24 text-muted-foreground bg-muted/10 border border-dashed border-border/50 rounded-xl">
          <Building2 className="mx-auto h-12 w-12 opacity-20 mb-4" />
          <p className="text-sm font-medium">Client introuvable.</p>
          <Link href="/admin/organizations">
            <Button variant="outline" size="sm" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" /> Retour à la flotte
            </Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const isSuspended = org.subscription?.status === 'suspended';

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex items-start gap-4 w-full sm:w-auto">
            <Link href="/admin/organizations">
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 mt-0.5 border border-border/50 bg-card hover:bg-muted/50">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{org.name}</h1>
                {org.type === 'groupe' && (
                  <Badge variant="outline" className="text-[10px] h-5 px-2 py-0 uppercase tracking-wider bg-violet-50 text-violet-700 border-violet-200">
                    Groupe
                  </Badge>
                )}
                {org.size && (
                  <Badge variant="outline" className={cn("text-[10px] h-5 px-2 py-0 uppercase tracking-wider font-semibold", SIZE_COLORS[org.size])}>
                    {org.size}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                <span className="font-medium text-foreground/80">{org.sector || "Secteur non défini"}</span>
                {org.siret && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30"></span>
                    <span className="font-mono text-xs">{org.siret}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
            {isSuspended ? (
              <Button 
                variant="outline" 
                className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800"
                onClick={handleReactivate}
                disabled={reactivateOrg.isPending}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Réactiver le compte
              </Button>
            ) : (
              <Button 
                variant="outline" 
                className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:text-rose-800"
                onClick={handleSuspend}
                disabled={suspendOrg.isPending}
              >
                <Ban className="h-4 w-4 mr-2" />
                Suspendre le compte
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="informations" className="w-full">
          <TabsList className="w-full justify-start border-b border-border/50 rounded-none bg-transparent p-0 h-auto gap-6 overflow-x-auto no-scrollbar">
            {[
              { id: "informations", icon: Building2, label: "Informations" },
              { id: "abonnement", icon: CreditCard, label: "Abonnement" },
              { id: "generations", icon: FileText, label: "Générations RSE" },
              { id: "utilisateurs", icon: Users, label: "Utilisateurs" },
              { id: "conformite", icon: Activity, label: "Conformité" },
              { id: "historique", icon: Clock, label: "Historique" },
              { id: "ressources", icon: BookOpen, label: "Ressources" },
            ].map((t) => (
              <TabsTrigger 
                key={t.id} 
                value={t.id} 
                className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none py-3 px-1 gap-2 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground"
              >
                <t.icon className="h-4 w-4 shrink-0" />
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-6">
            <TabsContent value="informations" className="m-0"><InfoForm org={org} /></TabsContent>
            <TabsContent value="abonnement" className="m-0"><SubForm orgId={orgId} /></TabsContent>
            <TabsContent value="generations" className="m-0"><ReportGenerationCredits orgId={orgId} /></TabsContent>
            <TabsContent value="utilisateurs" className="m-0"><MembersTab orgId={orgId} /></TabsContent>
            <TabsContent value="conformite" className="m-0"><ComplianceTab org={org} /></TabsContent>
            <TabsContent value="historique" className="m-0"><HistoryTab org={org} /></TabsContent>
            <TabsContent value="ressources" className="m-0"><ResourcesTab orgId={orgId} /></TabsContent>
          </div>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
