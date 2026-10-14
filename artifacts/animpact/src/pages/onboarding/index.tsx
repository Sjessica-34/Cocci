import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  customFetch,
  useCreateOrganization,
  getListOrganizationsQueryKey,
  useListOrganizations,
  useGetOnboardingProgress,
  useUpdateOnboardingProgress,
  getGetOnboardingProgressQueryKey,
} from "@workspace/api-client-react";
import type { OnboardingProgress, Organization } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Building, Network, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { setCurrentOrg } from "@/hooks/useCurrentOrganization";
import { onboardingAfterOrganizationCreated } from "@/lib/onboardingCache";
import { RouteLoadingFallback } from "@/components/route-loading";
import {
  clearOnboardingChoices,
  clearOrganizationNameDraft,
  readEffectifSelection,
  readOrganizationNameDraft,
  readOrganizationTypeDraft,
  readSubscriptionIntent,
  saveOrganizationNameDraft,
  saveOrganizationTypeDraft,
} from "./plans";
import { useDebugMount } from "@/lib/requestDebug";
import { useStorageUpload } from "@/hooks/useStorageUpload";
import { resolveOnboardingStepPath } from "@/lib/onboardingNavigation";

// Version des documents légaux en vigueur
const LEGAL_VERSION = "2025-01";

export function Onboarding() {
  useDebugMount("Onboarding");
  const [location, setLocation] = useLocation();
  const qc = useQueryClient();
  const createOrg = useCreateOrganization();
  const updateProgress = useUpdateOnboardingProgress();
  const { uploadFile, isUploading } = useStorageUpload();
  const { data: organizations, isLoading: organizationsLoading } = useListOrganizations(undefined, {
    query: {
      queryKey: getListOrganizationsQueryKey(),
      meta: { debugLabel: "Onboarding:listOrganizations" },
    },
  });
  const { data: onboarding, isLoading: onboardingLoading } = useGetOnboardingProgress({
    query: {
      queryKey: getGetOnboardingProgressQueryKey(),
      meta: { debugLabel: "Onboarding:onboarding" },
    },
  });
  const hasSubmittedRef = useRef(false);

  const [name, setName] = useState(readOrganizationNameDraft);
  const [type, setType] = useState<"entreprise" | "groupe">(readOrganizationTypeDraft);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (organizationsLoading || onboardingLoading || !onboarding || hasSubmittedRef.current) return;

    if (onboarding.status === "completed") {
      clearOnboardingChoices();
      if (location !== "/dashboard") {
        setLocation("/dashboard", { replace: true });
      }
      return;
    }

    if (organizations && organizations.length > 0) {
      const effectifKey = onboarding.effectifKey ?? readEffectifSelection();
      const intent = readSubscriptionIntent();
      const nextPath = resolveOnboardingStepPath({
        status: onboarding.status,
        organizations,
        hasEffectifSelection: Boolean(effectifKey),
        hasMatchingSubscriptionIntent: Boolean(intent && intent === effectifKey),
      });
      if (location !== nextPath) {
        setLocation(nextPath, { replace: true });
      }
    }
  }, [location, onboarding, onboardingLoading, organizations, organizationsLoading, setLocation]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Le nom doit contenir au moins 2 caractères.");
      return;
    }
    if (!consentChecked) {
      setError("Vous devez accepter les CGU et la politique de confidentialité pour continuer.");
      return;
    }
    setError("");
    hasSubmittedRef.current = true;

    let org;
    try {
      const effectifKey = onboarding?.effectifKey ?? readEffectifSelection();
      if (effectifKey && onboarding?.status !== "completed") {
        const saved = await updateProgress.mutateAsync({
          data: {
            status: onboarding?.status ?? "not_started",
            effectifKey,
          },
        });
        qc.setQueryData(getGetOnboardingProgressQueryKey(), saved);
      }
      let logoUrl: string | undefined;
      if (logoFile) {
        const uploaded = await uploadFile(logoFile, null);
        if (!uploaded) {
          hasSubmittedRef.current = false;
          setError("Le logo n’a pas pu être envoyé. Vérifiez le fichier puis réessayez.");
          return;
        }
        logoUrl = uploaded.fileUrl;
      }
      org = await createOrg.mutateAsync({
        data: { name: name.trim(), type, ...(logoUrl ? { logoUrl } : {}) },
      });
    } catch (err: any) {
      if (err?.status === 409 || err?.message?.includes("409")) {
        // Une autre requête a terminé la création : reprendre l'état serveur.
        hasSubmittedRef.current = false;
        await Promise.all([
          qc.invalidateQueries({ queryKey: getListOrganizationsQueryKey() }),
          qc.invalidateQueries({ queryKey: ["/api/users/me/onboarding"] }),
        ]);
        setLocation("/onboarding");
        return;
      }
      hasSubmittedRef.current = false;
      setError("Une erreur est survenue. Veuillez réessayer.");
      return;
    }
    // Mettre à jour immédiatement le cache avant de changer de route.
    // L'invalidation seule peut laisser WorkspaceGuard voir [] si la query
    // n'a plus d'observateur actif pendant l'onboarding.
    qc.setQueryData<Organization[]>(getListOrganizationsQueryKey(), (organizations = []) => {
      return organizations.some((organization) => organization.id === org.id)
        ? organizations
        : [...organizations, org];
    });
    qc.setQueryData<OnboardingProgress>(
      getGetOnboardingProgressQueryKey(),
      (current) => onboardingAfterOrganizationCreated(current, org.id),
    );
    await qc.invalidateQueries({ queryKey: getListOrganizationsQueryKey() });
    clearOrganizationNameDraft();
    setCurrentOrg(org.id);
    // Enregistrement du consentement côté backend
    try {
      await customFetch("/api/users/me/consents", {
        method: "POST",
        body: JSON.stringify({ documentType: "cgu", documentVersion: LEGAL_VERSION }),
      });
      await customFetch("/api/users/me/consents", {
        method: "POST",
        body: JSON.stringify({ documentType: "privacy", documentVersion: LEGAL_VERSION }),
      });
    } catch {
      // L'enregistrement du consentement ne bloque pas l'onboarding
    }

    if (type === "groupe") {
      setLocation("/onboarding/filiales");
    } else if (readSubscriptionIntent()) {
      // L'utilisateur a explicitement demandé Checkout avant de créer son
      // organisation : la formule est reprise automatiquement à l'étape suivante.
      setLocation("/onboarding/abonnement");
    } else {
      setLocation("/onboarding/effectif");
    }
  }

  if (organizationsLoading || onboardingLoading || (organizations?.length ?? 0) > 0) {
    return <RouteLoadingFallback message="Préparation de votre parcours…" />;
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-muted/30 px-4 py-12">
      {/* Logo */}
      <div className="flex items-center justify-center mb-10">
        <img src={`${import.meta.env.BASE_URL}logo-dark.png`} alt="Cocci" className="h-9 w-auto" />
      </div>

      <div className="w-full max-w-md bg-white rounded-xl border border-border shadow-sm p-8 space-y-7">
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight">Bienvenue sur cocci</h1>
          <p className="text-muted-foreground text-sm">
            Commençons par configurer votre espace RSE.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Nom *</Label>
            <Input
              id="name"
              placeholder="Mon Entreprise"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                saveOrganizationNameDraft(e.target.value);
                setError("");
              }}
              autoFocus
              data-testid="input-organization-name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="organization-logo">Logo (facultatif)</Label>
            <Input
              id="organization-logo"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                if (file && file.size > 5 * 1024 * 1024) {
                  setError("Le logo doit faire 5 Mo maximum.");
                  event.target.value = "";
                  setLogoFile(null);
                  return;
                }
                setLogoFile(file);
                setError("");
              }}
              data-testid="input-organization-logo"
            />
            {logoFile && <p className="text-xs text-muted-foreground">{logoFile.name}</p>}
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <RadioGroup
              value={type}
              onValueChange={(v) => {
                const nextType = v as "entreprise" | "groupe";
                setType(nextType);
                saveOrganizationTypeDraft(nextType);
              }}
              className="grid grid-cols-2 gap-3"
            >
              {(
                [
                  {
                    value: "entreprise",
                    icon: Building,
                    label: "Entreprise",
                    desc: "Une seule entité avec ses propres données RSE",
                  },
                  {
                    value: "groupe",
                    icon: Network,
                    label: "Groupe",
                    desc: "Un groupe avec une ou plusieurs filiales",
                  },
                ] as const
              ).map((opt) => (
                <div
                  key={opt.value}
                  className={cn(
                    "flex flex-col gap-2 rounded-xl border p-4 cursor-pointer transition-colors",
                    type === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/30",
                  )}
                  onClick={() => {
                    setType(opt.value);
                    saveOrganizationTypeDraft(opt.value);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value={opt.value} id={`type-${opt.value}`} />
                    <Label
                      htmlFor={`type-${opt.value}`}
                      className="cursor-pointer font-semibold flex items-center gap-1.5"
                    >
                      <opt.icon className="h-4 w-4" />
                      {opt.label}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-5">{opt.desc}</p>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Consentement CGU — obligatoire, non précoché (RGPD art. 7) */}
          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 px-3 py-3">
            <Checkbox
              id="consent"
              checked={consentChecked}
              onCheckedChange={(v) => {
                setConsentChecked(!!v);
                setError("");
              }}
              className="mt-0.5"
            />
            <label htmlFor="consent" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
              J'ai lu et j'accepte les{" "}
              <Link href="/legal?section=cgu" className="underline text-foreground hover:text-primary">
                Conditions Générales d'Utilisation
              </Link>{" "}
              et la{" "}
              <Link href="/legal?section=confidentialite" className="underline text-foreground hover:text-primary">
                Politique de confidentialité
              </Link>{" "}
              de cocci.
            </label>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            disabled={createOrg.isPending || updateProgress.isPending || isUploading || !consentChecked}
            data-testid="button-create-organization"
          >
            {(createOrg.isPending || updateProgress.isPending || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {type === "groupe" ? "Créer le groupe →" : "Commencer →"}
          </Button>
        </form>
      </div>
    </div>
  );
}
