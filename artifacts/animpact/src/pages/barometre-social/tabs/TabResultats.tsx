import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetBarometreResults,
  useCreateBarometreAction,
  getGetBarometreResultsQueryKey,
  type BarometreCampaign,
} from "@workspace/api-client-react";
import { BAROMETRE_SCALE_LABELS } from "@workspace/rse-referentials";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, TrendingDown, MessageSquare, ListPlus } from "lucide-react";

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
  const queryClient = useQueryClient();
  const [actionDialogFor, setActionDialogFor] = useState<{ code: string; theme: string } | null>(null);
  const [actionTitle, setActionTitle] = useState("");

  const { data, isLoading } = useGetBarometreResults(orgId, campaign?.id ?? 0, {
    query: { enabled: !!campaign, queryKey: getGetBarometreResultsQueryKey(orgId, campaign?.id ?? 0) },
  });

  const { mutate: createAction, isPending: isCreatingAction } = useCreateBarometreAction({
    mutation: {
      onSuccess: () => {
        setActionDialogFor(null);
        setActionTitle("");
      },
    },
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
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground flex-1">{q.text}</p>
                  <Dialog open={actionDialogFor?.code === q.code} onOpenChange={(open) => setActionDialogFor(open ? { code: q.code, theme: q.theme } : null)}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1 shrink-0 text-xs">
                        <ListPlus className="h-3.5 w-3.5" />
                        Créer une action
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nouvelle action</DialogTitle>
                        <DialogDescription>À partir de : « {q.text} »</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-1.5 py-2">
                        <Label htmlFor="action-title">Intitulé de l'action</Label>
                        <Input id="action-title" value={actionTitle} onChange={(e) => setActionTitle(e.target.value)} placeholder="Ex. Mettre en place un point d'équipe mensuel" />
                      </div>
                      <DialogFooter>
                        <Button
                          disabled={!actionTitle.trim() || isCreatingAction}
                          onClick={() =>
                            createAction({
                              orgId,
                              id: campaign.id,
                              data: { title: actionTitle.trim(), sourceTheme: q.theme },
                            })
                          }
                        >
                          Créer
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

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
