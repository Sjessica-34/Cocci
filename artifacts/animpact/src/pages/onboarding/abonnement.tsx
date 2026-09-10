import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import {
  customFetch,
  useGetOnboardingProgress,
  useUpdateOnboardingProgress,
  getGetOnboardingProgressQueryKey,
} from "@workspace/api-client-react";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import {
  canStartSubscriptionCheckout,
  isActiveStripeSubscription,
  isOrganizationSubscriptionReady,
  isSubscriptionCheckoutButtonDisabled,
  useOrganizationSubscription,
} from "@/hooks/useOrganizationSubscription";
import { Button } from "@/components/ui/button";
import { Check, CreditCard, ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import {
  ONBOARDING_CONTINUATION_SESSION_KEY,
  EFFECTIF_SESSION_KEY,
  SUBSCRIPTION_INTENT_SESSION_KEY,
  effectifToPlan,
  type EffectifKey,
  type Plan,
} from "./plans";

export function OnboardingAbonnement() {
  const [, setLocation] = useLocation();
  const { isLoaded: isAuthLoaded, isSignedIn, getToken } = useAuth();
  const { currentOrgId } = useCurrentOrganization();
  const { data: onboarding, isLoading: onboardingLoading } = useGetOnboardingProgress({
    query: {
      enabled: isAuthLoaded && isSignedIn,
      queryKey: getGetOnboardingProgressQueryKey(),
    },
  });
  const updateProgress = useUpdateOnboardingProgress();
  const effectiveOrgId = currentOrgId ?? onboarding?.primaryOrganizationId ?? null;
  const {
    subscription,
    isLoading: subscriptionLoading,
    error: subscriptionError,
    refresh: refreshSubscription,
  } = useOrganizationSubscription(effectiveOrgId);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [effectifKey, setEffectifKey] = useState<EffectifKey | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const checkoutStartedRef = useRef(false);

  useEffect(() => {
    const key = (onboarding?.effectifKey
      ?? sessionStorage.getItem(EFFECTIF_SESSION_KEY)) as EffectifKey | null | undefined;
    if (onboardingLoading) return;
    if (!key) {
      // Pas de tranche sélectionnée → retour à l'étape effectif
      setLocation("/onboarding/effectif");
      return;
    }
    setEffectifKey(key);
    setPlan(effectifToPlan(key));
  }, [isAuthLoaded, isSignedIn, onboarding?.effectifKey, onboardingLoading, setLocation]);

  const isActive = isActiveStripeSubscription(subscription);
  const subscriptionReady = isOrganizationSubscriptionReady(
    effectiveOrgId,
    subscription,
    subscriptionLoading,
  );
  const isDevis = plan?.pricePerMonth === null;

  const handlePortal = async () => {
    if (!effectiveOrgId) return;
    setPortalLoading(true);
    setPortalError(null);
    try {
      const token = await getToken({ skipCache: true });
      if (!token) throw new Error("Authentication token unavailable");
      const { url } = await customFetch<{ url: string }>(
        `/api/organizations/${effectiveOrgId}/stripe/portal`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (url) window.open(url, "_blank");
    } catch {
      setPortalError("Erreur lors de l'ouverture du portail. Réessayez.");
    } finally {
      setPortalLoading(false);
    }
  };

  const startCheckout = useCallback(async () => {
    if (!canStartSubscriptionCheckout({
      currentOrgId: effectiveOrgId,
      effectifKey,
      isAuthLoaded,
      isSignedIn,
      isActive,
      checkoutStarted: checkoutStartedRef.current,
    })) {
      return;
    }

    checkoutStartedRef.current = true;
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      await updateProgress.mutateAsync({
        data: { status: "subscription_selected", effectifKey: effectifKey ?? undefined },
      });
      const token = await getToken({ skipCache: true });
      if (!token) throw new Error("Authentication token unavailable");
      // Le frontend transmet seulement la tranche d'effectif. Le serveur
      // sélectionne lui-même le Product ID et le Price ID autorisés.
      const { url } = await customFetch<{ url: string }>(
        `/api/organizations/${effectiveOrgId}/stripe/checkout`,
        {
          method: "POST",
          body: JSON.stringify({ effectifKey }),
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (url) {
        // Checkout est lancé : l'intention est consommée pour ne jamais
        // redéclencher une seconde session après un retour ou un rechargement.
        sessionStorage.removeItem(SUBSCRIPTION_INTENT_SESSION_KEY);
        sessionStorage.removeItem(EFFECTIF_SESSION_KEY);
        sessionStorage.removeItem(ONBOARDING_CONTINUATION_SESSION_KEY);
        // Stripe Checkout ne peut pas être rendu dans l'iframe de prévisualisation.
        const targetWindow = window.top ?? window;
        targetWindow.location.href = url;
        return; // redirection en cours — garder l'état "loading"
      }
      throw new Error("URL de paiement manquante");
    } catch {
      checkoutStartedRef.current = false;
      setCheckoutError("Erreur lors de la création de la session de paiement. Réessayez.");
      setCheckoutLoading(false);
    }
  }, [
    effectiveOrgId,
    effectifKey,
    getToken,
    isActive,
    isAuthLoaded,
    isSignedIn,
    updateProgress,
  ]);

  useEffect(() => {
    const hasMatchingIntent = effectifKey
      && sessionStorage.getItem(SUBSCRIPTION_INTENT_SESSION_KEY) === effectifKey;
    const canResumeCheckout = isSignedIn
      && effectiveOrgId
      && effectifKey
      && !isDevis
      && hasMatchingIntent
      && subscriptionReady
      && !isActive;

    if (isActive && hasMatchingIntent) {
      sessionStorage.removeItem(SUBSCRIPTION_INTENT_SESSION_KEY);
      return;
    }

    if (canResumeCheckout) {
      void startCheckout();
    }
  }, [
    effectiveOrgId,
    effectifKey,
    isActive,
    isDevis,
    isSignedIn,
    startCheckout,
    subscriptionReady,
  ]);

  /** Enregistre l'intention puis ouvre Checkout maintenant ou après l'onboarding. */
  const handleSouscrire = async () => {
    if (!effectifKey) {
      setCheckoutError("La formule sélectionnée est introuvable. Recommencez le parcours.");
      return;
    }

    // Un compte déjà configuré ne peut pas créer une intention de paiement
    // depuis une ancienne URL d'onboarding.
    if (isSignedIn && effectiveOrgId && onboarding?.status === "completed") {
      sessionStorage.removeItem(SUBSCRIPTION_INTENT_SESSION_KEY);
      sessionStorage.removeItem(ONBOARDING_CONTINUATION_SESSION_KEY);
      setLocation("/dashboard");
      return;
    }

    sessionStorage.setItem(SUBSCRIPTION_INTENT_SESSION_KEY, effectifKey);

    // Non connecté → inscription. L'intention est reprise après authentification.
    if (!isSignedIn) {
      setLocation("/sign-up");
      return;
    }
    // Connecté mais sans organisation → création d'espace, puis reprise automatique.
    if (!effectiveOrgId) {
      setLocation("/onboarding");
      return;
    }
    if (!subscriptionReady && !subscriptionError) {
      setCheckoutError("Impossible de vérifier votre abonnement. Réessayez.");
      return;
    }
    if (isActive) {
      sessionStorage.removeItem(SUBSCRIPTION_INTENT_SESSION_KEY);
      return;
    }

    await startCheckout();
  };

  const handleRetrySubscriptionCheck = () => {
    setCheckoutError(null);
    refreshSubscription();
  };

  if (!plan) return null;

  const INCLUDED_FEATURES = [
    "Toutes les fonctionnalités Cocci incluses",
    "1 utilisateur inclus dans l'abonnement",
    "Toutes les filiales incluses dans l'abonnement",
    "Utilisateurs supplémentaires : 3 € TTC / mois / utilisateur",
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-muted/30 px-4 py-12">
      {/* Logo */}
      <div className="flex items-center justify-center mb-10">
        <img src={`${import.meta.env.BASE_URL}logo-dark.png`} alt="Cocci" className="h-9 w-auto" />
      </div>

      <div className="w-full max-w-md bg-white rounded-xl border border-border shadow-sm p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <h1 className="text-xl font-bold tracking-tight">Votre formule</h1>
          <p className="text-muted-foreground text-sm">
            Tout ce dont vous avez besoin pour piloter votre RSE.
          </p>
        </div>

        {/* Plan card */}
        <div className="rounded-xl border-2 border-primary bg-primary/5 p-6 space-y-4">
          {/* Effectif + tarif */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                Formule
              </p>
              <p className="font-semibold text-foreground">{plan.effectifLabel}</p>
            </div>
            <div className="text-right shrink-0">
              {isDevis ? (
                <p className="text-xl font-bold text-primary leading-tight">Sur devis</p>
              ) : (
                <>
                  <p className="text-2xl font-bold text-primary leading-tight">
                    {plan.pricePerMonth!.toLocaleString("fr-FR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    €
                  </p>
                  <p className="text-xs text-muted-foreground">TTC / mois</p>
                </>
              )}
            </div>
          </div>

          {/* Inclus */}
          <div className="pt-3 border-t border-primary/20 space-y-2.5">
            {INCLUDED_FEATURES.map((feature) => (
              <div key={feature} className="flex items-start gap-2.5 text-sm text-foreground">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {effectiveOrgId && subscriptionLoading && (
          <p className="text-center text-xs text-muted-foreground">
            Vérification de votre abonnement…
          </p>
        )}

        {isActive && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wide font-medium text-green-700">
                Abonnement actuel
              </p>
              <p className="text-sm font-semibold text-green-900 mt-1">
                {subscription?.offer_name ?? "Cocci Pro"} · Actif
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 border-green-300 bg-white"
              onClick={handlePortal}
              disabled={portalLoading}
            >
              {portalLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <ExternalLink className="h-4 w-4" />}
              Gérer mon abonnement
            </Button>
            {portalError && (
              <p className="text-xs text-center text-destructive">{portalError}</p>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="space-y-3">
          {isDevis ? (
            <>
              {/* Offre entreprise : contact commercial */}
              <Button className="w-full gap-2" disabled>
                <CreditCard className="h-4 w-4" />
                Nous contacter pour un devis
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Notre équipe vous recontactera dans les meilleurs délais.
              </p>
            </>
          ) : (
            <>
              <Button
                className="w-full gap-2"
                onClick={handleSouscrire}
                disabled={isSubscriptionCheckoutButtonDisabled({
                  checkoutLoading,
                  subscriptionLoading,
                  currentOrgId: effectiveOrgId,
                  subscriptionReady,
                  subscriptionError,
                  isActive,
                })}
              >
                {checkoutLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redirection vers le paiement…
                  </>
                ) : isActive ? (
                  "Abonnement déjà actif"
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    Souscrire
                  </>
                )}
              </Button>
              {subscriptionError && (
                <div className="space-y-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-center">
                  <p className="text-xs text-destructive">
                    Impossible de vérifier votre abonnement.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleRetrySubscriptionCheck}
                    disabled={subscriptionLoading}
                  >
                    Réessayer la vérification
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Lien secondaire : accéder à l'espace ou s'inscrire */}
          <button
            type="button"
            onClick={() => {
              if (isSignedIn) {
                sessionStorage.removeItem(ONBOARDING_CONTINUATION_SESSION_KEY);
              }
              setLocation(isSignedIn ? "/dashboard" : "/sign-up");
            }}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Accéder à mon espace →
          </button>
        </div>

        {/* Retour */}
        <button
          type="button"
          onClick={() => setLocation("/onboarding/effectif")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
        >
          <ArrowLeft className="h-3 w-3" />
          Modifier ma sélection
        </button>
      </div>
    </div>
  );
}
