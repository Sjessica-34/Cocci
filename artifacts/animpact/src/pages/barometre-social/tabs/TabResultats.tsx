import {
  useGetBarometreResults,
  getGetBarometreResultsQueryKey,
  type BarometreCampaign,
} from "@workspace/api-client-react";
import { BAROMETRE_SCALE_LABELS } from "@workspace/rse-referentials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, MessageSquare } from "lucide-react";

interface Props {
  orgId: number;
  campaign: BarometreCampaign | null;
}

function TrendBadge({ current, previous }: { current: number | null; previous: number | null }) {
  if (current == null || previous == null) return null;
  const delta = current - previous;
  if (Math.abs(delta) < 0.05) return null;
  const Icon = delta > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs ${delta > 0 ? "text-emerald-600" : "text-red-600"}`}>
      <Icon className="h-3 w-3" />
      {delta > 0 ? "+" : ""}{delta.toFixed(1)}
    </span>
  );
}

export function TabResultats({ orgId, campaign }: Props) {
  const { data, isLoading } = useGetBarometreResults(orgId, campaign?.id ?? 0, {
    query: { enabled: !!campaign, queryKey: getGetBarometreResultsQueryKey(orgId, campaign?.id ?? 0) },
  });

  if (!campaign) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground border rounded-xl">
        Sélectionnez une campagne pour consulter ses résultats.
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (data.campaign.nbRepondants === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground border rounded-xl">
        Aucune réponse reçue pour l'instant sur cette campagne.
      </div>
    );
  }

  const themes = Array.from(new Set(data.questions.map((q) => q.theme)));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <Badge variant="secondary">{data.campaign.nbRepondants} réponses</Badge>
        <Badge variant="secondary">{data.campaign.tauxParticipation.toFixed(0)}% de participation</Badge>
      </div>

      {themes.map((theme) => (
        <Card key={theme}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{theme}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.questions.filter((q) => q.theme === theme).map((q) => (
              <div key={q.code} className="space-y-1.5 pb-3 border-b last:border-0 last:pb-0">
                <p className="text-sm font-medium text-foreground">{q.text}</p>

                {q.type === "scale" ? (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 space-y-1">
                      {[1, 2, 3, 4, 5].map((v) => {
                        const count = q.distribution?.[String(v)] ?? 0;
                        const pct = q.responseCount ? (count / q.responseCount) * 100 : 0;
                        return (
                          <div key={v} className="flex items-center gap-2 text-xs">
                            <span className="w-24 text-muted-foreground truncate">{BAROMETRE_SCALE_LABELS[v]}</span>
                            <Progress value={pct} className="h-1.5 flex-1" />
                            <span className="w-8 text-right text-muted-foreground">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-semibold text-foreground">{q.average != null ? q.average.toFixed(1) : "—"}/5</p>
                      <TrendBadge current={q.average ?? null} previous={q.previousAverage ?? null} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {q.comments?.length ? (
                      q.comments.map((c, i) => (
                        <div key={i} className="flex gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
                          <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>{c}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Aucun commentaire.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
