import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import {
  useListEchangesFeedback,
  useListEchangesRatings,
  useCreateEchangesFeedback,
  useCreateEchangesRating,
  getEchangesFeedbackQueryKey,
  getEchangesRatingsQueryKey,
} from "@workspace/api-client-react";
import type { CocciFeedback, CocciRating } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useStorageUpload } from "@/hooks/useStorageUpload";
import {
  MessageSquare,
  Star,
  Send,
  Paperclip,
  CheckCircle2,
  Upload,
  Loader2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

const REQUEST_TYPES = [
  { value: "suggestion", label: "Suggestion d'amélioration" },
  { value: "bug", label: "Signaler un problème" },
  { value: "evolution", label: "Demande d'évolution" },
  { value: "question", label: "Question" },
  { value: "other", label: "Autre" },
];

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  nouveau: { label: "Nouveau", class: "bg-blue-50 text-blue-700 border-blue-200" },
  en_cours: { label: "En cours", class: "bg-amber-50 text-amber-700 border-amber-200" },
  traite: { label: "Traité", class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  ferme: { label: "Fermé", class: "bg-zinc-100 text-zinc-600 border-zinc-200" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getTypeLabel(type: string) {
  return REQUEST_TYPES.find((t) => t.value === type)?.label ?? type;
}

// ─── Star picker ─────────────────────────────────────────────────────────────

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none transition-transform hover:scale-110"
        >
          <Star
            className={cn(
              "h-8 w-8 transition-colors",
              n <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30",
            )}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Feedback list item ───────────────────────────────────────────────────────

function FeedbackItem({ item }: { item: CocciFeedback }) {
  const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG["nouveau"];
  return (
    <div className="border border-border/50 rounded-xl p-4 bg-white dark:bg-card hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-sm font-semibold text-foreground truncate">{item.subject}</p>
            <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5 py-0 font-medium shrink-0", statusCfg.class)}>
              {statusCfg.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            {getTypeLabel(item.requestType)} · {formatDate(item.createdAt)}
          </p>
          <p className="text-sm text-foreground/80 line-clamp-2">{item.message}</p>
          {item.wantsCallback && (
            <p className="text-xs text-primary mt-1.5 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Vous avez demandé à être recontacté
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Rating item ─────────────────────────────────────────────────────────────

function RatingItem({ item }: { item: CocciRating }) {
  return (
    <div className="border border-border/50 rounded-xl p-4 bg-white dark:bg-card">
      <div className="flex items-center gap-1 mb-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={cn(
              "h-4 w-4",
              n <= item.stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20",
            )}
          />
        ))}
        <span className="ml-2 text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
      </div>
      {item.comment && (
        <p className="text-sm text-foreground/80">{item.comment}</p>
      )}
    </div>
  );
}

// ─── Tab: Nous écrire ─────────────────────────────────────────────────────────

function TabNousEcrire({ orgId }: { orgId: number }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [sent, setSent] = useState(false);

  const [form, setForm] = useState({
    subject: "",
    requestType: "",
    message: "",
    attachmentUrl: "",
    wantsCallback: false,
  });

  const { data: feedbacks, isLoading } = useListEchangesFeedback(orgId);
  const createFeedback = useCreateEchangesFeedback();

  const { uploadFile, isUploading, progress } = useStorageUpload({
    onSuccess: (res) => {
      setForm((f) => ({ ...f, attachmentUrl: res.fileUrl }));
      toast({ title: "Fichier joint." });
    },
    onError: () => toast({ title: "Échec de l'upload.", variant: "destructive" }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.subject.trim() || !form.requestType || !form.message.trim()) return;

    createFeedback.mutate(
      {
        organizationId: orgId,
        subject: form.subject.trim(),
        requestType: form.requestType,
        message: form.message.trim(),
        attachmentUrl: form.attachmentUrl || null,
        wantsCallback: form.wantsCallback,
      },
      {
        onSuccess: () => {
          setSent(true);
          setForm({ subject: "", requestType: "", message: "", attachmentUrl: "", wantsCallback: false });
          qc.invalidateQueries({ queryKey: getEchangesFeedbackQueryKey(orgId) });
        },
        onError: () => toast({ title: "Erreur lors de l'envoi.", variant: "destructive" }),
      },
    );
  }

  return (
    <div className="space-y-8">
      {/* Form */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Envoyer un message à l'équipe Cocci
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
              <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Message envoyé !</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Notre équipe vous répondra dans les meilleurs délais.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSent(false)}>
                Envoyer un autre message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="subject">
                  Objet <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="subject"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Ex : Problème sur la page bilan carbone"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  Type de demande <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.requestType}
                  onValueChange={(v) => setForm((f) => ({ ...f, requestType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner…" />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUEST_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message">
                  Message <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="message"
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Décrivez votre demande en détail…"
                  rows={5}
                  required
                />
              </div>

              {/* Pièce jointe */}
              <div className="space-y-1.5">
                <Label>Pièce jointe <span className="text-muted-foreground text-xs font-normal">(optionnelle)</span></Label>
                <div className="flex gap-2 items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 relative overflow-hidden"
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                    {isUploading ? `${progress}%` : form.attachmentUrl ? "Changer le fichier" : "Joindre un fichier"}
                    <input
                      type="file"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadFile(f);
                      }}
                      disabled={isUploading}
                    />
                  </Button>
                  {form.attachmentUrl && !isUploading && (
                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Fichier joint
                    </span>
                  )}
                </div>
                {isUploading && (
                  <div className="h-1.5 w-full max-w-xs bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Rappel */}
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="wantsCallback"
                  checked={form.wantsCallback}
                  onChange={(e) => setForm((f) => ({ ...f, wantsCallback: e.target.checked }))}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <Label htmlFor="wantsCallback" className="cursor-pointer text-sm font-normal">
                  Je souhaite être recontacté
                </Label>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  disabled={
                    createFeedback.isPending ||
                    isUploading ||
                    !form.subject.trim() ||
                    !form.requestType ||
                    !form.message.trim()
                  }
                  className="gap-2"
                >
                  {createFeedback.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Envoyer
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Mes demandes précédentes
        </h3>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : !feedbacks || feedbacks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 border-2 border-dashed border-border/50 rounded-xl">
            Aucune demande envoyée pour l'instant.
          </p>
        ) : (
          <div className="space-y-3">
            {feedbacks.map((f) => (
              <FeedbackItem key={f.id} item={f} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Évaluer Cocci ───────────────────────────────────────────────────────

function TabEvaluerCocci({ orgId }: { orgId: number }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [sent, setSent] = useState(false);

  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");

  const { data: ratings, isLoading } = useListEchangesRatings(orgId);
  const createRating = useCreateEchangesRating();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (stars < 1) return;

    createRating.mutate(
      {
        organizationId: orgId,
        stars,
        comment: comment.trim() || null,
      },
      {
        onSuccess: () => {
          setSent(true);
          setStars(0);
          setComment("");
          qc.invalidateQueries({ queryKey: getEchangesRatingsQueryKey(orgId) });
        },
        onError: () => toast({ title: "Erreur lors de l'envoi.", variant: "destructive" }),
      },
    );
  }

  return (
    <div className="space-y-8">
      {/* Form */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            Donnez votre avis sur Cocci
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
              <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center">
                <Star className="h-7 w-7 fill-amber-400 text-amber-400" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Merci pour votre avis !</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Votre retour nous aide à améliorer la plateforme.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSent(false)}>
                Laisser un autre avis
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label>Note <span className="text-destructive">*</span></Label>
                <StarPicker value={stars} onChange={setStars} />
                {stars > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {stars === 1 && "Très insatisfait"}
                    {stars === 2 && "Insatisfait"}
                    {stars === 3 && "Correct"}
                    {stars === 4 && "Satisfait"}
                    {stars === 5 && "Très satisfait"}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="comment">
                  Commentaire <span className="text-muted-foreground text-xs font-normal">(facultatif)</span>
                </Label>
                <Textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Partagez votre expérience, vos suggestions…"
                  rows={4}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={createRating.isPending || stars < 1}
                  className="gap-2"
                >
                  {createRating.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Envoyer mon avis
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Mes avis précédents
        </h3>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : !ratings || ratings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 border-2 border-dashed border-border/50 rounded-xl">
            Vous n'avez pas encore laissé d'avis.
          </p>
        ) : (
          <div className="space-y-3">
            {ratings.map((r) => (
              <RatingItem key={r.id} item={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function EchangesCocci() {
  const [tab, setTab] = useState<"ecrire" | "evaluer">("ecrire");
  const { currentOrgId } = useCurrentOrganization();

  if (!currentOrgId) return null;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Échanges avec Cocci
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Communiquez avec notre équipe : posez une question, signalez un problème ou partagez votre avis.
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border gap-1">
          <button
            onClick={() => setTab("ecrire")}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
              tab === "ecrire"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Nous écrire
          </button>
          <button
            onClick={() => setTab("evaluer")}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5",
              tab === "evaluer"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Star className="h-3.5 w-3.5" />
            Évaluer Cocci
          </button>
        </div>

        {/* Tab content */}
        <div className="max-w-2xl">
          {tab === "ecrire" ? (
            <TabNousEcrire orgId={currentOrgId} />
          ) : (
            <TabEvaluerCocci orgId={currentOrgId} />
          )}
        </div>
      </div>
    </AppLayout>
  );
}
