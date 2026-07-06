import { useEffect } from "react";
import type { CarbonBilanInput } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Calculator } from "lucide-react";

// ── Emission factors (ADEME 2024) ──────────────────────────────────────────
//  kWh : electricity grid emission factor
//  litres : liquid fuel (average petrol combustion)
//  m3 : natural gas combustion
//  go : data transfer (digital services)

const FACTORS: Record<string, Record<string, number>> = {
  kwh: {
    france: 0.052,   // kgCO₂e/kWh — RTE 2023
    europe: 0.233,   // kgCO₂e/kWh — EU average
    monde:  0.429,   // kgCO₂e/kWh — IEA world avg
  },
  litres: {
    france: 2.28,    // kgCO₂e/L — ADEME essence SP95
    europe: 2.28,
    monde:  2.28,
  },
  m3: {
    france: 2.20,    // kgCO₂e/m³ — gaz naturel ADEME
    europe: 2.20,
    monde:  2.20,
  },
  go: {
    france: 0.012,   // kgCO₂e/Go — ADEME Numérique
    europe: 0.025,
    monde:  0.040,
  },
};

// Unit labels and hints by product type
const TYPE_UNIT_MAP: Record<string, { unit: string; label: string; hint: string }> = {
  "appareil-electrique": {
    unit: "kwh",
    label: "Consommation électrique moyenne",
    hint: "kWh/an",
  },
  "vehicule": {
    unit: "litres",
    label: "Consommation de carburant moyenne",
    hint: "litres/an",
  },
  "machine-industrielle": {
    unit: "m3",
    label: "Consommation de gaz / énergie moyenne",
    hint: "m³/an",
  },
  "logiciel-numerique": {
    unit: "go",
    label: "Volume de données transférées par utilisateur",
    hint: "Go/mois",
  },
  "consommable": {
    unit: "kwh",
    label: "Consommation énergétique moyenne",
    hint: "kWh/an",
  },
  "produit-alimentaire": {
    unit: "kwh",
    label: "Consommation énergétique moyenne",
    hint: "kWh/an",
  },
  autre: {
    unit: "autre",
    label: "Consommation annuelle",
    hint: "unité à préciser",
  },
};

// ── Types ───────────────────────────────────────────────────────────────────
type FormState = Partial<CarbonBilanInput>;

interface Props {
  form: FormState;
  set: <K extends keyof FormState>(key: K, val: FormState[K]) => void;
}

// ── Computation ─────────────────────────────────────────────────────────────
export function computeUtilisation(form: FormState): {
  totalConsumption: number;
  factor: number;
  kgCO2e: number;
  tCO2e: number;
} | null {
  if (!form.utilProductType || form.utilUnitsSold == null || form.utilLifespanYears == null || form.utilConsumptionPerYear == null) {
    return null;
  }
  const units    = Number(form.utilUnitsSold) || 0;
  const lifespan = Number(form.utilLifespanYears) || 0;
  const conso    = Number(form.utilConsumptionPerYear) || 0;
  const unitKey  = form.utilUnit ?? "kwh";
  const country  = form.utilCountry ?? "france";

  // For digital (go/mois), consumption is per month → annual = ×12
  const annualConso = unitKey === "go" ? conso * 12 : conso;

  const factorTable = FACTORS[unitKey];
  const factor =
    unitKey === "autre"
      ? Number(form.utilCustomFactor ?? 0)
      : (factorTable?.[country] ?? 0);

  const totalConsumption = units * lifespan * annualConso; // total unit-years × annual consumption
  const kgCO2e = totalConsumption * factor;
  const tCO2e  = kgCO2e / 1000;

  return { totalConsumption, factor, kgCO2e, tCO2e };
}

// ── Component ───────────────────────────────────────────────────────────────
export function UtilisationCalculator({ form, set }: Props) {
  const hasUse = form.utilProductType !== undefined
    ? form.utilProductType !== "non"
    : undefined; // tristate: undefined = unanswered

  const answered = hasUse !== undefined || form.utilProductType === "non";

  const result = computeUtilisation(form);

  // Auto-update utilisation field whenever result changes
  useEffect(() => {
    if (result !== null) {
      const t = Math.round(result.tCO2e * 1000) / 1000;
      if (form.utilisation !== t) {
        set("utilisation", t);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.tCO2e]);

  const productType = form.utilProductType;
  const unitInfo    = productType ? TYPE_UNIT_MAP[productType] : null;
  const unitKey     = unitInfo?.unit ?? form.utilUnit ?? "kwh";

  const setUtilNo = () => {
    set("utilProductType", "non");
    set("utilisation", 0);
  };

  const setUtilYes = () => {
    if (!form.utilProductType || form.utilProductType === "non") {
      set("utilProductType", "appareil-electrique");
      set("utilUnit", "kwh");
      set("utilisation", undefined);
    }
  };

  const isNo  = form.utilProductType === "non";
  const isYes = !isNo && form.utilProductType !== undefined;
  const isUnanswered = !isNo && !isYes;

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20">
        <Calculator className="h-4 w-4 text-emerald-700" />
        <h3 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-widest">
          Calculateur — Poste Utilisation (Scope 3)
        </h3>
      </div>

      <div className="p-5 space-y-5">
        {/* Étape 1 — Question initiale */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">
            Vos produits ou services consomment-ils de l'énergie ou des ressources pendant leur phase d'utilisation ?
          </p>
          <div className="flex gap-4">
            {[
              { label: "Oui", active: isYes || isUnanswered ? false : false, selected: isYes },
              { label: "Non", active: false, selected: isNo },
            ].map(({ label, selected }) => {
              const isOui = label === "Oui";
              return (
                <label key={label} className="flex items-center gap-2 cursor-pointer">
                  <div
                    className={cn(
                      "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                      selected
                        ? "border-emerald-600 bg-emerald-600"
                        : "border-border hover:border-emerald-400",
                    )}
                    onClick={isOui ? setUtilYes : setUtilNo}
                  >
                    {selected && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                  <span className="text-sm text-foreground">{label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Non → zero */}
        {isNo && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-border bg-muted/20 text-sm text-muted-foreground">
            Poste Utilisation = <span className="font-semibold text-foreground ml-1">0 kgCO₂e</span>
          </div>
        )}

        {/* Oui → full calculator */}
        {isYes && (
          <div className="space-y-4">
            {/* 1. Type de produit */}
            <FieldRow label="1. Type de produit">
              <select
                value={form.utilProductType ?? "appareil-electrique"}
                onChange={(e) => {
                  const type = e.target.value;
                  const info = TYPE_UNIT_MAP[type];
                  set("utilProductType", type);
                  if (info && info.unit !== "autre") set("utilUnit", info.unit);
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="appareil-electrique">Appareil électrique</option>
                <option value="vehicule">Véhicule</option>
                <option value="machine-industrielle">Machine industrielle</option>
                <option value="logiciel-numerique">Logiciel / Service numérique</option>
                <option value="consommable">Consommable</option>
                <option value="produit-alimentaire">Produit alimentaire</option>
                <option value="autre">Autre</option>
              </select>
            </FieldRow>

            {/* 2. Nombre d'unités vendues */}
            <FieldRow label="2. Nombre d'unités vendues">
              <NumInput
                value={form.utilUnitsSold}
                onChange={(v) => set("utilUnitsSold", v ?? undefined)}
                placeholder="ex : 1 000"
              />
            </FieldRow>

            {/* 3. Durée de vie moyenne */}
            <FieldRow label="3. Durée de vie moyenne (années)">
              <NumInput
                value={form.utilLifespanYears}
                onChange={(v) => set("utilLifespanYears", v ?? undefined)}
                placeholder="ex : 5"
              />
            </FieldRow>

            {/* 4. Consommation */}
            <FieldRow
              label={`4. ${unitInfo?.label ?? "Consommation moyenne"}`}
              hint={
                unitKey === "go"
                  ? "Go/mois — converti automatiquement en Go/an"
                  : unitInfo?.hint
                    ? `En ${unitInfo.hint}`
                    : undefined
              }
            >
              <div className="flex gap-2">
                <NumInput
                  value={form.utilConsumptionPerYear}
                  onChange={(v) => set("utilConsumptionPerYear", v ?? undefined)}
                  placeholder="ex : 150"
                />
                {/* For "autre", allow unit selection */}
                {unitKey === "autre" && (
                  <select
                    value={form.utilUnit ?? "kwh"}
                    onChange={(e) => set("utilUnit", e.target.value)}
                    className="w-40 rounded-md border border-input bg-background px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="kwh">kWh/an</option>
                    <option value="litres">litres/an</option>
                    <option value="m3">m³/an</option>
                    <option value="go">Go/mois</option>
                    <option value="autre">Unité custom</option>
                  </select>
                )}
                {unitKey !== "autre" && (
                  <span className="flex items-center px-3 py-2 rounded-md border border-input bg-muted/30 text-sm text-muted-foreground whitespace-nowrap">
                    {unitKey === "kwh" ? "kWh/an"
                      : unitKey === "litres" ? "litres/an"
                      : unitKey === "m3" ? "m³/an"
                      : "Go/mois"}
                  </span>
                )}
              </div>
            </FieldRow>

            {/* Custom factor (for "autre" unit with value autre) */}
            {unitKey === "autre" && form.utilUnit === "autre" && (
              <FieldRow
                label="Facteur d'émission (kgCO₂e / unité)"
                hint="Renseignez un facteur depuis une base officielle (ADEME, IPCC…)"
              >
                <NumInput
                  value={form.utilCustomFactor}
                  onChange={(v) => set("utilCustomFactor", v ?? undefined)}
                  placeholder="ex : 0.05"
                />
              </FieldRow>
            )}

            {/* 5. Pays d'utilisation */}
            <FieldRow label="5. Pays d'utilisation principal">
              <div className="flex gap-4">
                {(["france", "europe", "monde"] as const).map((c) => (
                  <label key={c} className="flex items-center gap-2 cursor-pointer">
                    <div
                      className={cn(
                        "h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors",
                        (form.utilCountry ?? "france") === c
                          ? "border-emerald-600 bg-emerald-600"
                          : "border-border hover:border-emerald-400",
                      )}
                      onClick={() => set("utilCountry", c)}
                    >
                      {(form.utilCountry ?? "france") === c && (
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-sm text-foreground capitalize">{c}</span>
                  </label>
                ))}
              </div>
            </FieldRow>

            {/* ── Résultat live ── */}
            {result && (result.kgCO2e > 0 || (form.utilUnitsSold && form.utilLifespanYears && form.utilConsumptionPerYear)) && (
              <div className="rounded-lg border border-emerald-300 bg-white dark:bg-muted/10 divide-y divide-border overflow-hidden">
                <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/20">
                  <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest">Résultat du calcul</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
                  <ResultCell
                    label="Consommation totale"
                    value={result.totalConsumption.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}
                    unit={unitKey === "kwh" ? "kWh" : unitKey === "litres" ? "L" : unitKey === "m3" ? "m³" : unitKey === "go" ? "Go" : "unités"}
                  />
                  <ResultCell
                    label="Facteur d'émission"
                    value={result.factor.toLocaleString("fr-FR", { maximumFractionDigits: 4 })}
                    unit="kgCO₂e/unité"
                  />
                  <ResultCell
                    label="Émissions"
                    value={result.kgCO2e.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}
                    unit="kgCO₂e"
                    highlight
                  />
                  <ResultCell
                    label="Émissions"
                    value={result.tCO2e.toLocaleString("fr-FR", { maximumFractionDigits: 3 })}
                    unit="tCO₂e"
                    highlight
                  />
                </div>
                <div className="px-4 py-2 bg-emerald-50/50 dark:bg-emerald-950/10">
                  <p className="text-[11px] text-emerald-700">
                    ✓ La valeur <strong>{result.tCO2e.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} tCO₂e</strong> est automatiquement reportée dans le tableau ci-dessus (ligne Utilisation).
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-3 items-start">
      <div className="pt-2">
        <p className="text-sm font-medium text-foreground/90">{label}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
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
      className="w-full text-right rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

function ResultCell({ label, value, unit, highlight }: { label: string; value: string; unit: string; highlight?: boolean }) {
  return (
    <div className={cn("px-4 py-3 space-y-0.5", highlight && "bg-emerald-50/60 dark:bg-emerald-950/20")}>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={cn("text-lg font-bold tabular-nums", highlight ? "text-emerald-700" : "text-foreground")}>
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground">{unit}</p>
    </div>
  );
}
