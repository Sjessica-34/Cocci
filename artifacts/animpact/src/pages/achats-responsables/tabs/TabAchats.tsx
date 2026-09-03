import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useListResponsiblePurchases,
  useCreateResponsiblePurchase,
  useUpdateResponsiblePurchase,
  useDeleteResponsiblePurchase,
  getListResponsiblePurchasesQueryKey,
} from "@workspace/api-client-react";
import type { ResponsiblePurchase } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ShoppingCart, Leaf, MapPin, Recycle, Plus, Pencil, Trash2, TrendingUp, Euro, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Formatters
const formatEur = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
const formatPct = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 1 }).format(v / 100);

const purchaseSchema = z.object({
  category: z.string().min(1, "Catégorie requise"),
  amount: z.coerce.number().min(0, "Montant invalide"),
  responsibleAmount: z.coerce.number().min(0, "Montant invalide"),
  localAmount: z.coerce.number().min(0, "Montant invalide"),
  circularAmount: z.coerce.number().min(0, "Montant invalide"),
  objectivePercent: z.number().min(0).max(100, "L'objectif doit être entre 0 et 100").optional(),
}).superRefine((data, ctx) => {
  if (data.responsibleAmount > data.amount) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ne peut excéder le montant total", path: ["responsibleAmount"] });
  }
  if (data.localAmount > data.amount) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ne peut excéder le montant total", path: ["localAmount"] });
  }
  if (data.circularAmount > data.amount) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ne peut excéder le montant total", path: ["circularAmount"] });
  }
});

type PurchaseFormData = z.infer<typeof purchaseSchema>;

export function TabAchats({ orgId, isReadOnly }: { orgId: number; isReadOnly?: boolean }) {
  const { data, isLoading } = useListResponsiblePurchases(orgId);
  const rawItems = data?.items ?? [];
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMut = useCreateResponsiblePurchase();
  const updateMut = useUpdateResponsiblePurchase();
  const deleteMut = useDeleteResponsiblePurchase();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      category: "",
      amount: 0,
      responsibleAmount: 0,
      localAmount: 0,
      circularAmount: 0,
      objectivePercent: undefined,
    }
  });

  const items = useMemo(() => {
    if (!isReadOnly) return rawItems;
    const map = new Map<string, {
      row: ResponsiblePurchase;
      objectiveWeightedSum: number;
      objectiveWeight: number;
    }>();
    for (const item of rawItems) {
      const objectiveWeight = item.objectivePercent == null ? 0 : Math.max(item.amount, 1);
      const existing = map.get(item.category);
      if (!existing) {
        map.set(item.category, {
          row: { ...item },
          objectiveWeightedSum: (item.objectivePercent ?? 0) * objectiveWeight,
          objectiveWeight,
        });
        continue;
      }
      existing.row = {
        ...existing.row,
        amount: existing.row.amount + item.amount,
        responsibleAmount: existing.row.responsibleAmount + item.responsibleAmount,
        localAmount: existing.row.localAmount + item.localAmount,
        circularAmount: existing.row.circularAmount + item.circularAmount,
      };
      existing.objectiveWeightedSum += (item.objectivePercent ?? 0) * objectiveWeight;
      existing.objectiveWeight += objectiveWeight;
    }
    return Array.from(map.values()).map(({ row, objectiveWeightedSum, objectiveWeight }) => ({
      ...row,
      objectivePercent: objectiveWeight > 0
        ? Math.round(objectiveWeightedSum / objectiveWeight)
        : null,
    }));
  }, [rawItems, isReadOnly]);

  let totalAchats = 0;
  let totalResp = 0;
  let totalLocal = 0;
  let totalCirc = 0;
  items.forEach(p => {
    totalAchats += p.amount;
    totalResp += p.responsibleAmount;
    totalLocal += p.localAmount;
    totalCirc += p.circularAmount;
  });

  const opportunities = useMemo(() => {
    return items.filter(item => item.objectivePercent != null).map(item => {
      const targetAmount = item.amount * ((item.objectivePercent ?? 0) / 100);
      const gap = targetAmount - item.responsibleAmount;
      return { ...item, gap };
    }).filter(item => item.gap > 0).sort((a, b) => b.gap - a.gap).slice(0, 3);
  }, [items]);

  const openCreate = () => {
    reset({ category: "", amount: 0, responsibleAmount: 0, localAmount: 0, circularAmount: 0, objectivePercent: undefined });
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    reset({
      category: item.category,
      amount: item.amount,
      responsibleAmount: item.responsibleAmount,
      localAmount: item.localAmount,
      circularAmount: item.circularAmount,
      objectivePercent: item.objectivePercent ?? undefined,
    });
    setEditingId(item.id);
    setDialogOpen(true);
  };

  const onSubmit = (data: PurchaseFormData) => {
    if (editingId) {
      updateMut.mutate({ orgId, id: editingId, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListResponsiblePurchasesQueryKey(orgId) });
          setDialogOpen(false);
          toast({ title: "Catégorie mise à jour" });
        },
        onError: () => toast({
          title: "Mise à jour impossible",
          description: "Vérifiez les montants saisis et réessayez.",
          variant: "destructive",
        }),
      });
    } else {
      createMut.mutate({ orgId, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListResponsiblePurchasesQueryKey(orgId) });
          setDialogOpen(false);
          toast({ title: "Catégorie ajoutée" });
        },
        onError: () => toast({
          title: "Ajout impossible",
          description: "Cette catégorie existe peut-être déjà pour l'exercice courant.",
          variant: "destructive",
        }),
      });
    }
  };

  const handleDelete = (id: number) => {
    if (!confirm("Voulez-vous vraiment supprimer cette catégorie ?")) return;
    deleteMut.mutate({ orgId, id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListResponsiblePurchasesQueryKey(orgId) });
        toast({ title: "Catégorie supprimée" });
      },
      onError: () => toast({
        title: "Suppression impossible",
        description: "La catégorie n'a pas pu être supprimée.",
        variant: "destructive",
      }),
    });
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-6">
      {isReadOnly && (
        <div className="bg-muted text-muted-foreground p-3 rounded-md text-sm">
          Vue consolidée : les données des filiales sont agrégées par catégorie. Les modifications sont désactivées.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-5 pb-5">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700"><Euro className="h-5 w-5" /></div>
            <div>
              <p className="text-2xl font-bold">{formatEur(totalAchats)}</p>
              <p className="text-sm text-muted-foreground">Volume total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-5 pb-5">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700"><Leaf className="h-5 w-5" /></div>
            <div>
              <p className="text-2xl font-bold">{formatPct(totalAchats ? totalResp / totalAchats * 100 : 0)}</p>
              <p className="text-sm text-muted-foreground">Part responsable</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-5 pb-5">
            <div className="p-2 rounded-lg bg-orange-100 text-orange-600"><MapPin className="h-5 w-5" /></div>
            <div>
              <p className="text-2xl font-bold">{formatPct(totalAchats ? totalLocal / totalAchats * 100 : 0)}</p>
              <p className="text-sm text-muted-foreground">Part locale</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-5 pb-5">
            <div className="p-2 rounded-lg bg-teal-100 text-teal-700"><Recycle className="h-5 w-5" /></div>
            <div>
              <p className="text-2xl font-bold">{formatPct(totalAchats ? totalCirc / totalAchats * 100 : 0)}</p>
              <p className="text-sm text-muted-foreground">Part circulaire</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {items.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Répartition des achats par catégorie</CardTitle>
            <CardDescription>
              Comparez le montant total au montant qualifié d'achat responsable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.min(420, Math.max(220, items.length * 42))}>
              <BarChart
                data={[...items].sort((a, b) => b.amount - a.amount)}
                layout="vertical"
                margin={{ left: 8, right: 20 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(value)}
                />
                <YAxis type="category" dataKey="category" width={135} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => formatEur(value)} />
                <Bar dataKey="amount" name="Montant total" radius={[0, 4, 4, 0]}>
                  {items.map((item) => <Cell key={`total-${item.category}`} fill="#94a3b8" />)}
                </Bar>
                <Bar dataKey="responsibleAmount" name="Montant responsable" radius={[0, 4, 4, 0]}>
                  {items.map((item) => <Cell key={`responsible-${item.category}`} fill="#10b981" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <div>
            <CardTitle>Suivi des catégories d'achats</CardTitle>
            <CardDescription>Cartographiez et suivez vos achats responsables par catégorie</CardDescription>
          </div>
          {!isReadOnly && (
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-2" /> Ajouter une catégorie
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Catégorie</TableHead>
                  <TableHead className="text-right">Montant total</TableHead>
                  <TableHead>Part Responsable</TableHead>
                  <TableHead>Part Locale</TableHead>
                  <TableHead>Part Circulaire</TableHead>
                  {!isReadOnly && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isReadOnly ? 5 : 6} className="text-center py-8 text-muted-foreground">
                      Aucune donnée d'achat renseignée.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => {
                    const respPct = item.amount > 0 ? (item.responsibleAmount / item.amount) * 100 : 0;
                    const localPct = item.amount > 0 ? (item.localAmount / item.amount) * 100 : 0;
                    const circPct = item.amount > 0 ? (item.circularAmount / item.amount) * 100 : 0;

                    return (
                      <TableRow key={item.id || item.category}>
                        <TableCell className="font-medium">{item.category}</TableCell>
                        <TableCell className="text-right font-semibold">{formatEur(item.amount)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="w-10 text-xs font-medium">{Math.round(respPct)}%</span>
                            <Progress value={respPct} className="h-2 w-16" />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {item.objectivePercent == null ? "Aucun objectif" : `/ ${item.objectivePercent}%`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="w-10 text-xs font-medium">{Math.round(localPct)}%</span>
                            <Progress value={localPct} className="h-2 w-16 bg-muted [&>div]:bg-orange-500" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="w-10 text-xs font-medium">{Math.round(circPct)}%</span>
                            <Progress value={circPct} className="h-2 w-16 bg-muted [&>div]:bg-teal-500" />
                          </div>
                        </TableCell>
                        {!isReadOnly && (
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {opportunities.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Opportunités d'amélioration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {opportunities.map((opp, idx) => (
              <Card key={idx} className="bg-primary/5 border-primary/20 shadow-none">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-primary">{opp.category}</span>
                    <Target className="h-4 w-4 text-primary/60" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Pour atteindre votre objectif de <strong className="text-foreground">{opp.objectivePercent}%</strong>, il manque <strong className="text-foreground">{formatEur(opp.gap)}</strong> d'achats responsables.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier la catégorie" : "Nouvelle catégorie d'achats"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>Catégorie (ex: Prestations IT, Fournitures...)</Label>
              <Input {...register("category")} placeholder="Nom de la catégorie" />
              {errors.category && <span className="text-xs text-destructive">{errors.category.message}</span>}
            </div>
            
            <div className="grid gap-2">
              <Label>Montant total des achats (€)</Label>
              <Input type="number" step="0.01" {...register("amount")} />
              {errors.amount && <span className="text-xs text-destructive">{errors.amount.message}</span>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Montant responsable (€)</Label>
                <Input type="number" step="0.01" {...register("responsibleAmount")} />
                {errors.responsibleAmount && <span className="text-xs text-destructive">{errors.responsibleAmount.message}</span>}
              </div>
              <div className="grid gap-2">
                <Label>Objectif responsable (%)</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  placeholder="Facultatif"
                  {...register("objectivePercent", {
                    setValueAs: (value) => value === "" ? undefined : Number(value),
                  })}
                />
                {errors.objectivePercent && <span className="text-xs text-destructive">{errors.objectivePercent.message}</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">Dont montant local (€)</Label>
                <Input type="number" step="0.01" {...register("localAmount")} />
                {errors.localAmount && <span className="text-xs text-destructive">{errors.localAmount.message}</span>}
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">Dont montant circulaire (€)</Label>
                <Input type="number" step="0.01" {...register("circularAmount")} />
                {errors.circularAmount && <span className="text-xs text-destructive">{errors.circularAmount.message}</span>}
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
