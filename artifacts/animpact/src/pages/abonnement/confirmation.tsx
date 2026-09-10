import { useEffect, useMemo } from "react";
import { useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import {
  getGetOnboardingProgressQueryKey,
  useGetOnboardingProgress,
} from "@workspace/api-client-react";
import { CheckCircle2, LayoutDashboard, LogIn, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isActiveStripeSubscription,
  useOrganizationSubscription,
} from "@/hooks/useOrganizationSubscription";
import {
  PLANS,
  SUBSCRIPTION_INTENT_SESSION_KEY,
  type EffectifKey,
} from "@/pages/onboarding/plans";

function getOfferLabel(rawOffer: string | null): string {
  if (rawOffer === "additional_user") {
    return "Cocci — Utilisateur supplémentaire";
  }

  if (
    rawOffer
    && Object.prototype.hasOwnProperty.call(PLANS, rawOffer)
  ) {
    const plan = PLANS[rawOffer as EffectifKey];
    return `Cocci — ${plan.effectifLabel}`;
  }

  return "Votre formule Cocci";
}

export function SubscriptionConfirmation() {
  const [, setLocation] = useLocation();
  const { isLoaded, isSignedIn } = useAuth();
  const {
    data: onboarding,
    isLoading: onboardingLoading,
    refetch: refetchOnboarding,
  } = useGetOnboardingProgress({
    query: {
      enabled: isLoaded && isSignedIn,
      queryKey: getGetOnboardingProgressQueryKey(),
    },
  });
  const primaryOrganizationId = onboarding?.primaryOrganizationId ?? null;
  const {
    subscription,
    isLoading: subscriptionLoading,
    refresh: refreshSubscription,
  } = useOrganizationSubscription(primaryOrganizationId);
  const isServerConfirmed =
    onboarding?.status === "completed" && isActiveStripeSubscription(subscription);
  const offerLabel = useMemo(
    () => getOfferLabel(new URLSearchParams(window.location.search).get("offer")),
    [],
  );

  useEffect(() => {
    // Une intention de paiement déjà satisfaite ne doit jamais relancer Checkout
    // après le retour depuis Stripe.
    sessionStorage.removeItem(SUBSCRIPTION_INTENT_SESSION_KEY);
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !primaryOrganizationId || isServerConfirmed) return;
    const intervalId = window.setInterval(() => {
      refreshSubscription();
      void refetchOnboarding();
    }, 2500);
    return () => window.clearInterval(intervalId);
  }, [
    isLoaded,
    isServerConfirmed,
    isSignedIn,
    primaryOrganizationId,
    refetchOnboarding,
    refreshSubscription,
  ]);

  const handleContinue = () => {
    if (isSignedIn && !isServerConfirmed) {
      refreshSubscription();
      void refetchOnboarding();
      return;
    }
    setLocation(isSignedIn ? "/dashboard" : "/sign-in");
  };

  return (
    <main className="min-h-[100dvh] bg-muted/30 px-4 py-12 flex items-center justify-center">
      <section
        className="w-full max-w-md rounded-xl border border-border bg-white p-8 text-center shadow-sm space-y-6"
        aria-labelledby="subscription-confirmation-title"
        data-testid="card-subscription-confirmation"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1
            id="subscription-confirmation-title"
            className="text-2xl font-bold tracking-tight text-foreground"
            data-testid="text-subscription-confirmation-title"
          >
            {isServerConfirmed
              ? "Votre abonnement est actif"
              : "Paiement reçu, confirmation en cours"}
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="text-subscription-confirmation-message">
            {isServerConfirmed
              ? "Merci pour votre confiance. Votre espace Cocci est maintenant disponible."
              : "Stripe a reçu votre paiement. Nous vérifions encore la confirmation serveur avant d'ouvrir votre espace."}
          </p>
        </div>

        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-green-700">Formule souscrite</p>
          <p className="mt-1 text-sm font-semibold text-green-950" data-testid="text-subscribed-offer">
            {offerLabel}
          </p>
        </div>

        {!isLoaded || (isSignedIn && (onboardingLoading || subscriptionLoading)) ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground" data-testid="status-session-loading">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Vérification de votre session…
          </div>
        ) : (
          <Button
            type="button"
            className="w-full"
            onClick={handleContinue}
            disabled={isSignedIn && !isServerConfirmed}
            data-testid="button-access-workspace"
          >
            {isSignedIn ? (
              <>
                <LayoutDashboard aria-hidden="true" />
                {isServerConfirmed ? "Accéder à mon espace" : "Vérifier à nouveau"}
              </>
            ) : (
              <>
                <LogIn aria-hidden="true" />
                Se connecter
              </>
            )}
          </Button>
        )}
      </section>
    </main>
  );
}