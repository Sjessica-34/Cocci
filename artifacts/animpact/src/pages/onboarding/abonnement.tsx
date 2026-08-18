import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Check, CreditCard, ArrowLeft } from "lucide-react";
import {
  EFFECTIF_SESSION_KEY,
  effectifToPlan,
  type EffectifKey,
  type Plan,
} from "./plans";

export function OnboardingAbonnement() {
  const [, setLocation] = useLocation();
  const { isSignedIn } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    const key = sessionStorage.getItem(EFFECTIF_SESSION_KEY) as EffectifKey | null;
    if (!key) {
      // Pas de tranche sélectionnée → retour à l'étape effectif
      setLocation("/onboarding/effectif");
      return;
    }
    setPlan(effectifToPlan(key));
  }, [setLocation]);

  if (!plan) return null;

  const isDevis = plan.pricePerMonth === null;

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
              {/*
               * ⚠️  STRIPE CHECKOUT — à brancher ici lors de l'intégration Stripe.
               *
               * Récupérer la clé effectif :
               *   const key = sessionStorage.getItem(EFFECTIF_SESSION_KEY) as EffectifKey;
               *   const plan = effectifToPlan(key);
               *
               * Ouvrir Stripe Checkout avec `plan.stripePriceId` (renseigner dans plans.ts).
               * Si non connecté : rediriger vers /sign-up (l'onboarding reprend ensuite).
               * Si connecté : appeler POST /api/subscriptions/checkout-session et rediriger.
               */}
              <Button
                className="w-full gap-2"
                onClick={() => {
                  if (!isSignedIn) {
                    setLocation("/sign-up");
                  }
                  /* else : Stripe Checkout — à implémenter */
                }}
              >
                <CreditCard className="h-4 w-4" />
                Souscrire
              </Button>
            </>
          )}

          {/* Lien secondaire : accéder à l'espace ou s'inscrire */}
          <button
            type="button"
            onClick={() => setLocation(isSignedIn ? "/dashboard" : "/sign-up")}
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
