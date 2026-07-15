import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateOrganization, getListOrganizationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Leaf, Building, Network, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { setCurrentOrg } from "@/hooks/useCurrentOrganization";

export function Onboarding() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const createOrg = useCreateOrganization();

  const [name, setName] = useState("");
  const [type, setType] = useState<"entreprise" | "groupe">("entreprise");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError("Le nom doit contenir au moins 2 caractères.");
      return;
    }
    setError("");

    const org = await createOrg.mutateAsync({ data: { name: name.trim(), type } });
    await qc.invalidateQueries({ queryKey: getListOrganizationsQueryKey() });
    setCurrentOrg(org.id);

    if (type === "groupe") {
      setLocation("/onboarding/filiales");
    } else {
      setLocation("/dashboard");
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-muted/30 px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <Leaf className="h-7 w-7 text-primary" />
        <span className="text-2xl font-bold tracking-tight text-foreground">cocci</span>
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
            {error && <p className="text-xs text-destructive">{error}</p>}
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

          <Button type="submit" className="w-full" disabled={createOrg.isPending}>
            {createOrg.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {type === "groupe" ? "Créer le groupe →" : "Commencer →"}
          </Button>
        </form>
      </div>
    </div>
  );
}
