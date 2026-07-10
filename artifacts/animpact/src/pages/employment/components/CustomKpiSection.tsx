import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListEmploymentCustomKpis,
  useCreateEmploymentCustomKpi,
  useUpdateEmploymentCustomKpi,
  useDeleteEmploymentCustomKpi,
  useListEmploymentFormulaVariables,
  getListEmploymentCustomKpisQueryKey,
  getListEmploymentFormulaVariablesQueryKey,
  getGetEmploymentResultsQueryKey,
  type EmploymentCustomKpi,
  type EmploymentCustomKpiInputCategory,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Sigma, AlertCircle } from "lucide-react";
import { FieldHelp } from "@/components/FieldHelp";

interface Props {
  orgId: number;
  category: EmploymentCustomKpiInputCategory;
  readOnly: boolean;
  title: string;
}

const OPERATORS = ["+", "-", "*", "/", "(", ")"];

interface KpiFormState {
  name: string;
  unit: string;
  mode: "value" | "formula";
  value: string;
  formula: string;
}

function emptyKpiForm(): KpiFormState {
  return { name: "", unit: "", mode: "value", value: "", formula: "" };
}

export function CustomKpiSection({ orgId, category, readOnly, title }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<KpiFormState>(emptyKpiForm());
  const [error, setError] = useState<string | null>(null);

  const { data: kpisData, isLoading } = useListEmploymentCustomKpis(orgId, {
    query: { enabled: !!orgId, queryKey: getListEmploymentCustomKpisQueryKey(orgId) },
  });
  const { data: variablesData } = useListEmploymentFormulaVariables(orgId, {
    query: { enabled: !!orgId, queryKey: getListEmploymentFormulaVariablesQueryKey(orgId) },
  });

  const kpis = (kpisData?.items ?? []).filter((k) => k.category === category);
  const variables = variablesData?.items ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListEmploymentCustomKpisQueryKey(orgId) });
    queryClient.invalidateQueries({ queryKey: getGetEmploymentResultsQueryKey(orgId) });
  };

  const { mutate: createKpi, isPending: creating } = useCreateEmploymentCustomKpi({
    mutation: {
      onSuccess: () => {
        invalidate();
        closeDialog();
      },
      onError: (err: unknown) => setError(extractError(err)),
    },
  });
  const { mutate: updateKpi, isPending: updating } = useUpdateEmploymentCustomKpi({
    mutation: {
      onSuccess: () => {
        invalidate();
        closeDialog();
      },
      onError: (err: unknown) => setError(extractError(err)),
    },
  });
  const { mutate: deleteKpi } = useDeleteEmploymentCustomKpi({
    mutation: { onSuccess: invalidate },
  });

  function extractError(err: unknown): string {
    const anyErr = err as { error?: string } | undefined;
    return anyErr?.error ?? "Une erreur est survenue lors de l'enregistrement de la formule.";
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyKpiForm());
    setError(null);
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyKpiForm());
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(kpi: EmploymentCustomKpi) {
    setEditingId(kpi.id);
    setForm({
      name: kpi.name,
      unit: kpi.unit ?? "",
      mode: kpi.mode as "value" | "formula",
      value: kpi.value != null ? String(kpi.value) : "",
      formula: kpi.formula ?? "",
    });
    setError(null);
    setDialogOpen(true);
  }

  function insertToken(token: string) {
    setForm((f) => ({ ...f, formula: `${f.formula}${f.formula && !f.formula.endsWith(" ") ? " " : ""}${token} ` }));
  }

  function handleSubmit() {
    setError(null);
    if (!form.name.trim()) {
      setError("Le nom de l'indicateur est requis.");
      return;
    }
    const payload = {
      category,
      name: form.name.trim(),
      unit: form.unit.trim() || null,
      mode: form.mode,
      value: form.mode === "value" ? (form.value === "" ? null : Number(form.value)) : null,
      formula: form.mode === "formula" ? form.formula.trim() || null : null,
    };
    if (form.mode === "formula" && !payload.formula) {
      setError("Composez une formule à l'aide des variables ci-dessous.");
      return;
    }
    if (editingId != null) {
      updateKpi({ orgId, id: editingId, data: payload });
    } else {
      createKpi({ orgId, data: payload });
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Sigma className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
        {!readOnly && (
          <Button size="sm" variant="outline" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" /> Ajouter un indicateur
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : kpis.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun indicateur personnalisé pour l'instant.</p>
        ) : (
          <div className="space-y-2">
            {kpis.map((kpi) => (
              <div key={kpi.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{kpi.name}</span>
                    {kpi.mode === "formula" && <Badge variant="secondary" className="text-[10px]">Formule</Badge>}
                  </div>
                  {kpi.mode === "formula" && <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{kpi.formula}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold tabular-nums">
                    {kpi.computedValue != null ? `${kpi.computedValue}${kpi.unit ? ` ${kpi.unit}` : ""}` : (
                      <span className="text-xs font-normal text-amber-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Donnée manquante
                      </span>
                    )}
                  </span>
                  {!readOnly && (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(kpi)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cet indicateur ?</AlertDialogTitle>
                            <AlertDialogDescription>Cette action est définitive.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteKpi({ orgId, id: kpi.id })}>Supprimer</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId != null ? "Modifier l'indicateur" : "Nouvel indicateur personnalisé"}</DialogTitle>
            <DialogDescription>
              Créez un indicateur avec une valeur saisie manuellement, ou calculé automatiquement à partir d'une formule.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="kpiName">Nom de l'indicateur</Label>
              <Input id="kpiName" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex. Taux de féminisation du management" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="kpiUnit">Unité (optionnel)</Label>
              <Input id="kpiUnit" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="Ex. %, h, €..." />
            </div>

            <RadioGroup value={form.mode} onValueChange={(v) => setForm((f) => ({ ...f, mode: v as "value" | "formula" }))} className="flex gap-6">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="value" id="kpiModeValue" />
                <Label htmlFor="kpiModeValue" className="text-sm font-normal">Valeur manuelle</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="formula" id="kpiModeFormula" />
                <Label htmlFor="kpiModeFormula" className="text-sm font-normal">Formule calculée</Label>
              </div>
            </RadioGroup>

            {form.mode === "value" ? (
              <div className="space-y-1.5">
                <Label htmlFor="kpiValue">Valeur</Label>
                <Input id="kpiValue" type="number" step="0.01" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
              </div>
            ) : (
              <div className="space-y-2">
                <FieldHelp
                  label="Formule"
                  help="Composez votre formule en sélectionnant des variables et des opérateurs ci-dessous. Le résultat est recalculé automatiquement dès que les données concernées changent."
                />
                <Input
                  value={form.formula}
                  onChange={(e) => setForm((f) => ({ ...f, formula: e.target.value }))}
                  placeholder="Ex. taux_femmes / 2"
                  className="font-mono text-sm"
                />
                <div className="flex flex-wrap gap-1.5">
                  {OPERATORS.map((op) => (
                    <Button key={op} type="button" variant="outline" size="sm" className="h-7 w-9 font-mono" onClick={() => insertToken(op)}>
                      {op}
                    </Button>
                  ))}
                </div>
                <Select onValueChange={(code) => insertToken(code)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Insérer une variable..." />
                  </SelectTrigger>
                  <SelectContent>
                    {variables.map((v) => (
                      <SelectItem key={v.code} value={v.code}>
                        {v.label} {v.unit ? `(${v.unit})` : ""} — {v.value != null ? v.value : "non renseigné"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={creating || updating}>
              {editingId != null ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
