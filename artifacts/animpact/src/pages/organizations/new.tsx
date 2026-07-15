import { useState } from "react";
import { AppLayout } from "@/components/layout";
import {
  useCreateOrganization,
  useListOrganizations,
  getListOrganizationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Building2, Building, Network, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { setCurrentOrg } from "@/hooks/useCurrentOrganization";

const SECTORS = [
  "Agriculture & Agro-alimentaire",
  "Aéronautique & Défense",
  "Bâtiment & Travaux publics",
  "Chimie & Matériaux",
  "Commerce & Distribution",
  "Culture & Média",
  "Énergie & Environnement",
  "Finance & Assurance",
  "Immobilier",
  "Industrie manufacturière",
  "Informatique & Numérique",
  "Logistique & Transport",
  "Luxe & Mode",
  "Santé & Pharmaceutique",
  "Services aux entreprises",
  "Tourisme & Hôtellerie",
  "Autre",
];

const formSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
  legalName: z.string().optional(),
  siret: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{14}$/.test(v.replace(/\s/g, "")), {
      message: "Le SIRET doit contenir 14 chiffres.",
    }),
  sector: z.string().optional(),
  size: z.enum(["TPE", "PME", "ETI", "GE"]).optional(),
  type: z.enum(["entreprise", "groupe"]).default("entreprise"),
  belongsToGroup: z.boolean().default(false),
  groupChoice: z.enum(["existing", "new"]).default("existing"),
  existingGroupId: z.number().optional(),
  newGroupName: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function OrganizationNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createOrg = useCreateOrganization();
  const { data: allOrgs = [] } = useListOrganizations();

  const existingGroups = allOrgs.filter((o) => o.type === "groupe");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      legalName: "",
      siret: "",
      sector: "",
      size: undefined,
      type: "entreprise",
      belongsToGroup: false,
      groupChoice: existingGroups.length > 0 ? "existing" : "new",
      existingGroupId: undefined,
      newGroupName: "",
    },
  });

  const watchType = form.watch("type");
  const watchBelongsToGroup = form.watch("belongsToGroup");
  const watchGroupChoice = form.watch("groupChoice");

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      let parentId: number | undefined;

      // Step 1: If creating an enterprise that belongs to a NEW group, create the group first
      if (values.type === "entreprise" && values.belongsToGroup && values.groupChoice === "new") {
        if (!values.newGroupName || values.newGroupName.trim().length < 2) {
          form.setError("newGroupName", { message: "Le nom du groupe doit contenir au moins 2 caractères." });
          setIsSubmitting(false);
          return;
        }
        const group = await createOrg.mutateAsync({ data: { name: values.newGroupName.trim(), type: "groupe" } });
        parentId = group.id;
      } else if (values.type === "entreprise" && values.belongsToGroup && values.groupChoice === "existing") {
        if (!values.existingGroupId) {
          form.setError("existingGroupId", { message: "Sélectionnez un groupe." });
          setIsSubmitting(false);
          return;
        }
        parentId = values.existingGroupId;
      }

      // Step 2: Create the main entity
      const org = await createOrg.mutateAsync({
        data: {
          name: values.name,
          legalName: values.legalName || undefined,
          siret: values.siret ? values.siret.replace(/\s/g, "") : undefined,
          sector: values.sector || undefined,
          size: values.size,
          type: values.type,
          parentId,
        },
      });

      await queryClient.invalidateQueries({ queryKey: getListOrganizationsQueryKey() });
      setCurrentOrg(org.id);

      toast({
        title: values.type === "groupe" ? "Groupe créé" : "Entreprise créée",
        description: `${org.name} a été créé${values.type === "groupe" ? "" : "e"} avec succès.`,
      });

      setLocation(`/organizations/${org.id}`);
    } catch {
      toast({
        variant: "destructive",
        title: "Échec de la création",
        description: "Une erreur est survenue. Veuillez réessayer.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/organizations">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Créer une entité</h1>
            <p className="text-muted-foreground text-sm">Ajoutez une entreprise ou un groupe à votre portefeuille RSE.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Type d'entité
            </CardTitle>
            <CardDescription>
              Choisissez si vous créez une entreprise ou un groupe d'entreprises.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                {/* ── Type selector ──────────────────────────────────────────── */}
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <RadioGroup
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v);
                          if (v === "groupe") form.setValue("belongsToGroup", false);
                        }}
                        className="grid grid-cols-2 gap-3"
                      >
                        <div
                          className={cn(
                            "flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-colors",
                            field.value === "entreprise"
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted/30",
                          )}
                          onClick={() => { field.onChange("entreprise"); form.setValue("belongsToGroup", false); }}
                        >
                          <RadioGroupItem value="entreprise" id="type-entreprise" />
                          <div>
                            <Label htmlFor="type-entreprise" className="cursor-pointer font-semibold flex items-center gap-1.5">
                              <Building className="h-4 w-4" />
                              Entreprise
                            </Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Entité avec ses propres données RSE</p>
                          </div>
                        </div>
                        <div
                          className={cn(
                            "flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-colors",
                            field.value === "groupe"
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted/30",
                          )}
                          onClick={() => { field.onChange("groupe"); form.setValue("belongsToGroup", false); }}
                        >
                          <RadioGroupItem value="groupe" id="type-groupe" />
                          <div>
                            <Label htmlFor="type-groupe" className="cursor-pointer font-semibold flex items-center gap-1.5">
                              <Network className="h-4 w-4" />
                              Groupe
                            </Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Regroupe plusieurs filiales</p>
                          </div>
                        </div>
                      </RadioGroup>
                    </FormItem>
                  )}
                />

                {/* ── Name ───────────────────────────────────────────────────── */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {watchType === "groupe" ? "Nom du groupe *" : "Nom commercial *"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={watchType === "groupe" ? "Groupe Martin" : "Mon Entreprise"}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ── Belongs to group (entreprise only) ───────────────────── */}
                {watchType === "entreprise" && (
                  <FormField
                    control={form.control}
                    name="belongsToGroup"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="belongs-to-group"
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              if (checked) {
                                form.setValue("groupChoice", existingGroups.length > 0 ? "existing" : "new");
                              }
                            }}
                          />
                          <Label htmlFor="belongs-to-group" className="cursor-pointer font-medium">
                            Cette entreprise appartient à un groupe
                          </Label>
                        </div>
                      </FormItem>
                    )}
                  />
                )}

                {/* ── Group affiliation ────────────────────────────────────── */}
                {watchType === "entreprise" && watchBelongsToGroup && (
                  <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
                    <FormField
                      control={form.control}
                      name="groupChoice"
                      render={({ field }) => (
                        <FormItem>
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                            className="space-y-2"
                          >
                            {existingGroups.length > 0 && (
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value="existing" id="group-existing" />
                                <Label htmlFor="group-existing" className="cursor-pointer">Sélectionner un groupe existant</Label>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value="new" id="group-new" />
                              <Label htmlFor="group-new" className="cursor-pointer">Créer un nouveau groupe</Label>
                            </div>
                          </RadioGroup>
                        </FormItem>
                      )}
                    />

                    {watchGroupChoice === "existing" && existingGroups.length > 0 && (
                      <FormField
                        control={form.control}
                        name="existingGroupId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Groupe</FormLabel>
                            <Select
                              onValueChange={(v) => field.onChange(Number(v))}
                              value={field.value ? String(field.value) : ""}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner un groupe…" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {existingGroups.map((g) => (
                                  <SelectItem key={g.id} value={String(g.id)}>
                                    <div className="flex items-center gap-2">
                                      <Network className="h-3.5 w-3.5 text-muted-foreground" />
                                      {g.name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {watchGroupChoice === "new" && (
                      <FormField
                        control={form.control}
                        name="newGroupName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom du nouveau groupe</FormLabel>
                            <FormControl>
                              <Input placeholder="Groupe Martin" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                )}

                {/* ── Details ─────────────────────────────────────────────── */}
                <div className="border-t border-border pt-4 space-y-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Informations complémentaires (optionnel)
                  </p>

                  <FormField
                    control={form.control}
                    name="legalName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Raison sociale</FormLabel>
                        <FormControl>
                          <Input placeholder="Mon Entreprise SAS" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="siret"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SIRET</FormLabel>
                          <FormControl>
                            <Input placeholder="14 chiffres" maxLength={17} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="size"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Taille</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="TPE">TPE — moins de 10 salariés</SelectItem>
                              <SelectItem value="PME">PME — 10 à 249 salariés</SelectItem>
                              <SelectItem value="ETI">ETI — 250 à 4 999 salariés</SelectItem>
                              <SelectItem value="GE">GE — 5 000+ salariés</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="sector"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secteur d'activité</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SECTORS.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-border">
                  <Link href="/organizations">
                    <Button type="button" variant="outline">
                      Annuler
                    </Button>
                  </Link>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {watchType === "groupe" ? "Créer le groupe" : "Créer l'entreprise"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
