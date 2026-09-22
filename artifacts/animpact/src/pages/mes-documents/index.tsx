import { useState, useRef } from "react";
import { Link } from "wouter";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { getCurrentExerciseId } from "@/hooks/useCurrentExercise";
import { useListDocuments, useDeleteDocument, useListLabels, getListDocumentsQueryKey, getListLabelsQueryKey } from "@workspace/api-client-react";
import type { DocumentMeta, Label } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderOpen, Upload, FileText, Trash2, Download, Loader2, AlertCircle,
  ChevronDown, ChevronRight, Award, ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/apiUrl";
import { CATEGORY_LABELS, isDiagnosticCategory, isDocumentsClesCategory, isNumeriqueResponsableCategory, getDocumentsClesSlug, getDiagnosticSubcategoryId } from "@/components/DocumentUploader";
import { getDocumentsClesLabel } from "@/pages/diagnostic/TabDocumentsCles";
import { DIAGNOSTIC_CATEGORIES } from "@workspace/rse-referentials";

const ORDERED_CATEGORIES = [
  "parties-prenantes",
  "materialite",
  "bilan-carbone",
  "biodiversite",
  "achats-responsables",
  "demarche-rse",
  "numerique-responsable",
  "mes-actions",
  "capital-humain",
  "mes-labels",
  "rapport-rse",
  "autre",
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

// ── Encart Labels ──────────────────────────────────────────────────────────
function LabelsEncart({ labels, orgId }: { labels: Label[]; orgId: number }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-amber-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2.5">
          <Award className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-sm font-semibold text-foreground">Mes labels</span>
          <span className="text-xs text-muted-foreground">
            ({labels.length} label{labels.length !== 1 ? "s" : ""})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/mes-labels">
            <span
              className="text-xs text-amber-700 underline underline-offset-2 hover:text-amber-900 mr-2"
              onClick={(e) => e.stopPropagation()}
            >
              Gérer mes labels
            </span>
          </Link>
          {open
            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-4 border-t border-amber-200">
          {labels.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">Aucun label enregistré.</p>
              <Link href="/mes-labels">
                <span className="text-sm text-amber-700 underline underline-offset-2 hover:text-amber-900 cursor-pointer">
                  Ajouter un label
                </span>
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 pt-4">
              {labels.map((label) => (
                <div
                  key={label.id}
                  className="flex items-center gap-2 bg-white border border-amber-200 rounded-lg px-3 py-2 shadow-sm"
                >
                  {label.logoUrl ? (
                    <img src={label.logoUrl} alt={label.name ? `Logo du label ${label.name}` : ""} className="h-7 w-7 rounded object-contain border bg-white p-0.5" />
                  ) : (
                    <div className="h-7 w-7 rounded bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
                      {label.name ? label.name.charAt(0) : <Award className="h-4 w-4" />}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight truncate max-w-[140px]">{label.name ?? "Sans nom"}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {label.holder && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{label.holder}</span>}
                      {label.year && <span className="text-[10px] bg-amber-100 text-amber-700 px-1 rounded">{label.year}</span>}
                      {label.score && <span className="text-[10px] bg-slate-100 text-slate-700 px-1 rounded">{label.score}</span>}
                      {label.documentIds.length > 0 && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <FileText className="h-2.5 w-2.5" />
                          {label.documentIds.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Section catégorie standard ─────────────────────────────────────────────
function CategorySection({
  category,
  docs,
  orgId,
  onDelete,
  onDownload,
  onUpload,
  uploading,
  uploadingCategory,
}: {
  category: string;
  docs: DocumentMeta[];
  orgId: number;
  onDelete: (docId: number) => void;
  onDownload: (doc: DocumentMeta) => void;
  onUpload: (file: File, category: string) => void;
  uploading: boolean;
  uploadingCategory: string | null;
}) {
  const [open, setOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const isUploading = uploading && uploadingCategory === category;

  return (
    <div className="rounded-xl border border-border bg-white dark:bg-muted/10 overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/5 hover:bg-muted/10 transition-colors"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((v) => !v);
          }
        }}
      >
        <div className="flex items-center gap-2.5">
          <FolderOpen className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold text-foreground">
            {CATEGORY_LABELS[category] ?? category}
          </span>
          <span className="text-xs text-muted-foreground">
            ({docs.length} fichier{docs.length !== 1 ? "s" : ""})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 h-7 text-xs"
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            disabled={isUploading}
          >
            {isUploading
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Upload className="h-3 w-3" />}
            Importer
          </Button>
          {open
            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {open && (
        <div className="p-5">
          {docs.length === 0 ? (
            <button
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              className="w-full flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border py-6 text-muted-foreground hover:border-emerald-400 hover:text-emerald-600 transition-colors"
            >
              {isUploading
                ? <Loader2 className="h-5 w-5 animate-spin" />
                : <Upload className="h-5 w-5" />}
              <span className="text-xs font-medium">
                {isUploading ? "Upload en cours…" : "Aucun document — cliquez pour importer"}
              </span>
            </button>
          ) : (
            <div className="divide-y divide-border">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.originalName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatSize(doc.size)} · {new Date(doc.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onDownload(doc)}
                      title="Télécharger"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => onDelete(doc.id)}
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.png,.jpg,.jpeg"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file, category);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
    </div>
  );
}

// ── Section Diagnostic RSE (groupée par sous-catégorie) ───────────────────
function SubcategoryDocRow({
  doc,
  onDelete,
  onDownload,
}: {
  doc: DocumentMeta;
  onDelete: (docId: number) => void;
  onDownload: (doc: DocumentMeta) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{doc.originalName}</p>
        <p className="text-[10px] text-muted-foreground">
          {formatSize(doc.size)} · {new Date(doc.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      </div>
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onDownload(doc)} title="Télécharger">
        <Download className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => onDelete(doc.id)} title="Supprimer">
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

function DiagnosticRseSection({
  docs,
  docsCles,
  orgId,
  onDelete,
  onDownload,
  onUpload,
  uploading,
  uploadingCategory,
}: {
  docs: DocumentMeta[];
  docsCles: DocumentMeta[];
  orgId: number;
  onDelete: (docId: number) => void;
  onDownload: (doc: DocumentMeta) => void;
  onUpload: (file: File, category: string) => void;
  uploading: boolean;
  uploadingCategory: string | null;
}) {
  const [open, setOpen] = useState(true);

  const bySubcat: Record<string, DocumentMeta[]> = {};
  for (const doc of docs) {
    const sub = getDiagnosticSubcategoryId(doc.category);
    if (!bySubcat[sub]) bySubcat[sub] = [];
    bySubcat[sub].push(doc);
  }

  const bySlug: Record<string, DocumentMeta[]> = {};
  for (const doc of docsCles) {
    const slug = getDocumentsClesSlug(doc.category);
    if (!bySlug[slug]) bySlug[slug] = [];
    bySlug[slug].push(doc);
  }

  const totalDocs = docs.length + docsCles.length;

  return (
    <div className="rounded-xl border border-border bg-white dark:bg-muted/10 overflow-hidden">
      {/* En-tête */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/5 hover:bg-muted/10 transition-colors"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((v) => !v);
          }
        }}
      >
        <div className="flex items-center gap-2.5">
          <ClipboardList className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold text-foreground">Diagnostic RSE</span>
          <span className="text-xs text-muted-foreground">
            ({totalDocs} fichier{totalDocs !== 1 ? "s" : ""})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/diagnostic">
            <span
              className="text-xs text-primary underline underline-offset-2 hover:text-primary/80 mr-2"
              onClick={(e) => e.stopPropagation()}
            >
              Aller au diagnostic
            </span>
          </Link>
          {open
            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {open && (
        <div className="p-4 space-y-3">
          {totalDocs === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs text-muted-foreground">
                Aucun document importé. Ouvrez le diagnostic pour ajouter des preuves ou des documents clés.
              </p>
              <Link href="/diagnostic">
                <span className="text-xs text-primary underline underline-offset-2 hover:text-primary/80 cursor-pointer mt-1 inline-block">
                  Accéder au diagnostic
                </span>
              </Link>
            </div>
          ) : (
            <>
              {/* Sous-section Documents clés */}
              {docsCles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                    Documents clés
                  </p>
                  {Object.entries(bySlug).map(([slug, slugDocs]) => {
                    const sorted = [...slugDocs].sort(
                      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                    );
                    const active = sorted[0]!;
                    return (
                      <div key={slug} className="rounded-lg border border-border bg-muted/5 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs font-medium text-foreground truncate">
                              {getDocumentsClesLabel(slug)}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              ({slugDocs.length})
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                              {active.originalName}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              onClick={() => onDownload(active)}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => onDelete(active.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Sous-section Preuves questionnaire */}
              {docs.length > 0 && DIAGNOSTIC_CATEGORIES.map((cat) => {
                const subcatsWithDocs = cat.subcategories.filter((s) => bySubcat[s.id]?.length);
                if (subcatsWithDocs.length === 0) return null;
                return (
                  <div key={cat.id} className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                      {cat.label}
                    </p>
                    {subcatsWithDocs.map((sub) => (
                      <SubcatGroup
                        key={sub.id}
                        label={sub.label}
                        subcategoryId={sub.id}
                        docs={bySubcat[sub.id] ?? []}
                        orgId={orgId}
                        onDelete={onDelete}
                        onDownload={onDownload}
                        onUpload={onUpload}
                        uploading={uploading}
                        uploadingCategory={uploadingCategory}
                      />
                    ))}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SubcatGroup({
  label,
  subcategoryId,
  docs,
  orgId,
  onDelete,
  onDownload,
  onUpload,
  uploading,
  uploadingCategory,
}: {
  label: string;
  subcategoryId: string;
  docs: DocumentMeta[];
  orgId: number;
  onDelete: (docId: number) => void;
  onDownload: (doc: DocumentMeta) => void;
  onUpload: (file: File, category: string) => void;
  uploading: boolean;
  uploadingCategory: string | null;
}) {
  const [open, setOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const docCategory = `diagnostic-rse/${subcategoryId}`;
  const isUploading = uploading && uploadingCategory === docCategory;

  return (
    <div className="rounded-lg border border-emerald-100 bg-white overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/5 transition-colors"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((v) => !v);
          }
        }}
      >
        <div className="flex items-center gap-2">
          <FolderOpen className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span className="text-xs font-medium text-foreground">{label}</span>
          <span className="text-[10px] text-muted-foreground">({docs.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 gap-1 text-[10px] px-2"
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Upload className="h-2.5 w-2.5" />}
            Ajouter
          </Button>
          {open
            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </div>
      {open && docs.length > 0 && (
        <div className="px-4 pb-3 border-t border-border/50 divide-y divide-border/50">
          {docs.map((doc) => (
            <SubcategoryDocRow key={doc.id} doc={doc} onDelete={onDelete} onDownload={onDownload} />
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.png,.jpg,.jpeg"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file, docCategory);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────
export function MesDocuments() {
  const { currentOrgId } = useCurrentOrganization();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: labelsData } = useListLabels(currentOrgId ?? 0, { query: { enabled: !!currentOrgId, queryKey: getListLabelsQueryKey(currentOrgId ?? 0) } });
  const labels = labelsData?.items ?? [];

  const { data: docs = [], isLoading } = useListDocuments(currentOrgId ?? 0, {
    query: {
      enabled: !!currentOrgId,
      queryKey: getListDocumentsQueryKey(currentOrgId ?? 0),
    },
  });

  const { mutate: deleteDoc } = useDeleteDocument({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey(currentOrgId ?? 0) });
      },
    },
  });

  const handleUpload = async (file: File, category: string) => {
    if (file.size > 10 * 1024 * 1024) { setError("Fichier trop volumineux (max 10 Mo)."); return; }
    setError(null);
    setUploading(true);
    setUploadingCategory(category);
    try {
      const token = await getToken();
      const exerciseId = getCurrentExerciseId();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);
      const res = await fetch(apiUrl(`/api/organizations/${currentOrgId}/documents`), {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(exerciseId != null ? { "x-exercise-id": String(exerciseId) } : {}),
        },
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey(currentOrgId ?? 0) });
    } catch {
      setError("Erreur lors de l'upload. Réessayez.");
    } finally {
      setUploading(false);
      setUploadingCategory(null);
    }
  };

  const handleDownload = async (doc: DocumentMeta) => {
    const token = await getToken();
    const res = await fetch(apiUrl(`/api/organizations/${currentOrgId}/documents/${doc.id}/download`), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.originalName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = (docId: number) => {
    if (!currentOrgId) return;
    deleteDoc({ orgId: currentOrgId, docId });
  };

  const allDocs = docs as DocumentMeta[];

  // Séparer les documents diagnostic RSE des autres
  const diagnosticDocsCles = allDocs.filter((d) => isDocumentsClesCategory(d.category));
  const diagnosticProofs   = allDocs.filter((d) => isDiagnosticCategory(d.category) && !isDocumentsClesCategory(d.category));
  const regularDocs = allDocs.filter((d) => !isDiagnosticCategory(d.category));

  const docsByCategory = ORDERED_CATEGORIES.reduce<Record<string, DocumentMeta[]>>((acc, cat) => {
    acc[cat] = regularDocs.filter((d) =>
      cat === "numerique-responsable"
        ? isNumeriqueResponsableCategory(d.category)
        : d.category === cat,
    );
    return acc;
  }, {});

  const totalDocs = allDocs.length;

  return (
    <AppLayout>
      <div className="space-y-6 pb-16 max-w-3xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FolderOpen className="h-6 w-6 text-emerald-600" />
              Mes documents
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Centralisez tous vos documents RSE, classés par module.
            </p>
          </div>
          {totalDocs > 0 && (
            <span className="text-xs text-muted-foreground mt-1.5 bg-muted/30 px-2.5 py-1 rounded-full">
              {totalDocs} fichier{totalDocs !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {!currentOrgId && (
          <div className="flex items-center gap-3 p-5 rounded-xl border border-amber-200 bg-amber-50">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">Sélectionnez une organisation dans la barre latérale.</p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {isLoading && currentOrgId && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        )}

        {!!currentOrgId && (
          <LabelsEncart labels={labels} orgId={currentOrgId} />
        )}

        {!isLoading && !!currentOrgId && (
          <div className="space-y-4">
            {/* Section Diagnostic RSE (docs clés + preuves questionnaire) */}
            <DiagnosticRseSection
              docs={diagnosticProofs}
              docsCles={diagnosticDocsCles}
              orgId={currentOrgId}
              onDelete={handleDelete}
              onDownload={handleDownload}
              onUpload={handleUpload}
              uploading={uploading}
              uploadingCategory={uploadingCategory}
            />

            {/* Sections standard */}
            {ORDERED_CATEGORIES.map((cat) => (
              <CategorySection
                key={cat}
                category={cat}
                docs={docsByCategory[cat]}
                orgId={currentOrgId}
                onDelete={handleDelete}
                onDownload={handleDownload}
                onUpload={handleUpload}
                uploading={uploading}
                uploadingCategory={uploadingCategory}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
