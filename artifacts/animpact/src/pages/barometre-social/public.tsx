import { useMemo, useState } from "react";
import { useParams } from "wouter";
import {
  useGetPublicBarometreQuestionnaire,
  useSubmitPublicBarometreResponse,
  getGetPublicBarometreQuestionnaireQueryKey,
} from "@workspace/api-client-react";
import { BAROMETRE_SCALE_LABELS } from "@workspace/rse-referentials";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2 } from "lucide-react";

type Answers = Record<string, { scaleValue?: number | null; freeText?: string | null }>;

export function BarometreSocialPublic() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [respondentLabel, setRespondentLabel] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, error } = useGetPublicBarometreQuestionnaire(token ?? "", {
    query: { enabled: !!token, queryKey: getGetPublicBarometreQuestionnaireQueryKey(token ?? "") },
  });

  const { mutate: submit, isPending } = useSubmitPublicBarometreResponse({
    mutation: { onSuccess: () => setSubmitted(true) },
  });

  const questions = data?.questions ?? [];
  const current = questions[step];
  const progressPct = questions.length ? ((step + 1) / questions.length) * 100 : 0;

  const setAnswer = (code: string, value: Answers[string]) => {
    setAnswers((prev) => ({ ...prev, [code]: { ...prev[code], ...value } }));
  };

  const canProceed = useMemo(() => {
    if (!current) return false;
    const a = answers[current.code];
    if (current.type === "scale") return !!a?.scaleValue;
    return true;
  }, [answers, current]);

  const handleSubmit = (completed: boolean) => {
    if (!token) return;
    submit({
      token,
      data: {
        respondentLabel: respondentLabel.trim() || null,
        completed,
        answers: questions.map((q) => ({
          questionCode: q.code,
          scaleValue: answers[q.code]?.scaleValue ?? null,
          freeText: answers[q.code]?.freeText ?? null,
        })),
      },
    });
  };

  if (isLoading) {
    return (
      <PublicShell>
        <Skeleton className="h-8 w-2/3 mb-4" />
        <Skeleton className="h-40 w-full" />
      </PublicShell>
    );
  }

  if (error || !data) {
    return (
      <PublicShell>
        <p className="text-sm text-muted-foreground">
          Ce lien de campagne est invalide ou la campagne n'est plus ouverte aux réponses.
        </p>
      </PublicShell>
    );
  }

  if (submitted) {
    return (
      <PublicShell>
        <div className="flex flex-col items-center text-center gap-3 py-8">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          <h2 className="text-lg font-semibold text-foreground">Merci pour votre réponse !</h2>
          <p className="text-sm text-muted-foreground">Votre contribution a bien été enregistrée.</p>
        </div>
      </PublicShell>
    );
  }

  if (step === -1 || questions.length === 0) {
    return (
      <PublicShell>
        <p className="text-sm text-muted-foreground">Ce questionnaire ne contient aucune question.</p>
      </PublicShell>
    );
  }

  const isFirst = step === 0;
  const isLast = step === questions.length - 1;

  return (
    <PublicShell title={data.campaignName}>
      {isFirst && data.mode === "identified" && (
        <div className="mb-6 space-y-1.5">
          <Label htmlFor="respondent-label">Votre nom (facultatif)</Label>
          <Input id="respondent-label" value={respondentLabel} onChange={(e) => setRespondentLabel(e.target.value)} />
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>Question {step + 1} sur {questions.length}</span>
          <span>{current.theme}</span>
        </div>
        <Progress value={progressPct} className="h-1.5" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base leading-relaxed">{current.text}</CardTitle>
        </CardHeader>
        <CardContent>
          {current.type === "scale" ? (
            <div className="grid grid-cols-1 gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAnswer(current.code, { scaleValue: v })}
                  className={`text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                    answers[current.code]?.scaleValue === v
                      ? "border-primary bg-primary/10 font-medium text-primary"
                      : "border-input hover:bg-muted/50"
                  }`}
                >
                  {BAROMETRE_SCALE_LABELS[v]}
                </button>
              ))}
            </div>
          ) : (
            <Textarea
              rows={5}
              placeholder="Votre réponse (facultative)…"
              value={answers[current.code]?.freeText ?? ""}
              onChange={(e) => setAnswer(current.code, { freeText: e.target.value })}
            />
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mt-6">
        <Button variant="outline" disabled={isFirst} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          Précédent
        </Button>
        {isLast ? (
          <Button disabled={!canProceed || isPending} onClick={() => handleSubmit(true)}>
            Envoyer mes réponses
          </Button>
        ) : (
          <Button disabled={!canProceed} onClick={() => setStep((s) => Math.min(questions.length - 1, s + 1))}>
            Suivant
          </Button>
        )}
      </div>
    </PublicShell>
  );
}

function PublicShell({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-muted/30 flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center mb-6">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Cocci" className="h-8 w-auto" />
        </div>
        {title && <h1 className="text-lg font-semibold text-foreground mb-4 text-center">{title}</h1>}
        {children}
      </div>
    </div>
  );
}
