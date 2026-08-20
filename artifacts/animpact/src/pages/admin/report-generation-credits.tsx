import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetAdminReportGenerationQuotasQueryKey,
  useGetAdminReportGenerationQuotas,
  useGrantAdminReportGenerations,
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FilePlus2, Loader2, Sparkles } from "lucide-react";

export function ReportGenerationCredits({ orgId }: { orgId: number }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [exerciseId, setExerciseId] = useState<string>("");
  const [generations, setGenerations] = useState("1");
  const { data: quotas = [], isLoading } = useGetAdminReportGenerationQuotas(orgId, {
    query: { enabled: Number.isFinite(orgId) && orgId > 0, queryKey: getGetAdminReportGenerationQuotasQueryKey(orgId) },
  });
  const grant = useGrantAdminReportGenerations();

  useEffect(() => {
    if (exerciseId || quotas.length === 0) return;
    const activeExercise = quotas.find((quota) => quota.exerciseStatus === "active") ?? quotas[0];
    setExerciseId(String(activeExercise.exerciseId));
  }, [exerciseId, quotas]);

  const selectedQuota = useMemo(
    () => quotas.find((quota) => quota.exerciseId === Number(exerciseId)),
    [exerciseId, quotas],
  );

  const requestedGenerations = Number(generations);
  const isValidAmount = Number.isInteger(requestedGenerations) && requestedGenerations >= 1 && requestedGenerations <= 1000;

  function handleGrant(event: React.FormEvent) {
    event.preventDefault();
    if (!exerciseId || !isValidAmount) return;

    grant.mutate(
      { id: orgId, data: { exerciseId: Number(exerciseId), generations: requestedGenerations } },
      {
        onSuccess: (quota) => {
          toast({
            title: `${requestedGenerations} génération${requestedGenerations > 1 ? "s" : ""} ajoutée${requestedGenerations > 1 ? "s" : ""}`,
            description: `Le quota de l'exercice ${quota.exerciseYear} est maintenant de ${quota.maxGenerations} générations.`,
          });
          setGenerations("1");
          queryClient.invalidateQueries({ queryKey: getGetAdminReportGenerationQuotasQueryKey(orgId) });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Ajout impossible",
            description: "Vérifiez le nombre de générations puis réessayez.",
          });
        },
      },
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="bg-muted/20 border-b border-border/50">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Générations de rapports RSE</CardTitle>
            <CardDescription className="mt-1">
              Accordez un crédit supplémentaire à un exercice, sans modifier les rapports déjà archivés.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement des quotas…
          </div>
        ) : quotas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun exercice n’est encore disponible pour cette organisation.
          </p>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quota de l’exercice</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {selectedQuota?.usedGenerations ?? 0}
                    <span className="mx-1 text-muted-foreground">/</span>
                    {selectedQuota?.maxGenerations ?? 0}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-muted-foreground">Crédits ajoutés</p>
                  <p className="font-semibold text-primary">+{selectedQuota?.additionalGenerations ?? 0}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleGrant} className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_180px_auto] md:items-end">
              <div className="space-y-2">
                <Label htmlFor="rse-credit-exercise">Exercice</Label>
                <Select value={exerciseId} onValueChange={setExerciseId}>
                  <SelectTrigger id="rse-credit-exercise">
                    <SelectValue placeholder="Sélectionner un exercice" />
                  </SelectTrigger>
                  <SelectContent>
                    {quotas.map((quota) => (
                      <SelectItem key={quota.exerciseId} value={String(quota.exerciseId)}>
                        {quota.exerciseYear} — {quota.exerciseStatus === "active" ? "actif" : "clôturé"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rse-credit-amount">Générations à ajouter</Label>
                <Input
                  id="rse-credit-amount"
                  type="number"
                  min={1}
                  max={1000}
                  step={1}
                  value={generations}
                  onChange={(event) => setGenerations(event.target.value)}
                />
              </div>
              <Button type="submit" disabled={!exerciseId || !isValidAmount || grant.isPending}>
                {grant.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FilePlus2 className="mr-2 h-4 w-4" />}
                Ajouter
              </Button>
            </form>
            <p className="text-xs text-muted-foreground">
              Les crédits sont cumulés pour l’exercice choisi. Ils augmentent uniquement la limite de génération et ne remettent pas le compteur utilisé à zéro.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}