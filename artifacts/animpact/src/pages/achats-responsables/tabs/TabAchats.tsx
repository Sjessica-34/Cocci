import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListResponsiblePurchasesQueryKey,
  useCreateResponsiblePurchase,
  useDeleteResponsiblePurchase,
  useListResponsiblePurchases,
  useUpdateResponsiblePurchase,
} from "@workspace/api-client-react";
import type { ResponsiblePurchase, ResponsiblePurchaseInput } from "@workspace/api-client-react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Euro, Leaf, MapPin, Pencil, Plus, Recycle, ShoppingCart, Trash2, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FormState = Pick<
  ResponsiblePurchaseInput,
  "category" | "amount" | "responsiblePercent" | "localPercent" | "circularPercent"
>;

const EMPTY_FORM: FormState = {
  category: "",
  amount: 0,
  responsiblePercent: 0,
  localPercent: 0,
  circularPercent: 0,
};

const CATEGORY_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];

const formatEur = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);

const formatPct = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value / 100);

function aggregatePurchases(items: ResponsiblePurchase[], isConsolidated: boolean) {
  if (!isConsolidated) return items;

  const groups = new Map<
    string,
    {
      row: ResponsiblePurchase;
      responsibleWeighted: number;
      localWeighted: number;
      circularWeighted: number;
      weight: number;
    }
  >();

  for (const item of items) {
    const weight = Math.max(item.amount, 1);
    const current = groups.get(item.category);
    if (!current) {
      groups.set(item.category, {
        row: { ...item },
        responsibleWeighted: item.responsiblePercent * weight,
        localWeighted: item.localPercent * weight,
        circularWeighted: item.circularPercent * weight,
        weight,
      });
      continue;
    }

    current.row = {
      ...current.row,
      amount: current.row.amount + item.amount,
    };
    current.responsibleWeighted += item.responsiblePercent * weight;
    current.localWeighted += item.localPercent * weight;
    current.circularWeighted += item.circularPercent * weight;
    current.weight += weight;
  }

  return Array.from(groups.values()).map((group) => ({
    ...group.row,
    responsiblePercent: Math.round(group.responsibleWeighted / group.weight),
    localPercent: Math.round(group.localWeighted / group.weight),
    circularPercent: Math.round(group.circularWeighted / group.weight),
  }));
}

function SliderField({
  label,
  help,
  value,
  colorClass,
  onChange,
}: {
  label: string;
  help: string;
  value: number;
  colorClass: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="font-medium">{label}</Label>
        <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${colorClass}`}>{value} %</span>
      </div>
      <Slider
        min={0}
        max={100}
        step={1}
        value={[value]}
        onValueChange={([nextValue]) => onChange(nextValue ?? 0)}
        aria-label={label}
      />
      <p className="text-xs leading-relaxed text-muted-foreground">{help}</p>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  iconClass,
}: {
  icon: typeof Euro;
  label: string;
  value: string;
  sub?: string;
  iconClass: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-5 pb-5">
        <div className={`rounded-lg p-2 ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function TabAchats({
  orgId,
  isReadOnly = false,
}: {
  orgId: number;
  isReadOnly?: boolean;
}) {
  const { data, isLoading } = useListResponsiblePurchases(orgId);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createPurchase = useCreateResponsiblePurchase();
  const updatePurchase = useUpdateResponsiblePurchase();
  const deletePurchase = useDeleteResponsiblePurchase();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const items = useMemo(
    () => aggregatePurchases(data?.items ?? [], isReadOnly),
    [data?.items, isReadOnly],
  );

  const metrics = useMemo(() => {
    const result = {
      total: 0,
      responsible: 0,
      local: 0,
      circular: 0,
    };
    for (const item of items) {
      result.total += item.amount;
      result.responsible += (item.amount * item.responsiblePercent) / 100;
      result.local += (item.amount * item.localPercent) / 100;
      result.circular += (item.amount * item.circularPercent) / 100;
    }
    return result;
  }, [items]);

  const categoryChart = useMemo(
    () =>
      [...items]
        .sort((a, b) => b.amount - a.amount)
        .map((item) => ({
          name: item.category,
          total: item.amount,
          responsible: (item.amount * item.responsiblePercent) / 100,
        })),
    [items],
  );

  const opportunities = useMemo(() => {
    const candidates = items.flatMap((item) => {
      const suggestions: { category: string; label: string; value: number }[] = [];
      if (item.responsiblePercent < 50) {
        suggestions.push({
          category: item.category,
          label: "Augmenter la part responsable",
          value: 50 - item.responsiblePercent,
        });
      }
      if (item.localPercent < 30) {
        suggestions.push({
          category: item.category,
          label: "Explorer davantage de fournisseurs locaux",
          value: 30 - item.localPercent,
        });
      }
      if (item.circularPercent < 15) {
        suggestions.push({
          category: item.category,
          label: "Identifier des alternatives circulaires",
          value: 15 - item.circularPercent,
        });
      }
      return suggestions;
    });
    return candidates.sort((a, b) => b.value - a.value).slice(0, 3);
  }, [items]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (item: ResponsiblePurchase) => {
    setEditingId(item.id);
    setForm({
      category: item.category,
      amount: item.amount,
      responsiblePercent: item.responsiblePercent,
      localPercent: item.localPercent,
      circularPercent: item.circularPercent,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const invalidatePurchases = () =>
    queryClient.invalidateQueries({ queryKey: getListResponsiblePurchasesQueryKey(orgId) });

  const save = () => {
    const category = form.category.trim();
    if (!category) {
      setFormError("Indiquez une catégorie d'achat.");
      return;
    }
    if (!Number.isFinite(form.amount) || form.amount < 0) {
      setFormError("Indiquez un montant annuel valide.");
      return;
    }

    const payload: ResponsiblePurchaseInput = {
      category,
      amount: form.amount,
      responsiblePercent: form.responsiblePercent,
      localPercent: form.localPercent,
      circularPercent: form.circularPercent,
    };

    const options = {
      onSuccess: () => {
        void invalidatePurchases();
        setDialogOpen(false);
        toast({ title: editingId ? "Catégorie mise à jour" : "Catégorie ajoutée" });
      },
      onError: () =>
        toast({
          title: "Enregistrement impossible",
          description: "Cette catégorie existe peut-être déjà pour l'exercice courant.",
          variant: "destructive",
        }),
    };

    if (editingId !== null) {
      updatePurchase.mutate({ orgId, id: editingId, data: payload }, options);
    } else {
      createPurchase.mutate({ orgId, data: payload }, options);
    }
  };

  const remove = (id: number) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette catégorie ?")) return;
    deletePurchase.mutate(
      { orgId, id },
      {
        onSuccess: () => {
          void invalidatePurchases();
          toast({ title: "Catégorie supprimée" });
        },
        onError: () =>
          toast({
            title: "Suppression impossible",
            description: "La catégorie n'a pas pu être supprimée.",
            variant: "destructive",
          }),
      },
    );
  };

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Chargement des achats…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Piloter simplement</p>
          <h2 className="text-xl font-semibold">Vos achats responsables</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Estimez vos achats annuels par grande catégorie, puis donnez votre estimation en quelques curseurs.
            Aucun calcul n&apos;est nécessaire.
          </p>
        </div>
        {!isReadOnly && (
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une catégorie
          </Button>
        )}
      </div>

      {isReadOnly && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          Vue groupe : les données des filiales sont regroupées par catégorie. La saisie se fait dans chaque filiale.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          icon={Euro}
          label="Achats annuels"
          value={formatEur(metrics.total)}
          iconClass="bg-blue-100 text-blue-700"
        />
        <KpiCard
          icon={Leaf}
          label="Part responsable"
          value={formatPct(metrics.total ? (metrics.responsible / metrics.total) * 100 : 0)}
          sub={formatEur(metrics.responsible)}
          iconClass="bg-emerald-100 text-emerald-700"
        />
        <KpiCard
          icon={MapPin}
          label="Part locale"
          value={formatPct(metrics.total ? (metrics.local / metrics.total) * 100 : 0)}
          sub={formatEur(metrics.local)}
          iconClass="bg-orange-100 text-orange-700"
        />
        <KpiCard
          icon={Recycle}
          label="Part circulaire"
          value={formatPct(metrics.total ? (metrics.circular / metrics.total) * 100 : 0)}
          sub={formatEur(metrics.circular)}
          iconClass="bg-teal-100 text-teal-700"
        />
      </div>

      {items.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Répartition par catégorie</CardTitle>
            <CardDescription>
              Les montants responsables sont calculés automatiquement à partir de vos estimations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.min(420, Math.max(220, categoryChart.length * 42))}>
              <BarChart data={categoryChart} layout="vertical" margin={{ left: 8, right: 20 }}>
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) =>
                    new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(value)
                  }
                />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => formatEur(value)} />
                <Bar dataKey="total" name="Achats annuels" radius={[0, 4, 4, 0]}>
                  {categoryChart.map((item, index) => (
                    <Cell key={`total-${item.name}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} fillOpacity={0.35} />
                  ))}
                </Bar>
                <Bar dataKey="responsible" name="Part responsable" radius={[0, 4, 4, 0]}>
                  {categoryChart.map((item, index) => (
                    <Cell key={`responsible-${item.name}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 border-b pb-4">
          <div>
            <CardTitle>Mes catégories d&apos;achats</CardTitle>
            <CardDescription>
              {items.length === 0
                ? "Commencez par renseigner une catégorie, comme les prestations, l'informatique ou la logistique."
                : `${items.length} catégorie${items.length > 1 ? "s" : ""} renseignée${items.length > 1 ? "s" : ""}`}
            </CardDescription>
          </div>
          <ShoppingCart className="hidden h-5 w-5 shrink-0 text-muted-foreground sm:block" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">Montant annuel</TableHead>
                  <TableHead>Part responsable</TableHead>
                  <TableHead>Part locale</TableHead>
                  <TableHead>Part circulaire</TableHead>
                  {!isReadOnly && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isReadOnly ? 5 : 6} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <ShoppingCart className="h-9 w-9 opacity-30" />
                        <p className="font-medium">Aucune catégorie renseignée</p>
                        {!isReadOnly && (
                          <Button variant="outline" size="sm" onClick={openCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            Ajouter ma première catégorie
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={`${item.category}-${item.id}`}>
                      <TableCell className="font-medium">{item.category}</TableCell>
                      <TableCell className="text-right font-semibold">{formatEur(item.amount)}</TableCell>
                      <TableCell>
                        <div className="flex min-w-[145px] items-center gap-2">
                          <span className="w-9 text-xs font-medium">{item.responsiblePercent}%</span>
                          <Progress value={item.responsiblePercent} className="h-2 flex-1" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-[145px] items-center gap-2">
                          <span className="w-9 text-xs font-medium">{item.localPercent}%</span>
                          <Progress value={item.localPercent} className="h-2 flex-1 bg-muted [&>div]:bg-orange-500" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-[145px] items-center gap-2">
                          <span className="w-9 text-xs font-medium">{item.circularPercent}%</span>
                          <Progress value={item.circularPercent} className="h-2 flex-1 bg-muted [&>div]:bg-teal-500" />
                        </div>
                      </TableCell>
                      {!isReadOnly && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" aria-label={`Modifier ${item.category}`} onClick={() => openEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Supprimer ${item.category}`}
                            className="text-destructive hover:text-destructive"
                            onClick={() => remove(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {opportunities.length > 0 && (
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <TrendingUp className="h-5 w-5 text-primary" />
            Pistes d&apos;amélioration
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {opportunities.map((opportunity, index) => (
              <Card key={`${opportunity.category}-${opportunity.label}`} className="border-primary/20 bg-primary/5 shadow-none">
                <CardContent className="pt-5">
                  <p className="font-semibold text-primary">{opportunity.category}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{opportunity.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier une catégorie" : "Ajouter une catégorie d'achat"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-3">
            <div className="space-y-2">
              <Label htmlFor="purchase-category">Catégorie d&apos;achat</Label>
              <Input
                id="purchase-category"
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                placeholder="Ex. informatique, prestations, matières premières…"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase-amount">Montant annuel estimé (€)</Label>
              <Input
                id="purchase-amount"
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    amount: event.target.value === "" ? 0 : Number(event.target.value),
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Une estimation suffit : utilisez le montant annuel approximatif de cette catégorie.
              </p>
            </div>
            <div className="space-y-5 rounded-lg border bg-muted/20 p-4">
              <SliderField
                label="Part locale"
                value={form.localPercent}
                colorClass="bg-orange-100 text-orange-700"
                onChange={(value) => setForm((current) => ({ ...current, localPercent: value }))}
                help="Quelle part de vos achats dans cette catégorie est réalisée auprès de fournisseurs locaux ou français ?"
              />
              <SliderField
                label="Part responsable"
                value={form.responsiblePercent}
                colorClass="bg-emerald-100 text-emerald-700"
                onChange={(value) => setForm((current) => ({ ...current, responsiblePercent: value }))}
                help="Selon vous, quelle part de ces achats répond à des critères environnementaux, sociaux ou éthiques ?"
              />
              <SliderField
                label="Part circulaire"
                value={form.circularPercent}
                colorClass="bg-teal-100 text-teal-700"
                onChange={(value) => setForm((current) => ({ ...current, circularPercent: value }))}
                help="Quelle part concerne des produits reconditionnés, recyclés ou issus de l'économie circulaire ?"
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={save} disabled={createPurchase.isPending || updatePurchase.isPending}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}