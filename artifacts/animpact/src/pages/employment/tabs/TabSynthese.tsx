import { useGetEmploymentResults, getGetEmploymentResultsQueryKey, type EmploymentIndicator, type EmploymentWorkforce, type EmploymentDiversity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Sparkles, AlertTriangle, ThumbsUp } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

const AGE_COLOR = "#6366f1";
const SENIORITY_COLOR = "#0ea5e9";
const GENDER_COLORS = ["#3b82f6", "#ec4899", "#a855f7", "#f59e0b", "#64748b"];

function buildAgeBrackets(w: EmploymentWorkforce | null | undefined) {
  if (!w) return [];
  const brackets = [
    { label: "< 25 ans", value: w.ageUnder25 },
    { label: "25-34 ans", value: w.age25to34 },
    { label: "35-44 ans", value: w.age35to44 },
    { label: "45-54 ans", value: w.age45to54 },
    { label: "55 ans et +", value: w.age55plus },
  ];
  return brackets.some((b) => b.value != null) ? brackets : [];
}

function buildSeniorityBrackets(w: EmploymentWorkforce | null | undefined) {
  if (!w) return [];
  const brackets = [
    { label: "< 2 ans", value: w.seniorityUnder2 },
    { label: "2-5 ans", value: w.seniority2to5 },
    { label: "5-10 ans", value: w.seniority5to10 },
    { label: "> 10 ans", value: w.seniorityOver10 },
  ];
  return brackets.some((b) => b.value != null) ? brackets : [];
}

function buildGenderBreakdown(d: EmploymentDiversity | null | undefined) {
  if (!d) return [];
  const parts = [
    { label: "Hommes", value: d.nbHommes },
    { label: "Femmes", value: d.nbFemmes },
    { label: "Non-binaire", value: d.nbNonBinaire },
    { label: "Autre", value: d.nbAutreGenre },
    { label: "Ne se prononce pas", value: d.nbPrefereNePasRepondreGenre },
  ];
  return parts.filter((p): p is { label: string; value: number } => p.value != null && p.value > 0);
}

function DistributionChart({
  title,
  data,
  avgValue,
  avgLabel,
  color,
}: {
  title: string;
  data: { label: string; value: number | null | undefined }[];
  avgValue: number | null | undefined;
  avgLabel: string;
  color: string;
}) {
  const chartData = data.map((d) => ({ label: d.label, value: d.value ?? 0 }));
  const hasBrackets = data.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {avgValue != null && (
          <p className="text-sm text-muted-foreground mb-3">
            {avgLabel} : <span className="font-semibold text-foreground">{avgValue} ans</span>
          </p>
        )}
        {hasBrackets ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="label" width={90} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : avgValue == null ? (
          <p className="text-sm text-muted-foreground">Aucune donnée renseignée.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function GenderChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Répartition par genre</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune donnée renseignée.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80} label={(e) => `${e.label} (${e.value})`}>
                {data.map((_, i) => (
                  <Cell key={i} fill={GENDER_COLORS[i % GENDER_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

interface Props {
  orgId: number;
}

function TrendIcon({ trend }: { trend: EmploymentIndicator["trend"] }) {
  if (trend === "up") return <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />;
  if (trend === "down") return <TrendingDown className="h-3.5 w-3.5 text-rose-600" />;
  if (trend === "new") return <Sparkles className="h-3.5 w-3.5 text-blue-500" />;
  if (trend === "stable") return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  return null;
}

function IndicatorCard({ indicator }: { indicator: EmploymentIndicator }) {
  return (
    <div className="p-4 rounded-xl border bg-card">
      <p className="text-xs text-muted-foreground">{indicator.label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-bold tabular-nums">
          {indicator.value != null ? `${indicator.value}${indicator.unit ? ` ${indicator.unit}` : ""}` : "—"}
        </span>
        {indicator.trend !== "unknown" && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendIcon trend={indicator.trend} />
            {indicator.previousValue != null && `(N-1 : ${indicator.previousValue}${indicator.unit ? ` ${indicator.unit}` : ""})`}
          </span>
        )}
      </div>
    </div>
  );
}

export function TabSynthese({ orgId }: Props) {
  const { data, isLoading } = useGetEmploymentResults(orgId, {
    query: { enabled: !!orgId, queryKey: getGetEmploymentResultsQueryKey(orgId) },
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const hasAnyData = !!data.workforce || !!data.diversity || !!data.training;

  if (!hasAnyData) {
    return (
      <div className="flex items-center gap-3 p-5 rounded-xl border border-blue-200 bg-blue-50">
        <Sparkles className="h-5 w-5 text-blue-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-800">Aucune donnée renseignée</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Renseignez les onglets Effectifs, Diversité & Inclusion et Formation & Développement pour faire apparaître vos indicateurs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Indicateurs clés</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.indicators.map((ind) => (
            <IndicatorCard key={ind.code} indicator={ind} />
          ))}
        </div>
      </div>

      {data.customKpis.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Indicateurs personnalisés</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.customKpis.map((kpi) => (
              <div key={kpi.id} className="p-4 rounded-xl border bg-card">
                <p className="text-xs text-muted-foreground">{kpi.name}</p>
                <span className="text-2xl font-bold tabular-nums block mt-1">
                  {kpi.computedValue != null ? `${kpi.computedValue}${kpi.unit ? ` ${kpi.unit}` : ""}` : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ThumbsUp className="h-4 w-4 text-emerald-600" /> Points forts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.strengths.length === 0 ? (
              <p className="text-sm text-muted-foreground">Rien à signaler pour l'instant.</p>
            ) : (
              <ul className="space-y-2">
                {data.strengths.map((s) => (
                  <li key={s.code} className="flex items-center justify-between text-sm">
                    <span>{s.label}</span>
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                      {s.value}{s.unit ? ` ${s.unit}` : ""}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Points de vigilance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.watchpoints.length === 0 ? (
              <p className="text-sm text-muted-foreground">Rien à signaler pour l'instant.</p>
            ) : (
              <ul className="space-y-2">
                {data.watchpoints.map((s) => (
                  <li key={s.code} className="flex items-center justify-between text-sm">
                    <span>{s.label}</span>
                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                      {s.value}{s.unit ? ` ${s.unit}` : ""}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {(data.workforce || data.diversity) && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Pyramides & répartitions</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DistributionChart
              title="Pyramide des âges"
              data={buildAgeBrackets(data.workforce)}
              avgValue={data.workforce?.avgAge ?? null}
              avgLabel="Âge moyen"
              color={AGE_COLOR}
            />
            <DistributionChart
              title="Répartition par ancienneté"
              data={buildSeniorityBrackets(data.workforce)}
              avgValue={data.workforce?.avgSeniority ?? null}
              avgLabel="Ancienneté moyenne"
              color={SENIORITY_COLOR}
            />
            <GenderChart data={buildGenderBreakdown(data.diversity)} />
          </div>
        </div>
      )}

      {(data.increasing.length > 0 || data.decreasing.length > 0 || data.isNew.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Évolution par rapport à l'exercice précédent</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> En hausse</p>
              <ul className="space-y-1 text-sm">{data.increasing.map((i) => <li key={i.code}>{i.label}</li>)}</ul>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><TrendingDown className="h-3.5 w-3.5 text-rose-600" /> En baisse</p>
              <ul className="space-y-1 text-sm">{data.decreasing.map((i) => <li key={i.code}>{i.label}</li>)}</ul>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-blue-500" /> Nouveaux</p>
              <ul className="space-y-1 text-sm">{data.isNew.map((i) => <li key={i.code}>{i.label}</li>)}</ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
