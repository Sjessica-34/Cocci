import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout";
import { GroupModuleBanner } from "@/components/GroupModuleBanner";
import { useModuleContext } from "@/hooks/useModuleContext";
import {
  useGetCaptationCarbone,
  useUpsertCaptationCarbone,
  useGetCarbonBilan,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  TreePine,
  ChevronDown,
  ChevronUp,
  Save,
  Info,
  Leaf,
  AlertCircle,
} from "lucide-react";

// ─── Méthode Arnaud De Grave ─────────────────────────────────────────────────
// Facteur centralisé — modifier ici uniquement pour mettre à jour le calcul.
const ARNAUD_DE_GRAVE_KG_PER_TREE = 10;

// ─── Architecture multi-méthodes (extensible sans modifier le composant) ──────
interface EstimationMethod {
  id: string;
  label: string;
  description: string;
  compute: (params: Record<string, number>) => number;
}

const ESTIMATION_METHODS: EstimationMethod[] = [
  {
    id: "arnaud-de-grave",
    label: "Méthode simplifiée d'Arnaud De Grave",
    description: `Applique un facteur moyen de ${ARNAUD_DE_GRAVE_KG_PER_TREE} kg CO₂/arbre/an.`,
    compute: ({ treeCount }) => treeCount * ARNAUD_DE_GRAVE_KG_PER_TREE,
  },
  // Futures méthodes : surface forestière, haies, vergers, etc.
];

const DEFAULT_ESTIMATION_METHOD = ESTIMATION_METHODS[0];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function computeCaptationKg(
  mode: string,
  captationValue: string,
  captationUnit: string,
  treeCount: string,
): number | null {
  if (mode === "saisie") {
    const v = parseFloat(captationValue);
    if (isNaN(v) || v <= 0) return null;
    return captationUnit === "t" ? v * 1000 : v;
  }
  if (mode === "estimation") {
    const t = parseInt(treeCount, 10);
    if (isNaN(t) || t <= 0) return null;
    return DEFAULT_ESTIMATION_METHOD.compute({ treeCount: t });
  }
  return null;
}

function formatKg(kg: number): string {
  return kg.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

function formatT(kg: number): string {
  return (kg / 1000).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function computeBilanTotal(bilan: Record<string, number | null | undefined>): number | null {
  const fields = [
    "energie1", "energie2", "horsEnergie1", "horsEnergie2",
    "intrantsBiens", "intrantsServices", "futursEmballages",
    "fret", "deplacements", "dechetsDirects", "immobilisations",
    "utilisation", "finDeVie",
  ] as const;
  const values = fields.map((f) => Number(bilan[f] ?? 0)).filter((n) => !isNaN(n));
  if (values.every((v) => v === 0)) return null;
  return values.reduce((a, b) => a + b, 0);
}

// ─── Composant Guide ──────────────────────────────────────────────────────────
function Guide() {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-emerald-200 bg-emerald-50/40">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none hover:bg-emerald-50/80 transition-colors rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Leaf className="h-4 w-4 text-emerald-700" />
                </div>
                <div>
                  <CardTitle className="text-base text-emerald-900">Guide pédagogique</CardTitle>
                  <CardDescription className="text-emerald-700/80">
                    Comprendre la captation carbone et comment renseigner vos données
                  </CardDescription>
                </div>
              </div>
              {open ? (
                <ChevronUp className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-emerald-600 shrink-0" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-5 text-sm text-emerald-900/90">
            <Separator className="bg-emerald-200" />

            <div>
              <h3 className="font-semibold mb-1.5">À quoi sert ce module ?</h3>
              <p className="text-muted-foreground leading-relaxed">
                Ce module permet de renseigner ou d'estimer la quantité de CO₂ captée chaque année
                par les arbres appartenant à votre organisation ou présents sur les terrains que vous
                gérez. Cette information vient compléter votre démarche climat et votre bilan carbone.
                Elle constitue une estimation ou une donnée déclarative selon le mode choisi.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-1.5">Méthode d'estimation</h3>
              <p className="text-muted-foreground leading-relaxed mb-2">
                L'estimation repose sur la méthode simplifiée d'Arnaud De Grave, qui applique une
                moyenne annuelle de {ARNAUD_DE_GRAVE_KG_PER_TREE} kg CO₂ par arbre et par an pour
                obtenir un ordre de grandeur.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-2">
                La captation réelle dépend notamment des essences, de l'âge des arbres, des conditions
                climatiques, du type de sol, de la densité, de la croissance et de l'état sanitaire.
              </p>
              <p className="text-xs text-muted-foreground italic">
                Les résultats doivent être considérés comme une estimation et non comme une valeur scientifique.
              </p>
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 flex gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Important :</strong> La captation carbone ne remplace jamais la réduction des
                émissions. Elle est affichée à titre informatif afin d'aider les organisations à suivre
                leur contribution environnementale.
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export function CaptationCarbone() {
  const { effectiveOrgId, isReadOnly, showGroupBanner } = useModuleContext("group");
  const { toast } = useToast();

  const { data: existing, isLoading } = useGetCaptationCarbone(effectiveOrgId ?? 0, {
    query: {
      queryKey: [`/api/organizations/${effectiveOrgId}/captation-carbone`],
      enabled: !!effectiveOrgId,
      retry: false,
    },
  });

  const { data: bilanCarbone } = useGetCarbonBilan(effectiveOrgId ?? 0, {
    query: {
      queryKey: [`/api/organizations/${effectiveOrgId}/carbon`],
      enabled: !!effectiveOrgId,
      retry: false,
    },
  });

  const { mutate: save, isPending: saving } = useUpsertCaptationCarbone({
    mutation: {
      onSuccess: () => toast({ title: "Données enregistrées" }),
      onError: () => toast({ title: "Erreur lors de l'enregistrement", variant: "destructive" }),
    },
  });

  // ── Form state ──────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<"saisie" | "estimation">("saisie");
  const [captationValue, setCaptationValue] = useState("");
  const [captationUnit, setCaptationUnit] = useState<"kg" | "t">("kg");
  const [treeCount, setTreeCount] = useState("");

  // Populate form when existing data loads
  useEffect(() => {
    if (!existing) return;
    setMode((existing.mode as "saisie" | "estimation") ?? "saisie");
    setCaptationValue(existing.captationValue != null ? String(existing.captationValue) : "");
    setCaptationUnit((existing.captationUnit as "kg" | "t") ?? "kg");
    setTreeCount(existing.treeCount != null ? String(existing.treeCount) : "");
  }, [existing]);

  // ── Computed captation ───────────────────────────────────────────────────────
  const captationKg = computeCaptationKg(mode, captationValue, captationUnit, treeCount);

  // ── Bilan carbone comparison ─────────────────────────────────────────────────
  const emissionsTotal = bilanCarbone ? computeBilanTotal(bilanCarbone as unknown as Record<string, number | null>) : null;

  // ── Submit ───────────────────────────────────────────────────────────────────
  function handleSave() {
    if (!effectiveOrgId) return;
    save({
      orgId: effectiveOrgId,
      data: {
        mode,
        year: new Date().getFullYear(),
        captationValue: mode === "saisie" && captationValue ? parseFloat(captationValue) : null,
        captationUnit: mode === "saisie" ? captationUnit : null,
        treeCount: mode === "estimation" && treeCount ? parseInt(treeCount, 10) : null,
      },
    });
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <TreePine className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ma captation carbone</h1>
            <p className="text-sm text-muted-foreground">
              Suivez la contribution de vos arbres à l'absorption de CO₂
            </p>
          </div>
        </div>

        {/* Filiale read-only banner */}
        {showGroupBanner && <GroupModuleBanner />}

        {/* Guide */}
        <Guide />

        {/* Saisie */}
        {/* @ts-expect-error */}
        <div inert={isReadOnly ? "" : undefined} className={isReadOnly ? "opacity-70" : ""}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mode de saisie</CardTitle>
              <CardDescription>Choisissez comment vous souhaitez renseigner votre captation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? (
                <p className="text-sm text-muted-foreground animate-pulse">Chargement…</p>
              ) : (
                <>
                  {/* Mode selector */}
                  <RadioGroup
                    value={mode}
                    onValueChange={(v) => setMode(v as "saisie" | "estimation")}
                    className="space-y-3"
                  >
                    <div className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/40 transition-colors">
                      <RadioGroupItem value="saisie" id="mode-saisie" className="mt-0.5" />
                      <Label htmlFor="mode-saisie" className="cursor-pointer space-y-0.5">
                        <span className="font-medium">J'ai déjà calculé ma captation carbone</span>
                        <p className="text-xs text-muted-foreground font-normal">
                          Renseignez directement une valeur issue de votre propre calcul
                        </p>
                      </Label>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/40 transition-colors">
                      <RadioGroupItem value="estimation" id="mode-estimation" className="mt-0.5" />
                      <Label htmlFor="mode-estimation" className="cursor-pointer space-y-0.5">
                        <span className="font-medium">Je souhaite l'estimer</span>
                        <p className="text-xs text-muted-foreground font-normal">
                          Estimation simplifiée à partir du nombre d'arbres (méthode Arnaud De Grave)
                        </p>
                      </Label>
                    </div>
                  </RadioGroup>

                  <Separator />

                  {/* Fields */}
                  {mode === "saisie" && (
                    <div className="space-y-3">
                      <Label htmlFor="captation-value" className="font-medium">
                        Captation annuelle
                      </Label>
                      <div className="flex gap-3">
                        <Input
                          id="captation-value"
                          type="number"
                          min={0}
                          step="any"
                          placeholder="Ex. : 1500"
                          value={captationValue}
                          onChange={(e) => setCaptationValue(e.target.value)}
                          className="flex-1"
                        />
                        <div className="flex rounded-md border overflow-hidden shrink-0">
                          {(["kg", "t"] as const).map((unit) => (
                            <button
                              key={unit}
                              type="button"
                              onClick={() => setCaptationUnit(unit)}
                              className={`px-4 py-2 text-sm font-medium transition-colors ${
                                captationUnit === unit
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-background hover:bg-muted text-foreground"
                              }`}
                            >
                              {unit === "kg" ? "kg CO₂e/an" : "t CO₂e/an"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        La valeur sera automatiquement convertie en kg CO₂e/an pour les calculs.
                      </p>
                    </div>
                  )}

                  {mode === "estimation" && (
                    <div className="space-y-3">
                      <Label htmlFor="tree-count" className="font-medium">
                        Nombre d'arbres
                      </Label>
                      <Input
                        id="tree-count"
                        type="number"
                        min={1}
                        step={1}
                        placeholder="Ex. : 200"
                        value={treeCount}
                        onChange={(e) => setTreeCount(e.target.value)}
                        className="max-w-xs"
                      />
                      <p className="text-xs text-muted-foreground">
                        Calcul automatique : {ARNAUD_DE_GRAVE_KG_PER_TREE} kg CO₂/arbre/an (méthode
                        Arnaud De Grave).
                      </p>
                    </div>
                  )}

                  <Button onClick={handleSave} disabled={saving || !captationKg} className="w-full sm:w-auto">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Enregistrement…" : "Enregistrer"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Synthèse */}
        {captationKg !== null && (
          <Card className="border-emerald-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TreePine className="h-4 w-4 text-emerald-600" />
                <CardTitle className="text-base text-emerald-900">Synthèse</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Captation */}
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-1">
                <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">
                  Captation annuelle
                </p>
                <p className="text-3xl font-bold text-emerald-900">
                  {formatKg(captationKg)}{" "}
                  <span className="text-base font-semibold">kgCO₂e/an</span>
                </p>
                {captationKg >= 1000 && (
                  <p className="text-sm text-emerald-700">
                    ≈ {formatT(captationKg)} tCO₂e/an
                  </p>
                )}
              </div>

              {/* Comparaison avec bilan carbone */}
              {emissionsTotal !== null && emissionsTotal > 0 && (
                <div className="space-y-3">
                  <Separator />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Comparaison avec votre bilan carbone groupe
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-center">
                      <p className="text-[11px] text-red-700 font-medium mb-1">Émissions annuelles</p>
                      <p className="text-lg font-bold text-red-900">
                        {formatT(emissionsTotal)}
                        <span className="text-xs font-normal ml-1">tCO₂e</span>
                      </p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-center">
                      <p className="text-[11px] text-emerald-700 font-medium mb-1">Captation annuelle</p>
                      <p className="text-lg font-bold text-emerald-900">
                        {formatT(captationKg)}
                        <span className="text-xs font-normal ml-1">tCO₂e</span>
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
                      <p className="text-[11px] text-slate-600 font-medium mb-1">Émissions nettes</p>
                      <p className="text-lg font-bold text-slate-900">
                        {formatT(emissionsTotal - captationKg)}
                        <span className="text-xs font-normal ml-1">tCO₂e</span>
                      </p>
                    </div>
                  </div>
                  <Alert className="bg-amber-50 border-amber-200">
                    <Info className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-xs text-amber-800">
                      Cet indicateur est fourni à titre informatif et ne constitue pas une compensation
                      automatique des émissions.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Source */}
              <div className="rounded-md bg-muted/40 border p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Origine de la donnée</p>
                <p className="text-sm">
                  {mode === "saisie"
                    ? "• Valeur déclarée par l'entreprise"
                    : `• Estimation simplifiée (méthode ${DEFAULT_ESTIMATION_METHOD.label})`}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Placeholder si aucune donnée et rien saisi */}
        {captationKg === null && !isLoading && (
          <Card className="border-dashed">
            <CardContent className="py-10 flex flex-col items-center gap-3 text-center">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <TreePine className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Aucune donnée renseignée</p>
                <p className="text-sm text-muted-foreground/70">
                  Renseignez une captation ou un nombre d'arbres pour voir la synthèse.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
