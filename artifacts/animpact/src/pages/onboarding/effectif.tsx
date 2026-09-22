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
import { EFFECTIF_OPTIONS, EFFECTIF_SESSION_KEY, type EffectifKey } from "./plans";
import { useDebugMount } from "@/lib/requestDebug";

export function OnboardingEffectif() {
  useDebugMount("OnboardingEffectif");
  const [, setLocation] = useLocation();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const [selected, setSelected] = useState<EffectifKey | null>(null);
  const { data: onboarding } = useGetOnboardingProgress({
    query: {
      queryKey: getGetOnboardingProgressQueryKey(),
      meta: { debugLabel: "OnboardingEffectif:onboarding" },
    },
  });
  const updateProgress = useUpdateOnboardingProgress();
  const qc = useQueryClient();

  useEffect(() => {
    const key = onboarding?.effectifKey as EffectifKey | null | undefined;
    if (key && EFFECTIF_OPTIONS.some((option) => option.key === key)) {
      setSelected(key);
    }
  }, [onboarding?.effectifKey]);

  async function handleContinue() {
    if (!selected) return;

    if (isAuthLoaded && isSignedIn) {
      if (onboarding?.status === "completed") {
        setLocation("/dashboard", { replace: true });
        return;
      }
      if (
        onboarding?.status === "subscription_selected"
        || onboarding?.status === "payment_pending"
      ) {
        setLocation("/onboarding/abonnement", { replace: true });
        return;
      }
    }

    sessionStorage.setItem(EFFECTIF_SESSION_KEY, selected);
    if (isAuthLoaded && isSignedIn) {
      try {
        await updateProgress.mutateAsync({
          data: { status: "workforce_completed", effectifKey: selected },
        });
      } catch (error: any) {
        if (error?.status === 409 || error?.message?.includes("409")) {
          await qc.invalidateQueries({
            queryKey: getGetOnboardingProgressQueryKey(),
          });
          setLocation("/onboarding", { replace: true });
          return;
        }
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
              onClick={() => setSelected(opt.key)}
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
      </div>
    </div>
  );
}
