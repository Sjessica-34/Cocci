import { useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout";
import { OrgSubNav } from "@/components/shared/OrgSubNav";
import { GroupModuleBanner } from "@/components/GroupModuleBanner";
import {
  useGetOrganization,
  useUpdateOrganization,
  useListOrganizations,
  getGetOrganizationQueryKey,
  getListOrganizationsQueryKey,
} from "@workspace/api-client-react";
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
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
import { Building2, Loader2, Save, Network, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { setCurrentOrg } from "@/hooks/useCurrentOrganization";
import { Separator } from "@/components/ui/separator";
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
import { useLocation } from "wouter";

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
  exerciseOpeningMonth: z.coerce.number().int().min(1).max(12),
});

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export function OrganizationSettings() {
  const { id } = useParams();
  const orgId = Number(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Capture the navigation context BEFORE setCurrentOrg fires in the effect below.
  // This lets us detect when the user arrived here from a subsidiary context,
  // making the admin page read-only (groupe-scope module).
  const { currentOrgId: navOrgId } = useCurrentOrganization();
  const navOrgAtMountRef = useRef(navOrgId);
  const { data: allOrgs = [] } = useListOrganizations();
  const rootOrg = allOrgs.find((o) => !o.parentId);
  const isAdminReadOnly = allOrgs.some(
    (o) => o.parentId === rootOrg?.id && o.id === navOrgAtMountRef.current,
  );

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
      exerciseOpeningMonth: 12,
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
        exerciseOpeningMonth: org.exerciseOpeningMonth ?? 12,
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

  function handleTransformToGroup() {
    updateOrg.mutate(
      { id: orgId, data: { type: "groupe" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOrganizationsQueryKey() });
          setLocation("/onboarding/filiales");
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Erreur",
            description: "La transformation a échoué. Réessayez.",
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

        {isAdminReadOnly && <GroupModuleBanner />}

        <OrgSubNav orgId={orgId} />

        {/* @ts-expect-error -- `inert` est un attribut HTML5 valide, pas encore dans les types JSX React */}
        <div inert={isAdminReadOnly ? "" : undefined} className={isAdminReadOnly ? "opacity-70" : ""}>
        {isLoading ? (
          <Skeleton className="h-[480px] w-full rounded-xl" />
        ) : (
          <>
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

                  <Separator />

                  {/* Exercice annuel */}
                  <div>
                    <p className="text-sm font-medium text-foreground mb-4">Exercice annuel</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FormField
                        control={form.control}
                        name="exerciseOpeningMonth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mois d'ouverture du nouvel exercice</FormLabel>
                            <Select
                              onValueChange={(v) => field.onChange(Number(v))}
                              value={String(field.value)}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {MONTHS.map((label, i) => (
                                  <SelectItem key={label} value={String(i + 1)}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription className="text-xs">
                              À partir de ce mois, le bouton « Clôturer et créer l'exercice suivant » devient
                              disponible.
                            </FormDescription>
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

          {/* Transformer en groupe — affiché seulement pour les entreprises simples */}
          {org && org.type === "entreprise" && !org.parentId && (
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Network className="h-5 w-5 text-destructive/70" />
                  Zone avancée
                </CardTitle>
                <CardDescription>
                  Ces actions modifient la structure de votre compte.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-muted/40 border border-border">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Transformer cette entreprise en groupe</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Votre compte deviendra un groupe. Vous pourrez ensuite créer des filiales.
                        Cette action est irréversible.
                      </p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="shrink-0">
                        <Network className="mr-1.5 h-3.5 w-3.5" />
                        Transformer
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Transformer en groupe ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          <strong>{org.name}</strong> deviendra un groupe. Vous serez redirigé vers
                          le wizard pour créer vos premières filiales. Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleTransformToGroup} disabled={updateOrg.isPending}>
                          {updateOrg.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Transformer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          )}
          </>
        )}
        </div>{/* /inert */}
      </div>
    </AppLayout>
  );
}
