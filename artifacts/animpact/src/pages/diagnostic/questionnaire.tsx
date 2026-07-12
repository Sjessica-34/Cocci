import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import {
  useGetDiagnosticResponses,
  useUpsertDiagnosticResponses,
  getGetDiagnosticResponsesQueryKey,
  getGetDiagnosticScoresQueryKey,
} from "@workspace/api-client-react";
import type { DiagnosticResponse } from "@workspace/api-client-react";
import {
  getSubcategoryById,
  getCategoryById,
} from "@workspace/rse-referentials";
import {
  ArrowLeft,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const LEVEL_LABELS = ["Non initié", "Initié", "En cours", "Maîtrisé"] as const;
const LEVEL_COLORS = [
  "border-rose-200 bg-rose-50 text-rose-700",
  "border-amber-200 bg-amber-50 text-amber-700",
  "border-teal-200 bg-teal-50 text-teal-700",
  "border-emerald-200 bg-emerald-50 text-emerald-700",
] as const;

const LEVEL_SELECTED_BG = [
  "bg-rose-100 border-rose-400",
  "bg-amber-100 border-amber-400",
  "bg-teal-100 border-teal-400",
  "bg-emerald-100 border-emerald-400",
] as const;

function QuestionCard({
  index,
  question,
  level,
  onLevelChange,
}: {
  index: number;
  question: { id: string; question: string; levels: [string, string, string, string] };
  level: number | null;
  onLevelChange: (level: number) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex gap-3">
        <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-muted text-xs font-semibold text-muted-foreground">
          {index}
        </span>
        <p className="text-sm font-medium text-foreground leading-relaxed">{question.question}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-9">
        {question.levels.map((desc, lvl) => (
          <button
            key={lvl}
            onClick={() => onLevelChange(lvl)}
            className={cn(
              "text-left rounded-lg border-2 p-3 transition-all",
              level === lvl
                ? LEVEL_SELECTED_BG[lvl]
                : "border-border bg-background hover:border-muted-foreground/30 hover:bg-muted/30",
            )}
          >
            <div className="flex items-start gap-2">
              <span
                className={cn(
                  "flex-shrink-0 mt-0.5 inline-flex items-center justify-center h-5 w-5 rounded-full border text-xs font-bold",
                  level === lvl
                    ? LEVEL_COLORS[lvl]
                    : "border-muted-foreground/30 text-muted-foreground",
                )}
              >
                {lvl}
              </span>
              <div>
                <p
                  className={cn(
                    "text-xs font-semibold",
                    level === lvl ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {LEVEL_LABELS[lvl]}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function DiagnosticQuestionnaire() {
  const params = useParams<{ categoryId: string; subcategoryId: string }>();
  const [, navigate] = useLocation();
  const { currentOrgId } = useCurrentOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const subcategory = getSubcategoryById(params.subcategoryId ?? "");
  const category = getCategoryById(params.categoryId ?? "");

  const [answers, setAnswers] = useState<Map<string, number>>(new Map());
  const [isDirty, setIsDirty] = useState(false);

  const orgId = currentOrgId ?? 0;
  const { data: existing, isLoading: loadingResponses } = useGetDiagnosticResponses(
    orgId,
    { query: { enabled: !!currentOrgId, queryKey: getGetDiagnosticResponsesQueryKey(orgId) } },
  );

  useEffect(() => {
    if (!existing || !subcategory) return;
    const map = new Map<string, number>();
    for (const r of existing as DiagnosticResponse[]) {
      if (subcategory.questions.some((q) => q.id === r.questionId)) {
        map.set(r.questionId, r.level);
      }
    }
    setAnswers(map);
    setIsDirty(false);
  }, [existing, subcategory?.id]);

  const mutation = useUpsertDiagnosticResponses();

  function handleLevelChange(questionId: string, level: number) {
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(questionId, level);
      return next;
    });
    setIsDirty(true);
  }

  async function handleSave() {
    if (!currentOrgId || !subcategory) return;
    const responses = Array.from(answers.entries()).map(([questionId, level]) => ({
      questionId,
      level,
    }));
    if (responses.length === 0) return;

    try {
      await mutation.mutateAsync({ orgId: currentOrgId, data: { responses } });

      // Invalidate both caches so dashboard + responses reload
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetDiagnosticResponsesQueryKey(orgId) }),
        queryClient.invalidateQueries({ queryKey: getGetDiagnosticScoresQueryKey(orgId) }),
      ]);

      setIsDirty(false);
      toast({ title: "Réponses enregistrées", description: `${responses.length} réponses sauvegardées.` });
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les réponses.",
        variant: "destructive",
      });
    }
  }

  if (!subcategory || !category) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto px-4 py-10 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Sous-catégorie introuvable.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/diagnostic")}>
            Retour au diagnostic
          </Button>
        </div>
      </AppLayout>
    );
  }

  const answeredCount = subcategory.questions.filter((q) => answers.has(q.id)).length;
  const progress = Math.round((answeredCount / subcategory.questions.length) * 100);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
          <button
            onClick={() => navigate("/diagnostic")}
            className="hover:text-foreground transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Diagnostic RSE
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span>{category.label}</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{subcategory.label}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">{subcategory.label}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {subcategory.questions.length} questions · {answeredCount} répondues
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={!isDirty || mutation.isPending || answeredCount === 0}
            size="sm"
            className="flex-shrink-0"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : mutation.isSuccess && !isDirty ? (
              <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-400" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Enregistrer
          </Button>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progression</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Questions */}
        {loadingResponses ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {subcategory.questions.map((q, i) => (
              <QuestionCard
                key={q.id}
                index={i + 1}
                question={q}
                level={answers.get(q.id) ?? null}
                onLevelChange={(lvl) => handleLevelChange(q.id, lvl)}
              />
            ))}
          </div>
        )}

        {/* Sticky save bar */}
        {isDirty && (
          <div className="sticky bottom-4 flex justify-center">
            <div className="flex items-center gap-3 rounded-full border border-border bg-card px-5 py-2.5 shadow-lg">
              <span className="text-sm text-muted-foreground">Modifications non sauvegardées</span>
              <Button size="sm" onClick={handleSave} disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Enregistrer
              </Button>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
