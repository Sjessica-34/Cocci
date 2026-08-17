import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout";
import {
  useGetMe,
  useUpdateMe,
  getGetMeQueryKey,
  useGetOrganization,
  getGetOrganizationQueryKey,
  useUpdateOrganization,
  useListMembers,
  getListMembersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useUser, useClerk } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";
import { useExportMyData, useRequestAccountDeletion, useMyConsents } from "@workspace/api-client-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import {
  Loader2,
  Save,
  Download,
  Trash2,
  ShieldCheck,
  LogOut,
  FileText,
  ExternalLink,
  User,
  Building2,
  Lock,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères."),
  lastName:  z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
});

const orgSchema = z.object({
  name:      z.string().min(1, "Le nom est requis."),
  legalName: z.string().optional(),
  siret:     z.string().optional(),
  sector:    z.string().optional(),
  size:      z.enum(["TPE", "PME", "ETI", "GE"]).optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeEmail(email: string | undefined): string | null {
  if (!email) return null;
  if (email.includes("@pending.local")) return null;
  return email;
}

const ROLE_LABELS: Record<string, string> = {
  owner:  "Propriétaire",
  admin:  "Administrateur",
  member: "Membre",
  viewer: "Lecteur",
};

// ─── Tab: Mon profil ──────────────────────────────────────────────────────────

function ProfileTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const updateMe = useUpdateMe();
  const initialized = useRef(false);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: "", lastName: "" },
  });

  useEffect(() => {
    if (user && !initialized.current) {
      form.reset({ firstName: user.firstName || "", lastName: user.lastName || "" });
      initialized.current = true;
    }
  }, [user, form]);

  function onSubmit(values: z.infer<typeof profileSchema>) {
    updateMe.mutate(
      { data: values },
      {
        onSuccess: (updated) => {
          toast({ title: "Profil enregistré", description: "Vos informations ont été mises à jour." });
          queryClient.setQueryData(getGetMeQueryKey(), updated);
        },
        onError: () =>
          toast({ variant: "destructive", title: "Erreur", description: "La sauvegarde a échoué. Réessayez." }),
      },
    );
  }

  const email = safeEmail(user?.email);
  const initial = (user?.firstName?.charAt(0) || user?.lastName?.charAt(0) || "U").toUpperCase();

  return (
    <div className="space-y-6">
      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-xl" />
      ) : (
        <Card>
          <CardHeader className="pb-4 border-b border-border">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarImage src={user?.avatarUrl || ""} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl">
                  {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Mon compte"}
                </CardTitle>
                {email ? (
                  <CardDescription className="mt-1">{email}</CardDescription>
                ) : null}
                <CardDescription className="mt-0.5">
                  Membre depuis le{" "}
                  {new Date(user?.createdAt ?? Date.now()).toLocaleDateString("fr-FR", {
                    day: "numeric", month: "long", year: "numeric",
                  })}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prénom</FormLabel>
                      <FormControl><Input {...field} autoComplete="given-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom</FormLabel>
                      <FormControl><Input {...field} autoComplete="family-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Read-only email row */}
                {email && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Adresse e-mail</p>
                    <p className="text-sm text-muted-foreground bg-muted/40 px-3 py-2 rounded-md border border-border">
                      {email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      L'adresse e-mail est gérée par votre fournisseur d'authentification.
                    </p>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-border">
                  <Button type="submit" disabled={updateMe.isPending || !form.formState.isDirty}>
                    {updateMe.isPending
                      ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      : <Save className="mr-2 h-4 w-4" />}
                    Enregistrer
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Tab: Mon organisation ────────────────────────────────────────────────────

function OrgTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrgId } = useCurrentOrganization();
  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });

  const { data: org, isLoading: orgLoading } = useGetOrganization(currentOrgId!, {
    query: { queryKey: getGetOrganizationQueryKey(currentOrgId!), enabled: !!currentOrgId },
  });

  const { data: members } = useListMembers(currentOrgId!, {
    query: { queryKey: getListMembersQueryKey(currentOrgId!), enabled: !!currentOrgId },
  });

  const updateOrg = useUpdateOrganization();
  const initialized = useRef(false);

  const myMember = members?.find((m) => m.userId === me?.id);
  const myRole = myMember?.role;
  const canEdit = myRole === "owner" || myRole === "admin";

  const form = useForm<z.infer<typeof orgSchema>>({
    resolver: zodResolver(orgSchema),
    defaultValues: { name: "", legalName: "", siret: "", sector: "", size: undefined },
  });

  useEffect(() => {
    if (org && !initialized.current) {
      form.reset({
        name:      org.name || "",
        legalName: org.legalName || "",
        siret:     org.siret || "",
        sector:    org.sector || "",
        size:      (org.size as "TPE" | "PME" | "ETI" | "GE") || undefined,
      });
      initialized.current = true;
    }
  }, [org, form]);

  function onSubmit(values: z.infer<typeof orgSchema>) {
    if (!currentOrgId) return;
    updateOrg.mutate(
      { id: currentOrgId, data: values },
      {
        onSuccess: () => {
          toast({ title: "Organisation enregistrée", description: "Les informations ont été mises à jour." });
          queryClient.invalidateQueries({ queryKey: getGetOrganizationQueryKey(currentOrgId) });
          initialized.current = false;
        },
        onError: () =>
          toast({ variant: "destructive", title: "Erreur", description: "La sauvegarde a échoué. Réessayez." }),
      },
    );
  }

  if (!currentOrgId) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Aucune organisation sélectionnée.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {orgLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <Card>
          <CardHeader className="pb-4 border-b border-border">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="text-xl">{org?.name}</CardTitle>
                {org?.sector && <CardDescription className="mt-1">{org.sector}</CardDescription>}
              </div>
              {myRole && (
                <Badge variant="outline" className="text-xs font-medium">
                  {ROLE_LABELS[myRole] ?? myRole}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de l'organisation</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!canEdit} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="legalName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Raison sociale</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!canEdit} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="siret" render={({ field }) => (
                    <FormItem>
                      <FormLabel>SIREN / SIRET</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!canEdit} maxLength={14} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="sector" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secteur d'activité</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!canEdit} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="size" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Taille</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!canEdit}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="TPE">TPE (moins de 10 salariés)</SelectItem>
                          <SelectItem value="PME">PME (10 à 249 salariés)</SelectItem>
                          <SelectItem value="ETI">ETI (250 à 4 999 salariés)</SelectItem>
                          <SelectItem value="GE">GE (5 000 salariés et plus)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {!canEdit && (
                  <p className="text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-md border border-border">
                    Seuls les administrateurs et propriétaires peuvent modifier ces informations.
                  </p>
                )}

                {canEdit && (
                  <div className="flex justify-end pt-4 border-t border-border">
                    <Button type="submit" disabled={updateOrg.isPending || !form.formState.isDirty}>
                      {updateOrg.isPending
                        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        : <Save className="mr-2 h-4 w-4" />}
                      Enregistrer les modifications
                    </Button>
                  </div>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Historique des consentements ────────────────────────────────────────────

function ConsentHistory() {
  const { data: consents, isLoading } = useMyConsents();

  const LABELS: Record<string, string> = {
    cgu: "Conditions Générales d'Utilisation",
    privacy: "Politique de confidentialité",
  };

  return (
    <Card>
      <CardHeader className="pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Consentements</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Historique de vos acceptations des documents légaux (RGPD art. 7).
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : !consents?.length ? (
          <p className="text-sm text-muted-foreground">
            Aucun consentement enregistré. Votre utilisation de la plateforme vaut acceptation des CGU en vigueur.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {consents.map((c) => (
              <div key={c.id} className="py-2.5 flex items-center justify-between gap-4">
                <div className="text-sm">{LABELS[c.documentType] ?? c.documentType}</div>
                <div className="text-xs text-muted-foreground text-right whitespace-nowrap">
                  <div>v{c.documentVersion}</div>
                  <div>{new Date(c.acceptedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Tab: Confidentialité & données ──────────────────────────────────────────

function PrivacyTab() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const { triggerExport } = useExportMyData();
  const deletionRequest = useRequestAccountDeletion({
    onSuccess: (data) => toast({ title: "Demande enregistrée", description: data.message }),
    onError: () => toast({ variant: "destructive", title: "Erreur", description: "Impossible d'enregistrer la demande. Réessayez." }),
  });

  async function handleExport() {
    setExporting(true);
    try {
      await triggerExport();
      toast({ title: "Export réussi", description: "Vos données ont été téléchargées." });
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "L'export a échoué. Réessayez." });
    } finally {
      setExporting(false);
    }
  }

  const legalLinks = [
    { label: "Politique de confidentialité", href: "/legal?section=confidentialite" },
    { label: "Conditions Générales d'Utilisation", href: "/legal?section=cgu" },
    { label: "Conditions Générales de Vente", href: "/legal?section=cgv" },
    { label: "Mentions légales", href: "/legal?section=mentions" },
    { label: "Politique de cookies", href: "/legal?section=cookies" },
  ];

  return (
    <div className="space-y-6">
      {/* Legal documents */}
      <Card>
        <CardHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Documents légaux</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <ul className="space-y-2">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>
                  <span className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer py-1">
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    {link.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* My data */}
      <Card>
        <CardHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Mes données</CardTitle>
          </div>
          <CardDescription className="text-sm mt-1">
            Conformément au RGPD, vous pouvez télécharger vos données ou demander la suppression de votre compte.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Export */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium text-foreground">Télécharger mes données</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Recevez un fichier JSON contenant votre profil et vos organisations.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting}
              className="shrink-0"
            >
              {exporting
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Download className="mr-2 h-4 w-4" />}
              Exporter
            </Button>
          </div>

          <Separator />

          {/* Deletion */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium text-foreground">Supprimer mon compte</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Votre demande sera traitée dans les 30 jours. Cette action est irréversible.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="shrink-0 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer mon compte
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer la demande de suppression</AlertDialogTitle>
                  <AlertDialogDescription>
                    Votre demande sera transmise à notre équipe. Toutes vos données personnelles
                    seront supprimées ou anonymisées dans les 30 jours ouvrés. Cette action est
                    irréversible une fois traitée.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-rose-600 hover:bg-rose-700 text-white"
                    onClick={() => deletionRequest.mutate()}
                    disabled={deletionRequest.isPending}
                  >
                    {deletionRequest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmer la demande
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Consents */}
      <ConsentHistory />
    </div>
  );
}

// ─── Tab: Sécurité ────────────────────────────────────────────────────────────

function SecurityTab() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { toast } = useToast();
  const [signingOut, setSigningOut] = useState(false);

  const isGoogleAuth = user?.externalAccounts?.some((a) => a.provider === "google");
  const hasPassword  = user?.passwordEnabled === true;

  async function handleSignOutAll() {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "La déconnexion a échoué." });
      setSigningOut(false);
    }
  }

  if (!isLoaded) return <Skeleton className="h-48 w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      {/* Auth method */}
      <Card>
        <CardHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Méthode d'authentification</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {isGoogleAuth && (
            <div className="flex items-center gap-3 text-sm">
              <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-foreground">Google</p>
                <p className="text-xs text-muted-foreground">
                  Vous êtes connecté via Google. La gestion du mot de passe se fait sur votre compte Google.
                </p>
              </div>
            </div>
          )}

          {!isGoogleAuth && hasPassword && (
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium text-foreground">Mot de passe</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Modifiez votre mot de passe depuis la page de connexion Clerk.
                </p>
              </div>
            </div>
          )}

          {!isGoogleAuth && !hasPassword && (
            <p className="text-sm text-muted-foreground">
              Aucune méthode d'authentification par mot de passe n'est configurée.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sessions */}
      <Card>
        <CardHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Session active</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Dernière connexion :{" "}
              <span className="font-medium text-foreground">
                {user?.lastSignInAt
                  ? new Date(user.lastSignInAt).toLocaleString("fr-FR", {
                      day: "numeric", month: "long", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })
                  : "—"}
              </span>
            </p>
          </div>

          <Separator />

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium text-foreground">Se déconnecter</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ferme votre session sur cet appareil et vous redirige vers la page de connexion.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={handleSignOutAll}
              disabled={signingOut}
            >
              {signingOut
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <LogOut className="mr-2 h-4 w-4" />}
              Se déconnecter
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS = [
  { value: "profile",      label: "Mon profil",             Icon: User },
  { value: "organization", label: "Mon organisation",       Icon: Building2 },
  { value: "privacy",      label: "Confidentialité",        Icon: Lock },
  { value: "security",     label: "Sécurité",               Icon: Shield },
] as const;

export function UserSettings() {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Mes paramètres</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gérez votre profil, votre organisation et vos données personnelles.
          </p>
        </div>

        <Tabs defaultValue="profile">
          {/* Tab list — scrollable on mobile */}
          <TabsList className="flex w-full overflow-x-auto no-scrollbar h-auto gap-0 p-1 bg-muted rounded-lg">
            {TABS.map(({ value, label, Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className={cn(
                  "flex-1 min-w-[7rem] flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">
                  {value === "profile" ? "Profil" :
                   value === "organization" ? "Org." :
                   value === "privacy" ? "Données" : "Sécurité"}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="profile"      className="mt-6"><ProfileTab /></TabsContent>
          <TabsContent value="organization" className="mt-6"><OrgTab /></TabsContent>
          <TabsContent value="privacy"      className="mt-6"><PrivacyTab /></TabsContent>
          <TabsContent value="security"     className="mt-6"><SecurityTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
