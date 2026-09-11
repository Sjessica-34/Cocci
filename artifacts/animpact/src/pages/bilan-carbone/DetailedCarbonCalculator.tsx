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

  const updateTravel = (categoryKey: string, quantity: number | null) => {
    const category = TRAVEL_CATEGORIES.find((candidate) => candidate.key === categoryKey);
    if (!category) return;
    const next = travelItems.filter((item) => item.categoryKey !== categoryKey);
    if (quantity != null && quantity > 0) {
      next.push({
        categoryKey,
        label: category.label,
        quantity,
        unit: "km",
        emissionFactor: TRAVEL_EMISSION_FACTORS[categoryKey] ?? null,
        scope: category.scope,
      });
    }
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
        <div className="divide-y divide-border">
          {TRAVEL_CATEGORIES.map((category) => {
            const item = travelItems.find((candidate) => candidate.categoryKey === category.key);
            const factor = TRAVEL_EMISSION_FACTORS[category.key] ?? null;
            const emissions = item ? calculateTravelEmissions(category.key, item.quantity, factor) : null;
            return (
              <div key={category.key} className="grid grid-cols-1 sm:grid-cols-[1fr_9rem_9rem] gap-3 items-center px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{category.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {factor == null ? "Facteur ADEME à documenter" : `Facteur : ${(factor * 1_000_000).toLocaleString("fr-FR")} gCO₂e/km`}
                  </p>
                </div>
                <NumberInput
                  value={item?.quantity}
                  placeholder="km/an"
                  onChange={(value) => updateTravel(category.key, value)}
                />
                <div className={cn("text-right text-xs font-medium", emissions == null && item ? "text-amber-600" : "text-muted-foreground")}>
                  {emissions == null && item ? "Non calculé" : emissions != null ? `${emissions.toFixed(3)} tCO₂e` : "—"}
                </div>
              </div>
            );
          })}
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