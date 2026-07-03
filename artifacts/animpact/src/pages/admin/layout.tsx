import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Building2, Users, Shield, ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser, useClerk } from "@clerk/react";

const navItems = [
  { href: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
  { href: "/admin/organizations", label: "Organisations", icon: Building2, exact: false },
  { href: "/admin/users", label: "Utilisateurs", icon: Users, exact: false },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-border bg-sidebar flex flex-col h-screen sticky top-0">
        {/* Header */}
        <div className="h-16 flex items-center px-5 border-b border-sidebar-border gap-2 shrink-0">
          <Shield className="h-5 w-5 text-destructive shrink-0" />
          <span className="font-bold text-sm tracking-tight text-sidebar-foreground">Back-office cocci</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.exact ? location === item.href : location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              </Link>
            );
          })}
        </nav>

        {/* Bouton switch Espace client */}
        <div className="px-3 pb-2">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              className="w-full justify-start h-9 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            >
              <UserIcon className="h-4 w-4 mr-3" />
              Espace client
            </Button>
          </Link>
        </div>

        {/* Profil utilisateur */}
        <div className="px-3 pb-3 border-t border-sidebar-border bg-sidebar shrink-0 pt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start px-2 h-auto py-2 hover:bg-sidebar-accent/50"
              >
                <Avatar className="h-8 w-8 mr-3 border border-sidebar-border shrink-0">
                  <AvatarImage src={user?.imageUrl} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {user?.firstName?.charAt(0) ||
                      user?.emailAddresses[0]?.emailAddress?.charAt(0) ||
                      "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start flex-1 overflow-hidden min-w-0">
                  <span className="text-sm font-medium text-sidebar-foreground truncate w-full text-left">
                    {user?.fullName || "Utilisateur"}
                  </span>
                  <span className="text-xs text-sidebar-foreground/50 truncate w-full text-left">
                    {user?.emailAddresses[0]?.emailAddress}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-sidebar-foreground/50 shrink-0 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Back-office superadmin
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer"
                onClick={() => signOut({ redirectUrl: basePath || "/" })}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
