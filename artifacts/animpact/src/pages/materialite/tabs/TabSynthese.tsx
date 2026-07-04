import { useState } from "react";
import type { IssueRatedItem, IssueAnalysisResult, SuperIssue } from "@workspace/api-client-react";
import { useGetIssueAnalysis, useAnalyzeIssues } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, RefreshCw, TrendingUp, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CARD_COLORS = [
  "from-teal-50 to-teal-100/60 border-teal-200 dark:from-teal-950/40 dark:to-teal-900/20 dark:border-teal-800",
  "from-violet-50 to-violet-100/60 border-violet-200 dark:from-violet-950/40 dark:to-violet-900/20 dark:border-violet-800",
  "from-amber-50 to-amber-100/60 border-amber-200 dark:from-amber-950/40 dark:to-amber-900/20 dark:border-amber-800",
  "from-emerald-50 to-emerald-100/60 border-emerald-200 dark:from-emerald-950/40 dark:to-emerald-900/20 dark:border-emerald-800",
];
const SCORE_COLORS = [
  "text-teal-700 dark:text-teal-400",
  "text-violet-700 dark:text-violet-400",
  "text-amber-700 dark:text-amber-400",
  "text-emerald-700 dark:text-emerald-400",
];

function SuperIssueCard({ superIssue, idx }: { superIssue: SuperIssue; idx: number }) {
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-5 space-y-3 ${CARD_COLORS[idx % CARD_COLORS.length]}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-bold text-foreground leading-snug">{superIssue.title}</h3>
        <div className="shrink-0 text-right">
          <p className={`text-2xl font-bold ${SCORE_COLORS[idx % SCORE_COLORS.length]}`}>
            {superIssue.avgScore.toFixed(1)}
          </p>
          <p className="text-[10px] text-muted-foreground">/5</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">{superIssue.summary}</p>

      <div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Enjeux composants ({superIssue.issues.length})
        </p>
        <div className="flex flex-wrap gap-1.5">
          {superIssue.issues.map((label) => (
            <span
              key={label}
              className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/70 dark:bg-black/20 border border-border text-[10px] font-medium text-foreground"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

type Props = { orgId: number; items: IssueRatedItem[] };

export function TabSynthese({ orgId, items }: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: analysis, isLoading: loadingAnalysis } = useGetIssueAnalysis(orgId, {
    query: { queryKey: [`/api/organizations/${orgId}/issues/analysis`], retry: false },
  });
  const { mutate: analyze } = useAnalyzeIssues();

  const ratedCount = items.filter((i) => i.stakeholderScore != null && i.companyScore != null).length;

  function handleAnalyze() {
    setIsAnalyzing(true);
    analyze(
      { orgId },
      {
        onSuccess: (result) => {
          qc.setQueryData([`/api/organizations/${orgId}/issues/analysis`], result);
          setIsAnalyzing(false);
        },
        onError: (err: unknown) => {
          setIsAnalyzing(false);
          const msg = err instanceof Error ? err.message : "Erreur lors de l'analyse.";
          toast({ variant: "destructive", title: msg });
        },
      },
    );
  }

  if (loadingAnalysis) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Synthèse stratégique IA</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Analyse de vos {Math.min(12, ratedCount)} enjeux les plus matériels, regroupés en super-enjeux stratégiques.
          </p>
        </div>
        <Button
          onClick={handleAnalyze}
          disabled={isAnalyzing || ratedCount < 4}
          className="shrink-0"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Analyse en cours…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              {analysis ? "Relancer l'analyse" : "Générer la synthèse"}
            </>
          )}
        </Button>
      </div>

      {/* Not enough rated */}
      {ratedCount < 4 && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Pas encore assez d'enjeux notés
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Notez au moins 4 enjeux (idéalement 12) dans la Bibliothèque avant de générer la synthèse.
            </p>
          </div>
        </div>
      )}

      {/* No analysis yet */}
      {!analysis && ratedCount >= 4 && !isAnalyzing && (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed border-border">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Prêt pour l'analyse</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Vous avez noté {ratedCount} enjeux. Cliquez sur "Générer la synthèse" pour que l'IA identifie vos super-enjeux stratégiques.
          </p>
        </div>
      )}

      {/* Analyzing skeleton */}
      {isAnalyzing && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
            <RefreshCw className="h-5 w-5 text-primary animate-spin shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Analyse IA en cours…</p>
              <p className="text-xs text-muted-foreground">L'IA identifie vos thématiques communes et rédige les super-enjeux.</p>
            </div>
          </div>
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      )}

      {/* Results */}
      {analysis && !isAnalyzing && (
        <>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            Générée le{" "}
            {new Date((analysis as IssueAnalysisResult).generatedAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(analysis as IssueAnalysisResult).superIssues.map((si, i) => (
              <SuperIssueCard key={i} superIssue={si} idx={i} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
