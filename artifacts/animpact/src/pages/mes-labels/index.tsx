import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListLabels,
  useCreateLabel,
  useUpdateLabel,
  useDeleteLabel,
  useListDocuments,
  getListLabelsQueryKey,
  getListDocumentsQueryKey,
} from "@workspace/api-client-react";
import type { Label, LabelInput, DocumentMeta } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label as FormLabel } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Award, Plus, Pencil, Trash2, FileText, ExternalLink, FolderOpen } from "lucide-react";
import { DocumentUploader } from "@/components/DocumentUploader";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { CATEGORY_LABELS } from "@/components/DocumentUploader";
import { cn } from "@/lib/utils";

const KNOWN_LABELS: { name: string; holder: string }[] = [
  { name: "B Corp", holder: "B Lab" },
  { name: "ISO 14001", holder: "Certification ISO" },
  { name: "ISO 26000", holder: "Certification ISO" },
  { name: "ISO 50001", holder: "Certification ISO" },
  { name: "Ecocert", holder: "Ecocert France" },
  { name: "Label Bas-Carbone", holder: "Ministère de la Transition Écologique" },
  { name: "Lucie 26000", holder: "Lucie Agency" },
  { name: "HQE", holder: "Cerqual / Certivéa" },
  { name: "FSC", holder: "Forest Stewardship Council" },
  { name: "MSC", holder: "Marine Stewardship Council" },
  { name: "Rainforest Alliance", holder: "Rainforest Alliance" },
  { name: "Commerce équitable", holder: "Max Havelaar France" },
  { name: "Entreprise du Patrimoine Vivant (EPV)", holder: "Direction Générale des Entreprises" },
];

const LABEL_COLORS = [
  "bg-emerald-100 text-emerald-700",
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-orange-100 text-orange-700",
];

function labelColor(index: number) {
  return LABEL_COLORS[index % LABEL_COLORS.length];
}

function LogoDisplay({ logoUrl, name, index, size = "md" }: { logoUrl: string | null | undefined; name: string | null | undefined; index: number; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "h-10 w-10 text-base" : size === "lg" ? "h-16 w-16 text-2xl" : "h-12 w-12 text-lg";
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name ?? "Logo"}
        className={cn("rounded-lg object-contain border bg-white p-1", sizeClass)}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <div className={cn("rounded-lg flex items-center justify-center font-bold shrink-0", labelColor(index), sizeClass)}>
      {name ? name.charAt(0).toUpperCase() : <Award className="h-5 w-5" />}
    </div>
  );
}

const EMPTY_FORM: LabelInput = { name: null, logoUrl: null, holder: null, year: null, score: null, documentIds: [] };

function DocPicker({ docs, selected, onChange }: { docs: DocumentMeta[]; selected: number[]; onChange: (ids: number[]) => void }) {
  const categories = Array.from(new Set(docs.map((d) => d.category))).sort();
  if (docs.length === 0) return <p className="text-sm text-muted-foreground py-2">Aucun document disponible. Ajoutez des documents dans "Mes documents".</p>;
  return (
    <div className="space-y-3 max-h-48 overflow-y-auto border rounded-md p-3">
      {categories.map((cat) => {
        const catDocs = docs.filter((d) => d.category === cat);
        return (
          <div key={cat}>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">{CATEGORY_LABELS[cat] ?? cat}</p>
            <div className="space-y-1">
              {catDocs.map((doc) => (
                <div key={doc.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`doc-${doc.id}`}
                    checked={selected.includes(doc.id)}
                    onCheckedChange={(checked) => {
                      if (checked) onChange([...selected, doc.id]);
                      else onChange(selected.filter((id) => id !== doc.id));
                    }}
                  />
                  <label htmlFor={`doc-${doc.id}`} className="text-sm text-foreground cursor-pointer truncate flex-1">{doc.originalName}</label>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LabelCard({ label, index, docs, onEdit, onDelete }: { label: Label; index: number; docs: DocumentMeta[]; onEdit: (l: Label) => void; onDelete: (id: number) => void }) {
  const linkedDocs = docs.filter((d) => label.documentIds.includes(d.id));

  return (
    <div className="border rounded-xl bg-white p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <LogoDisplay logoUrl={label.logoUrl} name={label.name} index={index} size="lg" />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base leading-tight">{label.name ?? <span className="text-muted-foreground italic">Sans nom</span>}</h3>
          {label.holder && <p className="text-sm text-muted-foreground mt-0.5">{label.holder}</p>}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {label.year && <Badge variant="secondary">{label.year}</Badge>}
            {label.score && <Badge className={cn("border-0", labelColor(index))}>{label.score}</Badge>}
            {linkedDocs.length > 0 && (
              <Badge variant="outline" className="gap-1">
                <FileText className="h-3 w-3" />
                {linkedDocs.length} document{linkedDocs.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(label)}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(label.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      {linkedDocs.length > 0 && (
        <div className="border-t pt-3">
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">Documents associés</p>
          <div className="space-y-1">
            {linkedDocs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3 w-3 shrink-0" />
                <span className="truncate">{doc.originalName}</span>
                <span className="shrink-0 text-[10px]">({CATEGORY_LABELS[doc.category] ?? doc.category})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function MesLabels() {
  const { currentOrgId } = useCurrentOrganization();
  const queryClient = useQueryClient();

  const { data: labelsData, isLoading } = useListLabels(currentOrgId ?? 0, { query: { enabled: !!currentOrgId, queryKey: getListLabelsQueryKey(currentOrgId ?? 0) } });
  const { data: docsData } = useListDocuments(currentOrgId ?? 0, { query: { enabled: !!currentOrgId, queryKey: getListDocumentsQueryKey(currentOrgId ?? 0) } });

  const createMut = useCreateLabel();
  const updateMut = useUpdateLabel();
  const deleteMut = useDeleteLabel();

  const [sheetOpen, setSheetOpen]   = useState(false);
  const [editId, setEditId]         = useState<number | null>(null);
  const [form, setForm]             = useState<LabelInput>(EMPTY_FORM);
  const [deleteId, setDeleteId]     = useState<number | null>(null);
  const [saving, setSaving]         = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [quickFill, setQuickFill]   = useState<string>("");

  const labels = labelsData?.items ?? [];
  const docs   = (docsData ?? []) as DocumentMeta[];

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setLogoPreview("");
    setQuickFill("");
    setSheetOpen(true);
  }

  function openEdit(label: Label) {
    setEditId(label.id);
    setForm({ name: label.name, logoUrl: label.logoUrl, holder: label.holder, year: label.year, score: label.score, documentIds: label.documentIds });
    setLogoPreview(label.logoUrl ?? "");
    setQuickFill("");
    setSheetOpen(true);
  }

  function applyQuickFill(value: string) {
    setQuickFill(value);
    const known = KNOWN_LABELS.find((l) => l.name === value);
    if (known) setForm((prev) => ({ ...prev, name: known.name, holder: known.holder }));
  }

  function setField<K extends keyof LabelInput>(k: K, v: LabelInput[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function submit() {
    if (!currentOrgId) return;
    setSaving(true);
    try {
      if (editId !== null) await updateMut.mutateAsync({ orgId: currentOrgId, id: editId, data: form });
      else await createMut.mutateAsync({ orgId: currentOrgId, data: form });
      await queryClient.invalidateQueries({ queryKey: getListLabelsQueryKey(currentOrgId) });
      setSheetOpen(false);
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (deleteId === null || !currentOrgId) return;
    await deleteMut.mutateAsync({ orgId: currentOrgId, id: deleteId });
    await queryClient.invalidateQueries({ queryKey: getListLabelsQueryKey(currentOrgId) });
    setDeleteId(null);
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Award className="h-6 w-6 text-amber-500" />
              Mes labels
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Centralisez vos certifications et labels RSE — B Corp, ISO 14001, Ecocert…
            </p>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Ajouter un label</Button>
        </div>

        {!currentOrgId && (
          <div className="flex items-center gap-3 p-5 rounded-xl border border-amber-200 bg-amber-50">
            <Award className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">Sélectionnez une organisation dans la barre latérale.</p>
          </div>
        )}

        {isLoading && currentOrgId && (
          <div className="text-sm text-muted-foreground py-8 text-center">Chargement…</div>
        )}

        {!isLoading && !!currentOrgId && labels.length === 0 && (
          <div className="border-2 border-dashed rounded-xl py-20 flex flex-col items-center gap-4 text-muted-foreground">
            <div className="h-14 w-14 rounded-2xl bg-amber-100 flex items-center justify-center">
              <Award className="h-7 w-7 text-amber-500" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">Aucun label enregistré</p>
              <p className="text-sm mt-1">Ajoutez vos certifications RSE pour les centraliser ici.</p>
            </div>
            <Button onClick={openCreate} variant="outline"><Plus className="h-4 w-4 mr-2" />Ajouter un label</Button>
          </div>
        )}

        {!isLoading && !!currentOrgId && labels.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {labels.map((label, i) => (
              <LabelCard
                key={label.id}
                label={label}
                index={i}
                docs={docs}
                onEdit={openEdit}
                onDelete={(id) => setDeleteId(id)}
              />
            ))}
          </div>
        )}

        {!!currentOrgId && (
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-2 mb-1">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Documents labels & certifications</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Certificats, attestations, rapports d'audit, documents de renouvellement…
            </p>
            <DocumentUploader
              orgId={currentOrgId}
              category="mes-labels"
              question="Ajoutez vos certificats et attestations de labels"
            />
          </div>
        )}
      </div>

      {/* Add / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle>{editId !== null ? "Modifier le label" : "Ajouter un label"}</SheetTitle>
            <p className="text-sm text-muted-foreground">Renseignez les informations de votre certification.</p>
          </SheetHeader>

          <div className="space-y-5 pb-6">
            {/* Quick fill */}
            {editId === null && (
              <div className="space-y-1">
                <FormLabel className="text-sm">Pré-remplir depuis un label connu (optionnel)</FormLabel>
                <Select value={quickFill} onValueChange={applyQuickFill}>
                  <SelectTrigger><SelectValue placeholder="Choisir un label…" /></SelectTrigger>
                  <SelectContent>
                    {KNOWN_LABELS.map((l) => (
                      <SelectItem key={l.name} value={l.name}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Logo */}
            <div className="space-y-2">
              <FormLabel className="text-sm">Logo (URL)</FormLabel>
              <div className="flex items-center gap-3">
                <div className="shrink-0">
                  {logoPreview
                    ? <img src={logoPreview} alt="Logo" className="h-12 w-12 rounded-lg object-contain border bg-white p-1" onError={() => setLogoPreview("")} />
                    : <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center"><Award className="h-6 w-6 text-slate-400" /></div>}
                </div>
                <Input
                  placeholder="https://…/logo.png"
                  value={form.logoUrl ?? ""}
                  onChange={(e) => { setField("logoUrl", e.target.value || null); setLogoPreview(e.target.value); }}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1">
              <FormLabel className="text-sm">Nom du label</FormLabel>
              <Input placeholder="Ex : B Corp" value={form.name ?? ""} onChange={(e) => setField("name", e.target.value || null)} />
            </div>

            {/* Holder */}
            <div className="space-y-1">
              <FormLabel className="text-sm">Porteur / Organisme certificateur</FormLabel>
              <Input placeholder="Ex : B Lab, Ecocert France…" value={form.holder ?? ""} onChange={(e) => setField("holder", e.target.value || null)} />
            </div>

            {/* Year + Score */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <FormLabel className="text-sm">Année d'obtention</FormLabel>
                <Input
                  type="number"
                  placeholder={String(new Date().getFullYear())}
                  min={1990}
                  max={new Date().getFullYear() + 5}
                  value={form.year ?? ""}
                  onChange={(e) => setField("year", e.target.value ? parseInt(e.target.value) : null)}
                />
              </div>
              <div className="space-y-1">
                <FormLabel className="text-sm">Score / Niveau</FormLabel>
                <Input placeholder="Ex : 87/100, Gold…" value={form.score ?? ""} onChange={(e) => setField("score", e.target.value || null)} />
              </div>
            </div>

            {/* Document picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel className="text-sm">Documents associés</FormLabel>
                {(form.documentIds ?? []).length > 0 && (
                  <span className="text-xs text-muted-foreground">{(form.documentIds ?? []).length} sélectionné{(form.documentIds ?? []).length !== 1 ? "s" : ""}</span>
                )}
              </div>
              <DocPicker
                docs={docs}
                selected={form.documentIds ?? []}
                onChange={(ids) => setField("documentIds", ids)}
              />
            </div>
          </div>

          <SheetFooter className="sticky bottom-0 bg-white border-t pt-4 pb-2 gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Annuler</Button>
            <Button onClick={submit} disabled={saving}>{saving ? "Enregistrement…" : editId !== null ? "Enregistrer" : "Créer"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce label ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
