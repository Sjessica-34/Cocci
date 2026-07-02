import { AppLayout } from "@/components/layout";
import { useListMembers, useInviteMember, useUpdateMember, getListMembersQueryKey } from "@workspace/api-client-react";
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
import { ArrowLeft, Users, Loader2, Mail, ShieldAlert, BadgeInfo } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "member", "viewer"]),
});

export function OrganizationMembers() {
  const { id } = useParams();
  const orgId = Number(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useListMembers(orgId, {
    query: { enabled: !!orgId, queryKey: getListMembersQueryKey(orgId) }
  });

  const inviteMember = useInviteMember();
  const updateMember = useUpdateMember();

  const form = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: "member",
    },
  });

  function onInvite(values: z.infer<typeof inviteSchema>) {
    inviteMember.mutate(
      { id: orgId, data: values },
      {
        onSuccess: () => {
          toast({
            title: "Invitation sent",
            description: `Invited ${values.email} as ${values.role}.`,
          });
          form.reset();
          queryClient.invalidateQueries({ queryKey: getListMembersQueryKey(orgId) });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Failed to invite member",
            description: "Please check the email address and try again.",
          });
        },
      }
    );
  }

  function handleRoleChange(memberId: number, newRole: any) {
    updateMember.mutate(
      { id: orgId, memberId, data: { role: newRole } },
      {
        onSuccess: () => {
          toast({ title: "Role updated", description: "Member role has been updated." });
          queryClient.invalidateQueries({ queryKey: getListMembersQueryKey(orgId) });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error updating role" });
        }
      }
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/organizations/${orgId}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Member Management</h1>
            <p className="text-muted-foreground text-sm">Invite colleagues and assign access roles.</p>
          </div>
        </div>

        <Card>
          <CardHeader className="bg-muted/30 border-b border-border">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" /> Invite New Member
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onInvite)} className="flex flex-col sm:flex-row gap-4 items-start">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="flex-1 w-full">
                      <FormControl>
                        <Input placeholder="colleague@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem className="w-full sm:w-40 shrink-0">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={inviteMember.isPending} className="w-full sm:w-auto">
                  {inviteMember.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Invite
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Active Members
            </CardTitle>
            <CardDescription>
              Manage access levels for existing team members.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : members?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No members found.</div>
            ) : (
              <div className="divide-y divide-border">
                {members?.map((member) => (
                  <div key={member.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarImage src={member.user?.avatarUrl || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {member.user?.firstName?.charAt(0) || member.user?.email?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm text-foreground flex items-center gap-2">
                          {member.user?.firstName} {member.user?.lastName}
                          {member.status === "invited" && (
                            <Badge variant="outline" className="text-[10px] bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{member.user?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.role === "owner" ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-md text-sm text-muted-foreground border border-border/50">
                          <ShieldAlert className="h-4 w-4" /> Owner
                        </div>
                      ) : (
                        <Select 
                          defaultValue={member.role} 
                          onValueChange={(val) => handleRoleChange(member.id, val)}
                          disabled={updateMember.isPending}
                        >
                          <SelectTrigger className="w-[120px] h-9 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
