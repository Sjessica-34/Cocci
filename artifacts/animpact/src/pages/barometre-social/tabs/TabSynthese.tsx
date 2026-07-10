import { useState } from "react";
import {
  useGetBarometreSynthese,
  useRegenerateBarometreAiSummary,
  useCreateBarometreAction,
  getGetBarometreSyntheseQueryKey,
  type BarometreCampaign,
} from "@workspace/api-client-react";

import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
import { Sparkles, RefreshCw, TrendingUp, TrendingDown, ThumbsUp, ThumbsDown, AlertTriangle, ListPlus } from "lucide-react";

interface Props {
  orgId: number;
  campaign: BarometreCampaign | null;
}

export function TabSynthese({ orgId, campaign }: Props) {
  const queryClient = useQueryClient();
  const [actionDialogOpen, setActionDialogOpen] = useState<string | null>(null);
  const [actionTitle, setActionTitle] = useState("");

  const { data, isLoading } = useGetBarometreSynthese(orgId, campaign?.id ?? 0, {
    query: { enabled: !!campaign, queryKey: getGetBarometreSyntheseQueryKey(orgId, campaign?.id ?? 0) },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetBarometreSyntheseQueryKey(orgId, campaign?.id ?? 0) });

  const { mutate: regenerate, isPending: isRegenerating } = useRegenerateBarometreAiSummary({
    mutation: { onSuccess: invalidate },
  });

  const { mutate: createAction, isPending: isCreatingAction } = useCreateBarometreAction({
    mutation: {
      onSuccess: () => {
        setActionDialogOpen(null);
        setActionTitle("");
      },
    },
  });

  if (!campaign) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground border rounded-xl">
        Sélectionnez une campagne pour consulter sa synthèse.
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (data.nbRepondants === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground border rounded-xl">
        Aucune réponse reçue pour l'instant — la synthèse sera disponible dès les premières réponses.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Satisfaction globale</p>
            <p className="text-3xl font-bold text-foreground mt-1">
              {data.satisfactionGlobale != null ? `${data.satisfactionGlobale.toFixed(1)}/5` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Répondants</p>
            <p className="text-3xl font-bold text-foreground mt-1">{data.nbRepondants}/{data.nbCollaborateurs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Taux de participation</p>
            <p className="text-3xl font-bold text-foreground mt-1">{data.tauxParticipation.toFixed(0)}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Score par thématique</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {data.themeScores.map((t) => {
            const delta = t.average != null && t.previousAverage != null ? t.average - t.previousAverage : null;
            return (
              <div key={t.theme} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                <span className="text-foreground">{t.theme}</span>
                <div className="flex items-center gap-2">
                  {delta != null && Math.abs(delta) >= 0.05 && (
                    <span className={`inline-flex items-center gap-0.5 text-xs ${delta > 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                    </span>
                  )}
                  <span className="font-semibold text-foreground">{t.average != null ? `${t.average.toFixed(1)}/5` : "—"}</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
              <ThumbsUp className="h-4 w-4" /> Points forts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.pointsForts.length ? (
              <ul className="space-y-1.5 text-sm text-foreground list-disc list-inside">
                {data.pointsForts.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground italic">Aucun point fort identifié.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <ThumbsDown className="h-4 w-4" /> Points faibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.pointsFaibles.length ? (
              <ul className="space-y-1.5 text-sm text-foreground list-disc list-inside">
                {data.pointsFaibles.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground italic">Aucun point faible identifié.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {!!data.themesASurveiller.length && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" /> Thématiques à surveiller
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {data.themesASurveiller.map((t) => (
              <Badge key={t} variant="outline" className="border-amber-300 text-amber-800">{t}</Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Synthèse générée par IA
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={isRegenerating}
            onClick={() => regenerate({ orgId, id: campaign.id })}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
            {data.aiSummary ? "Régénérer" : "Générer"}
          </Button>
        </CardHeader>
        <CardContent>
          {data.aiSummary ? (
            <div className="space-y-4">
              <p className="text-sm text-foreground leading-relaxed">{data.aiSummary.summary}</p>
              {!!data.aiSummary.suggestions.length && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Suggestions d'actions</p>
                  <div className="space-y-1.5">
                    {data.aiSummary.suggestions.map((s, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 text-sm bg-muted/50 rounded-lg p-2">
                        <span className="text-foreground">{s}</span>
                        <Dialog open={actionDialogOpen === s} onOpenChange={(open) => { setActionDialogOpen(open ? s : null); setActionTitle(open ? s : ""); }}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="gap-1 shrink-0 text-xs">
                              <ListPlus className="h-3.5 w-3.5" /> Créer une action
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Nouvelle action</DialogTitle>
                              <DialogDescription>Suggestion issue de la synthèse IA</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-1.5 py-2">
                              <Label htmlFor="ai-action-title">Intitulé de l'action</Label>
                              <Input id="ai-action-title" value={actionTitle} onChange={(e) => setActionTitle(e.target.value)} />
                            </div>
                            <DialogFooter>
                              <Button
                                disabled={!actionTitle.trim() || isCreatingAction}
                                onClick={() => createAction({ orgId, id: campaign.id, data: { title: actionTitle.trim(), sourceTheme: null } })}
                              >
                                Créer
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Générée le {new Date(data.aiSummary.generatedAt).toLocaleString("fr-FR")}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Aucune synthèse générée pour l'instant. Cliquez sur « Générer » pour obtenir un résumé des commentaires libres.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
