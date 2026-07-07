import { useListSuppliers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import { Building2, AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { computeGeoDistribution } from "../data";

interface Props {
  orgId: number;
}

const GEO_COLORS = ["#10b981", "#3b82f6", "#f59e0b"];
const CATEGORY_COLORS = ["#6366f1", "#ec4899", "#f97316", "#14b8a6", "#8b5cf6", "#ef4444", "#22c55e", "#a855f7"];

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  iconClass,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  iconClass?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-5 pb-5">
        <div className={`p-2 rounded-lg ${iconClass ?? "bg-slate-100"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function TabDashboard({ orgId }: Props) {
  const { data, isLoading } = useListSuppliers(orgId);
  const suppliers = data?.items ?? [];

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Chargement…</div>;
  }

  if (suppliers.length === 0) {
    return (
      <div className="border-2 border-dashed rounded-lg py-16 flex flex-col items-center gap-3 text-muted-foreground">
        <Building2 className="h-10 w-10 opacity-30" />
        <p className="font-medium">Aucune donnée disponible</p>
        <p className="text-sm">Ajoutez des fournisseurs dans l'onglet "Mes fournisseurs" pour voir les indicateurs.</p>
      </div>
    );
  }

  const total      = suppliers.length;
  const evaluated  = suppliers.filter((s) => s.criticality != null || s.riskLevel != null || s.dependency != null).length;
  const critical   = suppliers.filter((s) => (s.criticality ?? 0) >= 4).length;
  const highRisk   = suppliers.filter((s) => (s.riskLevel ?? 0) >= 4).length;

  // Geo distribution
  const geo = computeGeoDistribution(suppliers);
  const geoChartData = [
    { name: "France", value: geo.france },
    { name: "Europe", value: geo.europe },
    { name: "Hors Europe", value: geo.horsEurope },
  ].filter((d) => d.value > 0);

  // Regions chart
  const regionData = Object.entries(geo.byRegion)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  // Category distribution
  const catMap: Record<string, number> = {};
  for (const s of suppliers) {
    const cat = s.category ?? "Non catégorisé";
    catMap[cat] = (catMap[cat] ?? 0) + 1;
  }
  const categoryData = Object.entries(catMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Criticality distribution
  const critMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const s of suppliers) {
    if (s.criticality) critMap[s.criticality] = (critMap[s.criticality] ?? 0) + 1;
  }
  const critData = [1, 2, 3, 4, 5].map((n) => ({ name: `Criticité ${n}`, value: critMap[n] ?? 0 }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Building2} label="Fournisseurs total" value={total} iconClass="bg-blue-100 text-blue-700" />
        <KpiCard
          icon={CheckCircle2}
          label="Fournisseurs évalués"
          value={evaluated}
          sub={total > 0 ? `${Math.round((evaluated / total) * 100)}% du total` : undefined}
          iconClass="bg-emerald-100 text-emerald-700"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Fournisseurs critiques"
          value={critical}
          sub="Criticité ≥ 4"
          iconClass="bg-orange-100 text-orange-600"
        />
        <KpiCard
          icon={ShieldAlert}
          label="À risque élevé"
          value={highRisk}
          sub="Risque ≥ 4"
          iconClass="bg-red-100 text-red-600"
        />
      </div>

      {/* Geo + Category row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Geo distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Répartition géographique</CardTitle>
          </CardHeader>
          <CardContent>
            {geoChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Renseignez le pays de vos fournisseurs pour voir ce graphique.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={geoChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {geoChartData.map((_, i) => (
                      <Cell key={i} fill={GEO_COLORS[i % GEO_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(v: number) => [`${v} fournisseur${v !== 1 ? "s" : ""}`, ""]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Répartition par catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: 20 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [v, "fournisseurs"]} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Region breakdown (France only) */}
      {regionData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Fournisseurs français par région</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(180, regionData.length * 30)}>
              <BarChart data={regionData} layout="vertical" margin={{ left: 8, right: 20 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [v, "fournisseurs"]} />
                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Criticality distribution */}
      {evaluated > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Distribution de la criticité</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={critData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [v, "fournisseurs"]} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {critData.map((_, i) => {
                    const colors = ["#22c55e", "#84cc16", "#facc15", "#f97316", "#ef4444"];
                    return <Cell key={i} fill={colors[i]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
