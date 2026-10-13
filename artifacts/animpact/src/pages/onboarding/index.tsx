import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  customFetch,
  useCreateOrganization,
  getListOrganizationsQueryKey,
  useListOrganizations,
  useGetOnboardingProgress,
  getGetOnboardingProgressQueryKey,
} from "@workspace/api-client-react";
import type { Organization } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { Building, Network, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { setCurrentOrg } from "@/hooks/useCurrentOrganization";
import {
  ONBOARDING_CONTINUATION_SESSION_KEY,
  SUBSCRIPTION_INTENT_SESSION_KEY,
} from "./plans";
import { useDebugMount } from "@/lib/requestDebug";

// Version des documents légaux en vigueur
const LEGAL_VERSION = "2025-01";

export function Onboarding() {
  useDebugMount("Onboarding");
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const createOrg = useCreateOrganization();
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
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const pendingInvitationQuery = useQuery({
    queryKey: ["/api/users/me/pending-invitation"],
    queryFn: () => customFetch<{ organizationId: number | null }>("/users/me/pending-invitation"),
    enabled: authLoaded && isSignedIn === true,
    retry: false,
  });
  const hasSubmittedRef = useRef(false);
  const invitationRedirectStartedRef = useRef(false);

  const [name, setName] = useState("");
  const [type, setType] = useState<"entreprise" | "groupe">("entreprise");
  const [consentChecked, setConsentChecked] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (
      organizationsLoading
      || onboardingLoading
      || pendingInvitationQuery.isLoading
      || pendingInvitationQuery.isFetching
      || pendingInvitationQuery.isError
      || !onboarding
      || hasSubmittedRef.current
    ) return;

    const invitedOrganizationId = pendingInvitationQuery.data?.organizationId;
    if (invitedOrganizationId && !invitationRedirectStartedRef.current) {
      invitationRedirectStartedRef.current = true;
      setLocation(`/accept-invitation?organizationId=${invitedOrganizationId}`, { replace: true });
      return;
    }

    if (onboarding.status === "completed") {
      sessionStorage.removeItem(SUBSCRIPTION_INTENT_SESSION_KEY);
      sessionStorage.removeItem(ONBOARDING_CONTINUATION_SESSION_KEY);
      setLocation("/dashboard", { replace: true });
      return;
    }

    if (organizations && organizations.length > 0) {
      if (
        onboarding.status !== "organization_created"
        && onboarding.status !== "subsidiaries_configured"
        && onboarding.status !== "workforce_completed"
        && onboarding.status !== "subscription_selected"
        && onboarding.status !== "payment_pending"
      ) {
        setLocation("/dashboard", { replace: true });
        return;
      }
      const root = organizations.find((organization) => !organization.parentId);
      const nextPath =
        onboarding.status === "organization_created" && root?.type === "groupe"
          ? "/onboarding/filiales"
          : onboarding.status === "organization_created" || onboarding.status === "subsidiaries_configured"
            ? "/onboarding/effectif"
            : "/onboarding/abonnement";
      setLocation(nextPath, { replace: true });
    }
  }, [
    onboarding,
    onboardingLoading,
    organizations,
    organizationsLoading,
    pendingInvitationQuery.data,
    pendingInvitationQuery.isError,
    pendingInvitationQuery.isFetching,
    pendingInvitationQuery.isLoading,
    setLocation,
  ]);

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
      org = await createOrg.mutateAsync({ data: { name: name.trim(), type } });
    } catch (err: any) {
      if (err?.status === 409 || err?.message?.includes("409")) {
        // Une autre requête a terminé la création : reprendre l'état serveur.
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
    await qc.invalidateQueries({ queryKey: getListOrganizationsQueryKey() });
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
    } else if (sessionStorage.getItem(SUBSCRIPTION_INTENT_SESSION_KEY)) {
      // L'utilisateur a explicitement demandé Checkout avant de créer son
      // organisation : la formule est reprise automatiquement à l'étape suivante.
      setLocation("/onboarding/abonnement");
    } else {
      setLocation("/onboarding/effectif");
    }
  }

  if (pendingInvitationQuery.isError) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 p-6 text-center">
        <p role="alert" className="max-w-lg text-sm text-destructive">
          Impossible de vérifier vos invitations. L’onboarding est suspendu pour éviter de créer une seconde organisation.
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>Réessayer</Button>
      </main>
    );
  }

  if (
    organizationsLoading
    || onboardingLoading
    || pendingInvitationQuery.isLoading
    || pendingInvitationQuery.isFetching
    || (organizations?.length ?? 0) > 0
  ) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center p-6 text-sm text-muted-foreground" role="status">
        Vérification de votre invitation et de votre organisation…
      </main>
    );
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
              onChange={(e) => { setName(e.target.value); setError(""); }}
              autoFocus
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <RadioGroup
              value={type}
              onValueChange={(v) => setType(v as "entreprise" | "groupe")}
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
                  onClick={() => setType(opt.value)}
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
            disabled={createOrg.isPending || !consentChecked}
          >
            {createOrg.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {type === "groupe" ? "Créer le groupe →" : "Commencer →"}
          </Button>
        </form>
      </div>
    </div>
  );
}
