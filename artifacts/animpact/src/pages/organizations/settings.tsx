import { useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout";
import { OrgSubNav } from "@/components/shared/OrgSubNav";
import {
  useGetOrganization,
  useUpdateOrganization,
  getGetOrganizationQueryKey,
  getListOrganizationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Building2, Loader2, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { setCurrentOrg } from "@/hooks/useCurrentOrganization";
import { Separator } from "@/components/ui/separator";

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
});

export function OrganizationSettings() {
  const { id } = useParams();
  const orgId = Number(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (orgId > 0) setCurrentOrg(orgId);
    return () => setCurrentOrg(null);
  }, [orgId]);

  const { data: org, isLoading } = useGetOrganization(orgId, {
    query: { enabled: !!orgId, queryKey: getGetOrganizationQueryKey(orgId) },
  });

  const updateOrg = useUpdateOrganization();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      legalName: "",
      siret: "",
      sector: "",
      size: undefined,
    },
  });

  const initializedRef = useRef(false);

  useEffect(() => {
    if (org && !initializedRef.current) {
      form.reset({
        name: org.name || "",
        legalName: org.legalName || "",
        siret: org.siret || "",
        sector: org.sector || "",
        size: (org.size as "TPE" | "PME" | "ETI" | "GE") || undefined,
      });
      initializedRef.current = true;
    }
  }, [org, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    updateOrg.mutate(
      { id: orgId, data: values },
      {
        onSuccess: (updatedOrg) => {
          toast({
            title: "Paramètres sauvegardés",
            description: "Les informations de l'organisation ont été mises à jour.",
          });
          queryClient.setQueryData(getGetOrganizationQueryKey(orgId), updatedOrg);
          queryClient.invalidateQueries({ queryKey: getListOrganizationsQueryKey() });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Erreur lors de la sauvegarde",
            description: "Une erreur est survenue. Réessayez.",
          });
        },
      },
    );
  }

  return (
    <AppLayout>
      <div className="space-y-1 max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Paramètres</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gérez les informations et le profil de l'organisation.
          </p>
        </div>

        <OrgSubNav orgId={orgId} />

        {isLoading ? (
          <Skeleton className="h-[480px] w-full rounded-xl" />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Profil de l'entreprise
              </CardTitle>
              <CardDescription>
                Renseignez les informations légales et organisationnelles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Nom commercial */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom commercial *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  {/* Informations légales */}
                  <div>
                    <p className="text-sm font-medium text-foreground mb-4">Informations légales</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FormField
                        control={form.control}
                        name="legalName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Raison sociale</FormLabel>
                            <FormControl>
                              <Input placeholder="SAS, SARL, SA…" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="siret"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SIRET</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="14 chiffres"
                                {...field}
                                maxLength={17}
                              />
                            </FormControl>
                            <FormDescription className="text-xs">
                              14 chiffres sans espaces
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Classification */}
                  <div>
                    <p className="text-sm font-medium text-foreground mb-4">Classification</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                                  <SelectItem key={s} value={s}>
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="size"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Taille de l'entreprise</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
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
                  </div>

                  <div className="flex justify-end pt-4 border-t border-border">
                    <Button
                      type="submit"
                      disabled={updateOrg.isPending || !form.formState.isDirty}
                    >
                      {updateOrg.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Enregistrer
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
