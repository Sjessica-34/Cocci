import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout";
import { purchaseSeatAndInviteAdditionalUser } from "@/lib/additionalUserInviteFlow";
import {
  ApiError,
  addAdditionalUser,
  removeAdditionalUser,
  useInviteMember,
  useListMembers,
  getListMembersQueryKey,
  customFetch,
  getGetEmploymentWorkforceQueryKey,
  getGetOrganizationQueryKey,
  useGetEmploymentWorkforce,
  useGetOrganization,
} from "@workspace/api-client-react";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { useOrganizationSubscription } from "@/hooks/useOrganizationSubscription";
import { PLANS, type EffectifKey } from "@/pages/onboarding/plans";
import { CheckCircle2, Loader2, Zap, Building2, Building, ExternalLink, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Price = {
  unitAmount: number;
  currency: string;
  recurring: { interval: "month" | "year" };
};

type Plan = {
  key: string;
  name: string;
  description: string | null;
  tier: string;
  prices: Price[];
};

type CheckoutError = {
  code?: string;
  employeeCount?: number;
  error?: string;
};

type SeatRemovalError = {
  error?: string;
  memberCount?: number;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatAmount(cents: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function getPlanMaxEmployees(planKey: string) {
  return PLANS[planKey as EffectifKey]?.maxEmployees ?? null;
}

const TIER_ICONS: Record<string, typeof Zap> = {
  tpe: Zap,
  pme: Building2,
  eti: Building,
};

const TIER_FEATURES: Record<string, string[]> = {
  tpe: [
    "Diagnostic RSE complet",
    "Bilan carbone & simulation",
    "Plan d'actions",
    "Labels & certifications",
    "Page publique RSE",
    "Rapport RSE annuel",
  ],
  pme: [
    "Tout Cocci TPE",
    "Multi-entités (filiales)",
    "Baromètre social",
    "Impact Score avancé",
    "Export & API",
    "Support prioritaire",
  ],
  eti: [
    "Tout Cocci PME",
    "Entités illimitées",
    "Consolidation groupe",
    "Accompagnement dédié",
    "SLA garanti",
    "Déploiement sur-mesure",
  ],
};

// ─── Composant ─────────────────────────────────────────────────────────────────

export function Abonnement() {
  const { getToken } = useAuth();
  const { user: clerkUser, isLoaded: clerkUserLoaded } = useUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { currentOrgId } = useCurrentOrganization();
  const { isSuperAdmin, isLoading: superAdminLoading } = useIsSuperAdmin();
  const {
    data: organizationMembers,
    isLoading: membersLoading,
    error: membersError,
  } = useListMembers(currentOrgId ?? 0, {
    query: {
      enabled: Boolean(currentOrgId),
      queryKey: getListMembersQueryKey(currentOrgId ?? 0),
    },
  });
  const currentMembership = organizationMembers?.find(
    (member) => member.user?.clerkId === clerkUser?.id,
  );
  const canManageAdditionalUsers =
    isSuperAdmin || currentMembership?.role === "owner" || currentMembership?.role === "admin";
  const billingPermissionLoading = !clerkUserLoaded || superAdminLoading || membersLoading;
  const {
    subscription,
    isLoading: subscriptionLoading,
    isActive,
    refresh: refreshSubscription,
  } = useOrganizationSubscription(currentOrgId);
  const {
    data: organization,
    isLoading: organizationLoading,
    error: organizationError,
  } = useGetOrganization(currentOrgId ?? 0, {
    query: {
      enabled: Boolean(currentOrgId) && isActive,
      queryKey: getGetOrganizationQueryKey(currentOrgId ?? 0),
    },
  });
  const {
    data: workforce,
    isLoading: workforceLoading,
    error: workforceError,
  } = useGetEmploymentWorkforce(currentOrgId ?? 0, {
    query: {
      enabled: Boolean(currentOrgId) && isActive,
      queryKey: getGetEmploymentWorkforceQueryKey(currentOrgId ?? 0),
    },
  });

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlanKey, setLoadingPlanKey] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [additionalUserLoading, setAdditionalUserLoading] = useState(false);
  const [showInviteAdditionalUser, setShowInviteAdditionalUser] = useState(false);
  const [additionalUserEmail, setAdditionalUserEmail] = useState("");
  const [additionalUserRole, setAdditionalUserRole] = useState<"admin" | "member" | "viewer">("member");
  const [seatReadyEmail, setSeatReadyEmail] = useState<string | null>(null);
  const [removeAdditionalUserLoading, setRemoveAdditionalUserLoading] = useState(false);
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const inviteMember = useInviteMember();
  const activeStripeSubscription =
    subscription?.mode === "stripe" && subscription.status === "active";
  const activePlan = plans.find(
    (plan) => plan.name.trim() === subscription?.offer_name?.trim(),
  );
  const activePlanMaxEmployees =
    (activePlan ? getPlanMaxEmployees(activePlan.key) : null) ??
    subscription?.max_employees ??
    null;

  useEffect(() => {
    if (currentOrgId) {
      setSeatReadyEmail(sessionStorage.getItem(`cocci:additional-user:ready:${currentOrgId}`));
    }
  }, [currentOrgId]);

  // Charger plans + statut en parallèle
  useEffect(() => {
    customFetch<{ plans: Plan[] }>("/api/stripe/plans")
      .then((d) => setPlans(d.plans ?? []))
      .catch(() => setPlans([]));
  }, []);

  const handleCheckout = async (effectifKey: string) => {
    const selectedMaxEmployees = getPlanMaxEmployees(effectifKey);
    const employeeCount =
      organization?.employeeCount ?? workforce?.data?.totalHeadcount ?? null;
    const planTooSmall =
      employeeCount !== null &&
      selectedMaxEmployees !== null &&
      employeeCount > selectedMaxEmployees;

    if (
      !currentOrgId ||
      organizationLoading ||
      organizationError ||
      planTooSmall ||
      subscriptionLoading ||
      (isActive && !activeStripeSubscription) ||
      (activeStripeSubscription &&
        (selectedMaxEmployees === null ||
          activePlanMaxEmployees === null ||
          selectedMaxEmployees <= activePlanMaxEmployees))
    ) return;
    setLoadingPlanKey(effectifKey);

    if (activeStripeSubscription) {
      try {
        const token = await getToken({ skipCache: true });
        if (!token) throw new Error("Authentication token unavailable");
        await customFetch(
          `/api/organizations/${currentOrgId}/stripe/change-plan`,
          {
            method: "POST",
            body: JSON.stringify({ effectifKey }),
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        await refreshSubscription();
        alert("Votre formule a été augmentée. Le prorata Stripe sera appliqué immédiatement.");
      } catch (error) {
        const changeError = error instanceof ApiError
          ? (error.data as CheckoutError | null)
          : null;
        if (changeError?.code === "PLAN_TOO_SMALL") {
          alert(`Cette formule ne couvre pas votre effectif de ${changeError.employeeCount ?? "votre organisation"} salarié(s).`);
        } else if (changeError?.code === "PLAN_NOT_UPGRADE") {
          alert("Vous pouvez uniquement choisir une formule supérieure à votre formule actuelle.");
        } else if (changeError?.code === "PLAN_CHANGE_PAYMENT_FAILED") {
          alert("La hausse n’a pas été appliquée : le paiement du prorata a échoué. Vérifiez votre moyen de paiement Stripe.");
        } else {
          alert(changeError?.error ?? "Impossible de modifier votre formule. Réessayez.");
        }
      } finally {
        setLoadingPlanKey(null);
      }
      return;
    }

    // Ouvrir l'onglet pendant le clic utilisateur : après l'appel réseau,
    // les navigateurs peuvent bloquer une nouvelle fenêtre depuis l'iframe.
    const checkoutWindow = window.open("about:blank", "cocci-stripe-checkout");
    if (checkoutWindow) {
      checkoutWindow.document.title = "Paiement sécurisé Cocci";
      checkoutWindow.document.body.style.cssText =
        "margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;color:#163028;background:#f8faf9";
      checkoutWindow.document.body.textContent = "Redirection vers le paiement sécurisé…";
    }
    let checkoutUrl: string;

    try {
      const token = await getToken({ skipCache: true });
      if (!token) throw new Error("Authentication token unavailable");
      const { url } = await customFetch<{ url: string }>(
        `/api/organizations/${currentOrgId}/stripe/checkout`,
        {
          method: "POST",
          body: JSON.stringify({ effectifKey }),
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!url) throw new Error("URL de paiement manquante");
      checkoutUrl = url;
    } catch (error) {
      checkoutWindow?.close();
      setLoadingPlanKey(null);
      const checkoutError =
        error instanceof ApiError ? (error.data as CheckoutError | null) : null;
      if (checkoutError?.code === "PLAN_TOO_SMALL") {
        const count = checkoutError.employeeCount;
        alert(
          `Cette formule ne couvre pas votre effectif de ${count} salarié${count === 1 ? "" : "s"}. Choisissez une formule supérieure.`,
        );
      }
      return;
    }

    try {
      if (checkoutWindow && !checkoutWindow.closed) {
        checkoutWindow.location.href = checkoutUrl;
      } else {
        const targetWindow = window.top ?? window;
        targetWindow.location.href = checkoutUrl;
      }
    } catch {
      checkoutWindow?.close();
      alert("Impossible d'ouvrir la page de paiement. Réessayez.");
    } finally {
      setLoadingPlanKey(null);
    }
  };

  const handlePortal = async () => {
    if (!currentOrgId) return;
    setPortalLoading(true);
    try {
      const token = await getToken({ skipCache: true });
      if (!token) throw new Error("Authentication token unavailable");
      const { url } = await customFetch<{ url: string }>(
        `/api/organizations/${currentOrgId}/stripe/portal`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (url) window.open(url, "_blank");
    } catch {
      alert("Erreur lors de l'ouverture du portail. Réessayez.");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleAdditionalUser = () => {
    if (
      !currentOrgId ||
      subscription?.mode !== "stripe" ||
      subscription.status !== "active" ||
      billingPermissionLoading ||
      !canManageAdditionalUsers ||
      additionalUserLoading
    ) return;
    setAdditionalUserEmail(seatReadyEmail ?? "");
    setShowInviteAdditionalUser(true);
  };

  const submitAdditionalUserInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentOrgId || !additionalUserEmail.trim() || additionalUserLoading) return;
    setAdditionalUserLoading(true);
    const normalizedEmail = additionalUserEmail.trim().toLowerCase();
    const idempotencyStorageKey = `cocci:additional-user:${currentOrgId}:${normalizedEmail}`;
    const readyStorageKey = `cocci:additional-user:ready:${currentOrgId}`;
    const idempotencyKey =
      sessionStorage.getItem(idempotencyStorageKey) ?? crypto.randomUUID();
    sessionStorage.setItem(idempotencyStorageKey, idempotencyKey);
    let seatWasReady = seatReadyEmail === normalizedEmail;
    try {
      await purchaseSeatAndInviteAdditionalUser({
        email: normalizedEmail,
        role: additionalUserRole,
        seatReadyEmail,
        purchaseSeat: async () => {
          const token = await getToken({ skipCache: true });
          if (!token) throw new Error("Authentication token unavailable");
          await addAdditionalUser(currentOrgId, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Idempotency-Key": idempotencyKey,
            },
          });
        },
        markSeatReady: (email) => {
          sessionStorage.setItem(readyStorageKey, email);
          seatWasReady = true;
          setSeatReadyEmail(email);
        },
        sendInvitation: (email, role) => inviteMember.mutateAsync({
          id: currentOrgId,
          data: { email, role },
        }),
      });
      sessionStorage.removeItem(readyStorageKey);
      sessionStorage.removeItem(idempotencyStorageKey);
      setSeatReadyEmail(null);
      await queryClient.invalidateQueries({
        queryKey: ["/api/organizations", currentOrgId, "subscription"],
      });
      await queryClient.invalidateQueries({
        queryKey: getListMembersQueryKey(currentOrgId),
      });
      refreshSubscription();
      toast({
        title: "Utilisateur invité",
        description: `${normalizedEmail} recevra une invitation pour rejoindre l’organisation. Le siège supplémentaire est facturé 3 € TTC/mois.`,
      });
      setShowInviteAdditionalUser(false);
      setAdditionalUserEmail("");
      setAdditionalUserRole("member");
    } catch (error) {
      const payload = error instanceof ApiError
        && error.data !== null
        && typeof error.data === "object"
        ? error.data as Record<string, unknown>
        : {};
      const code = typeof payload.code === "string" ? payload.code : "";
      const apiMessage = typeof payload.error === "string" ? payload.error : null;
      const stripeMessage = typeof payload.stripeMessage === "string" ? payload.stripeMessage : null;
      if (
        error instanceof ApiError &&
        (
          error.status === 400
          || code === "STRIPE_UPDATE_FAILED"
          || code === "SEAT_ATTEMPT_FAILED"
        ) &&
        sessionStorage.getItem(idempotencyStorageKey) === idempotencyKey &&
        !seatWasReady
      ) {
        sessionStorage.removeItem(idempotencyStorageKey);
      }
      let title = "Ajout impossible";
      let description = "Le serveur n’a pas confirmé le résultat. Réessayez avec le même formulaire; ne créez pas une seconde demande.";
      if (seatWasReady) {
        if (code === "CLERK_INVITATION_FAILED") {
          title = "Paiement effectué — échec d’envoi Clerk";
          description = "Le siège est bien ajouté et facturé 3 € TTC/mois, mais Clerk n’a pas envoyé l’invitation. Contactez le support si le problème persiste.";
        } else if (code.includes("DATABASE")) {
          title = "Paiement effectué — erreur de base de données";
          description = "Le siège est facturé 3 € TTC/mois, mais l’enregistrement de l’invitation a échoué. Contactez le support; ne rachetez pas de siège.";
        } else if (code.includes("ORGANIZATION")) {
          title = "Paiement effectué — erreur d’organisation";
          description = "Le siège est facturé 3 € TTC/mois, mais l’organisation n’a pas pu finaliser l’invitation. Contactez le support; ne rachetez pas de siège.";
        } else {
          title = "Paiement effectué mais invitation non envoyée";
          description = "Le siège est bien ajouté et facturé 3 € TTC/mois, mais l’invitation n’a pas été finalisée. Contactez le support.";
        }
      } else if (code === "STRIPE_UPDATE_FAILED") {
        title = "Paiement Stripe refusé";
        description = stripeMessage
          ? `Stripe a refusé l’ajout du siège : ${stripeMessage}`
          : "Stripe a refusé l’ajout du siège. Vérifiez votre moyen de paiement.";
      } else if (code === "STRIPE_SUCCEEDED_LOCAL_SYNC_FAILED") {
        title = "Paiement effectué, synchronisation en attente";
        description = "Stripe a confirmé le siège, mais Cocci n’a pas terminé sa synchronisation. Réessayez cette même demande : elle reprendra sans refacturer.";
      } else if (code === "STRIPE_OUTCOME_UNKNOWN" || code === "STRIPE_REQUEST_FAILED") {
        title = "Résultat Stripe à confirmer";
        description = stripeMessage
          ? `La demande Stripe n’a pas pu être confirmée (${stripeMessage}). Réessayez avec cette même demande; la clé idempotente évite un doublon.`
          : "La demande Stripe n’a pas pu être confirmée. Réessayez avec cette même demande; la clé idempotente évite un doublon.";
      } else if (code.startsWith("STRIPE_") || code.startsWith("ADDITIONAL_USER_PRICE_")) {
        title = "Configuration ou accès Stripe";
        description = apiMessage ?? "Stripe ou la configuration du prix n’a pas permis d’ajouter le siège.";
      } else if (code.includes("DATABASE")) {
        title = "Erreur de base de données";
        description = apiMessage ?? "Cocci n’a pas pu préparer le siège. Aucun succès Stripe n’a été confirmé.";
      } else if (code === "ORGANIZATION_ROLE_REQUIRED") {
        title = "Droits insuffisants";
        description = "Seuls le propriétaire ou un administrateur de l’organisation peuvent ajouter un utilisateur payant.";
      } else if (code.includes("ORGANIZATION")) {
        title = "Erreur d’organisation";
        description = apiMessage ?? "Cocci n’a pas pu résoudre l’organisation concernée.";
      } else if (code === "SEAT_ATTEMPT_PENDING") {
        title = "Synchronisation Stripe en attente";
        description = "Une tentative précédente doit être reprise. Réessayez avec cette même demande.";
      } else if (apiMessage) {
        title = "Ajout non effectué";
        description = apiMessage;
      }
      toast({
        variant: "destructive",
        title,
        description,
      });
    } finally {
      setAdditionalUserLoading(false);
    }
  };

  const handleRemoveAdditionalUser = async () => {
    if (
      !currentOrgId ||
      subscription?.mode !== "stripe" ||
      subscription.status !== "active" ||
      subscription.override_max_users !== null ||
      (subscription.max_users ?? 1) <= 1 ||
      removeAdditionalUserLoading
    ) return;

    const confirmed = window.confirm(
      "Retirer un siège supplémentaire ? La limite sera réduite d’un utilisateur et la facturation sera ajustée au prorata par Stripe.",
    );
    if (!confirmed) return;

    setRemoveAdditionalUserLoading(true);
    try {
      const token = await getToken({ skipCache: true });
      if (!token) throw new Error("Authentication token unavailable");
      const result = await removeAdditionalUser(currentOrgId, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await queryClient.invalidateQueries({
        queryKey: ["/api/organizations", currentOrgId, "subscription"],
      });
      refreshSubscription();
      toast({
        title: "Siège supplémentaire retiré",
        description: `Votre limite est maintenant de ${result.maxUsers} utilisateur${result.maxUsers === 1 ? "" : "s"}. Le prorata sera ajusté par Stripe.`,
      });
    } catch (error) {
      const removalError =
        error instanceof ApiError ? (error.data as SeatRemovalError | null) : null;
      if (removalError?.error === "USER_LIMIT_BELOW_CURRENT_MEMBERS") {
        const memberCount = removalError.memberCount ?? 0;
        toast({
          variant: "destructive",
          title: "Siège non supprimé",
          description: `Votre organisation compte ${memberCount} membre${memberCount === 1 ? "" : "s"} actif${memberCount === 1 ? "" : "s"} ou invité${memberCount === 1 ? "" : "s"}. Retirez d’abord des membres ou invitations.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Retrait impossible",
          description: "Stripe n’a pas pu appliquer la modification. Vérifiez votre abonnement et réessayez.",
        });
      }
    } finally {
      setRemoveAdditionalUserLoading(false);
    }
  };

  const hasAnyActive = subscription?.status === "active";
  const cancelled = searchParams.get("cancelled") === "1";
  const employeeCount =
    organization?.employeeCount ?? workforce?.data?.totalHeadcount ?? null;
  const employeeCountCheckPending =
    Boolean(currentOrgId) &&
    employeeCount === null &&
    (organizationLoading || workforceLoading);
  const employeeCountCheckFailed =
    Boolean(currentOrgId) &&
    employeeCount === null &&
    Boolean(organizationError || workforceError);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* ── En-tête ── */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Choisissez votre offre Cocci</h1>
          <p className="text-sm text-gray-500 max-w-lg mx-auto">
            Accédez à l'ensemble des fonctionnalités RSE adaptées à la taille de votre organisation.
          </p>
        </div>

        {/* ── Notifications ── */}
        {cancelled && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800">Paiement annulé. Votre abonnement n'a pas été modifié.</p>
          </div>
        )}

        {/* ── Statut actuel ── */}
        {subscriptionLoading && currentOrgId && (
          <div className="mb-8 text-center text-sm text-gray-500">
            Vérification de votre abonnement…
          </div>
        )}
        {subscription !== undefined && (
          <div className="mb-8 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-5">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Abonnement actuel</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  {subscription?.offer_name ?? (subscription?.mode === "stripe" ? "Cocci Pro" : subscription ? "Gratuit" : "Aucun")}
                </span>
                <Badge variant={hasAnyActive ? "default" : "secondary"}
                  className={hasAnyActive ? "bg-green-100 text-green-800 border-0" : ""}>
                  {subscription?.status === "active" ? "Actif" : subscription?.status === "trial" ? "Essai" : subscription?.status ?? "—"}
                </Badge>
              </div>
            </div>
            {isActive && (
              <div className="flex flex-col sm:flex-row gap-2">
                {subscription?.mode === "stripe" &&
                  subscription.status === "active" &&
                  canManageAdditionalUsers && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleAdditionalUser}
                    disabled={additionalUserLoading}
                    data-testid="button-additional-user"
                  >
                    {additionalUserLoading ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Ajout en cours…</>
                    ) : "Ajouter un utilisateur — 3 € TTC/mois"}
                  </Button>
                )}
                {subscription?.mode === "stripe" &&
                  subscription.status === "active" &&
                  subscription.override_max_users === null &&
                  (subscription.max_users ?? 1) > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveAdditionalUser}
                      disabled={removeAdditionalUserLoading || additionalUserLoading}
                      data-testid="button-remove-additional-user"
                    >
                      {removeAdditionalUserLoading ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Retrait en cours…</>
                      ) : "Retirer un siège supplémentaire"}
                    </Button>
                  )}
                <Button variant="outline" size="sm" onClick={handlePortal} disabled={portalLoading} className="gap-2">
                  {portalLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                  Gérer mon abonnement
                </Button>
              </div>
            )}
          </div>
        )}
        {!billingPermissionLoading && currentOrgId && !canManageAdditionalUsers && (
          <p className="mb-6 text-sm text-muted-foreground">
            {membersError
              ? "Impossible de vérifier vos droits. Seuls les propriétaires et administrateurs peuvent gérer les sièges payants."
              : "Seuls les propriétaires et administrateurs peuvent ajouter un utilisateur payant."}
          </p>
        )}

        <Dialog open={showInviteAdditionalUser} onOpenChange={setShowInviteAdditionalUser}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Ajouter un utilisateur</DialogTitle>
              <DialogDescription>
                Un siège supplémentaire coûte 3 € TTC/mois et sera ajouté à l’abonnement Stripe actif.
                La personne recevra une invitation pour rejoindre cette organisation.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submitAdditionalUserInvite} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="additional-user-email" className="text-sm font-medium">Adresse e-mail</label>
                <input
                  id="additional-user-email"
                  type="email"
                  required
                  value={additionalUserEmail}
                  onChange={(event) => setAdditionalUserEmail(event.target.value)}
                  placeholder="collaborateur@entreprise.fr"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="additional-user-role" className="text-sm font-medium">Rôle</label>
                <select
                  id="additional-user-role"
                  value={additionalUserRole}
                  onChange={(event) => setAdditionalUserRole(event.target.value as typeof additionalUserRole)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="admin">Administrateur</option>
                  <option value="member">Membre</option>
                  <option value="viewer">Lecteur</option>
                </select>
              </div>
              {seatReadyEmail === additionalUserEmail.trim().toLowerCase() && (
                <p className="text-sm text-amber-700">
                  Le siège est déjà facturé. Confirmer à nouveau renverra uniquement l’invitation.
                </p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowInviteAdditionalUser(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={additionalUserLoading || inviteMember.isPending}>
                  {(additionalUserLoading || inviteMember.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmer et inviter — 3 € TTC/mois
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {employeeCount !== null && (
          <div className="mb-8 rounded-xl border border-[#d8e7df] bg-[#f3f8f5] p-4 text-sm text-[#163028]">
            <p className="font-semibold">
              Effectif déclaré : {employeeCount.toLocaleString("fr-FR")} salarié{employeeCount === 1 ? "" : "s"}.
            </p>
            <p className="mt-1 text-[#527064]">
              Les formules qui ne couvrent pas cet effectif sont automatiquement indisponibles.
            </p>
          </div>
        )}
        {activeStripeSubscription && (
          <p className="mb-6 text-sm text-muted-foreground">
            Les formules supérieures peuvent être appliquées immédiatement. Stripe facture le prorata de la période en cours.
          </p>
        )}
        {employeeCountCheckFailed && (
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Impossible de vérifier l&apos;effectif de votre organisation. Les actions de souscription restent
            désactivées jusqu&apos;à la prochaine tentative.
          </div>
        )}

        {/* ── Plans ── */}
        {plans.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3" />
            <p className="text-sm">Chargement des offres…</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, i) => {
              const tier = plan.tier ?? "tpe";
              const Icon = TIER_ICONS[tier] ?? Zap;
              const features = TIER_FEATURES[tier] ?? [];
              const price = plan.prices.find((p) => p.recurring.interval === "month");
              const isFeatured = i === 1;
              const isLoading = loadingPlanKey === plan.key;
               const isCurrentPlan =
                 isActive && subscription?.offer_name?.trim() === plan.name.trim();
              const maxEmployees = getPlanMaxEmployees(plan.key);
              const isUpgrade =
                activeStripeSubscription &&
                activePlanMaxEmployees !== null &&
                maxEmployees !== null &&
                maxEmployees > activePlanMaxEmployees;
              const isLowerPlan =
                activeStripeSubscription &&
                activePlanMaxEmployees !== null &&
                maxEmployees !== null &&
                maxEmployees < activePlanMaxEmployees;
              const planTooSmall =
                employeeCount !== null &&
                maxEmployees !== null &&
                employeeCount > maxEmployees;
              const unavailable = employeeCountCheckPending || employeeCountCheckFailed || planTooSmall;

              return (
                <div key={plan.key}
                  className={`relative rounded-2xl border p-6 flex flex-col ${isFeatured ? "border-[#163028] shadow-lg ring-1 ring-[#163028]/20" : "border-gray-200"} ${planTooSmall ? "opacity-65" : ""}`}>
                  {isFeatured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-[#163028] text-white text-[11px] font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                        <Star className="h-3 w-3" /> Recommandé
                      </span>
                    </div>
                  )}

                  <div className="mb-4">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center mb-3 ${isFeatured ? "bg-[#163028]" : "bg-gray-100"}`}>
                      <Icon className={`h-5 w-5 ${isFeatured ? "text-white" : "text-[#163028]"}`} />
                    </div>
                    <h2 className="text-base font-bold text-gray-900">{plan.name}</h2>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{plan.description}</p>
                  </div>

                  {price && (
                    <div className="mb-6">
                      <span className="text-3xl font-extrabold text-gray-900">
                        {formatAmount(price.unitAmount, price.currency)}
                      </span>
                        <span className="text-sm text-gray-400 ml-1">/mois</span>
                    </div>
                  )}
                  {planTooSmall && (
                    <p className="mb-5 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                      Indisponible pour {employeeCount} salarié{employeeCount === 1 ? "" : "s"}.
                      Choisissez une formule supérieure.
                    </p>
                  )}

                  <ul className="space-y-2.5 mb-8 flex-1">
                    {features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="h-4 w-4 text-[#16a34a] shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => price && !unavailable && handleCheckout(plan.key)}
                    disabled={
                      !price ||
                      isLoading ||
                      unavailable ||
                      (isActive && !isUpgrade) ||
                      (subscription !== undefined &&
                        subscription !== null &&
                        !activeStripeSubscription)
                    }
                    className={`w-full ${isFeatured ? "bg-[#163028] hover:bg-[#1e4438] text-white" : "variant-outline"}`}
                    variant={isFeatured ? "default" : "outline"}
                  >
                    {isLoading ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Redirection…</>
                     ) : isCurrentPlan ? "Offre en cours" : isLowerPlan ? "Formule inférieure indisponible" : planTooSmall ? "Effectif trop élevé" : isUpgrade ? "Passer à cette offre" : "Choisir cette offre"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Footer ── */}
        <p className="text-center text-xs text-gray-400 mt-10">
          Paiement sécurisé par Stripe. Résiliable à tout moment depuis le portail client.
          <br />Vous avez une question ?{" "}
          <a href="mailto:bonjour@cocci.app" className="underline hover:text-gray-600">bonjour@cocci.app</a>
        </p>
      </div>
    </AppLayout>
  );
}
