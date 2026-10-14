import { useState } from "react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useAuth } from "@clerk/react";
import {
  useGetOnboardingProgress,
  useUpdateOnboardingProgress,
  getGetOnboardingProgressQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";
import {
  EFFECTIF_OPTIONS,
  readEffectifSelection,
  readSubscriptionIntent,
  saveEffectifSelection,
  saveSubscriptionIntent,
  type EffectifKey,
} from "./plans";
import { useDebugMount } from "@/lib/requestDebug";

export function OnboardingEffectif() {
  useDebugMount("OnboardingEffectif");
  const [, setLocation] = useLocation();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const [selected, setSelected] = useState<EffectifKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: onboarding } = useGetOnboardingProgress({
    query: {
      queryKey: getGetOnboardingProgressQueryKey(),
      enabled: isAuthLoaded && isSignedIn,
      meta: { debugLabel: "OnboardingEffectif:onboarding" },
    },
  });
  const updateProgress = useUpdateOnboardingProgress();
  const qc = useQueryClient();

  useEffect(() => {
    setSelected((onboarding?.effectifKey as EffectifKey | null | undefined) ?? readEffectifSelection());
  }, [onboarding?.effectifKey]);

  async function handleContinue() {
    if (!selected) return;
    setError(null);

    if (isAuthLoaded && isSignedIn) {
      if (onboarding?.status === "completed") {
        setLocation("/dashboard", { replace: true });
        return;
      }
    }

    saveEffectifSelection(selected);
    if (readSubscriptionIntent()) {
      saveSubscriptionIntent(selected);
    }
    if (isAuthLoaded && isSignedIn) {
      try {
        const savedStatus = onboarding?.status === "organization_created"
          || onboarding?.status === "subsidiaries_configured"
          || onboarding?.status === "subscription_selected"
          || onboarding?.status === "payment_pending"
          ? onboarding.status
          : "workforce_completed";
        const updatedOnboarding = await updateProgress.mutateAsync({
          data: { status: savedStatus, effectifKey: selected },
        });
        qc.setQueryData(getGetOnboardingProgressQueryKey(), updatedOnboarding);
      } catch (error: any) {
        if (error?.status === 409 || error?.message?.includes("409")) {
          await qc.invalidateQueries({
            queryKey: getGetOnboardingProgressQueryKey(),
          });
          setLocation("/onboarding", { replace: true });
          return;
        }
        setError("Impossible d’enregistrer cette étape. Vérifiez votre connexion puis réessayez.");
        return;
      }
    }
    setLocation("/onboarding/abonnement");
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-muted/30 px-4 py-12">
      {/* Logo */}
      <div className="flex items-center justify-center mb-10">
        <img src={`${import.meta.env.BASE_URL}logo-dark.png`} alt="Cocci" className="h-9 w-auto" />
      </div>

      <div className="w-full max-w-md bg-white rounded-xl border border-border shadow-sm p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Combien de salariés compte votre entreprise&nbsp;?
          </h1>
          <p className="text-muted-foreground text-sm">
            Cela nous permet de vous proposer la formule adaptée.
          </p>
        </div>

        {/* Options */}
        <div className="space-y-2">
          {EFFECTIF_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                setSelected(opt.key);
                saveEffectifSelection(opt.key);
              }}
              data-testid={`button-effectif-${opt.key}`}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl border transition-colors text-sm font-medium",
                selected === opt.key
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:bg-muted/30 text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <Button
          className="w-full"
          disabled={!selected || updateProgress.isPending}
          onClick={handleContinue}
        >
          Voir ma formule →
        </Button>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
