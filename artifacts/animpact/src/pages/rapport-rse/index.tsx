import { useState, useEffect, useCallback, useRef } from "react";
import { useModuleContext } from "@/hooks/useModuleContext";
import {
  useGetReportDraft, useUpdateReportDraft, useGenerateReportAiSection,
} from "@workspace/api-client-react";
import type { ReportDraft, ReportDraftUpdate } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { DocumentUploader } from "@/components/DocumentUploader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle, FileBarChart2, Save, CheckCircle2, Loader2, Sparkles,
  Plus, Trash2, Download, ChevronDown, ChevronRight, FileText,
  Building2, Users2, Leaf, Award, LayoutList, BookOpen, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getGetReportDraftQueryKey } from "@workspace/api-client-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type TimelineEvent = { id: string; date: string; title: string; description: string; photoUrl?: string };
type Highlight = { id: string; date: string; title: string; category: string; description: string; photos: string[] };
type InstitutionalPhoto = { url: string; caption?: string };
type LocalDraft = Partial<ReportDraftUpdate> & {
  timeline?: TimelineEvent[];
  institutionalPhotos?: InstitutionalPhoto[];
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

// ─── AI button ────────────────────────────────────────────────────────────────

function AiButton({ onClick, loading, label = "Générer avec l'IA" }: {
  onClick: () => void; loading?: boolean; label?: string;
}) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} disabled={loading} className="gap-1.5 border-primary/40 text-primary hover:bg-primary/5">
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
      {label}
    </Button>
  );
}

// ─── Timeline events editor ───────────────────────────────────────────────────

function TimelineEditor({ events, onChange }: { events: TimelineEvent[]; onChange: (evts: TimelineEvent[]) => void }) {
  const newId = () => `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const add = () => onChange([...events, { id: newId(), date: "", title: "", description: "" }]);
  const remove = (id: string) => onChange(events.filter((e) => e.id !== id));
  const update = (id: string, field: keyof TimelineEvent, value: string) =>
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
              <Input value={evt.date} onChange={(e) => update(evt.id, "date", e.target.value)} placeholder="ex : 2018" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Titre</Label>
              <Input value={evt.title} onChange={(e) => update(evt.id, "title", e.target.value)} placeholder="Création de l'entreprise" className="h-8 text-xs" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea value={evt.description} onChange={(e) => update(evt.id, "description", e.target.value)} placeholder="Quelques mots..." rows={2} className="text-xs resize-none" />
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

const HIGHLIGHT_CATEGORIES = ["Environnement", "Social", "Gouvernance", "Innovation", "Partenariat", "Certifications", "Autre"];

function HighlightEditor({ items, onChange }: { items: Highlight[]; onChange: (items: Highlight[]) => void }) {
  const newId = () => `hl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const add = () => onChange([...items, { id: newId(), date: "", title: "", category: "Autre", description: "", photos: [] }]);
  const remove = (id: string) => onChange(items.filter((h) => h.id !== id));
  const update = (id: string, field: keyof Highlight, value: string) =>
    onChange(items.map((h) => h.id === id ? { ...h, [field]: value } : h));

  return (
    <div className="space-y-3">
      {items.map((hl, i) => (
        <div key={hl.id} className="rounded-lg border bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Temps fort {i + 1}</span>
            <button onClick={() => remove(hl.id)} className="text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input value={hl.date} onChange={(e) => update(hl.id, "date", e.target.value)} placeholder="ex : Mars 2024" className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Catégorie</Label>
              <select
                value={hl.category}
                onChange={(e) => update(hl.id, "category", e.target.value)}
                className="h-8 w-full text-xs rounded-md border bg-background px-2"
              >
                {HIGHLIGHT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Titre</Label>
              <Input value={hl.title} onChange={(e) => update(hl.id, "title", e.target.value)} placeholder="Label zéro plastique" className="h-8 text-xs" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea value={hl.description} onChange={(e) => update(hl.id, "description", e.target.value)} rows={2} className="text-xs resize-none" />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="gap-1.5 w-full">
        <Plus className="h-3.5 w-3.5" /> Ajouter un temps fort
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
  const { effectiveOrgId, isReadOnly } = useModuleContext("group");
  const orgId = effectiveOrgId;

  const { data: draft, isLoading } = useGetReportDraft(orgId ?? 0, { query: { enabled: orgId != null, queryKey: getGetReportDraftQueryKey(orgId ?? 0) } });
  const { mutateAsync: saveDraft } = useUpdateReportDraft();
  const { mutateAsync: generateAiSection } = useGenerateReportAiSection();

  const [local, setLocal] = useState<LocalDraft>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [downloading, setDownloading] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Init local state from server
  useEffect(() => {
    if (draft && Object.keys(local).length === 0) {
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
        institutionalPhotos: (draft.institutionalPhotos as InstitutionalPhoto[]) ?? [],
        highlights: (draft.highlights as Highlight[]) ?? [],
        perspectivesMode: draft.perspectivesMode ?? "manual",
        perspectivesContent: draft.perspectivesContent ?? "",
        reportScope: draft.reportScope ?? "",
        reportMethodology: draft.reportMethodology ?? "",
      });
    }
  }, [draft]);

  const triggerSave = useCallback((patch: LocalDraft) => {
    if (!orgId || isReadOnly) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await saveDraft({ orgId, data: patch as ReportDraftUpdate });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("error");
      }
    }, 600);
  }, [orgId, isReadOnly, saveDraft]);

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

  const handleDownload = async () => {
    if (!orgId) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/organizations/${orgId}/report/generate`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rapport-rse.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Erreur lors de la génération du rapport. Veuillez réessayer.");
    } finally {
      setDownloading(false);
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
                  <div className="grid grid-cols-2 gap-4">
                    <FieldGroup label="Auteur">
                      <Input value={local.editorialAuthor ?? ""} onChange={(e) => update("editorialAuthor", e.target.value)} placeholder="Prénom Nom" disabled={isReadOnly} />
                    </FieldGroup>
                    <FieldGroup label="Fonction / Titre">
                      <Input value={local.editorialAuthorRole ?? ""} onChange={(e) => update("editorialAuthorRole", e.target.value)} placeholder="Directeur(trice) Général(e)" disabled={isReadOnly} />
                    </FieldGroup>
                  </div>

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

                  <FieldGroup label="Contexte additionnel" hint="Événements clés de l'année, projet phare, message spécifique (optionnel, aide l'IA)">
                    <Textarea
                      value={local.editorialContext ?? ""}
                      onChange={(e) => update("editorialContext", e.target.value)}
                      rows={2}
                      placeholder="ex : Cette année a été marquée par l'obtention de notre certification ISO 14001…"
                      disabled={isReadOnly}
                      className="resize-none"
                    />
                  </FieldGroup>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Contenu de l'éditorial</Label>
                      {!isReadOnly && (
                        <AiButton onClick={handleAiEditorial} loading={aiLoading.editorial} label="Générer avec l'IA" />
                      )}
                    </div>
                    <Textarea
                      value={local.editorialContent ?? ""}
                      onChange={(e) => update("editorialContent", e.target.value)}
                      rows={8}
                      placeholder="Rédigez ici votre éditorial ou cliquez sur « Générer avec l'IA »…"
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

                {/* ── Section 6 : Photos institutionnelles ── */}
                <SectionCard icon={FileText} title="Photos institutionnelles" subtitle="Galerie d'images pour le rapport">
                  <FieldGroup label="Photos (URLs)" hint="Une URL par ligne">
                    <Textarea
                      value={(local.institutionalPhotos ?? []).map((p) => p.url).join("\n")}
                      onChange={(e) => {
                        const urls = e.target.value.split("\n").filter((u) => u.trim());
                        update("institutionalPhotos", urls.map((url) => ({ url: url.trim() })));
                      }}
                      rows={4}
                      placeholder={"https://...photo1.jpg\nhttps://...photo2.jpg"}
                      disabled={isReadOnly}
                      className="resize-none font-mono text-xs"
                    />
                  </FieldGroup>
                </SectionCard>

                {/* ── Section 7 : Temps forts ── */}
                <SectionCard icon={Award} title="Temps forts de l'année" subtitle="Événements RSE marquants">
                  {!isReadOnly ? (
                    <HighlightEditor
                      items={local.highlights ?? []}
                      onChange={(items) => update("highlights", items)}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Lecture seule.</p>
                  )}
                </SectionCard>

                {/* ── Section 8 : Perspectives ── */}
                <SectionCard icon={Target} title="Perspectives" subtitle="Engagement et priorités pour l'an prochain">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Contenu des perspectives</Label>
                      {!isReadOnly && (
                        <AiButton onClick={handleAiPerspectives} loading={aiLoading.perspectives} label="Générer avec l'IA" />
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

                {/* ── Section 9 : Périmètre & Méthodologie ── */}
                <SectionCard icon={Leaf} title="Périmètre & Méthodologie" subtitle="Note de bas de rapport">
                  <FieldGroup label="Périmètre du rapport" hint="Entités, sites, zones géographiques couverts">
                    <Textarea
                      value={local.reportScope ?? ""}
                      onChange={(e) => update("reportScope", e.target.value)}
                      rows={3}
                      placeholder="ex : Ce rapport couvre l'ensemble des activités du groupe en France métropolitaine pour l'exercice 2024…"
                      disabled={isReadOnly}
                      className="resize-none"
                    />
                  </FieldGroup>

                  <FieldGroup label="Méthodologie de collecte" hint="Référentiels, sources, processus de validation">
                    <Textarea
                      value={local.reportMethodology ?? ""}
                      onChange={(e) => update("reportMethodology", e.target.value)}
                      rows={3}
                      placeholder="ex : Les données ont été collectées via la plateforme Cocci sur la base de…"
                      disabled={isReadOnly}
                      className="resize-none"
                    />
                  </FieldGroup>
                </SectionCard>
              </>
            )}
          </TabsContent>

          {/* ── TAB GÉNÉRER ─────────────────────────────────────────────────── */}
          <TabsContent value="generer" className="mt-2 space-y-4">
            <div className="rounded-xl border bg-card p-6 space-y-5">
              <div>
                <h2 className="text-base font-semibold">Générer votre rapport DOCX</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Le rapport intègre automatiquement toutes vos données RSE (bilan carbone, capital humain, diagnostic, plan d'actions, labels, impact score…) ainsi que le contenu éditorial que vous avez préparé ci-dessus.
                </p>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Éditorial", done: !!(local.editorialContent) },
                  { label: "Présentation entreprise", done: !!(local.companyDescription || local.companyMission) },
                  { label: "Historique", done: (local.timeline?.length ?? 0) > 0 },
                  { label: "Temps forts", done: (local.highlights?.length ?? 0) > 0 },
                  { label: "Perspectives", done: !!(local.perspectivesContent) },
                  { label: "Périmètre & Méthodo", done: !!(local.reportScope || local.reportMethodology) },
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
                  <strong>Note :</strong> Les données non renseignées dans les modules RSE (bilan carbone, diagnostic, etc.) apparaîtront avec la mention « Non évalué » dans le rapport. Le contenu éditorial préparé ici sera intégré tel quel.
                </p>
              </div>

              <Button
                onClick={handleDownload}
                disabled={downloading || isReadOnly}
                className="w-full gap-2"
                size="lg"
              >
                {downloading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Génération en cours…</>
                ) : (
                  <><Download className="h-4 w-4" /> Télécharger le rapport DOCX</>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Format Microsoft Word (.docx) — compatible Word, LibreOffice, Google Docs
              </p>
            </div>

            {/* Documents archivés */}
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
    </AppLayout>
  );
}
