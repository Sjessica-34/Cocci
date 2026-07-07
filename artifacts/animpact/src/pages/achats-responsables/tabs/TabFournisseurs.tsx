import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  getListSuppliersQueryKey,
} from "@workspace/api-client-react";
import type { Supplier, SupplierInput } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { SUPPLIER_CATEGORIES, computeCompletion, getDeptFromPostalCode, getRegionFromDept } from "../data";

interface Props {
  orgId: number;
}

type FormData = Omit<SupplierInput, never>;

const EMPTY_FORM: FormData = {
  name: null, category: null, contactName: null, phone: null, email: null,
  website: null, address: null, postalCode: null, city: null, department: null,
  region: null, country: null, siret: null, relationshipStartDate: null,
  annualAmount: null, comments: null, criticality: null, riskLevel: null,
  dependency: null, alternatives: null, certifications: null, rsePolicy: null,
  evalComments: null,
};

function RatingInput({
  value,
  onChange,
  label,
  description,
  colors,
}: {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  label: string;
  description: string;
  colors?: string[];
}) {
  const defaultColors = ["bg-gray-200", "bg-blue-200", "bg-yellow-200", "bg-orange-300", "bg-red-400"];
  const colorSet = colors ?? defaultColors;
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">{label}</Label>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="flex gap-1 mt-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? null : n)}
            className={`w-9 h-9 rounded-md text-sm font-semibold border transition-all
              ${value === n
                ? `${colorSet[n - 1]} border-transparent ring-2 ring-offset-1 ring-slate-400 text-slate-800`
                : "border-slate-200 text-slate-500 hover:border-slate-400"
              }`}
          >
            {n}
          </button>
        ))}
        {value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-muted-foreground hover:text-destructive px-1"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm text-slate-700 border-b pb-2">{title}</h3>
      {children}
    </div>
  );
}

function InputField({
  label,
  description,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  description?: string;
  value: string | null | undefined;
  onChange: (v: string | null) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <Input
        type={type}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      />
    </div>
  );
}

export function TabFournisseurs({ orgId }: Props) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useListSuppliers(orgId);
  const createMutation  = useCreateSupplier();
  const updateMutation  = useUpdateSupplier();
  const deleteMutation  = useDeleteSupplier();

  const [sheetOpen, setSheetOpen]       = useState(false);
  const [editingId, setEditingId]       = useState<number | null>(null);
  const [form, setForm]                 = useState<FormData>(EMPTY_FORM);
  const [deleteId, setDeleteId]         = useState<number | null>(null);
  const [saving, setSaving]             = useState(false);

  const suppliers = data?.items ?? [];

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditingId(s.id);
    setForm({
      name: s.name, category: s.category, contactName: s.contactName,
      phone: s.phone, email: s.email, website: s.website, address: s.address,
      postalCode: s.postalCode, city: s.city, department: s.department,
      region: s.region, country: s.country, siret: s.siret,
      relationshipStartDate: s.relationshipStartDate,
      annualAmount: s.annualAmount ?? null, comments: s.comments,
      criticality: s.criticality, riskLevel: s.riskLevel, dependency: s.dependency,
      alternatives: s.alternatives, certifications: s.certifications,
      rsePolicy: s.rsePolicy, evalComments: s.evalComments,
    });
    setSheetOpen(true);
  }

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "postalCode" && value) {
        const dept = getDeptFromPostalCode(value as string);
        if (dept) {
          next.department = dept;
          next.region     = getRegionFromDept(dept);
        }
      }
      return next;
    });
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      const payload: SupplierInput = { ...form };
      if (editingId !== null) {
        await updateMutation.mutateAsync({ orgId, id: editingId, data: payload });
      } else {
        await createMutation.mutateAsync({ orgId, data: payload });
      }
      await queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey(orgId) });
      setSheetOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (deleteId === null) return;
    await deleteMutation.mutateAsync({ orgId, id: deleteId });
    await queryClient.invalidateQueries({ queryKey: getListSuppliersQueryKey(orgId) });
    setDeleteId(null);
  }

  function getCriticalityColor(v: number | null | undefined) {
    if (!v) return "";
    if (v >= 4) return "destructive";
    if (v === 3) return "secondary";
    return "outline";
  }

  function getRiskColor(v: number | null | undefined) {
    if (!v) return "outline";
    if (v >= 4) return "destructive";
    if (v === 3) return "secondary";
    return "outline";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {suppliers.length} fournisseur{suppliers.length !== 1 ? "s" : ""} enregistré{suppliers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un fournisseur
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Chargement…</div>
      ) : suppliers.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg py-16 flex flex-col items-center gap-3 text-muted-foreground">
          <Building2 className="h-10 w-10 opacity-30" />
          <p className="font-medium">Aucun fournisseur enregistré</p>
          <p className="text-sm">Commencez par ajouter votre premier fournisseur.</p>
          <Button onClick={openCreate} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un fournisseur
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Nom</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead className="text-center">Criticité</TableHead>
                <TableHead className="text-center">Risque</TableHead>
                <TableHead>Complétude</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((s) => {
                const completion = computeCompletion(s as unknown as Record<string, unknown>);
                return (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-slate-50" onClick={() => openEdit(s)}>
                    <TableCell className="font-medium">{s.name ?? <span className="text-muted-foreground italic">Sans nom</span>}</TableCell>
                    <TableCell>{s.category ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{s.city ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-center">
                      {s.criticality ? (
                        <Badge variant={getCriticalityColor(s.criticality) as "destructive" | "secondary" | "outline" | "default"}>
                          {s.criticality}/5
                        </Badge>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {s.riskLevel ? (
                        <Badge variant={getRiskColor(s.riskLevel) as "destructive" | "secondary" | "outline" | "default"}>
                          {s.riskLevel}/5
                        </Badge>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="w-36">
                      <div className="flex items-center gap-2">
                        <Progress value={completion} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground w-8">{completion}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteId(s.id); }}
                        className="text-muted-foreground hover:text-destructive p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Supplier form sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              {editingId !== null ? "Modifier le fournisseur" : "Nouveau fournisseur"}
            </SheetTitle>
            <p className="text-sm text-muted-foreground">Tous les champs sont facultatifs. Complétez au fur et à mesure.</p>
          </SheetHeader>

          <div className="space-y-8 pb-6">
            <FormSection title="Identité">
              <FieldGroup>
                <InputField label="Nom du fournisseur" placeholder="Ex : Dupont Matériaux" value={form.name} onChange={(v) => setField("name", v)} />
                <div className="space-y-1">
                  <Label className="text-sm">Catégorie</Label>
                  <Select value={form.category ?? ""} onValueChange={(v) => setField("category", v || null)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner…" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPLIER_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </FieldGroup>
              <FieldGroup>
                <InputField label="SIRET" placeholder="12345678901234" value={form.siret} onChange={(v) => setField("siret", v)} />
                <InputField label="Date de début de relation" type="date" value={form.relationshipStartDate} onChange={(v) => setField("relationshipStartDate", v)} />
              </FieldGroup>
            </FormSection>

            <FormSection title="Contact">
              <FieldGroup>
                <InputField label="Nom du contact" placeholder="Jean Martin" value={form.contactName} onChange={(v) => setField("contactName", v)} />
                <InputField label="Téléphone" type="tel" placeholder="01 23 45 67 89" value={form.phone} onChange={(v) => setField("phone", v)} />
                <InputField label="Email" type="email" placeholder="contact@fournisseur.fr" value={form.email} onChange={(v) => setField("email", v)} />
                <InputField label="Site internet" type="url" placeholder="https://…" value={form.website} onChange={(v) => setField("website", v)} />
              </FieldGroup>
            </FormSection>

            <FormSection title="Adresse">
              <InputField label="Adresse" placeholder="12 rue des Acacias" value={form.address} onChange={(v) => setField("address", v)} />
              <FieldGroup>
                <InputField
                  label="Code postal"
                  placeholder="75001"
                  value={form.postalCode}
                  onChange={(v) => setField("postalCode", v)}
                />
                <InputField label="Ville" placeholder="Paris" value={form.city} onChange={(v) => setField("city", v)} />
                <InputField
                  label="Département"
                  placeholder="Calculé automatiquement"
                  value={form.department}
                  onChange={(v) => setField("department", v)}
                />
                <InputField label="Région" placeholder="Calculée automatiquement" value={form.region} onChange={(v) => setField("region", v)} />
                <InputField label="Pays" placeholder="France" value={form.country} onChange={(v) => setField("country", v)} />
              </FieldGroup>
            </FormSection>

            <FormSection title="Données commerciales">
              <FieldGroup>
                <div className="space-y-1">
                  <Label className="text-sm">Montant annuel des achats (€)</Label>
                  <p className="text-xs text-muted-foreground">Estimation de vos achats annuels auprès de ce fournisseur.</p>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.annualAmount ?? ""}
                    onChange={(e) => setField("annualAmount", e.target.value ? Number(e.target.value) : null)}
                  />
                </div>
              </FieldGroup>
              <div className="space-y-1">
                <Label className="text-sm">Commentaires</Label>
                <Textarea
                  placeholder="Informations complémentaires sur ce fournisseur…"
                  value={form.comments ?? ""}
                  onChange={(e) => setField("comments", e.target.value || null)}
                  rows={2}
                />
              </div>
            </FormSection>

            <FormSection title="Évaluation RSE">
              <div className="bg-slate-50 rounded-md p-3 mb-2">
                <p className="text-xs text-muted-foreground">
                  Ces indicateurs permettent de prioriser vos actions fournisseurs. Notez de 1 à 5 pour chaque dimension.
                  Consultez l'onglet <strong>Découvrir</strong> pour des définitions détaillées.
                </p>
              </div>

              <RatingInput
                label="Criticité"
                description="Importance stratégique de ce fournisseur pour votre activité. 1 = peu important, 5 = indispensable — votre activité s'arrêterait sans lui."
                value={form.criticality}
                onChange={(v) => setField("criticality", v)}
                colors={["bg-green-200", "bg-lime-200", "bg-yellow-200", "bg-orange-300", "bg-red-400"]}
              />

              <RatingInput
                label="Niveau de risque"
                description="Probabilité qu'un incident survienne avec ce fournisseur (fragilité financière, qualité, éthique). 1 = fournisseur très fiable, 5 = signaux d'alerte sérieux."
                value={form.riskLevel}
                onChange={(v) => setField("riskLevel", v)}
                colors={["bg-green-200", "bg-lime-200", "bg-yellow-200", "bg-orange-300", "bg-red-400"]}
              />

              <RatingInput
                label="Dépendance"
                description="Difficulté à remplacer ce fournisseur si nécessaire. 1 = alternatives faciles et nombreuses, 5 = aucune alternative identifiée, vous êtes captif."
                value={form.dependency}
                onChange={(v) => setField("dependency", v)}
                colors={["bg-green-200", "bg-lime-200", "bg-yellow-200", "bg-orange-300", "bg-red-400"]}
              />

              <div className="space-y-1">
                <Label className="text-sm">Alternatives disponibles</Label>
                <p className="text-xs text-muted-foreground">
                  Listez les fournisseurs alternatifs que vous pourriez solliciter en cas de défaillance.
                </p>
                <Textarea
                  placeholder="Ex : Société Dupont, Fournisseur X…"
                  value={form.alternatives ?? ""}
                  onChange={(e) => setField("alternatives", e.target.value || null)}
                  rows={2}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Certifications</Label>
                <p className="text-xs text-muted-foreground">
                  Certifications RSE, qualité ou environnementales détenues par ce fournisseur (ISO 14001, ISO 26000, B Corp, etc.).
                </p>
                <Input
                  placeholder="Ex : ISO 14001, ISO 9001…"
                  value={form.certifications ?? ""}
                  onChange={(e) => setField("certifications", e.target.value || null)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Politique RSE du fournisseur</Label>
                <p className="text-xs text-muted-foreground">
                  Ce fournisseur dispose-t-il d'une politique RSE formalisée ? Engagements environnementaux, sociaux, éthiques ?
                </p>
                <Textarea
                  placeholder="Décrivez les engagements RSE connus de ce fournisseur…"
                  value={form.rsePolicy ?? ""}
                  onChange={(e) => setField("rsePolicy", e.target.value || null)}
                  rows={2}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">Commentaires d'évaluation</Label>
                <Textarea
                  placeholder="Notes internes sur l'évaluation RSE…"
                  value={form.evalComments ?? ""}
                  onChange={(e) => setField("evalComments", e.target.value || null)}
                  rows={2}
                />
              </div>
            </FormSection>
          </div>

          <SheetFooter className="sticky bottom-0 bg-white border-t pt-4 pb-2 gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Enregistrement…" : editingId !== null ? "Enregistrer" : "Créer le fournisseur"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce fournisseur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les données de ce fournisseur seront définitivement supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
