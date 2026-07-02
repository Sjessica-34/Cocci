import { AppLayout } from "@/components/layout";
import { useGetMe, useUpdateMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const profileSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères."),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères."),
});

export function UserSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useGetMe({
    query: { queryKey: getGetMeQueryKey() }
  });

  const updateMe = useUpdateMe();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
    },
  });

  const initializedRef = useRef(false);

  useEffect(() => {
    if (user && !initializedRef.current) {
      form.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
      });
      initializedRef.current = true;
    }
  }, [user, form]);

  function onSubmit(values: z.infer<typeof profileSchema>) {
    updateMe.mutate(
      { data: values },
      {
        onSuccess: (updatedUser) => {
          toast({
            title: "Profil enregistré",
            description: "Vos informations personnelles ont été mises à jour.",
          });
          queryClient.setQueryData(getGetMeQueryKey(), updatedUser);
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Échec de la sauvegarde",
            description: "Une erreur est survenue. Veuillez réessayer.",
          });
        },
      }
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Mon profil</h1>
          <p className="text-muted-foreground mt-1">Gérez vos informations personnelles.</p>
        </div>

        {isLoading ? (
          <Skeleton className="h-[300px] w-full rounded-xl" />
        ) : (
          <Card>
            <CardHeader className="pb-4 border-b border-border">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-primary/20">
                  <AvatarImage src={user?.avatarUrl || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {user?.firstName?.charAt(0) || user?.email?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-xl">{user?.email}</CardTitle>
                  <CardDescription className="mt-1">
                    Membre depuis le{" "}
                    {new Date(user?.createdAt || Date.now()).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prénom</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end pt-6 border-t border-border">
                    <Button type="submit" disabled={updateMe.isPending || !form.formState.isDirty}>
                      {updateMe.isPending ? (
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
