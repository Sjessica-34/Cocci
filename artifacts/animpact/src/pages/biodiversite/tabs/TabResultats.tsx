import { useListBioDependencies, useListBioIssues } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { Leaf, AlertTriangle, Layers, Activity } from "lucide-react";
import { dependencyColor, chainLabel } from "../data";

interface Props { orgId: number }

function KpiCard({ icon: Icon, label, value, sub, iconClass }: { icon: React.ElementType; label: string; value: number | string; sub?: string; iconClass?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-5 pb-5">
        <div className={`p-2 rounded-lg ${iconClass ?? "bg-slate-100"}`}><Icon className="h-5 w-5" /></div>
        <div><p className="text-2xl font-bold">{value}</p><p className="text-sm text-muted-foreground">{label}</p>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</div>
      </CardContent>
    </Card>
  );
}

const CHART_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];
const POSITION_COLORS: Record<string, string> = { "amont": "#3b82f6", "in-situ": "#10b981", "aval": "#8b5cf6" };

export function TabResultats({ orgId }: Props) {
  const { data: depsData, isLoading: depsLoading } = useListBioDependencies(orgId);
  const { data: issuesData, isLoading: issuesLoading } = useListBioIssues(orgId);

  const deps   = depsData?.items ?? [];
  const issues = issuesData?.items ?? [];

  if (depsLoading || issuesLoading) return <div className="text-sm text-muted-foreground py-8 text-center">Chargement…</div>;

  const totalDeps    = deps.length;
  const totalIssues  = issues.length;
  const avgDep       = totalDeps > 0 ? (deps.reduce((s, d) => s + (d.dependencyLevel ?? 0), 0) / deps.filter((d) => d.dependencyLevel).length) || 0 : 0;
  const avgMastery   = totalDeps > 0 ? (deps.reduce((s, d) => s + (d.masteryLevel ?? 0), 0) / deps.filter((d) => d.masteryLevel).length) || 0 : 0;
  const criticalDeps = deps.filter((d) => (d.dependencyLevel ?? 0) >= 4).length;
  const priorityIssues = issues.filter((i) => (i.importance ?? 0) >= 4).length;

  if (totalDeps === 0 && totalIssues === 0) {
    return (
      <div className="border-2 border-dashed rounded-lg py-16 flex flex-col items-center gap-3 text-muted-foreground">
        <Leaf className="h-10 w-10 opacity-30" />
        <p className="font-medium">Aucune donnée disponible</p>
        <p className="text-sm">Ajoutez des dépendances pour voir les indicateurs.</p>
      </div>
    );
  }

  // Category distribution
  const catMap: Record<string, number> = {};
  for (const d of deps) { const c = d.category ?? "Non catégorisée"; catMap[c] = (catMap[c] ?? 0) + 1; }
  const categoryData = Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Position distribution
  const posMap: Record<string, number> = { amont: 0, "in-situ": 0, aval: 0 };
  for (const d of deps) { posMap[d.chainPosition ?? "amont"] = (posMap[d.chainPosition ?? "amont"] ?? 0) + 1; }
  const posData = Object.entries(posMap).map(([name, value]) => ({ name: chainLabel(name), value, fill: POSITION_COLORS[name] ?? "#94a3b8" })).filter((d) => d.value > 0);

  // Dependency level distribution
  const depLevelMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const d of deps) { if (d.dependencyLevel) depLevelMap[d.dependencyLevel] = (depLevelMap[d.dependencyLevel] ?? 0) + 1; }
  const depLevelData = [1, 2, 3, 4, 5].map((n) => ({ name: `Niveau ${n}`, value: depLevelMap[n] ?? 0 }));
  const depLevelColors = ["#22c55e", "#84cc16", "#facc15", "#f97316", "#ef4444"];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Leaf} label="Dépendances" value={totalDeps} iconClass="bg-emerald-100 text-emerald-700" />
        <KpiCard icon={Layers} label="Enjeux" value={totalIssues} sub={priorityIssues > 0 ? `dont ${priorityIssues} prioritaire${priorityIssues > 1 ? "s" : ""}` : undefined} iconClass="bg-blue-100 text-blue-700" />
        <KpiCard icon={AlertTriangle} label="Dépendances critiques" value={criticalDeps} sub="Niveau ≥ 4" iconClass="bg-red-100 text-red-600" />
        <KpiCard icon={Activity} label="Dép. moy. / Maît. moy." value={totalDeps > 0 ? `${avgDep.toFixed(1)} / ${avgMastery.toFixed(1)}` : "—"} sub="sur 5" iconClass="bg-purple-100 text-purple-700" />
      </div>

      {/* Répartition Amont/In situ/Aval + Catégorie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Répartition Amont / In situ / Aval</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={posData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {posData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Legend />
                <Tooltip formatter={(v: number) => [`${v}`, "dépendances"]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Répartition par catégorie</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 8, right: 20 }}>
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => [v, "dépendances"]} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>{categoryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Dependency levels */}
      {deps.some((d) => d.dependencyLevel) && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Distribution des niveaux de dépendance</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={depLevelData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [v, "dépendances"]} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>{depLevelData.map((_, i) => <Cell key={i} fill={depLevelColors[i]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Cartographies recap */}
      {deps.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Aperçu des dépendances critiques</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {deps.filter((d) => (d.dependencyLevel ?? 0) >= 4).length === 0
                ? <p className="text-sm text-muted-foreground text-center py-4">Aucune dépendance critique (niveau ≥ 4) identifiée.</p>
                : deps.filter((d) => (d.dependencyLevel ?? 0) >= 4).map((d) => (
                  <div key={d.id} className={`border rounded-md px-3 py-2 flex items-center gap-3 ${dependencyColor(d.dependencyLevel)}`}>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{d.name ?? "Sans nom"}</p>
                      <p className="text-xs opacity-70">{d.category}{d.subCategory ? ` › ${d.subCategory}` : ""} · {chainLabel(d.chainPosition)}</p>
                    </div>
                    <span className="text-xs font-bold">{d.dependencyLevel}/5</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
