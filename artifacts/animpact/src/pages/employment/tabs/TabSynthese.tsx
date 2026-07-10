import { useGetEmploymentResults, getGetEmploymentResultsQueryKey, type EmploymentIndicator } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Sparkles, AlertTriangle, ThumbsUp } from "lucide-react";

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
