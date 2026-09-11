import { useState, useEffect } from "react";
import { useModuleContext } from "@/hooks/useModuleContext";
import { useGetCarbonBilan, useUpsertCarbonBilan } from "@workspace/api-client-react";

import type { CarbonBilan, CarbonBilanInput, CarbonTravelItemInput, CarbonUsageItemInput } from "@workspace/api-client-react";
import { UtilisationCalculator, computeUtilisation } from "./UtilisationCalculator";
import { DetailedCarbonCalculator } from "./DetailedCarbonCalculator";
import { calculateCarbonDetailTotals, calculateTravelEmissions, calculateUsageEmissions } from "@workspace/rse-referentials";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Globe, AlertCircle, AlertTriangle, Save, Mail,
  CheckCircle2, Loader2, Building2, Car, Plane, ShoppingBag, Trash2, Zap,
} from "lucide-react";
import { DocumentUploader } from "@/components/DocumentUploader";
import { cn } from "@/lib/utils";

// ── Emission factors (ADEME 2024) ──────────────────────────────────────────
const HEATING_FACTORS: Record<string, number> = {
  gaz:           0.0227,  // tCO2e/m²/year (100kWh/m² × 0.227 kgCO2e/kWh /1000)
  fioul:         0.0324,  // tCO2e/m²/year
  electrique:    0.0052,  // tCO2e/m²/year (100kWh/m² × 0.052 /1000)
  "pompe-chaleur": 0.0017,
  bois:          0.0030,
  reseau:        0.0110,
};

const VEHICLE_FACTORS: Record<string, number> = {
  essence:    2.880,  // tCO2e/vehicle/year (15000km × 0.192 kg/km /1000)
  diesel:     2.565,
  electrique: 0.705,
  hybride:    1.965,
  gnv:        2.130,
};

const TRAIN_FACTOR   = 0.00000369;  // tCO2e/voyageur.km
const PLANE_FACTOR   = 0.00023;     // tCO2e/voyageur.km (avg)
const GOODS_FACTOR   = 0.30;        // tCO2e/k€ achats matériels
const SERVICES_FACTOR = 0.10;       // tCO2e/k€ achats services
const WASTE_FACTOR   = 0.45;        // tCO2e/tonne déchets
const FREIGHT_FACTOR = 0.0000762;   // tCO2e/tonne.km

// ── Saisie categories ───────────────────────────────────────────────────────
const SAISIE_CATEGORIES: { key: keyof CarbonBilanInput; label: string; scope: string }[] = [
  { key: "energie1",         label: "Énergie 1",                     scope: "1" },
  { key: "energie2",         label: "Énergie 2",                     scope: "2" },
  { key: "horsEnergie1",     label: "Hors énergie 1",                scope: "1" },
  { key: "horsEnergie2",     label: "Hors énergie 2",                scope: "1" },
  { key: "intrantsBiens",    label: "Intrants — biens et matières",  scope: "3" },
  { key: "intrantsServices", label: "Intrants — services",           scope: "3" },
  { key: "futursEmballages", label: "Futurs emballages",             scope: "3" },
  { key: "fret",             label: "Fret",                          scope: "3" },
  { key: "deplacements",     label: "Déplacements",                  scope: "3" },
  { key: "dechetsDirects",   label: "Déchets directs",               scope: "3" },
  { key: "immobilisations",  label: "Immobilisations",               scope: "3" },
  { key: "utilisation",      label: "Utilisation",                   scope: "3" },
  { key: "finDeVie",         label: "Fin de vie",                    scope: "3" },
];

// ── Computation helpers ─────────────────────────────────────────────────────
type Breakdown = { label: string; value: number; scope: string };

function computeEstimation(form: Partial<CarbonBilanInput>): { breakdown: Breakdown[]; total: number } {
  const emp   = form.estEmployeeCount ?? 0;
  const sqm   = form.estOfficeSqm ?? 0;
  const heat  = form.estHeatingType ?? "gaz";
  const elec  = form.estElecKwhYear ?? emp * 3000;
  const veh   = form.estVehicleCount ?? 0;
  const fuel  = form.estVehicleFuelType ?? "essence";
  const train = form.estTrainKmYear ?? 0;
  const plane = form.estPlaneKmYear ?? 0;
  const goods = form.estBuysGoodsKeur ?? 0;
  const svcs  = form.estBuysServicesKeur ?? 0;
  const waste = form.estWasteTons ?? emp * 0.5;
  const fret  = form.estFreightTkm ?? 0;
  const sub   = Math.max(1, form.estSubsidiaryCount ?? 1);

  const breakdown: Breakdown[] = [
    { label: "Électricité",             value: elec * 0.052 / 1000,                    scope: "Scope 2" },
    { label: "Chauffage",               value: sqm * (HEATING_FACTORS[heat] ?? 0.023), scope: "Scope 1" },
    { label: "Véhicules de service",    value: veh * (VEHICLE_FACTORS[fuel] ?? 2.88),  scope: "Scope 1" },
    { label: "Déplacements — Train",    value: train * TRAIN_FACTOR,                   scope: "Scope 3" },
    { label: "Déplacements — Avion",    value: plane * PLANE_FACTOR,                   scope: "Scope 3" },
    { label: "Achats de biens",         value: goods * GOODS_FACTOR,                   scope: "Scope 3" },
    { label: "Achats de services",      value: svcs * SERVICES_FACTOR,                 scope: "Scope 3" },
    { label: "Déchets",                 value: waste * WASTE_FACTOR,                   scope: "Scope 3" },
    { label: "Fret",                    value: fret * FREIGHT_FACTOR,                  scope: "Scope 3" },
  ];

  return {
    breakdown: breakdown.map((b) => ({ ...b, value: b.value * sub })),
    total: breakdown.reduce((s, b) => s + b.value, 0) * sub,
  };
}

function computeSaisieTotal(form: Partial<CarbonBilanInput>): number {
  return SAISIE_CATEGORIES.reduce((sum, c) => {
    const v = form[c.key];
    return sum + (typeof v === "number" ? v : 0);
  }, 0);
}

function top3(items: { label: string; value: number }[]) {
  return [...items].filter((i) => i.value > 0).sort((a, b) => b.value - a.value).slice(0, 3);
}

// ── Sub-components ──────────────────────────────────────────────────────────
function ScopeChip({ scope }: { scope: string }) {
  const color =
    scope === "1" ? "bg-red-100 text-red-600"
    : scope === "2" ? "bg-amber-100 text-amber-600"
    : "bg-blue-100 text-blue-600";
  return (
    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", color)}>
      S{scope}
    </span>
  );
}

function NumInput({
  value, onChange, placeholder = "0",
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      min={0}
      step="any"
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className="w-full text-right rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

function BarChart({ items, total }: { items: Breakdown[]; total: number }) {
  const sorted = [...items].filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  if (!sorted.length) return null;
  const max = sorted[0].value;
  return (
    <div className="space-y-2">
      {sorted.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-44 shrink-0 text-right truncate">{item.label}</span>
          <div className="flex-1 bg-muted/30 rounded-full h-5 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-600/80 transition-all duration-500 flex items-center justify-end pr-2"
              style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
            >
              <span className="text-[10px] text-white font-semibold whitespace-nowrap">
                {total > 0 ? `${Math.round((item.value / total) * 100)}%` : ""}
              </span>
            </div>
          </div>
          <span className="text-xs font-mono text-foreground w-20 text-right shrink-0">
            {item.value.toFixed(1)} tCO₂e
          </span>
        </div>
      ))}
    </div>
  );
}

function ResultCard({ total, breakdown, isEstimation }: { total: number; breakdown: Breakdown[]; isEstimation?: boolean }) {
  const podium = top3(breakdown);
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-[#1a3a2a] text-white p-6">
        <p className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-1">
          {isEstimation ? "Estimation" : "Total des émissions"}
        </p>
        <div className="flex items-end gap-3">
          <span className="text-5xl font-bold tabular-nums">
            {total > 0 ? total.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) : "—"}
          </span>
          <span className="text-lg text-white/70 mb-1">tCO₂e / an</span>
        </div>
        {isEstimation && (
          <p className="text-xs text-white/50 mt-2">Estimation indicative — ne remplace pas un vrai Bilan Carbone®</p>
        )}
      </div>

      {podium.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">📊 Les 3 postes les plus émetteurs</h4>
          <div className="space-y-2">
            {podium.map((p, i) => (
              <div key={p.label} className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-white dark:bg-muted/10">
                <span className="text-lg">{medals[i]}</span>
                <span className="flex-1 text-sm text-foreground">{p.label}</span>
                <span className="text-sm font-semibold text-foreground">{total > 0 ? `${Math.round((p.value / total) * 100)} %` : "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {breakdown.some((b) => b.value > 0) && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Répartition graphique</h4>
          <BarChart items={breakdown} total={total} />
        </div>
      )}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
type FormState = Partial<CarbonBilanInput> & {
  year: number;
  mode: "saisie" | "estimation";
  travelItems: CarbonTravelItemInput[];
  usageItems: CarbonUsageItemInput[];
};

const defaultForm = (): FormState => ({
  year: new Date().getFullYear(),
  mode: "estimation",
  status: "draft",
  scope: "1-2-3",
  methodology: "Bilan Carbone®",
  travelItems: [],
  usageItems: [],
});

function fromBilan(b: CarbonBilan): FormState {
  return {
    year: b.year,
    mode: b.mode as "saisie" | "estimation",
    status: b.status ?? "draft",
    methodology: b.methodology ?? "Bilan Carbone®",
    scope: b.scope ?? "1-2-3",
    energie1: b.energie1 ?? undefined,
    energie2: b.energie2 ?? undefined,
    horsEnergie1: b.horsEnergie1 ?? undefined,
    horsEnergie2: b.horsEnergie2 ?? undefined,
    intrantsBiens: b.intrantsBiens ?? undefined,
    intrantsServices: b.intrantsServices ?? undefined,
    futursEmballages: b.futursEmballages ?? undefined,
    fret: b.fret ?? undefined,
    deplacements: b.deplacements ?? undefined,
    dechetsDirects: b.dechetsDirects ?? undefined,
    immobilisations: b.immobilisations ?? undefined,
    utilisation: b.utilisation ?? undefined,
    finDeVie: b.finDeVie ?? undefined,
    estEmployeeCount: b.estEmployeeCount ?? undefined,
    estOfficeSqm: b.estOfficeSqm ?? undefined,
    estSubsidiaryCount: b.estSubsidiaryCount ?? undefined,
    estHeatingType: b.estHeatingType ?? undefined,
    estElecKwhYear: b.estElecKwhYear ?? undefined,
    estVehicleCount: b.estVehicleCount ?? undefined,
    estVehicleFuelType: b.estVehicleFuelType ?? undefined,
    estTrainKmYear: b.estTrainKmYear ?? undefined,
    estPlaneKmYear: b.estPlaneKmYear ?? undefined,
    estBuysGoodsKeur: b.estBuysGoodsKeur ?? undefined,
    estBuysServicesKeur: b.estBuysServicesKeur ?? undefined,
    estWasteTons: b.estWasteTons ?? undefined,
    estFreightTkm: b.estFreightTkm ?? undefined,
    utilProductType: b.utilProductType ?? undefined,
    utilUnitsSold: b.utilUnitsSold ?? undefined,
    utilLifespanYears: b.utilLifespanYears ?? undefined,
    utilConsumptionPerYear: b.utilConsumptionPerYear ?? undefined,
    utilUnit: b.utilUnit ?? undefined,
    utilCountry: b.utilCountry ?? undefined,
    utilCustomFactor: b.utilCustomFactor ?? undefined,
    travelItems: (b.travelItems ?? []).map(({ categoryKey, label, quantity, unit, emissionFactor, scope }) => ({
      categoryKey, label, quantity, unit, emissionFactor, scope,
    })),
    usageItems: (b.usageItems ?? []).map(({ productName, unitsSold, lifespanYears, consumesEnergy, energyType, consumptionPerYear, unit, country, emissionFactor }) => ({
      productName, unitsSold, lifespanYears, consumesEnergy, energyType, consumptionPerYear, unit, country, emissionFactor,
    })),
  };
}

export function BilanCarbone() {
  const { effectiveOrgId, isConsolidated } = useModuleContext("subsidiary");
  const [form, setForm] = useState<FormState>(defaultForm());
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const { data: existing, isLoading } = useGetCarbonBilan(effectiveOrgId ?? 0, {
    query: {
      enabled: !!effectiveOrgId,
      retry: false,
      queryKey: [`/api/organizations/${effectiveOrgId}/carbon`],
    },
  });

  // Réinitialiser le formulaire à chaque changement d'organisation
  useEffect(() => {
    setForm(defaultForm());
    setSavedAt(null);
  }, [effectiveOrgId]);

  // Peupler le formulaire quand les données existantes arrivent
  useEffect(() => {
    if (existing) {
      setForm(fromBilan(existing));
      setSavedAt(existing.updatedAt);
    }
  }, [existing]);

  const { mutate: save, isPending: saving } = useUpsertCarbonBilan({
    mutation: {
      onSuccess: (data) => setSavedAt(data.updatedAt),
    },
  });

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSave = () => {
    if (!effectiveOrgId || isConsolidated) return;
    save({ orgId: effectiveOrgId, data: form as CarbonBilanInput });
  };

  const isSaisie = form.mode === "saisie";
  const detailTotals = calculateCarbonDetailTotals(form, form.travelItems, form.usageItems);
  const saisieTotal = detailTotals.globalTotal;
  const saisieBreakdown: Breakdown[] = SAISIE_CATEGORIES.map((c) => ({
    label: c.label,
    value: detailTotals.byCategory[String(c.key)] ?? 0,
    scope: `Scope ${c.scope}`,
  }));

  const { breakdown: estBreakdownBase, total: estTotalBase } = computeEstimation(form);
  const legacyUtilResult = form.usageItems.length > 0 ? null : computeUtilisation(form);
  const detailedTravelEntries = form.travelItems
    .map((item) => {
      const emissions = calculateTravelEmissions(item.categoryKey, item.quantity, item.emissionFactor ?? null);
      return emissions == null ? null : { label: `Déplacements — ${item.label}`, value: emissions, scope: "Scope 3" };
    })
    .filter((item): item is Breakdown => item !== null);
  const detailedUsageEntries = form.usageItems
    .map((item) => ({
      label: item.productName || "Produit non nommé",
      value: calculateUsageEmissions({
        unitsSold: item.unitsSold,
        lifespanYears: item.lifespanYears,
        consumesEnergy: item.consumesEnergy,
        energyType: item.energyType ?? null,
        consumptionPerYear: item.consumptionPerYear ?? null,
        unit: item.unit ?? null,
        country: item.country ?? null,
        emissionFactor: item.emissionFactor ?? null,
      }) ?? 0,
      scope: "Scope 3",
    }))
    .filter((item) => item.value > 0);
  const utilEntry = form.usageItems.length > 0
    ? detailedUsageEntries.filter((item) => item.value > 0)
    : legacyUtilResult && legacyUtilResult.tCO2e > 0
      ? [{ label: "Utilisation des produits/services", value: legacyUtilResult.tCO2e, scope: "Scope 3" }]
      : [];
  const estBreakdown = [
    ...(form.travelItems.length > 0 ? estBreakdownBase.filter((item) => !item.label.startsWith("Déplacements")) : estBreakdownBase),
    ...(form.travelItems.length > 0 ? detailedTravelEntries : []),
    ...utilEntry,
  ];
  const legacyTravelTotal = form.travelItems.length > 0
    ? 0
    : (form.estTrainKmYear ?? 0) * TRAIN_FACTOR + (form.estPlaneKmYear ?? 0) * PLANE_FACTOR;
  const detailTravelTotal = detailedTravelEntries.reduce((sum, item) => sum + item.value, 0);
  const estTotal = estTotalBase - legacyTravelTotal + detailTravelTotal +
    (form.usageItems.length > 0 ? detailTotals.usageTotal : (legacyUtilResult?.tCO2e ?? 0));

  const YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);


  return (
    <AppLayout>
      <div className="space-y-6 pb-16 max-w-4xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Globe className="h-6 w-6 text-emerald-600" />
              Bilan Carbone®
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Renseignez vos données ou obtenez une estimation rapide.
            </p>
          </div>
          {savedAt && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Sauvegardé {new Date(savedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>

        {!effectiveOrgId && (
          <div className="flex items-center gap-3 p-5 rounded-xl border border-amber-200 bg-amber-50">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">Sélectionnez une organisation dans la barre latérale.</p>
          </div>
        )}

        {isLoading && effectiveOrgId && (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        )}

        {!isLoading && !!effectiveOrgId && (
          <div className="space-y-6">
            {/* Mode selector */}
            <div className="rounded-xl border border-border bg-white dark:bg-muted/10 p-5 space-y-3">
              <p className="text-sm font-semibold text-foreground">Avez-vous déjà réalisé un Bilan Carbone® ?</p>
              <div className="space-y-2">
                {([
                  { value: "saisie", label: "Oui, je souhaite renseigner mes résultats" },
                  { value: "estimation", label: "Non, je souhaite obtenir une estimation rapide" },
                ] as const).map((opt) => (
                  <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                    <div
                      className={cn(
                        "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                        form.mode === opt.value
                          ? "border-emerald-600 bg-emerald-600"
                          : "border-border group-hover:border-emerald-400",
                      )}
                      onClick={() => set("mode", opt.value)}
                    >
                      {form.mode === opt.value && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                    <span className="text-sm text-foreground">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* ── SAISIE DIRECTE ─────────────────────────────────────────── */}
            {isSaisie && (
              <div className="space-y-5">
                {/* Informations générales */}
                <div className="rounded-xl border border-border bg-white dark:bg-muted/10 p-5 space-y-4">
                  <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Informations générales</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Année du bilan</label>
                      <select
                        value={form.year}
                        onChange={(e) => set("year", Number(e.target.value))}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Méthodologie</label>
                      <select
                        value={form.methodology ?? "Bilan Carbone®"}
                        onChange={(e) => set("methodology", e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {["Bilan Carbone®", "GHG Protocol", "ISO 14064", "Autre"].map((m) => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Périmètre</label>
                      <div className="flex gap-3 pt-1">
                        {(["1-2", "1-2-3"] as const).map((s) => (
                          <label key={s} className="flex items-center gap-2 cursor-pointer">
                            <div
                              className={cn(
                                "h-4 w-4 rounded-full border-2 flex items-center justify-center",
                                form.scope === s ? "border-emerald-600 bg-emerald-600" : "border-border",
                              )}
                              onClick={() => set("scope", s)}
                            >
                              {form.scope === s && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </div>
                            <span className="text-sm text-foreground">Scopes {s}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tableau des émissions */}
                <div className="rounded-xl border border-border bg-white dark:bg-muted/10 overflow-hidden">
                  <div className="px-5 py-4 border-b border-border">
                    <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Émissions par catégorie</h2>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/10">
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Catégorie</th>
                        <th className="px-5 py-2.5 text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-40">tCO₂e</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {SAISIE_CATEGORIES.map((cat) => (
                        <tr key={cat.key} className="hover:bg-muted/5">
                          <td className="px-5 py-2.5">
                            <div className="flex items-center gap-2">
                              <ScopeChip scope={cat.scope} />
                              {cat.label}
                            </div>
                          </td>
                          <td className="px-5 py-2.5 w-40">
                            <NumInput
                              value={form[cat.key] as number | null}
                              onChange={(v) => set(cat.key as keyof FormState, v as never)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/10">
                        <td className="px-5 py-3 font-semibold text-foreground">Total des émissions</td>
                        <td className="px-5 py-3 text-right">
                          <span className="text-xl font-bold text-foreground tabular-nums">
                            {saisieTotal > 0 ? saisieTotal.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) : "—"}
                          </span>
                          <span className="text-sm text-muted-foreground ml-1">tCO₂e</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Résultats */}
                {saisieTotal > 0 && (
                  <div className="rounded-xl border border-border bg-white dark:bg-muted/10 p-5">
                    <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Analyse automatique</h2>
                    <ResultCard total={saisieTotal} breakdown={saisieBreakdown} />
                  </div>
                )}
              </div>
            )}

            {/* ── ESTIMATION RAPIDE ──────────────────────────────────────── */}
            {!isSaisie && (
              <div className="space-y-5">
                {/* Disclaimer */}
                <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    Ce mini-calculateur fournit une <strong className="font-semibold">estimation indicative</strong> basée sur vos données physiques et les facteurs d'émission ADEME. Il ne remplace pas un vrai Bilan Carbone®.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-5">
                    {/* Structure */}
                    <Section icon={<Building2 className="h-4 w-4" />} title="Structure de l'organisation">
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">Année de référence</label>
                        <select
                          value={form.year}
                          onChange={(e) => set("year", Number(e.target.value))}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                      <Field label="Nombre de salariés">
                        <NumInput value={form.estEmployeeCount} onChange={(v) => set("estEmployeeCount", v ?? undefined)} placeholder="ex : 50" />
                      </Field>
                      <Field label="Surface des locaux (m²)">
                        <NumInput value={form.estOfficeSqm} onChange={(v) => set("estOfficeSqm", v ?? undefined)} placeholder="ex : 800" />
                      </Field>
                      <Field label="Nombre de filiales / sites">
                        <NumInput value={form.estSubsidiaryCount} onChange={(v) => set("estSubsidiaryCount", v ?? undefined)} placeholder="1" />
                      </Field>
                    </Section>

                    {/* Énergie */}
                    <Section icon={<Zap className="h-4 w-4" />} title="Énergie & chauffage">
                      <Field label="Type de chauffage">
                        <select
                          value={form.estHeatingType ?? "gaz"}
                          onChange={(e) => set("estHeatingType", e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {[
                            { v: "gaz", l: "Gaz naturel" },
                            { v: "fioul", l: "Fioul / Fuel" },
                            { v: "electrique", l: "Électrique" },
                            { v: "pompe-chaleur", l: "Pompe à chaleur" },
                            { v: "bois", l: "Bois / Biomasse" },
                            { v: "reseau", l: "Réseau de chaleur" },
                          ].map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                        </select>
                      </Field>
                      <Field label="Conso électrique (kWh/an)" hint="Laisser vide pour estimation automatique">
                        <NumInput value={form.estElecKwhYear} onChange={(v) => set("estElecKwhYear", v ?? undefined)} placeholder="estimation auto" />
                      </Field>
                    </Section>

                    {/* Véhicules */}
                    <Section icon={<Car className="h-4 w-4" />} title="Parc véhicules">
                      <Field label="Nombre de véhicules de service / fonction">
                        <NumInput value={form.estVehicleCount} onChange={(v) => set("estVehicleCount", v ?? undefined)} placeholder="0" />
                      </Field>
                      <Field label="Type de carburant (majorité)">
                        <select
                          value={form.estVehicleFuelType ?? "essence"}
                          onChange={(e) => set("estVehicleFuelType", e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {[
                            { v: "essence", l: "Essence" },
                            { v: "diesel", l: "Diesel" },
                            { v: "hybride", l: "Hybride" },
                            { v: "electrique", l: "Électrique" },
                            { v: "gnv", l: "GNV / Biocarburant" },
                          ].map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                        </select>
                      </Field>
                    </Section>
                  </div>

                  <div className="space-y-5">
                    {/* Déplacements */}
                    <Section icon={<Plane className="h-4 w-4" />} title="Déplacements professionnels">
                      <Field label="km totaux en train / an (tous salariés)">
                        <NumInput value={form.estTrainKmYear} onChange={(v) => set("estTrainKmYear", v ?? undefined)} placeholder="ex : 50 000" />
                      </Field>
                      <Field label="km totaux en avion / an (tous salariés)">
                        <NumInput value={form.estPlaneKmYear} onChange={(v) => set("estPlaneKmYear", v ?? undefined)} placeholder="ex : 100 000" />
                      </Field>
                    </Section>

                    {/* Achats */}
                    <Section icon={<ShoppingBag className="h-4 w-4" />} title="Achats & intrants">
                      <Field label="Achats de biens / matériels (k€/an)">
                        <NumInput value={form.estBuysGoodsKeur} onChange={(v) => set("estBuysGoodsKeur", v ?? undefined)} placeholder="ex : 500" />
                      </Field>
                      <Field label="Achats de services (k€/an)">
                        <NumInput value={form.estBuysServicesKeur} onChange={(v) => set("estBuysServicesKeur", v ?? undefined)} placeholder="ex : 200" />
                      </Field>
                      <Field label="Fret / Transport de marchandises (tonne.km/an)">
                        <NumInput value={form.estFreightTkm} onChange={(v) => set("estFreightTkm", v ?? undefined)} placeholder="ex : 10 000" />
                      </Field>
                    </Section>

                    {/* Déchets & fin de vie */}
                    <Section icon={<Trash2 className="h-4 w-4" />} title="Déchets & fin de vie">
                      <Field label="Volume de déchets générés (tonnes/an)" hint="Laisser vide pour estimation automatique">
                        <NumInput value={form.estWasteTons} onChange={(v) => set("estWasteTons", v ?? undefined)} placeholder="estimation auto" />
                      </Field>
                    </Section>

                    {/* Utilisation calculator */}
                    <DetailedCarbonCalculator form={form} set={set} />

                    {/* Live result */}
                    <div className="rounded-xl border border-border bg-white dark:bg-muted/10 p-5">
                      <ResultCard total={estTotal} breakdown={estBreakdown} isEstimation />
                    </div>

                    {/* Contact */}
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50">
                      <Mail className="h-5 w-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-emerald-800">Besoin d'un vrai Bilan Carbone® ?</p>
                        <a href="mailto:bonjour@a-nim-pact.fr" className="text-sm text-emerald-700 underline hover:text-emerald-900">
                          bonjour@a-nim-pact.fr
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isSaisie && <DetailedCarbonCalculator form={form} set={set} />}

            {/* Document import */}
            {!!effectiveOrgId && (
              <DocumentUploader
                orgId={effectiveOrgId}
                category="bilan-carbone"
                question="Avez-vous déjà un Bilan Carbone® existant à importer ?"
              />
            )}

            {/* Save */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                {form.status === "validated" ? "✓ Bilan validé" : "Brouillon"}
              </p>
              <div className="flex gap-2">
                {form.status !== "validated" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { set("status", "validated"); setTimeout(handleSave, 50); }}
                    disabled={saving}
                  >
                    Valider
                  </Button>
                )}
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Enregistrer
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

// ── Helper components ───────────────────────────────────────────────────────
function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-white dark:bg-muted/10 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/5">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground/80">{label}</label>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}
