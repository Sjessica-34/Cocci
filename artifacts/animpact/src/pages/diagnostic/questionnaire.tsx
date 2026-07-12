import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import {
  useGetDiagnosticResponses,
  useUpsertDiagnosticResponses,
  getGetDiagnosticResponsesQueryKey,
  getGetDiagnosticScoresQueryKey,
  useListDocuments,
  useDeleteDocument,
  getListDocumentsQueryKey,
} from "@workspace/api-client-react";
import type { DiagnosticResponse, DocumentMeta } from "@workspace/api-client-react";
import {
  getSubcategoryById,
  getCategoryById,
} from "@workspace/rse-referentials";
import {
  ArrowLeft, Save, Loader2, CheckCircle2, AlertCircle, ChevronRight,
  Upload, FileText, Trash2, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// ── Constantes niveaux ─────────────────────────────────────────────────────
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

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

// ── Upload compact de preuves pour une sous-catégorie ─────────────────────
function ProofsUploader({ orgId, subcategoryId }: { orgId: number; subcategoryId: string }) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const docCategory = `diagnostic-rse/${subcategoryId}`;

  const { data: allDocs = [] } = useListDocuments(orgId, {
    query: { enabled: !!orgId, queryKey: getListDocumentsQueryKey(orgId) },
  });
  const docs = (allDocs as DocumentMeta[]).filter((d) => d.category === docCategory);

  const { mutate: deleteDoc, isPending: deleting } = useDeleteDocument({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey(orgId) }) },
  });

  const handleUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { setUploadError("Fichier trop volumineux (max 10 Mo)."); return; }
    setUploadError(null);
    setUploading(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", docCategory);
      const res = await fetch(`/api/organizations/${orgId}/documents`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey(orgId) });
    } catch {
      setUploadError("Erreur lors de l'upload. Réessayez.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDownload = async (doc: DocumentMeta) => {
    const token = await getToken();
    const res = await fetch(`/api/organizations/${orgId}/documents/${doc.id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = doc.originalName; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-border bg-muted/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/10">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium text-foreground">Preuves & documents</span>
          {docs.length > 0 && (
            <span className="text-xs text-muted-foreground">({docs.length})</span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 text-xs"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          Importer
        </Button>
      </div>

      <div className="p-4">
        {uploadError && (
          <p className="text-xs text-destructive flex items-center gap-1 mb-3">
            <AlertCircle className="h-3 w-3" />{uploadError}
          </p>
        )}
        {docs.length === 0 ? (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full flex flex-col items-center gap-1.5 rounded-lg border-2 border-dashed border-border py-4 text-muted-foreground hover:border-primary/40 hover:text-primary/60 transition-colors"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            <span className="text-xs">Ajoutez vos preuves (PDF, Word, image…)</span>
          </button>
        ) : (
          <div className="space-y-1.5">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-background border border-border">
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{doc.originalName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatSize(doc.size)} · {new Date(doc.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleDownload(doc)} title="Télécharger">
                  <Download className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteDoc({ orgId, docId: doc.id })} disabled={deleting} title="Supprimer">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary/60 transition-colors"
            >
              <Upload className="h-3 w-3" />Ajouter un document
            </button>
          </div>
        )}
      </div>

      <input ref={inputRef} type="file" className="sr-only"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.png,.jpg,.jpeg"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
      />
    </div>
  );
}

// ── Carte question ─────────────────────────────────────────────────────────
function QuestionCard({
  index,
  question,
  level,
  comment,
  onLevelChange,
  onCommentChange,
}: {
  index: number;
  question: { id: string; question: string; levels: [string, string, string, string] };
  level: number | null;
  comment: string;
  onLevelChange: (level: number) => void;
  onCommentChange: (comment: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      {/* Numéro + question */}
      <div className="flex gap-3">
        <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-muted text-xs font-semibold text-muted-foreground">
          {index}
        </span>
        <p className="text-sm font-medium text-foreground leading-relaxed">{question.question}</p>
      </div>

      {/* Niveaux de maturité */}
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
              <span className={cn(
                "flex-shrink-0 mt-0.5 inline-flex items-center justify-center h-5 w-5 rounded-full border text-xs font-bold",
                level === lvl ? LEVEL_COLORS[lvl] : "border-muted-foreground/30 text-muted-foreground",
              )}>
                {lvl}
              </span>
              <div>
                <p className={cn("text-xs font-semibold", level === lvl ? "text-foreground" : "text-muted-foreground")}>
                  {LEVEL_LABELS[lvl]}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Bloc "Comment utilisez-vous les résultats ?" */}
      <div className="pl-9 space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Comment utilisez-vous les résultats ?
        </label>
        <textarea
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder="Décrivez comment vous exploitez ou allez exploiter ce résultat dans votre démarche RSE…"
          rows={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
        />
      </div>
    </div>
  );
}

// ── Page questionnaire ─────────────────────────────────────────────────────
export function DiagnosticQuestionnaire() {
  const params = useParams<{ categoryId: string; subcategoryId: string }>();
  const [, navigate] = useLocation();
  const { currentOrgId } = useCurrentOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const subcategory = getSubcategoryById(params.subcategoryId ?? "");
  const category = getCategoryById(params.categoryId ?? "");

  const [answers, setAnswers] = useState<Map<string, number>>(new Map());
  const [comments, setComments] = useState<Map<string, string>>(new Map());
  const [isDirty, setIsDirty] = useState(false);

  const orgId = currentOrgId ?? 0;

  const { data: existing, isLoading: loadingResponses } = useGetDiagnosticResponses(
    orgId,
    { query: { enabled: !!currentOrgId, queryKey: getGetDiagnosticResponsesQueryKey(orgId) } },
  );

  // Initialise depuis le serveur
  useEffect(() => {
    if (!existing || !subcategory) return;
    const aMap = new Map<string, number>();
    const cMap = new Map<string, string>();
    for (const r of existing as DiagnosticResponse[]) {
      if (subcategory.questions.some((q) => q.id === r.questionId)) {
        aMap.set(r.questionId, r.level);
        if (r.comment) cMap.set(r.questionId, r.comment);
      }
    }
    setAnswers(aMap);
    setComments(cMap);
    setIsDirty(false);
  }, [existing, subcategory?.id]);

  const mutation = useUpsertDiagnosticResponses();

  function handleLevelChange(questionId: string, level: number) {
    setAnswers((prev) => { const n = new Map(prev); n.set(questionId, level); return n; });
    setIsDirty(true);
  }

  function handleCommentChange(questionId: string, comment: string) {
    setComments((prev) => { const n = new Map(prev); n.set(questionId, comment); return n; });
    setIsDirty(true);
  }

  async function handleSave() {
    if (!currentOrgId || !subcategory) return;
    // Inclure toutes les questions qui ont une réponse ou un commentaire
    const questionIds = new Set([...answers.keys(), ...comments.keys()]);
    const responses = Array.from(questionIds)
      .filter((id) => answers.has(id)) // niveau obligatoire
      .map((questionId) => ({
        questionId,
        level: answers.get(questionId)!,
        comment: comments.get(questionId) ?? null,
      }));
    if (responses.length === 0) return;

    try {
      await mutation.mutateAsync({ orgId: currentOrgId, data: { responses } });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetDiagnosticResponsesQueryKey(orgId) }),
        queryClient.invalidateQueries({ queryKey: getGetDiagnosticScoresQueryKey(orgId) }),
      ]);
      setIsDirty(false);
      toast({ title: "Réponses enregistrées", description: `${responses.length} réponses sauvegardées.` });
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
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

        {/* Bouton retour prominent */}
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/diagnostic")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au Diagnostic RSE
          </Button>
        </div>

        {/* Fil d'Ariane */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
          <span>Diagnostic RSE</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span>{category.label}</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{subcategory.label}</span>
        </div>

        {/* En-tête + bouton Enregistrer */}
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

        {/* Barre de progression */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progression</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Upload preuves (au niveau de la sous-catégorie) */}
        {currentOrgId && (
          <ProofsUploader orgId={currentOrgId} subcategoryId={subcategory.id} />
        )}

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
                comment={comments.get(q.id) ?? ""}
                onLevelChange={(lvl) => handleLevelChange(q.id, lvl)}
                onCommentChange={(c) => handleCommentChange(q.id, c)}
              />
            ))}
          </div>
        )}

        {/* Barre de sauvegarde sticky */}
        {isDirty && (
          <div className="sticky bottom-4 flex justify-center">
            <div className="flex items-center gap-3 rounded-full border border-border bg-card px-5 py-2.5 shadow-lg">
              <span className="text-sm text-muted-foreground">Modifications non sauvegardées</span>
              <Button size="sm" onClick={handleSave} disabled={mutation.isPending}>
                {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Enregistrer
              </Button>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
