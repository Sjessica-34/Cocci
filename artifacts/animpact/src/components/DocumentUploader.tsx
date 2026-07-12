import { useRef, useState } from "react";
import { useAuth } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListDocuments,
  useDeleteDocument,
  getListDocumentsQueryKey,
} from "@workspace/api-client-react";
import type { DocumentMeta } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  Upload, FileText, Trash2, Download, Loader2, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Category labels ─────────────────────────────────────────────────────────
export const CATEGORY_LABELS: Record<string, string> = {
  "parties-prenantes":    "Mes parties prenantes",
  "materialite":          "Matrice de matérialité",
  "bilan-carbone":        "Bilan Carbone®",
  "biodiversite":         "Mes dépendances à la biodiversité",
  "achats-responsables":  "Achats & Fournisseurs Responsables",
  "diagnostic-rse":       "Diagnostic RSE",
  "demarche-rse":         "Ma démarche RSE",
  "numerique-responsable":"Ma démarche Numérique Responsable",
  "mes-actions":          "Mes actions RSE",
  "capital-humain":       "Capital Humain",
  "mes-labels":           "Mes labels & certifications",
  "rapport-rse":          "Mon rapport RSE",
  "autre":                "Autres documents",
};

/** Retourne true si la catégorie est une preuve liée au Diagnostic RSE */
export function isDiagnosticCategory(category: string): boolean {
  return category.startsWith("diagnostic-rse/");
}

/** Extrait l'ID de sous-catégorie d'une catégorie de document diagnostic */
export function getDiagnosticSubcategoryId(category: string): string {
  return category.replace("diagnostic-rse/", "");
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function fileIcon(mimeType: string) {
  return <FileText className="h-4 w-4 text-muted-foreground shrink-0" />;
}

interface Props {
  orgId: number;
  category: string;
  question?: string;
  compact?: boolean;
}

export function DocumentUploader({
  orgId,
  category,
  question = "Avez-vous déjà un document à joindre ?",
  compact = false,
}: Props) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: allDocs = [] } = useListDocuments(orgId, {
    query: {
      enabled: !!orgId,
      queryKey: getListDocumentsQueryKey(orgId),
    },
  });

  const docs = (allDocs as DocumentMeta[]).filter((d) => d.category === category);

  const { mutate: deleteDoc, isPending: deleting } = useDeleteDocument({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey(orgId) });
      },
    },
  });

  const handleUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError("Fichier trop volumineux (max 10 Mo).");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);
      const res = await fetch(`/api/organizations/${orgId}/documents`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey(orgId) });
    } catch (e) {
      setError("Erreur lors de l'upload. Réessayez.");
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
    a.href = url;
    a.download = doc.originalName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn(
      "rounded-xl border border-border bg-white dark:bg-muted/10 overflow-hidden",
      compact && "rounded-lg",
    )}>
      {!compact && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/5">
          <p className="text-sm font-medium text-foreground">{question}</p>
          <UploadButton uploading={uploading} onClick={() => inputRef.current?.click()} />
        </div>
      )}

      <div className={cn("p-5 space-y-3", compact && "p-4")}>
        {compact && (
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">{question}</p>
            <UploadButton uploading={uploading} onClick={() => inputRef.current?.click()} />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {docs.length === 0 ? (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-6 text-muted-foreground hover:border-emerald-400 hover:text-emerald-600 transition-colors"
          >
            {uploading
              ? <Loader2 className="h-6 w-6 animate-spin" />
              : <Upload className="h-6 w-6" />
            }
            <span className="text-xs font-medium">
              {uploading ? "Upload en cours…" : "Cliquez pour importer un fichier (PDF, Word, Excel…)"}
            </span>
            <span className="text-[11px]">Max 10 Mo</span>
          </button>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-muted/5 hover:bg-muted/10"
              >
                {fileIcon(doc.mimeType)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{doc.originalName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatSize(doc.size)} · {new Date(doc.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDownload(doc)}
                    title="Télécharger"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => deleteDoc({ orgId, docId: doc.id })}
                    disabled={deleting}
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

      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.png,.jpg,.jpeg"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />
    </div>
  );
}

function UploadButton({ uploading, onClick }: { uploading: boolean; onClick: () => void }) {
  return (
    <Button size="sm" variant="outline" onClick={onClick} disabled={uploading} className="gap-1.5 shrink-0">
      {uploading
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : <Upload className="h-3.5 w-3.5" />
      }
      Importer
    </Button>
  );
}
