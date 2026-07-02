import { AppLayout } from "@/components/layout";
import { useGetOrganization, useUpdateOrganization, getGetOrganizationQueryKey, getListOrganizationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
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
import { ArrowLeft, Building2, Loader2, Save } from "lucide-react";
import { useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  legalName: z.string().optional(),
  siret: z.string().optional(),
  sector: z.string().optional(),
  size: z.enum(["TPE", "PME", "ETI", "GE"]).optional(),
});

export function OrganizationSettings() {
  const { id } = useParams();
  const orgId = Number(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: org, isLoading } = useGetOrganization(orgId, {
    query: { enabled: !!orgId, queryKey: getGetOrganizationQueryKey(orgId) }
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
        size: (org.size as any) || undefined,
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
            title: "Settings saved",
            description: "Organization details have been updated successfully.",
          });
          queryClient.setQueryData(getGetOrganizationQueryKey(orgId), updatedOrg);
          queryClient.invalidateQueries({ queryKey: getListOrganizationsQueryKey() });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Failed to save settings",
            description: "An error occurred while updating the organization.",
          });
        },
      }
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/organizations/${orgId}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Organization Settings</h1>
            <p className="text-muted-foreground text-sm">Update company details and profile.</p>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-[400px] w-full rounded-xl" />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Company Profile
              </CardTitle>
              <CardDescription>
                Manage public and administrative details for this entity.
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
                        <FormLabel>Organization Name *</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                          <FormLabel>Legal Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                            <Input {...field} />
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
                          <FormLabel>Industry Sector</FormLabel>
                          <FormControl>
                            <Input {...field} />
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
                          <FormLabel>Company Size</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select size" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="TPE">TPE ({"<"} 10 employees)</SelectItem>
                              <SelectItem value="PME">PME (10-249 employees)</SelectItem>
                              <SelectItem value="ETI">ETI (250-4999 employees)</SelectItem>
                              <SelectItem value="GE">GE (5000+ employees)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end pt-6 border-t border-border">
                    <Button type="submit" disabled={updateOrg.isPending || !form.formState.isDirty}>
                      {updateOrg.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save Changes
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
