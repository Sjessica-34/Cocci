import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Calculator, Leaf, Users, Zap, Printer, Server } from "lucide-react";

interface ParcData {
  employees:      number;
  laptops:        number;
  desktops:       number;
  screens:        number;
  smartphones:    number;
  tablets:        number;
  servers:        number;
  printers:       number;
  reconditPct:    number;
  lifespanYears:  number;
  storageGb:      number;
  cloudPct:       number;
  printYearly:    number;
  elecKwhYear:    number;
}

export const DEFAULTS_NR: ParcData = {
  employees:     25,
  laptops:       20,
  desktops:      5,
  screens:       25,
  smartphones:   15,
  tablets:       5,
  servers:       2,
  printers:      3,
  reconditPct:   20,
  lifespanYears: 4,
  storageGb:     2000,
  cloudPct:      30,
  printYearly:   5000,
  elecKwhYear:   15000,
};

// Emission factors (kg CO2e per unit per year, approximate)
const FACTORS = {
  laptop:     156,  // kg CO2e/year (fabrication + usage)
  desktop:    196,
  screen:     52,
  smartphone: 70,
  tablet:     82,
  server:     1700,
  printer:    47,
  elec:       0.052, // kg CO2e/kWh (réseau FR moyen)
  print:      0.004, // kg CO2e/impression
  storage:    0.000007, // kg CO2e/Go/year
};

function num(v: string | number) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

export function useCalc(data: ParcData) {
  return useMemo(() => {
    const reconditFactor = 1 - (data.reconditPct / 100) * 0.7; // reconditioning saves 70%
    const ageFactor = Math.min(1.5, Math.max(0.5, 5 / Math.max(1, data.lifespanYears)));

    const eqCo2 =
      (data.laptops    * FACTORS.laptop    +
       data.desktops   * FACTORS.desktop   +
       data.screens    * FACTORS.screen    +
       data.smartphones* FACTORS.smartphone+
       data.tablets    * FACTORS.tablet    +
       data.servers    * FACTORS.server    +
       data.printers   * FACTORS.printer) *
      reconditFactor * ageFactor +
      data.elecKwhYear * FACTORS.elec +
      data.printYearly * FACTORS.print +
      data.storageGb * FACTORS.storage;

    const totalDevices = data.laptops + data.desktops + data.screens + data.smartphones + data.tablets + data.servers + data.printers;

    // Sobriété score: 0-100
    let sobriete = 50;
    if (data.reconditPct >= 30) sobriete += 15;
    else if (data.reconditPct >= 10) sobriete += 7;
    if (data.lifespanYears >= 5) sobriete += 15;
    else if (data.lifespanYears >= 4) sobriete += 7;
    if (data.printYearly < 2000) sobriete += 10;
    else if (data.printYearly > 10000) sobriete -= 10;
    if (data.cloudPct > 80) sobriete -= 5;
    sobriete = Math.min(100, Math.max(0, sobriete));

    return {
      eqCo2Tons:      Math.round(eqCo2 / 1000 * 10) / 10,
      eqCo2KgPerson:  data.employees > 0 ? Math.round(eqCo2 / data.employees) : 0,
      totalDevices,
      sobriete,
      chartData: [
        { name: "Équipements", value: Math.round((data.laptops * FACTORS.laptop + data.desktops * FACTORS.desktop + data.screens * FACTORS.screen + data.smartphones * FACTORS.smartphone + data.tablets * FACTORS.tablet + data.servers * FACTORS.server + data.printers * FACTORS.printer) * reconditFactor * ageFactor / 1000 * 10) / 10, color: "#3b82f6" },
        { name: "Électricité",  value: Math.round(data.elecKwhYear * FACTORS.elec / 1000 * 10) / 10, color: "#f59e0b" },
        { name: "Impressions",  value: Math.round(data.printYearly * FACTORS.print / 1000 * 10) / 10, color: "#ef4444" },
        { name: "Données",      value: Math.round(data.storageGb * FACTORS.storage / 1000 * 100) / 100, color: "#8b5cf6" },
      ],
    };
  }, [data]);
}

export function TabCalculateur() {
  const [data, setData] = useState<ParcData>(DEFAULTS_NR);
  const calc = useCalc(data);

  const set = (key: keyof ParcData, value: number) =>
    setData((d) => ({ ...d, [key]: value }));

  const inputProps = (key: keyof ParcData) => ({
    type: "number" as const,
    min: 0,
    value: data[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(key, num(e.target.value)),
    className: "w-24 text-right",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Calculator className="h-5 w-5 text-emerald-600" />
        <div>
          <h2 className="text-base font-semibold text-foreground">Mini calculateur Numérique Responsable</h2>
          <p className="text-xs text-muted-foreground">Estimez l'empreinte numérique de votre parc et votre score de sobriété. Outil indicatif.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input form */}
        <div className="space-y-4">
          {/* Effectif */}
          <Section title="Effectif" icon={<Users className="h-4 w-4 text-slate-600" />}>
            <Row label="Nombre d'employés" right={<Input {...inputProps("employees")} />} />
          </Section>

          {/* Équipements */}
          <Section title="Parc d'équipements" icon={<Zap className="h-4 w-4 text-blue-600" />}>
            <Row label="Ordinateurs portables"  right={<Input {...inputProps("laptops")} />} />
            <Row label="Ordinateurs fixes"       right={<Input {...inputProps("desktops")} />} />
            <Row label="Écrans"                  right={<Input {...inputProps("screens")} />} />
            <Row label="Smartphones"             right={<Input {...inputProps("smartphones")} />} />
            <Row label="Tablettes"               right={<Input {...inputProps("tablets")} />} />
            <Row label="Serveurs physiques"      right={<Input {...inputProps("servers")} />} />
            <Row label="Imprimantes"             right={<Input {...inputProps("printers")} />} />
          </Section>

          {/* Sobriété */}
          <Section title="Sobriété & durée de vie" icon={<Leaf className="h-4 w-4 text-emerald-600" />}>
            <Row
              label={`Matériel reconditionné (${data.reconditPct}%)`}
              right={
                <Slider
                  min={0} max={100} step={5}
                  value={[data.reconditPct]}
                  onValueChange={([v]) => set("reconditPct", v)}
                  className="w-32"
                />
              }
            />
            <Row
              label={`Durée de vie moyenne (${data.lifespanYears} ans)`}
              right={
                <Slider
                  min={1} max={10} step={1}
                  value={[data.lifespanYears]}
                  onValueChange={([v]) => set("lifespanYears", v)}
                  className="w-32"
                />
              }
            />
            <Row
              label={`Cloud externe (${data.cloudPct}% des données)`}
              right={
                <Slider
                  min={0} max={100} step={5}
                  value={[data.cloudPct]}
                  onValueChange={([v]) => set("cloudPct", v)}
                  className="w-32"
                />
              }
            />
          </Section>

          {/* Usage */}
          <Section title="Consommation & usage" icon={<Printer className="h-4 w-4 text-red-500" />}>
            <Row label="Stockage total (Go)"          right={<Input {...inputProps("storageGb")} />} />
            <Row label="Impressions par an"           right={<Input {...inputProps("printYearly")} />} />
            <Row label="Conso. électrique (kWh/an)"  right={<Input {...inputProps("elecKwhYear")} />} />
          </Section>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              label="Émissions estimées"
              value={`${calc.eqCo2Tons} t CO₂e`}
              sub="par an (estimation indicative)"
              color="text-red-600"
            />
            <KpiCard
              label="Par personne"
              value={`${calc.eqCo2KgPerson} kg CO₂e`}
              sub="par employé et par an"
              color="text-orange-600"
            />
            <KpiCard
              label="Parc total"
              value={`${calc.totalDevices} équipements`}
              sub="inventoriés"
              color="text-blue-600"
            />
            <KpiCard
              label="Score de sobriété"
              value={`${calc.sobriete}/100`}
              sub="estimation qualitative"
              color={calc.sobriete >= 65 ? "text-emerald-600" : calc.sobriete >= 40 ? "text-amber-600" : "text-red-600"}
            />
          </div>

          {/* Bar chart */}
          <div className="rounded-xl border border-border bg-white dark:bg-muted/10 p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Répartition des émissions (t CO₂e/an)</h4>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={calc.chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} unit=" t" width={36} />
                <Tooltip
                  formatter={(v: number) => [`${v} t CO₂e`, ""]}
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {calc.chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recommandations */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-2">
            <h4 className="text-xs font-semibold text-foreground">Recommandations</h4>
            {data.reconditPct < 20 && (
              <Reco text="Augmenter la part de matériel reconditionné réduirait significativement votre impact fabrication." />
            )}
            {data.lifespanYears < 4 && (
              <Reco text="Allonger la durée de vie moyenne des équipements est le levier le plus efficace." />
            )}
            {data.printYearly > 5000 && (
              <Reco text="Votre volume d'impressions est élevé. Un plan de réduction des impressions est recommandé." />
            )}
            {data.reconditPct >= 20 && data.lifespanYears >= 4 && data.printYearly <= 5000 && (
              <p className="text-xs text-emerald-700">✓ Vos pratiques actuelles sont dans la bonne direction. Continuez !</p>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            Calcul indicatif basé sur des facteurs d'émission moyens. Pour un bilan officiel, utilisez le module Bilan Carbone®.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-white dark:bg-muted/10 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/5">
        {icon}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-4 space-y-2.5">{children}</div>
    </div>
  );
}

function Row({ label, right }: { label: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-xs text-foreground/80 font-normal">{label}</Label>
      {right}
    </div>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-white dark:bg-muted/10 p-3 text-center">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function Reco({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-emerald-500 text-xs mt-0.5">→</span>
      <p className="text-xs text-emerald-800">{text}</p>
    </div>
  );
}

function ServerIcon(props: React.SVGProps<SVGSVGElement>) {
  return <Server {...props} />;
}
