/**
 * Onglet "Documents clés" du Diagnostic RSE.
 * Centralise les 14 documents structurants de la démarche RSE.
 * Architecture prête pour un futur bouton "Créer avec l'IA" (propriété aiReady).
 */

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
  Upload, FileText, Trash2, Download, Loader2, Check,
  History, ChevronDown, ChevronUp, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Définition des documents clés ─────────────────────────────────────────
const KEY_DOCUMENTS = [
  {
    slug: "politique-rse",
    label: "Politique RSE",
    description: "Formalise les engagements et les orientations de la démarche RSE de l'entreprise.",
    aiReady: true,
  },
  {
    slug: "charte-ethique",
    label: "Charte éthique",
    description: "Définit les valeurs, les principes et les comportements attendus au sein de l'entreprise.",
    aiReady: true,
  },
  {
    slug: "code-de-conduite",
    label: "Code de conduite",
    description: "Encadre les règles de conduite applicables aux collaborateurs, partenaires et fournisseurs.",
    aiReady: false,
  },
  {
    slug: "politique-rh",
    label: "Politique RH",
    description: "Présente les engagements de l'entreprise en matière de ressources humaines.",
    aiReady: false,
  },
  {
    slug: "charte-achats-responsables",
    label: "Charte des achats responsables",
    description: "Formalise les engagements de l'entreprise en matière d'achats responsables.",
    aiReady: false,
  },
  {
    slug: "certifications-iso",
    label: "Certification(s) ISO",
    description: "Permet d'importer une ou plusieurs certifications ou autres référentiels.",
    aiReady: false,
  },
  {
    slug: "plan-continuite-activite",
    label: "Plan de Continuité d'Activité (PCA)",
    description: "Décrit les mesures permettant d'assurer la continuité de l'activité en cas d'incident majeur.",
    aiReady: false,
  },
  {
    slug: "registre-rgpd",
    label: "Registre RGPD",
    description: "Registre des traitements de données personnelles.",
    aiReady: false,
  },
  {
    slug: "procedure-lanceur-alerte",
    label: "Procédure lanceur d'alerte",
    description: "Décrit le dispositif interne permettant de signaler un comportement contraire à l'éthique ou à la réglementation.",
    aiReady: false,
  },
  {
    slug: "organigramme",
    label: "Organigramme",
    description: "Organigramme de l'entreprise ou de sa gouvernance.",
    aiReady: false,
  },
  {
    slug: "axes-strategiques",
    label: "Axes stratégiques de l'entreprise",
    description: "Document présentant les orientations stratégiques et les priorités de développement de l'entreprise.",
    aiReady: false,
  },
  {
    slug: "guide-bonnes-pratiques",
    label: "Guide des bonnes pratiques",
    description: "Guide interne regroupant les bonnes pratiques, règles ou recommandations applicables aux collaborateurs.",
    aiReady: false,
  },
  {
    slug: "cartographie-risques",
    label: "Cartographie des risques",
    description: "Présentation des principaux risques identifiés par l'entreprise.",
    aiReady: false,
  },
  {
    slug: "duerp",
    label: "DUERP",
    description: "Document Unique d'Évaluation des Risques Professionnels — Présente l'évaluation des risques professionnels et les mesures de prévention mises en place au sein de l'entreprise.",
    aiReady: false,
  },
] as const;

export const DOCS_CLES_PREFIX = "diagnostic-rse/documents-cles";

export function docClesCategory(slug: string): string {
  return `${DOCS_CLES_PREFIX}/${slug}`;
}

export function isDocumentsClesCategory(category: string): boolean {
  return category.startsWith(`${DOCS_CLES_PREFIX}/`);
}

export function getDocumentsClesSlug(category: string): string {
  return category.replace(`${DOCS_CLES_PREFIX}/`, "");
}

export function getDocumentsClesLabel(slug: string): string {
  return KEY_DOCUMENTS.find((d) => d.slug === slug)?.label ?? slug;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

// ── Carte document individuelle ────────────────────────────────────────────
function DocCard({
  orgId,
  slug,
  label,
  description,
  allDocs,
  uploading,
  onUpload,
  onDelete,
  onDownload,
}: {
  orgId: number;
  slug: string;
  label: string;
  description: string;
  allDocs: DocumentMeta[];
  uploading: boolean;
  onUpload: (file: File, category: string) => void;
  onDelete: (docId: number) => void;
  onDownload: (doc: DocumentMeta) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const sortedDocs = [...allDocs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const activeDoc  = sortedDocs[0] ?? null;
  const olderDocs  = sortedDocs.slice(1);
  const hasDoc     = !!activeDoc;
  const category   = docClesCategory(slug);

  return (
    <div className={cn(
      "rounded-xl border bg-card p-5 flex flex-col gap-4 transition-colors",
      hasDoc ? "border-emerald-200 bg-emerald-50/30" : "border-border",
    )}>
      {/* En-tête : checkbox + titre + description */}
      <div className="flex items-start gap-3">
        <div className={cn(
          "mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
          hasDoc ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/30 bg-background",
        )}>
          {hasDoc && <Check className="h-3 w-3 text-white stroke-[3]" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug">{label}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-snug">{description}</p>
        </div>
      </div>

      {/* Document actif */}
      {activeDoc && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
          <FileText className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{activeDoc.originalName}</p>
            <p className="text-[10px] text-muted-foreground">
              Version active · {formatDate(activeDoc.createdAt)} · {formatSize(activeDoc.size)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => onDownload(activeDoc)}
            title="Télécharger"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-red-400 hover:text-red-600 hover:bg-red-50"
            onClick={() => onDelete(activeDoc.id)}
            title="Supprimer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Historique des versions */}
      {olderDocs.length > 0 && (
        <div>
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="h-3 w-3" />
            {olderDocs.length} version{olderDocs.length > 1 ? "s" : ""} précédente{olderDocs.length > 1 ? "s" : ""}
            {historyOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {historyOpen && (
            <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-muted/50">
              {olderDocs.map((doc) => (
                <div key={doc.id} className="flex items-center gap-2 py-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{doc.originalName}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDate(doc.createdAt)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => onDownload(doc)}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-red-400 hover:text-red-600"
                    onClick={() => onDelete(doc.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions : import (+ futur bouton IA) */}
      <div className="flex gap-2 mt-auto pt-1">
        <Button
          variant={hasDoc ? "outline" : "default"}
          size="sm"
          className="flex-1 gap-1.5 text-xs"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Upload className="h-3.5 w-3.5" />}
          {hasDoc ? "Nouvelle version" : "Importer un document"}
        </Button>
        {/* Emplacement futur : bouton "Créer avec l'IA" (aiReady) */}
      </div>

      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.png,.jpg,.jpeg"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) { onUpload(f, category); e.target.value = ""; }
        }}
      />
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────
export function TabDocumentsCles({ orgId }: { orgId: number }) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data: allDocs = [], isLoading } = useListDocuments(orgId, {
    query: { enabled: !!orgId, queryKey: getListDocumentsQueryKey(orgId) },
  });

  const { mutate: deleteDoc } = useDeleteDocument({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey(orgId) }),
    },
  });

  const docsCles = (allDocs as DocumentMeta[]).filter((d) => isDocumentsClesCategory(d.category));

  const bySlug: Record<string, DocumentMeta[]> = {};
  for (const doc of docsCles) {
    const slug = getDocumentsClesSlug(doc.category);
    if (!bySlug[slug]) bySlug[slug] = [];
    bySlug[slug].push(doc);
  }

  const importedCount = KEY_DOCUMENTS.filter((d) => (bySlug[d.slug]?.length ?? 0) > 0).length;

  const handleUpload = async (file: File, category: string) => {
    if (file.size > 20 * 1024 * 1024) {
      setUploadError("Fichier trop volumineux (max 20 Mo).");
      return;
    }
    setUploadError(null);
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
    } catch {
      setUploadError("Erreur lors de l'import. Réessayez.");
    } finally {
      setUploading(false);
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

  const handleDelete = (docId: number) => {
    deleteDoc({ orgId, docId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/40 px-5 py-4">
        <p className="text-sm text-blue-900 leading-relaxed">
          Les documents ci-dessous permettent de structurer votre démarche RSE et d'en démontrer la maturité.
          Ils ne sont pas tous obligatoires, mais représentent des bonnes pratiques de gouvernance.
          Les documents importés seront automatiquement enregistrés dans{" "}
          <span className="font-semibold">Mes documents › Diagnostic RSE › Documents clés</span>{" "}
          et pourront être réutilisés dans l'ensemble de Cocci.
        </p>
      </div>

      {/* Compteur de progression */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${(importedCount / KEY_DOCUMENTS.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {importedCount}/{KEY_DOCUMENTS.length} importé{importedCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Erreur upload */}
      {uploadError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {uploadError}
        </div>
      )}

      {/* Grille de cartes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {KEY_DOCUMENTS.map((doc) => (
          <DocCard
            key={doc.slug}
            orgId={orgId}
            slug={doc.slug}
            label={doc.label}
            description={doc.description}
            allDocs={bySlug[doc.slug] ?? []}
            uploading={uploading}
            onUpload={handleUpload}
            onDelete={handleDelete}
            onDownload={handleDownload}
          />
        ))}
      </div>
    </div>
  );
}
