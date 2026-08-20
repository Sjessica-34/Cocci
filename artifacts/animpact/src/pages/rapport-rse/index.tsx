import { useState, useEffect, useCallback, useRef } from "react";
import { useStorageUpload } from "@/hooks/useStorageUpload";
import { useAuth } from "@clerk/react";
import { useLocation } from "wouter";
import { useModuleContext } from "@/hooks/useModuleContext";
import { useCurrentExercise } from "@/hooks/useCurrentExercise";
import {
  useGetReportDraft, useUpdateReportDraft, useGenerateReportAiSection,
  customFetch,
} from "@workspace/api-client-react";
import type { ReportDraftUpdate, ReportHighlight } from "@workspace/api-client-react";
import { MAX_REPORT_GENERATIONS } from "@workspace/rse-referentials";
import { AppLayout } from "@/components/layout";
import { DocumentUploader } from "@/components/DocumentUploader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AlertCircle, FileBarChart2, CheckCircle2, Loader2, Sparkles,
  Plus, Trash2, ChevronDown, ChevronRight, FileText,
  Building2, Users2, Leaf, Award, LayoutList, BookOpen, Target,
  PenLine, Info, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getGetReportDraftQueryKey } from "@workspace/api-client-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type TimelineEvent = { id: string; date: string; title: string; description: string };
type Highlight = ReportHighlight;
type LocalDraft = Partial<ReportDraftUpdate> & {
  timeline?: TimelineEvent[];
  highlights?: Highlight[];
};

// ─── Section Card ──────────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, subtitle, children, defaultOpen = false }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <Icon className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-5 pt-2 space-y-4 border-t">{children}</div>}
    </div>
  );
}

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

// ─── Timeline events editor ───────────────────────────────────────────────────

function TimelineEditor({ events, onChange }: { events: TimelineEvent[]; onChange: (evts: TimelineEvent[]) => void }) {
  const newId = () => `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const add = () => onChange([...events, { id: newId(), date: "", title: "", description: "" }]);
  const remove = (id: string) => onChange(events.filter((e) => e.id !== id));
  const upd = (id: string, field: keyof TimelineEvent, value: string) =>
    onChange(events.map((e) => e.id === id ? { ...e, [field]: value } : e));

  return (
    <div className="space-y-3">
      {events.map((evt, i) => (
        <div key={evt.id} className="rounded-lg border bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Événement {i + 1}</span>
            <button onClick={() => remove(evt.id)} className="text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Date / Année</Label>
              <Input value={evt.date} onChange={(e) => upd(evt.id, "date", e.target.value)} placeholder="ex : 2018" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Titre</Label>
              <Input value={evt.title} onChange={(e) => upd(evt.id, "title", e.target.value)} placeholder="Création de l'entreprise" className="h-8 text-xs" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea value={evt.description} onChange={(e) => upd(evt.id, "description", e.target.value)} placeholder="Quelques mots..." rows={2} className="text-xs resize-none" />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1.5 w-full">
        <Plus className="h-3.5 w-3.5" /> Ajouter un événement
      </Button>
    </div>
  );
}

// ─── Highlights editor ────────────────────────────────────────────────────────

const HIGHLIGHT_CATEGORIES = [
  "RSE & Environnement", "Social & RH", "Innovation", "Certifications & Labels",
  "Team building", "Vie d'équipe", "Célébration", "Partenariat", "Gouvernance", "Autre",
];

function HighlightEditor({ items, onChange, orgId }: {
  items: Highlight[];
  onChange: (items: Highlight[]) => void;
  orgId: number;
}) {
  const newId = () => `hl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const add = () => onChange([...items, { id: newId(), date: "", title: "", category: "Autre", description: "", photos: [] }]);
  const remove = (id: string) => onChange(items.filter((h) => h.id !== id));
  const upd = (id: string, field: keyof Highlight, value: string) =>
    onChange(items.map((h) => h.id === id ? { ...h, [field]: value } : h));
  const updPhoto = (id: string, url: string) =>
    onChange(items.map((h) => h.id === id ? { ...h, photos: url ? [url] : [] } : h));
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { uploadFile, isUploading } = useStorageUpload({
    onError: (err) => setUploadError(err.message ?? "Échec de l'envoi"),
  });

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground italic py-2">
          Aucun moment ajouté. Cela peut être un label obtenu, un événement team building, une naissance, un anniversaire d'entreprise…
        </p>
      )}
      {items.map((hl, i) => (
        <div key={hl.id} className="rounded-lg border bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Moment {i + 1}</span>
            <button onClick={() => remove(hl.id)} className="text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input value={hl.date} onChange={(e) => upd(hl.id, "date", e.target.value)} placeholder="ex : Mars 2024" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Catégorie</Label>
              <select
                value={hl.category}
                onChange={(e) => upd(hl.id, "category", e.target.value)}
                className="h-8 w-full text-xs rounded-md border bg-background px-2"
              >
                {HIGHLIGHT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Titre</Label>
              <Input value={hl.title} onChange={(e) => upd(hl.id, "title", e.target.value)} placeholder="ex : Journée cohésion" className="h-8 text-xs" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea value={hl.description} onChange={(e) => upd(hl.id, "description", e.target.value)} rows={2} className="text-xs resize-none" placeholder="Quelques mots sur ce moment…" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Photo</Label>
            {hl.photos[0] ? (
              <div className="flex items-center gap-2">
                <img
                  src={hl.photos[0]}
                  alt="aperçu"
                  className="h-10 w-14 object-cover rounded border"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <button
                  type="button"
                  onClick={() => updPhoto(hl.id, "")}
                  className="text-xs text-destructive hover:underline"
                >
                  Supprimer
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs font-medium transition-colors",
                      isUploading
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : "bg-background hover:bg-muted text-foreground",
                    )}>
                      {isUploading ? (
                        <><Loader2 className="h-3 w-3 animate-spin" /> Envoi…</>
                      ) : (
                        <>📷 Importer</>
                      )}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={isUploading}
                      onChange={async (e) => {
                        setUploadError(null);
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const result = await uploadFile(file);
                        if (result) updPhoto(hl.id, result.fileUrl);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <span className="text-xs text-muted-foreground">ou coller une URL :</span>
                  <Input
                    className="h-8 text-xs flex-1"
                    placeholder="https://..."
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v) { updPhoto(hl.id, v); e.target.value = ""; }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const v = (e.target as HTMLInputElement).value.trim();
                        if (v) { updPhoto(hl.id, v); (e.target as HTMLInputElement).value = ""; }
                      }
                    }}
                  />
                </div>
                {uploadError && (
                  <p className="text-xs text-destructive">{uploadError}</p>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1.5 w-full">
        <Plus className="h-3.5 w-3.5" /> Ajouter un moment
      </Button>
    </div>
  );
}

// ─── Save status indicator ────────────────────────────────────────────────────

function SaveStatus({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "idle") return null;
  return (
    <div className={cn("flex items-center gap-1.5 text-xs", {
      "text-muted-foreground": status === "saving",
      "text-green-600": status === "saved",
      "text-destructive": status === "error",
    })}>
      {status === "saving" && <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Enregistrement…</>}
      {status === "saved" && <><CheckCircle2 className="h-3.5 w-3.5" /> Enregistré</>}
      {status === "error" && <><AlertCircle className="h-3.5 w-3.5" /> Erreur d'enregistrement</>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function RapportRse() {
  useAuth();
  const { effectiveOrgId, isReadOnly } = useModuleContext("group");
  const orgId = effectiveOrgId;
  const { currentExerciseId } = useCurrentExercise();
  const reportDraftQueryKey = [...getGetReportDraftQueryKey(orgId ?? 0), "exercise", currentExerciseId ?? "latest"];

  const { data: draft, isLoading } = useGetReportDraft(orgId ?? 0, {
    query: { enabled: orgId != null, queryKey: reportDraftQueryKey },
  });
  const { mutateAsync: saveDraft } = useUpdateReportDraft();
  const { mutateAsync: generateAiSection } = useGenerateReportAiSection();
  const [, navigate] = useLocation();

  const [local, setLocal] = useState<LocalDraft>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [showGenConfirm, setShowGenConfirm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const hydratedDraftScopeRef = useRef<string | null>(null);
  const draftScope = `${orgId ?? "none"}:${currentExerciseId ?? "latest"}`;
  const currentDraftScopeRef = useRef(draftScope);
  currentDraftScopeRef.current = draftScope;

  useEffect(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    hydratedDraftScopeRef.current = null;
    setLocal({});
    setSaveStatus("idle");
  }, [draftScope]);

  useEffect(() => {
    if (
      !draft ||
      hydratedDraftScopeRef.current === draftScope ||
      (currentExerciseId != null && draft.exerciseId !== currentExerciseId)
    ) return;

    hydratedDraftScopeRef.current = draftScope;
    setLocal({
      coverImageUrl: draft.coverImageUrl ?? "",
      version: draft.version ?? "1.0",
      period: draft.period ?? "",
      editorialMode: draft.editorialMode ?? "manual",
      editorialAuthor: draft.editorialAuthor ?? "",
      editorialAuthorRole: draft.editorialAuthorRole ?? "",
      editorialCoSigned: draft.editorialCoSigned ?? false,
      editorialTone: draft.editorialTone ?? "institutionnel",
      editorialThemes: draft.editorialThemes ?? [],
      editorialLength: draft.editorialLength ?? "standard",
      editorialContext: draft.editorialContext ?? "",
      editorialContent: draft.editorialContent ?? "",
      companyDescription: draft.companyDescription ?? "",
      companyMission: draft.companyMission ?? "",
      isMissionEntreprise: draft.isMissionEntreprise ?? false,
      companyVision: draft.companyVision ?? "",
      companyValues: draft.companyValues ?? "",
      companyKeyFigures: draft.companyKeyFigures ?? "",
      timeline: (draft.timeline as TimelineEvent[]) ?? [],
      orgChartUrl: draft.orgChartUrl ?? "",
      highlights: (draft.highlights as Highlight[]) ?? [],
      perspectivesMode: draft.perspectivesMode ?? "manual",
      perspectivesContent: draft.perspectivesContent ?? "",
    });
  }, [currentExerciseId, draft, draftScope]);

  const persistDraft = useCallback((patch: LocalDraft, scope: string): Promise<void> => {
    if (!orgId || isReadOnly) return Promise.resolve();
    const request = saveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        // A delayed save belonging to an earlier organization/exercise must
        // never be sent with the newly active exercise header.
        if (currentDraftScopeRef.current !== scope) return;
        setSaveStatus("saving");
        try {
          await saveDraft({ orgId, data: patch as ReportDraftUpdate });
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } catch (error) {
          setSaveStatus("error");
          throw error;
        }
      });
    saveQueueRef.current = request;
    return request;
  }, [orgId, isReadOnly, saveDraft]);

  const triggerSave = useCallback((patch: LocalDraft) => {
    if (!orgId || isReadOnly) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      saveTimerRef.current = null;
      await persistDraft(patch, draftScope).catch(() => undefined);
    }, 600);
  }, [orgId, isReadOnly, persistDraft, draftScope]);

  const flushDraftBeforeGeneration = useCallback(async (): Promise<void> => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (Object.keys(local).length > 0) {
      await persistDraft(local, draftScope);
    }
  }, [draftScope, local, persistDraft]);

  const update = useCallback(<K extends keyof LocalDraft>(field: K, value: LocalDraft[K]) => {
    setLocal((prev) => {
      const next = { ...prev, [field]: value };
      triggerSave(next);
      return next;
    });
  }, [triggerSave]);

  const toggleTheme = (theme: string) => {
    const current = local.editorialThemes ?? [];
    const next = current.includes(theme) ? current.filter((t) => t !== theme) : [...current, theme];
    update("editorialThemes", next);
  };

  const handleAiEditorial = async () => {
    if (!orgId) return;
    setAiLoading((p) => ({ ...p, editorial: true }));
    try {
      const res = await generateAiSection({
        orgId,
        data: {
          section: "editorial",
          tone: local.editorialTone ?? undefined,
          length: local.editorialLength ?? undefined,
          author: local.editorialAuthor ?? undefined,
          authorRole: local.editorialAuthorRole ?? undefined,
          themes: local.editorialThemes ?? undefined,
          context: local.editorialContext ?? undefined,
        },
      });
      if (res.content) update("editorialContent", res.content);
    } finally {
      setAiLoading((p) => ({ ...p, editorial: false }));
    }
  };

  const handleAiPerspectives = async () => {
    if (!orgId) return;
    setAiLoading((p) => ({ ...p, perspectives: true }));
    try {
      const res = await generateAiSection({
        orgId,
        data: { section: "intro", data: { chapterName: "Perspectives" } },
      });
      if (res.content) update("perspectivesContent", res.content);
    } finally {
      setAiLoading((p) => ({ ...p, perspectives: false }));
    }
  };

  const handleConfirmGenerate = async () => {
    if (!orgId || generating) return;
    setShowGenConfirm(false);
    setGenerating(true);
    setGenerateError(null);
    try {
      await flushDraftBeforeGeneration();
      await customFetch(`/api/organizations/${orgId}/report/register-generation`, {
        method: "POST",
      });
      navigate("/rapport-rse/viewer");
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 429) {
        setGenerateError("Quota de générations atteint pour cet exercice.");
      } else {
        setGenerateError("Une erreur est survenue. Réessayez dans quelques instants.");
      }
    } finally {
      setGenerating(false);
    }
  };

  const TONES = ["institutionnel", "inspirant", "humain", "technique", "ambitieux", "transparent"];
  const EDITORIAL_THEMES = [
    "Environnement & climat", "Capital humain", "Gouvernance", "Innovation",
    "Impact territorial", "Achats responsables", "Biodiversité", "Numérique responsable",
  ];
  const LENGTHS = [
    { value: "courte", label: "Courte (80–100 mots)" },
    { value: "standard", label: "Standard (130–160 mots)" },
    { value: "detaillee", label: "Détaillée (200–250 mots)" },
  ];

  const editorialMode = local.editorialMode ?? "manual";
  const reportGenerationCount = draft?.generationCount ?? 0;
  const reportMaxGenerations = draft?.maxGenerations ?? MAX_REPORT_GENERATIONS;

  if (!orgId) {
    return (
      <AppLayout>
        <div className="flex items-center gap-3 p-5 rounded-xl border border-amber-200 bg-amber-50 max-w-3xl">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">Sélectionnez une organisation pour accéder à ce module.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl pb-16 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileBarChart2 className="h-6 w-6 text-primary" />
              Rapport RSE
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Préparez le contenu éditorial de votre rapport et générez-le en DOCX.
            </p>
          </div>
          <SaveStatus status={saveStatus} />
        </div>

        {isReadOnly && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50 text-sm text-blue-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Ce module est piloté au niveau Groupe. La modification est désactivée pour cette vue.
          </div>
        )}

        <Tabs defaultValue="preparer">
          <TabsList className="mb-2">
            <TabsTrigger value="preparer">Préparer</TabsTrigger>
            <TabsTrigger value="generer">Générer</TabsTrigger>
          </TabsList>

          {/* ── TAB PRÉPARER ─────────────────────────────────────────────────── */}
          <TabsContent value="preparer" className="space-y-3 mt-2">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : (
              <>
                {/* ── Section 1 : Infos générales ── */}
                <SectionCard icon={FileText} title="Informations générales" subtitle="Version, période, couverture" defaultOpen>
                  <div className="grid grid-cols-2 gap-4">
                    <FieldGroup label="Version du rapport" hint="ex : 1.0, 2024-V1">
                      <Input
                        value={local.version ?? ""}
                        onChange={(e) => update("version", e.target.value)}
                        placeholder="1.0"
                        disabled={isReadOnly}
                      />
                    </FieldGroup>
                    <FieldGroup label="Période couverte" hint="ex : Exercice 2024, Jan–Déc 2024">
                      <Input
                        value={local.period ?? ""}
                        onChange={(e) => update("period", e.target.value)}
                        placeholder="Exercice 2024"
                        disabled={isReadOnly}
                      />
                    </FieldGroup>
                  </div>
                  <FieldGroup label="URL de l'image de couverture" hint="Collez l'URL de votre image (format paysage recommandé)">
                    <Input
                      value={local.coverImageUrl ?? ""}
                      onChange={(e) => update("coverImageUrl", e.target.value)}
                      placeholder="https://..."
                      disabled={isReadOnly}
                    />
                  </FieldGroup>
                </SectionCard>

                {/* ── Section 2 : Éditorial ── */}
                <SectionCard icon={BookOpen} title="Éditorial" subtitle="Message de la direction">

                  {/* Auteur */}
                  <div className="grid grid-cols-2 gap-4">
                    <FieldGroup label="Auteur">
                      <Input value={local.editorialAuthor ?? ""} onChange={(e) => update("editorialAuthor", e.target.value)} placeholder="Prénom Nom" disabled={isReadOnly} />
                    </FieldGroup>
                    <FieldGroup label="Fonction / Titre">
                      <Input value={local.editorialAuthorRole ?? ""} onChange={(e) => update("editorialAuthorRole", e.target.value)} placeholder="Directeur(trice) Général(e)" disabled={isReadOnly} />
                    </FieldGroup>
                  </div>

                  {/* Mode selector */}
                  {!isReadOnly && (
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Comment souhaitez-vous rédiger l'éditorial ?</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => update("editorialMode", "manual")}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
                            editorialMode === "manual"
                              ? "bg-primary/5 border-primary"
                              : "hover:border-muted-foreground/40",
                          )}
                        >
                          <PenLine className={cn("h-4 w-4 mt-0.5 shrink-0", editorialMode === "manual" ? "text-primary" : "text-muted-foreground")} />
                          <div>
                            <p className={cn("text-xs font-semibold", editorialMode === "manual" ? "text-primary" : "")}>Rédiger moi-même</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Saisissez directement votre texte</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => update("editorialMode", "ai")}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
                            editorialMode === "ai"
                              ? "bg-primary/5 border-primary"
                              : "hover:border-muted-foreground/40",
                          )}
                        >
                          <Sparkles className={cn("h-4 w-4 mt-0.5 shrink-0", editorialMode === "ai" ? "text-primary" : "text-muted-foreground")} />
                          <div>
                            <p className={cn("text-xs font-semibold", editorialMode === "ai" ? "text-primary" : "")}>Générer avec l'IA</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Paramétrez puis laissez l'IA rédiger</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Options IA — visibles uniquement en mode IA */}
                  {editorialMode === "ai" && (
                    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                      <FieldGroup label="Ton de l'éditorial">
                        <div className="flex flex-wrap gap-1.5">
                          {TONES.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => !isReadOnly && update("editorialTone", t)}
                              className={cn(
                                "px-2.5 py-1 rounded-full text-xs border transition-colors capitalize",
                                local.editorialTone === t
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "hover:border-primary/50",
                              )}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </FieldGroup>

                      <FieldGroup label="Longueur souhaitée">
                        <div className="flex gap-2 flex-wrap">
                          {LENGTHS.map((l) => (
                            <button
                              key={l.value}
                              type="button"
                              onClick={() => !isReadOnly && update("editorialLength", l.value)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-xs border transition-colors",
                                local.editorialLength === l.value
                                  ? "bg-primary/10 border-primary text-primary"
                                  : "hover:border-muted-foreground/40",
                              )}
                            >
                              {l.label}
                            </button>
                          ))}
                        </div>
                      </FieldGroup>

                      <FieldGroup label="Thématiques à mettre en avant">
                        <div className="flex flex-wrap gap-1.5">
                          {EDITORIAL_THEMES.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => !isReadOnly && toggleTheme(t)}
                              className={cn(
                                "px-2.5 py-1 rounded-full text-xs border transition-colors",
                                (local.editorialThemes ?? []).includes(t)
                                  ? "bg-green-100 border-green-500 text-green-800"
                                  : "hover:border-primary/50",
                              )}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </FieldGroup>

                      <FieldGroup label="Contexte additionnel" hint="Événements clés de l'année, message spécifique (optionnel)">
                        <Textarea
                          value={local.editorialContext ?? ""}
                          onChange={(e) => update("editorialContext", e.target.value)}
                          rows={2}
                          placeholder="ex : Cette année a été marquée par l'obtention de notre certification ISO 14001…"
                          disabled={isReadOnly}
                          className="resize-none"
                        />
                      </FieldGroup>

                      <Button
                        type="button"
                        onClick={handleAiEditorial}
                        disabled={aiLoading.editorial || isReadOnly}
                        className="w-full gap-2"
                        variant="default"
                        size="sm"
                      >
                        {aiLoading.editorial
                          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Rédaction en cours…</>
                          : <><Sparkles className="h-3.5 w-3.5" /> Générer l'éditorial</>}
                      </Button>
                    </div>
                  )}

                  {/* Textarea contenu — toujours visible pour éditer ou recevoir le résultat IA */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">
                      {editorialMode === "ai" ? "Résultat généré (modifiable)" : "Contenu de l'éditorial"}
                    </Label>
                    <Textarea
                      value={local.editorialContent ?? ""}
                      onChange={(e) => update("editorialContent", e.target.value)}
                      rows={8}
                      placeholder={
                        editorialMode === "ai"
                          ? "Le texte généré par l'IA apparaîtra ici, vous pourrez ensuite le modifier…"
                          : "Rédigez ici votre éditorial…"
                      }
                      disabled={isReadOnly}
                      className="resize-none font-light"
                    />
                  </div>
                </SectionCard>

                {/* ── Section 3 : Présentation entreprise ── */}
                <SectionCard icon={Building2} title="Présentation de l'entreprise" subtitle="Description, mission, vision, valeurs">
                  <FieldGroup label="Description générale">
                    <Textarea
                      value={local.companyDescription ?? ""}
                      onChange={(e) => update("companyDescription", e.target.value)}
                      rows={3}
                      placeholder="Quelques lignes présentant votre entreprise, son activité, son marché…"
                      disabled={isReadOnly}
                      className="resize-none"
                    />
                  </FieldGroup>

                  <FieldGroup label="Notre mission">
                    <Textarea
                      value={local.companyMission ?? ""}
                      onChange={(e) => update("companyMission", e.target.value)}
                      rows={2}
                      placeholder="La raison d'être de l'entreprise…"
                      disabled={isReadOnly}
                      className="resize-none"
                    />
                  </FieldGroup>

                  <div className="flex items-center gap-3">
                    <Switch
                      checked={local.isMissionEntreprise ?? false}
                      onCheckedChange={(v) => !isReadOnly && update("isMissionEntreprise", v)}
                      disabled={isReadOnly}
                    />
                    <Label className="text-sm cursor-pointer">Entreprise à mission (loi PACTE)</Label>
                  </div>

                  <FieldGroup label="Notre vision">
                    <Textarea
                      value={local.companyVision ?? ""}
                      onChange={(e) => update("companyVision", e.target.value)}
                      rows={2}
                      placeholder="Où souhaitez-vous être dans 5 à 10 ans ?"
                      disabled={isReadOnly}
                      className="resize-none"
                    />
                  </FieldGroup>

                  <FieldGroup label="Nos valeurs">
                    <Textarea
                      value={local.companyValues ?? ""}
                      onChange={(e) => update("companyValues", e.target.value)}
                      rows={2}
                      placeholder="ex : Confiance, Excellence, Impact, Durabilité"
                      disabled={isReadOnly}
                      className="resize-none"
                    />
                  </FieldGroup>

                  <FieldGroup label="Chiffres clés complémentaires" hint="Chiffre d'affaires, nombre de sites, marchés, etc.">
                    <Textarea
                      value={local.companyKeyFigures ?? ""}
                      onChange={(e) => update("companyKeyFigures", e.target.value)}
                      rows={2}
                      placeholder="ex : 42 M€ de CA en 2024, 3 sites en France, présent dans 12 pays…"
                      disabled={isReadOnly}
                      className="resize-none"
                    />
                  </FieldGroup>
                </SectionCard>

                {/* ── Section 4 : Historique ── */}
                <SectionCard icon={LayoutList} title="Historique de l'entreprise" subtitle="Frise chronologique des jalons clés">
                  {!isReadOnly ? (
                    <TimelineEditor
                      events={local.timeline ?? []}
                      onChange={(evts) => update("timeline", evts)}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Lecture seule.</p>
                  )}
                </SectionCard>

                {/* ── Section 5 : Organigramme ── */}
                <SectionCard icon={Users2} title="Organigramme" subtitle="Structure organisationnelle">
                  <FieldGroup label="URL de l'organigramme" hint="Collez l'URL d'une image de votre organigramme">
                    <Input
                      value={local.orgChartUrl ?? ""}
                      onChange={(e) => update("orgChartUrl", e.target.value)}
                      placeholder="https://..."
                      disabled={isReadOnly}
                    />
                  </FieldGroup>
                  {!isReadOnly && (
                    <div className="border-t pt-3">
                      <p className="text-xs text-muted-foreground mb-2">Ou uploadez le document ici pour archivage :</p>
                      <DocumentUploader orgId={orgId} category="organigramme" question="Organigramme de l'entreprise" />
                    </div>
                  )}
                </SectionCard>

                {/* ── Section 6 : Temps forts ── */}
                <SectionCard icon={Award} title="Temps forts de l'année" subtitle="Vie d'entreprise & moments clés (RSE, équipe, célébrations…)">
                  {!isReadOnly ? (
                    <HighlightEditor
                      items={local.highlights ?? []}
                      onChange={(items) => update("highlights", items)}
                      orgId={orgId}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Lecture seule.</p>
                  )}
                </SectionCard>

                {/* ── Section 7 : Perspectives ── */}
                <SectionCard icon={Target} title="Perspectives" subtitle="Engagement et priorités pour l'an prochain">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Contenu des perspectives</Label>
                      {!isReadOnly && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAiPerspectives}
                          disabled={aiLoading.perspectives}
                          className="gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                        >
                          {aiLoading.perspectives
                            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Rédaction…</>
                            : <><Sparkles className="h-3.5 w-3.5" /> Générer avec l'IA</>}
                        </Button>
                      )}
                    </div>
                    <Textarea
                      value={local.perspectivesContent ?? ""}
                      onChange={(e) => update("perspectivesContent", e.target.value)}
                      rows={6}
                      placeholder="Décrivez les priorités RSE pour les prochains exercices, les engagements pris, les projets à lancer…"
                      disabled={isReadOnly}
                      className="resize-none font-light"
                    />
                  </div>
                </SectionCard>

                {/* ── Section 8 : Périmètre & Méthodologie (fixe) ── */}
                <SectionCard icon={Leaf} title="Périmètre & Méthodologie" subtitle="Note générée automatiquement">
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                    <div className="flex gap-2.5">
                      <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <div>
                          <p className="font-medium text-foreground text-xs mb-1">Périmètre</p>
                          <p className="text-xs leading-relaxed">
                            Ce rapport couvre l'ensemble des entités du groupe, telles qu'enregistrées dans la plateforme Cocci pour l'exercice concerné.
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-xs mb-1">Méthodologie</p>
                          <p className="text-xs leading-relaxed">
                            Les données ont été collectées et consolidées via la plateforme Cocci. Ce rapport est produit à des fins internes de pilotage RSE. Il n'est pas établi selon les référentiels normatifs en vigueur (GRI, DPEF, ISO 26000, etc.) et ne constitue pas un reporting réglementaire.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cette note sera automatiquement incluse en fin de rapport. Elle n'est pas modifiable.
                  </p>
                </SectionCard>
              </>
            )}
          </TabsContent>

          {/* ── TAB GÉNÉRER ─────────────────────────────────────────────────── */}
          <TabsContent value="generer" className="mt-2 space-y-4">
            <div className="rounded-xl border bg-card p-6 space-y-5">
              <div>
                <h2 className="text-base font-semibold">Générer votre rapport RSE</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Le rapport intègre automatiquement toutes vos données RSE (bilan carbone, capital humain, diagnostic, plan d'actions, labels, impact score…) ainsi que le contenu éditorial préparé ci-dessus.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Éditorial", done: !!(local.editorialContent) },
                  { label: "Présentation entreprise", done: !!(local.companyDescription || local.companyMission) },
                  { label: "Historique", done: (local.timeline?.length ?? 0) > 0 },
                  { label: "Temps forts", done: (local.highlights?.length ?? 0) > 0 },
                  { label: "Perspectives", done: !!(local.perspectivesContent) },
                  { label: "Périmètre & Méthodo", done: true },
                ].map((item) => (
                  <div key={item.label} className={cn(
                    "flex items-center gap-2 text-sm p-3 rounded-lg border",
                    item.done ? "bg-green-50 border-green-200" : "bg-muted/30",
                  )}>
                    <CheckCircle2 className={cn("h-4 w-4 shrink-0", item.done ? "text-green-600" : "text-muted-foreground/30")} />
                    <span className={item.done ? "text-green-800" : "text-muted-foreground"}>{item.label}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-800">
                  <strong>Note :</strong> Les données non renseignées dans les modules RSE (bilan carbone, diagnostic, etc.) apparaîtront avec la mention « Non évalué » dans le rapport.
                </p>
              </div>

              {/* ─── Quota de générations ─── */}
              {(() => {
                const count = reportGenerationCount;
                const maxGenerations = reportMaxGenerations;
                const limitReached = count >= maxGenerations;
                return (
                  <div className="space-y-3">
                    {/* Indicateur de quota */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Générations utilisées</span>
                      <span className={cn(
                        "font-semibold",
                        limitReached ? "text-destructive" : "text-foreground",
                      )}>
                        {count} / {maxGenerations}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          limitReached ? "bg-destructive" : "bg-green-500",
                        )}
                        style={{ width: `${Math.min((count / maxGenerations) * 100, 100)}%` }}
                      />
                    </div>

                    {limitReached ? (
                      /* ── Limite atteinte ── */
                      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-1">
                        <p className="text-sm font-semibold text-destructive">
                          Vous avez atteint le nombre maximum de générations pour cet exercice ({maxGenerations}).
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Si vous souhaitez bénéficier d'une génération supplémentaire, merci de contacter l'équipe Cocci.
                        </p>
                      </div>
                    ) : (
                      /* ── Bouton de génération ── */
                      <Button
                        type="button"
                        onClick={() => setShowGenConfirm(true)}
                        disabled={generating}
                        className="w-full gap-2 h-11 text-sm font-semibold bg-green-700 hover:bg-green-800"
                      >
                        {generating
                          ? <><Loader2 className="h-4 w-4 animate-spin" /> Génération en cours…</>
                          : <><ExternalLink className="h-4 w-4" /> Générer le rapport</>}
                      </Button>
                    )}

                    {generateError && (
                      <p className="text-xs text-destructive flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {generateError}
                      </p>
                    )}
                  </div>
                );
              })()}

            </div>

            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold mb-1">Documents archivés</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Rapports précédents, DPEF, bilans de progrès, certifications…
              </p>
              <DocumentUploader orgId={orgId} category="rapport-rse" question="Ajoutez vos rapports RSE archivés" />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Dialog de confirmation avant génération ── */}
      <AlertDialog open={showGenConfirm} onOpenChange={setShowGenConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la génération</AlertDialogTitle>
            <AlertDialogDescription>
              Attention : chaque exercice est limité à{" "}
              <strong>{reportMaxGenerations} générations</strong> de rapport. Cette génération sera
              décomptée de votre quota. Souhaitez-vous continuer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmGenerate}>
              Continuer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
