import type { CarbonTravelItemInput, CarbonUsageItemInput } from "@workspace/api-client-react";
import {
  calculateTravelEmissions,
  calculateUsageEmissions,
  TRAVEL_CATEGORIES,
  TRAVEL_EMISSION_FACTORS,
  USAGE_EMISSION_FACTORS,
} from "@workspace/rse-referentials";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type FormState = {
  deplacements?: number | null;
  utilisation?: number | null;
  travelItems?: CarbonTravelItemInput[];
  usageItems?: CarbonUsageItemInput[];
};

type Setter = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

function NumberInput({ value, onChange, placeholder = "0" }: {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      min={0}
      step="any"
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

export function DetailedCarbonCalculator({ form, set }: { form: FormState; set: Setter }) {
  const travelItems = form.travelItems ?? [];
  const usageItems = form.usageItems ?? [];

  const addTravel = () => {
    set("travelItems", [
      ...travelItems,
      {
        categoryKey: "",
        label: "",
        quantity: 0,
        unit: "km",
        emissionFactor: null,
        scope: "3",
      },
    ]);
  };

  const updateTravel = (index: number, patch: Partial<CarbonTravelItemInput>) => {
    set("travelItems", travelItems.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item,
    ));
  };

  const selectTravelCategory = (index: number, categoryKey: string) => {
    if (travelItems.some((item, itemIndex) => itemIndex !== index && item.categoryKey === categoryKey)) return;
    const category = TRAVEL_CATEGORIES.find((candidate) => candidate.key === categoryKey);
    if (!category) return;
    updateTravel(index, {
      categoryKey,
      label: category.label,
      emissionFactor: TRAVEL_EMISSION_FACTORS[categoryKey] ?? null,
      scope: category.scope,
    });
  };

  const removeTravel = (index: number) => {
    const next = travelItems.filter((_, itemIndex) => itemIndex !== index);
    set("travelItems", next);
    if (next.length === 0) set("deplacements", 0);
  };

  const addUsage = () => {
    set("usageItems", [
      ...usageItems,
      {
        productName: "",
        unitsSold: 0,
        lifespanYears: 0,
        consumesEnergy: true,
        energyType: "kwh",
        consumptionPerYear: 0,
        unit: "kwh",
        country: "france",
        emissionFactor: USAGE_EMISSION_FACTORS.kwh.france,
      },
    ]);
  };

  const updateUsage = (index: number, patch: Partial<CarbonUsageItemInput>) => {
    set("usageItems", usageItems.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const removeUsage = (index: number) => {
    const next = usageItems.filter((_, itemIndex) => itemIndex !== index);
    set("usageItems", next);
    if (next.length === 0) set("utilisation", 0);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-white dark:bg-muted/10 overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Déplacements professionnels détaillés
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Renseignez les kilomètres annuels. Les émissions utilisent uniquement les facteurs disponibles dans le référentiel actuel.
          </p>
        </div>
        <div className="p-5 space-y-3">
          {travelItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun déplacement ajouté.</p>
          ) : (
            travelItems.map((item, index) => {
              const emissions = item.categoryKey
                ? calculateTravelEmissions(item.categoryKey, item.quantity, item.emissionFactor ?? undefined)
                : null;
              return (
                <div
                  key={`${item.categoryKey || "new"}-${index}`}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-background p-4 sm:grid-cols-[minmax(12rem,1fr)_10rem_minmax(8rem,10rem)_auto] sm:items-end"
                >
                  <label className="text-xs text-muted-foreground">
                    Type de transport
                    <select
                      value={item.categoryKey}
                      onChange={(event) => selectTravelCategory(index, event.target.value)}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                    >
                      <option value="">Sélectionner un transport</option>
                      {TRAVEL_CATEGORIES.map((category) => (
                        <option
                          key={category.key}
                          value={category.key}
                          disabled={travelItems.some((candidate, candidateIndex) =>
                            candidateIndex !== index && candidate.categoryKey === category.key,
                          )}
                        >
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Distance annuelle
                    <div className="mt-1">
                      <NumberInput
                        value={item.quantity}
                        placeholder="km/an"
                        onChange={(value) => updateTravel(index, { quantity: value ?? 0 })}
                      />
                    </div>
                    <span className="mt-1 block text-[11px]">km/an</span>
                  </label>
                  <div className="text-xs text-muted-foreground">
                    <span className="block">Émissions calculées</span>
                    <span className={cn(
                      "mt-2 block text-sm font-medium",
                      emissions == null && item.categoryKey ? "text-muted-foreground" : "text-foreground",
                    )}>
                      {emissions != null ? `${emissions.toFixed(3)} tCO₂e` : "—"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTravel(index)}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:bg-red-50 hover:text-red-600"
                    aria-label="Supprimer le déplacement"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sm:hidden">Supprimer</span>
                  </button>
                </div>
              );
            })
          )}
          <button
            type="button"
            onClick={addTravel}
            className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-primary/50 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5"
          >
            <Plus className="h-3.5 w-3.5" /> Ajouter un déplacement
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/10 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-emerald-200">
          <div>
            <h2 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-widest">
              Utilisation des produits vendus
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Ajoutez autant de produits ou catégories que nécessaire.</p>
          </div>
          <button type="button" onClick={addUsage} className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800">
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </button>
        </div>
        {usageItems.length === 0 ? (
          <p className="px-5 py-5 text-sm text-muted-foreground">Aucun produit détaillé ajouté.</p>
        ) : (
          <div className="p-5 space-y-4">
            {usageItems.map((item, index) => {
              const factor = item.emissionFactor ??
                (item.energyType && item.country ? USAGE_EMISSION_FACTORS[item.energyType]?.[item.country] ?? null : null);
              const emissions = calculateUsageEmissions({
                unitsSold: item.unitsSold,
                lifespanYears: item.lifespanYears,
                consumesEnergy: item.consumesEnergy,
                energyType: item.energyType ?? null,
                consumptionPerYear: item.consumptionPerYear ?? null,
                unit: item.unit ?? null,
                country: item.country ?? null,
                emissionFactor: factor,
              });
              return (
                <div key={index} className="rounded-lg border border-border bg-white dark:bg-muted/10 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">Produit / catégorie {index + 1}</p>
                    <button type="button" onClick={() => removeUsage(index)} className="text-muted-foreground hover:text-red-600" aria-label="Supprimer le produit">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="text-xs text-muted-foreground">
                      Nom du produit / catégorie
                      <input value={item.productName} onChange={(event) => updateUsage(index, { productName: event.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" placeholder="Ex. Appareils vendus" />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Pays d’utilisation
                      <select value={item.country ?? "france"} onChange={(event) => {
                        const country = event.target.value;
                        updateUsage(index, { country, emissionFactor: item.energyType ? USAGE_EMISSION_FACTORS[item.energyType]?.[country] ?? null : null });
                      }} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
                        <option value="france">France</option>
                        <option value="europe">Europe</option>
                        <option value="monde">Monde</option>
                      </select>
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Unités vendues
                      <div className="mt-1"><NumberInput value={item.unitsSold} onChange={(value) => updateUsage(index, { unitsSold: value ?? 0 })} /></div>
                    </label>
                    <label className="text-xs text-muted-foreground">
                      Durée de vie (années)
                      <div className="mt-1"><NumberInput value={item.lifespanYears} onChange={(value) => updateUsage(index, { lifespanYears: value ?? 0 })} /></div>
                    </label>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={item.consumesEnergy} onChange={(event) => updateUsage(index, { consumesEnergy: event.target.checked })} />
                    Le produit consomme de l’énergie ou une ressource pendant son utilisation
                  </label>
                  {item.consumesEnergy && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="text-xs text-muted-foreground">
                        Type d’énergie / ressource
                        <select value={item.energyType ?? "kwh"} onChange={(event) => {
                          const energyType = event.target.value;
                          const unit = energyType === "go" ? "go" : energyType;
                          updateUsage(index, { energyType, unit, emissionFactor: USAGE_EMISSION_FACTORS[energyType]?.[item.country ?? "france"] ?? null });
                        }} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground">
                          <option value="kwh">kWh</option>
                          <option value="litres">Litres</option>
                          <option value="m3">m³</option>
                          <option value="go">Go</option>
                        </select>
                      </label>
                      <label className="text-xs text-muted-foreground">
                        Consommation par an
                        <div className="mt-1"><NumberInput value={item.consumptionPerYear} onChange={(value) => updateUsage(index, { consumptionPerYear: value })} /></div>
                      </label>
                      <div className="flex items-end text-xs text-emerald-700 pb-2">
                        {emissions != null ? `${emissions.toFixed(3)} tCO₂e` : "Données insuffisantes"}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}