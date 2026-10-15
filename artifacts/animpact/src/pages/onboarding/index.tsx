import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useClerk, useOrganization } from "@clerk/react";
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
import { ArrowLeft, Building, LogOut, Network, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrganizationLogo } from "@/components/OrganizationLogo";
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
import { resolveOnboardingStepPath } from "@/lib/onboardingNavigation";

// Version des documents légaux en vigueur
const LEGAL_VERSION = "2025-01";
const CREATED_ORG_SESSION_KEY = "cocci_onboarding_created_org";

export function Onboarding() {
  useDebugMount("Onboarding");
  const [location, setLocation] = useLocation();
  const { signOut } = useClerk();
  const { organization: clerkOrganization, isLoaded: isClerkOrganizationLoaded } = useOrganization();
  const qc = useQueryClient();
  const createOrg = useCreateOrganization();
  const updateProgress = useUpdateOnboardingProgress();
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
  const nameEditedRef = useRef(false);

  const [name, setName] = useState(readOrganizationNameDraft);
  const [type, setType] = useState<"entreprise" | "groupe">(readOrganizationTypeDraft);
  const [createdOrg, setCreatedOrg] = useState<Organization | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const clerkName = clerkOrganization?.name.trim();
    if (!clerkName || nameEditedRef.current) return;
    setName((currentName) => {
      if (currentName.trim()) return currentName;
      saveOrganizationNameDraft(clerkName);
      return clerkName;
    });
  }, [clerkOrganization?.name]);

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
      const root = organizations.find((organization) => organization.parentId == null) ?? organizations[0];
      const resumableOrgId = Number(sessionStorage.getItem(CREATED_ORG_SESSION_KEY));
      if (location === "/onboarding" && root && resumableOrgId === root.id) {
        setCreatedOrg(root);
        setConsentChecked(true);
        return;
      }
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

    let org = createdOrg;
    let createdDuringAttempt = false;
    const giftToken = sessionStorage.getItem("cocci_gift_invitation");
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
      if (!org) {
        org = await createOrg.mutateAsync({
          data: {
            name: name.trim(),
            type,
            logoUrl: clerkOrganization?.imageUrl || undefined,
          },
        });
        createdDuringAttempt = true;
        setCreatedOrg(org);
        sessionStorage.setItem(CREATED_ORG_SESSION_KEY, String(org.id));
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
          // Le consentement est aussi requis côté serveur lors des actions suivantes.
        }
      }

    } catch (err: any) {
      if (!createdOrg && !createdDuringAttempt && (err?.status === 409 || err?.message?.includes("409"))) {
        // Une autre requête a terminé la création : reprendre l'état serveur.
        hasSubmittedRef.current = false;
        await Promise.all([
          qc.invalidateQueries({ queryKey: getListOrganizationsQueryKey() }),
          qc.invalidateQueries({ queryKey: ["/api/users/me/onboarding"] }),
        ]);
        setLocation("/onboarding");
        return;
      }
      if (!createdOrg && !createdDuringAttempt) hasSubmittedRef.current = false;
      setError(createdOrg || createdDuringAttempt
        ? "L’organisation Cocci existe déjà. Reprenez le parcours; elle ne sera pas recréée."
        : "Une erreur est survenue. Veuillez réessayer.");
      return;
    }
    if (!org) {
      hasSubmittedRef.current = false;
      setError("L’organisation n’a pas pu être créée. Réessayez.");
      return;
    }
    if (giftToken) {
      try {
        await customFetch("/api/gift-invitations/claim", {
          method: "POST",
          body: JSON.stringify({ token: giftToken }),
        });
        sessionStorage.removeItem("cocci_gift_invitation");
        clearOnboardingChoices();
      } catch {
        hasSubmittedRef.current = false;
        setError("L’invitation n’a pas pu être activée. Vérifiez que vous êtes connecté avec l’adresse e-mail invitée puis réessayez.");
        return;
      }
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
    sessionStorage.removeItem(CREATED_ORG_SESSION_KEY);
    setCurrentOrg(org.id);

    if (giftToken) {
      setLocation("/dashboard");
    } else if (readSubscriptionIntent()) {
      // L'utilisateur a explicitement demandé Checkout avant de créer son
      // organisation : récapituler la formule avant le Checkout.
      setLocation("/onboarding/abonnement");
    } else {
      setLocation("/onboarding/effectif");
    }
  }

  if (organizationsLoading || onboardingLoading || ((organizations?.length ?? 0) > 0 && !createdOrg)) {
    return <RouteLoadingFallback message="Préparation de votre parcours…" />;
  }

  const existingNeonLogo = createdOrg?.logoUrl
    ?? organizations?.find((organization) => organization.parentId == null)?.logoUrl
    ?? null;
  const organizationLogoUrl = existingNeonLogo || clerkOrganization?.imageUrl || null;

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#f4f8f8] px-4 py-10">
      {/* Logo */}
      <div className="flex items-center justify-center mb-7">
        <img src={`${import.meta.env.BASE_URL}logo-dark.png`} alt="Cocci" className="h-12 w-auto" />
      </div>

      <div className="w-full max-w-[560px] bg-white rounded-sm border border-border shadow-sm p-8 sm:p-12">
        <div className="text-center space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight">
            {createdOrg ? "Finaliser votre organisation" : "Configurer votre organisation"}
          </h1>
          <p className="text-muted-foreground text-base">
            {createdOrg
              ? "Votre organisation Cocci est créée. Vous pouvez reprendre le parcours."
              : "Entrez les détails de votre organisation pour continuer"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-7">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Nom *</Label>
            <Input
              id="name"
              placeholder="Mon Entreprise"
              value={name}
              onChange={(e) => {
                nameEditedRef.current = true;
                setName(e.target.value);
                saveOrganizationNameDraft(e.target.value);
                setError("");
              }}
              autoFocus
              disabled={!!createdOrg}
              data-testid="input-organization-name"
            />
          </div>

          <div className="flex items-center gap-4 rounded-md border border-border bg-slate-50/70 p-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded border bg-white">
              <OrganizationLogo
                src={organizationLogoUrl}
                alt={`Logo de ${name || "l’organisation"}`}
                className="h-full w-full object-contain p-1"
                fallback={<Building className="h-6 w-6 text-muted-foreground" aria-hidden="true" />}
              />
            </div>
            <div className="min-w-0">
              <Label>Logo de l’organisation</Label>
              <p className="text-sm text-muted-foreground">
                {organizationLogoUrl
                  ? existingNeonLogo
                    ? "Logo Cocci enregistré"
                    : "Logo récupéré depuis Clerk"
                  : "Aucun logo disponible dans Clerk pour le moment."}
              </p>
            </div>
          </div>
          {isClerkOrganizationLoaded && !clerkOrganization && (
            <p role="status" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              L’organisation Clerk n’est pas accessible dans cette session. Vous pouvez saisir le nom et continuer;
              Cocci ne tentera pas de recréer votre organisation Clerk.
            </p>
          )}
          {!isClerkOrganizationLoaded && (
            <p role="status" className="text-sm text-muted-foreground">
              Chargement de l’organisation et de son logo depuis Clerk…
            </p>
          )}

          {/* Type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <RadioGroup
              value={type}
              disabled={!!createdOrg}
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
                if (createdOrg) return;
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
              disabled={!!createdOrg}
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
            className="mt-2 h-12 w-full rounded-sm bg-[#0b514b] text-base font-semibold hover:bg-[#08443f]"
            disabled={
              createOrg.isPending
              || updateProgress.isPending
              || !consentChecked
              || !isClerkOrganizationLoaded
            }
            data-testid="button-create-organization"
          >
            {(createOrg.isPending || updateProgress.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {createdOrg ? "Réessayer et continuer" : "Continuer"}
          </Button>

          <div className="flex flex-col-reverse items-center justify-between gap-3 pt-2 sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => {
                setError("");
                setLocation(readSubscriptionIntent()
                  ? "/onboarding/abonnement"
                  : "/onboarding/effectif");
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à ma formule
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground"
              disabled={createOrg.isPending || updateProgress.isPending}
              onClick={async () => {
                try {
                  const homeUrl = new URL(import.meta.env.BASE_URL, window.location.origin).toString();
                  await signOut({ redirectUrl: homeUrl });
                } catch {
                  setError("La déconnexion a échoué. Vos informations sont conservées; réessayez.");
                }
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {createdOrg ? "Quitter et reprendre plus tard" : "Annuler l’inscription"}
            </Button>
          </div>
          {createdOrg && (
            <p className="text-center text-xs text-muted-foreground">
              L’organisation déjà créée ne sera pas supprimée; vous pourrez reprendre sa configuration plus tard.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
