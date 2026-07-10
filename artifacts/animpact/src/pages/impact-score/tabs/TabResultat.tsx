import { useState, useEffect } from "react";
import { useGetImpactScoreResult, useUpsertImpactScoreResult } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { DocumentUploader } from "@/components/DocumentUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ExternalLink, Pencil, CheckCircle, CalendarDays, FileText, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const IMPACT_SCORE_URL = "https://www.impactscore.fr/";

interface Props {
  orgId: number;
}

type Step = "question" | "not-done" | "form" | "done";

export function TabResultat({ orgId }: Props) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useGetImpactScoreResult(orgId, {
    query: { enabled: !!orgId, queryKey: ["impact-score-result", orgId] },
  });

  const mutation = useUpsertImpactScoreResult({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["impact-score-result", orgId] });
      },
    },
  });

  const saved = data?.result ?? null;

  // Form state
  const [step,    setStep]    = useState<Step>("question");
  const [score,   setScore]   = useState<string>("");
  const [date,    setDate]    = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [limitationImpactsNegatifs, setLimitationImpactsNegatifs] = useState<string>("");
  const [partageValeurPouvoir, setPartageValeurPouvoir] = useState<string>("");
  const [strategieImpactPositif, setStrategieImpactPositif] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Once we know whether data exists, auto-route
  useEffect(() => {
    if (!isLoading) {
      if (saved && !editing) {
        setStep("done");
      } else if (step === "question" && !saved) {
        setStep("question");
      }
    }
  }, [isLoading, saved, editing]);

  // Pre-fill form on edit
  useEffect(() => {
    if (editing && saved) {
      setScore(String(saved.score));
      setDate(saved.dateRealisation);
      setComment(saved.commentaire ?? "");
      setLimitationImpactsNegatifs(saved.limitationImpactsNegatifs ?? "");
      setPartageValeurPouvoir(saved.partageValeurPouvoir ?? "");
      setStrategieImpactPositif(saved.strategieImpactPositif ?? "");
      setStep("form");
    }
  }, [editing, saved]);

  function handleSave() {
    const parsed = parseInt(score, 10);
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      setError("Le score doit être un entier entre 0 et 100.");
      return;
    }
    if (!date) {
      setError("Veuillez renseigner la date de réalisation.");
      return;
    }
    setError(null);
    mutation.mutate(
      {
        orgId,
        data: {
          score: parsed,
          dateRealisation: date,
          commentaire: comment || null,
          limitationImpactsNegatifs: limitationImpactsNegatifs || null,
          partageValeurPouvoir: partageValeurPouvoir || null,
          strategieImpactPositif: strategieImpactPositif || null,
        },
      },
      {
        onSuccess: () => {
          setEditing(false);
          setStep("done");
        },
        onError: () => setError("Une erreur est survenue. Veuillez réessayer."),
      },
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">

      {/* ── STEP: question ─────────────────────────────────────────────────── */}
      {step === "question" && (
        <QuestionStep
          onYes={() => setStep("form")}
          onNo={() => setStep("not-done")}
        />
      )}

      {/* ── STEP: not done ─────────────────────────────────────────────────── */}
      {step === "not-done" && (
        <div className="rounded-xl border border-border bg-white dark:bg-muted/10 p-6 text-center space-y-4">
          <p className="text-sm text-foreground/80 leading-relaxed">
            Le questionnaire Impact Score se réalise directement sur la plateforme officielle.
            Une fois complété, revenez ici pour enregistrer votre résultat dans Cocci.
          </p>
          <Button asChild className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
            <a href={IMPACT_SCORE_URL} target="_blank" rel="noopener noreferrer">
              Réaliser mon Impact Score
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          <div>
            <button
              type="button"
              onClick={() => setStep("question")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Retour
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: form ─────────────────────────────────────────────────────── */}
      {step === "form" && (
        <div className="rounded-xl border border-border bg-white dark:bg-muted/10 p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Renseigner mon résultat</h3>
            {editing && (
              <button
                type="button"
                onClick={() => { setEditing(false); setStep("done"); }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Annuler
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Score */}
            <div className="space-y-1.5">
              <Label htmlFor="is-score" className="text-xs font-medium">
                Score obtenu <span className="text-muted-foreground font-normal">(sur 100)</span>
              </Label>
              <div className="relative">
                <Input
                  id="is-score"
                  type="number"
                  min={0}
                  max={100}
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  placeholder="ex. 67"
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">/100</span>
              </div>
              {score !== "" && !isNaN(Number(score)) && (
                <ScoreGauge value={Math.min(100, Math.max(0, Number(score)))} />
              )}
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="is-date" className="text-xs font-medium">
                Date de réalisation
              </Label>
              <Input
                id="is-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Comment */}
            <div className="space-y-1.5">
              <Label htmlFor="is-comment" className="text-xs font-medium text-muted-foreground">
                Commentaire <span className="font-normal">(facultatif)</span>
              </Label>
              <Textarea
                id="is-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Notes, contexte, objectifs pour la prochaine évaluation…"
                rows={3}
                className="resize-none text-sm"
              />
            </div>

            {/* Pilier: Limitation des impacts négatifs */}
            <div className="space-y-1.5">
              <Label htmlFor="is-pilier-limitation" className="text-xs font-medium text-muted-foreground">
                Limitation des impacts négatifs <span className="font-normal">(facultatif)</span>
              </Label>
              <Textarea
                id="is-pilier-limitation"
                value={limitationImpactsNegatifs}
                onChange={(e) => setLimitationImpactsNegatifs(e.target.value)}
                placeholder="Actions ou constats liés à la limitation des impacts négatifs…"
                rows={3}
                className="resize-none text-sm"
              />
            </div>

            {/* Pilier: Partage de la valeur et du pouvoir */}
            <div className="space-y-1.5">
              <Label htmlFor="is-pilier-partage" className="text-xs font-medium text-muted-foreground">
                Partage de la valeur et du pouvoir <span className="font-normal">(facultatif)</span>
              </Label>
              <Textarea
                id="is-pilier-partage"
                value={partageValeurPouvoir}
                onChange={(e) => setPartageValeurPouvoir(e.target.value)}
                placeholder="Actions ou constats liés au partage de la valeur et du pouvoir…"
                rows={3}
                className="resize-none text-sm"
              />
            </div>

            {/* Pilier: Stratégie à impact positif */}
            <div className="space-y-1.5">
              <Label htmlFor="is-pilier-strategie" className="text-xs font-medium text-muted-foreground">
                Stratégie à impact positif <span className="font-normal">(facultatif)</span>
              </Label>
              <Textarea
                id="is-pilier-strategie"
                value={strategieImpactPositif}
                onChange={(e) => setStrategieImpactPositif(e.target.value)}
                placeholder="Actions ou constats liés à la stratégie à impact positif…"
                rows={3}
                className="resize-none text-sm"
              />
            </div>

            {/* Doc upload */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Rapport Impact Score <span className="font-normal">(PDF, PNG, JPG)</span>
              </p>
              <DocumentUploader
                orgId={orgId}
                category="impact-score:rapport"
                question="Déposez votre rapport Impact Score"
                compact
              />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <Button
              onClick={handleSave}
              disabled={mutation.isPending}
              className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white"
            >
              {mutation.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…</>
                : <><CheckCircle className="h-4 w-4" /> Enregistrer mon résultat</>
              }
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP: done ─────────────────────────────────────────────────────── */}
      {step === "done" && saved && (
        <div className="space-y-4">
          {/* Score card */}
          <div className="rounded-xl border border-violet-100 dark:border-violet-900 bg-white dark:bg-muted/10 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Mon Impact Score</p>
                <div className="flex items-end gap-2">
                  <span className={cn("text-5xl font-bold", scoreColor(saved.score))}>{saved.score}</span>
                  <span className="text-xl text-muted-foreground mb-1">/100</span>
                </div>
                <p className={cn("text-sm font-semibold mt-1", scoreColor(saved.score))}>{scoreLabel(saved.score)}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8 shrink-0"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3 w-3" />
                Modifier
              </Button>
            </div>

            <ScoreGauge value={saved.score} large />

            <div className="flex items-center gap-1.5 mt-4 text-xs text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Réalisé le{" "}
              {format(new Date(saved.dateRealisation), "d MMMM yyyy", { locale: fr })}
            </div>

            {saved.commentaire && (
              <p className="mt-3 text-xs text-foreground/75 italic border-l-2 border-border pl-3">
                {saved.commentaire}
              </p>
            )}

            {(saved.limitationImpactsNegatifs || saved.partageValeurPouvoir || saved.strategieImpactPositif) && (
              <div className="mt-4 space-y-3">
                {saved.limitationImpactsNegatifs && (
                  <div>
                    <p className="text-xs font-semibold text-foreground/80">Limitation des impacts négatifs</p>
                    <p className="text-xs text-foreground/75 mt-0.5">{saved.limitationImpactsNegatifs}</p>
                  </div>
                )}
                {saved.partageValeurPouvoir && (
                  <div>
                    <p className="text-xs font-semibold text-foreground/80">Partage de la valeur et du pouvoir</p>
                    <p className="text-xs text-foreground/75 mt-0.5">{saved.partageValeurPouvoir}</p>
                  </div>
                )}
                {saved.strategieImpactPositif && (
                  <div>
                    <p className="text-xs font-semibold text-foreground/80">Stratégie à impact positif</p>
                    <p className="text-xs text-foreground/75 mt-0.5">{saved.strategieImpactPositif}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Documents */}
          <div className="rounded-xl border border-border bg-white dark:bg-muted/10 p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold text-foreground">Rapport Impact Score</h4>
            </div>
            <DocumentUploader
              orgId={orgId}
              category="impact-score:rapport"
              question="Déposez votre rapport Impact Score"
              compact
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function QuestionStep({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-white dark:bg-muted/10 p-6 space-y-5">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-violet-50 dark:bg-violet-950/30 mb-3">
          <span className="text-2xl">🎯</span>
        </div>
        <h3 className="text-base font-bold text-foreground">Avez-vous déjà réalisé votre Impact Score&nbsp;?</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Le questionnaire est disponible gratuitement sur la plateforme officielle.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onNo}
          className="flex flex-col items-center gap-2 rounded-xl border-2 border-border hover:border-muted-foreground/40 p-4 transition-colors group"
        >
          <span className="text-2xl">⏳</span>
          <span className="text-sm font-semibold text-foreground">Non, pas encore</span>
          <span className="text-[11px] text-muted-foreground text-center">Je souhaite le réaliser</span>
        </button>
        <button
          type="button"
          onClick={onYes}
          className="flex flex-col items-center gap-2 rounded-xl border-2 border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 hover:border-violet-400 dark:hover:border-violet-600 p-4 transition-colors"
        >
          <span className="text-2xl">✅</span>
          <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">Oui, je l'ai fait</span>
          <span className="text-[11px] text-muted-foreground text-center">Saisir mon résultat</span>
        </button>
      </div>
    </div>
  );
}

function ScoreGauge({ value, large = false }: { value: number; large?: boolean }) {
  const color = value >= 70 ? "#10b981" : value >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className={cn("rounded-full bg-muted overflow-hidden", large ? "h-3 mt-3" : "h-2 mt-2")}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  );
}

function scoreColor(s: number) {
  if (s >= 70) return "text-emerald-600";
  if (s >= 40) return "text-amber-600";
  return "text-red-600";
}

function scoreLabel(s: number) {
  if (s >= 80) return "Excellent";
  if (s >= 60) return "Avancé";
  if (s >= 40) return "En progression";
  if (s >= 20) return "Débutant";
  return "À initier";
}
