import { useState } from "react";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { useListDocuments, useDeleteDocument, getListDocumentsQueryKey } from "@workspace/api-client-react";
import type { DocumentMeta } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderOpen, Upload, FileText, Trash2, Download, Loader2, AlertCircle,
  ChevronDown, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/components/DocumentUploader";
import { useRef } from "react";

const ORDERED_CATEGORIES = [
  "parties-prenantes",
  "materialite",
  "bilan-carbone",
  "biodiversite",
  "demarche-rse",
  "numerique-responsable",
  "autre",
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

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
      <button
        className="w-full flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/5 hover:bg-muted/10 transition-colors"
        onClick={() => setOpen((v) => !v)}
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
      </button>

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

export function MesDocuments() {
  const { currentOrgId } = useCurrentOrganization();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);
      const res = await fetch(`/api/organizations/${currentOrgId}/documents`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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
    const res = await fetch(`/api/organizations/${currentOrgId}/documents/${doc.id}/download`, {
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

  const docsByCategory = ORDERED_CATEGORIES.reduce<Record<string, DocumentMeta[]>>((acc, cat) => {
    acc[cat] = (docs as DocumentMeta[]).filter((d) => d.category === cat);
    return acc;
  }, {});

  const totalDocs = (docs as DocumentMeta[]).length;

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

        {!isLoading && !!currentOrgId && (
          <div className="space-y-4">
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
