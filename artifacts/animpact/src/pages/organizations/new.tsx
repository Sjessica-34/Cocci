import { AppLayout } from "@/components/layout";
import { useCreateOrganization, getListOrganizationsQueryKey } from "@workspace/api-client-react";
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
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Building2, Loader2 } from "lucide-react";
import { Link } from "wouter";

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

export function OrganizationNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createOrg = useCreateOrganization();

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

  function onSubmit(values: z.infer<typeof formSchema>) {
    createOrg.mutate(
      { data: values },
      {
        onSuccess: (org) => {
          toast({
            title: "Organisation créée",
            description: `${org.name} a été créée avec succès.`,
          });
          queryClient.invalidateQueries({ queryKey: getListOrganizationsQueryKey() });
          setLocation(`/organizations/${org.id}`);
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Échec de la création",
            description: "Une erreur est survenue. Veuillez réessayer.",
          });
        },
      }
    );
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
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Créer une organisation</h1>
            <p className="text-muted-foreground text-sm">Ajoutez une nouvelle entité à votre portefeuille RSE.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Informations de l'entreprise
            </CardTitle>
            <CardDescription>
              Renseignez les informations de base. Vous pourrez les compléter ultérieurement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom commercial *</FormLabel>
                      <FormControl>
                        <Input placeholder="Mon Entreprise" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                  <FormField
                    control={form.control}
                    name="size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Taille de l'entreprise</FormLabel>
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

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Link href="/organizations">
                    <Button type="button" variant="outline">
                      Annuler
                    </Button>
                  </Link>
                  <Button type="submit" disabled={createOrg.isPending}>
                    {createOrg.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Créer l'organisation
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
