import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ApiError, customFetch } from "@workspace/api-client-react";
import { useAuth, useClerk } from "@clerk/react";
import {
  clearGiftInvitationToken,
  readGiftInvitationToken,
  saveGiftInvitationToken,
} from "@/lib/giftInvitationStorage";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clearOnboardingChoices, EFFECTIF_OPTIONS, saveEffectifSelection, type EffectifKey } from "./onboarding/plans";

export function GiftInvitationPage() {
  const [, setLocation] = useLocation();
  const { getToken, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const [details, setDetails] = useState<{ email: string; offerName: string; effectifKey: EffectifKey; durationMonths: number | null } | null>(null);
  const [effectif, setEffectif] = useState<EffectifKey>("1-5");
  const [error, setError] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [showAccountSwitch, setShowAccountSwitch] = useState(false);

  useEffect(() => {
    const token = window.location.hash.slice(1) || readGiftInvitationToken() || "";
    if (!token) {
      clearGiftInvitationToken();
      setError("Le lien d’invitation est incomplet.");
      return;
    }
    saveGiftInvitationToken(token);
    customFetch<{ email: string; offerName: string; effectifKey: EffectifKey; durationMonths: number | null }>("/api/gift-invitations/validate", {
      method: "POST",
      body: JSON.stringify({ token }),
    }).then((invite) => {
      setDetails(invite);
      setEffectif(invite.effectifKey);
    }).catch(() => {
      clearGiftInvitationToken();
      setError("Cette invitation est invalide, expirée ou déjà utilisée.");
    });
  }, []);

  function continueToSignup() {
    clearOnboardingChoices();
    saveEffectifSelection(effectif);
    setLocation("/sign-up");
  }

  async function continueWithExistingAccount() {
    const token = readGiftInvitationToken();
    if (!token) return;
    setClaiming(true);
    setError("");
    setShowAccountSwitch(false);
    try {
      const authToken = await getToken({ skipCache: true });
      if (!authToken) throw new Error("Reconnectez-vous pour activer cette offre.");
      await customFetch("/api/gift-invitations/claim", {
        method: "POST",
        body: JSON.stringify({ token }),
        headers: { Authorization: `Bearer ${authToken}` },
      });
      clearGiftInvitationToken();
      clearOnboardingChoices();
      setLocation("/dashboard");
    } catch (cause) {
      const apiError = cause instanceof ApiError ? cause.data as { error?: string } | null : null;
      if (apiError?.error === "Créez d'abord votre organisation Cocci.") {
        clearOnboardingChoices();
        saveEffectifSelection(effectif);
        setLocation("/onboarding");
        return;
      }
      const message = apiError?.error ?? (cause instanceof Error ? cause.message : "Impossible d’activer l’offre.");
      setError(message);
      setShowAccountSwitch(message.includes("adresse e-mail invitée doit être vérifiée"));
    } finally {
      setClaiming(false);
    }
  }

  async function switchToInvitedAccount() {
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
    const signUpUrl = `${window.location.origin}${basePath}/sign-up`;
    await signOut({ redirectUrl: signUpUrl });
  }

  return <main className="min-h-[100dvh] bg-muted/30 flex items-center justify-center p-4">
    <section className="w-full max-w-lg rounded-lg border bg-card p-8 text-center shadow-sm">
      <h1 className="text-2xl font-semibold">Votre invitation Cocci</h1>
      {details ? <>
        <p className="mt-3 text-muted-foreground">Offre {details.offerName}{details.durationMonths ? ` pendant ${details.durationMonths} mois` : " sans date de fin"}, réservée à {details.email}.</p>
        <div className="mt-5 text-left">
          <Label htmlFor="gift-effectif">Effectif de votre organisation</Label>
          <Select value={effectif} onValueChange={(value) => setEffectif(value as EffectifKey)}>
            <SelectTrigger id="gift-effectif" className="mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>{EFFECTIF_OPTIONS.map((option) => <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {isSignedIn
            ? "Votre adresse e-mail vérifiée dans Clerk doit correspondre à l’invitation."
            : "Créez votre compte avec cette adresse e-mail. Elle devra être vérifiée dans Clerk."}
        </p>
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        {showAccountSwitch && (
          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full"
            onClick={() => void switchToInvitedAccount()}
          >
            Se déconnecter et créer le compte invité
          </Button>
        )}
        <Button
          className="mt-6 w-full"
          disabled={claiming}
          onClick={isSignedIn ? continueWithExistingAccount : continueToSignup}
        >
          {claiming ? "Activation…" : isSignedIn ? "Activer mon offre" : "Créer mon compte"}
        </Button>
      </> : <>
        <p role="alert" className="mt-4 text-destructive">{error || "Vérification de l’invitation…"}</p>
        {error && <Button variant="outline" className="mt-5 w-full" onClick={() => setLocation("/sign-up")}>Continuer sans invitation</Button>}
      </>}
    </section>
  </main>;
}
