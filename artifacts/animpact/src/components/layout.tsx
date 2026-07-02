import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { useListOrganizations } from "@workspace/api-client-react";
import {
  Building2,
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  User as UserIcon,
  Leaf,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentOrganization, setCurrentOrg } from "@/hooks/useCurrentOrganization";
import { cn } from "@/lib/utils";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const { currentOrgId } = useCurrentOrganization();
  const { data: orgs } = useListOrganizations();
  const currentOrg = orgs?.find((o) => o.id === currentOrgId) ?? null;

  const insideOrg = location.startsWith("/organizations/") && location !== "/organizations/new";

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/organizations", label: "Entreprises", icon: Building2 },
    { href: "/settings", label: "Paramètres", icon: Settings },
  ];

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border bg-sidebar shrink-0">
        <Leaf className="h-6 w-6 text-sidebar-primary mr-2 shrink-0" />
        <span className="text-sidebar-foreground font-bold tracking-tight">A-NIM-PACT</span>
      </div>

      <div className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
        {/* Org switcher — visible when navigating inside an org */}
        {insideOrg && orgs && orgs.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 px-2 mb-1.5">
              Entreprise active
            </p>
            {orgs.length === 1 ? (
              <div className="flex items-center gap-2 px-2 py-2 rounded-md bg-sidebar-accent/60">
                <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                  {(currentOrg ?? orgs[0]).name.charAt(0)}
                </div>
                <span className="text-sm font-medium text-sidebar-foreground truncate flex-1">
                  {(currentOrg ?? orgs[0]).name}
                </span>
              </div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start px-2 h-9 hover:bg-sidebar-accent/60 text-sidebar-foreground"
                  >
                    <div className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0 mr-2">
                      {(currentOrg ?? orgs[0]).name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium truncate flex-1 text-left">
                      {currentOrg?.name ?? orgs[0].name}
                    </span>
                    <ChevronsUpDown className="h-3.5 w-3.5 text-sidebar-foreground/40 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Changer d'entreprise</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {orgs.map((org) => (
                    <Link key={org.id} href={`/organizations/${org.id}`}>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => setCurrentOrg(org.id)}
                      >
                        <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] shrink-0 mr-2">
                          {org.name.charAt(0)}
                        </div>
                        <span className="truncate">{org.name}</span>
                      </DropdownMenuItem>
                    </Link>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <div className="my-3 border-t border-sidebar-border" />
          </div>
        )}

        {/* Main nav */}
        <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 px-2 mb-1.5">
          Navigation
        </p>
        {navItems.map((item) => {
          const isActive =
            item.href === "/organizations"
              ? location === "/organizations" || location === "/organizations/new"
              : location === item.href || location.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start h-9",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <item.icon className="h-4 w-4 mr-3" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </div>

      {/* User profile */}
      <div className="p-3 border-t border-sidebar-border bg-sidebar shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start px-2 h-auto py-2 hover:bg-sidebar-accent/50"
            >
              <Avatar className="h-8 w-8 mr-3 border border-sidebar-border shrink-0">
                <AvatarImage src={user?.imageUrl} />
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
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
            <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/settings">
              <DropdownMenuItem className="cursor-pointer">
                <UserIcon className="h-4 w-4 mr-2" />
                Profil & Paramètres
              </DropdownMenuItem>
            </Link>
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
    </>
  );

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col md:flex-row w-full">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile header */}
      <header className="md:hidden h-14 border-b border-border bg-background flex items-center justify-between px-4 sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-primary" />
          <span className="font-bold text-foreground">A-NIM-PACT</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <DropdownMenuItem className="cursor-pointer">
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </DropdownMenuItem>
              </Link>
            ))}
            <DropdownMenuSeparator />
            <Link href="/settings">
              <DropdownMenuItem className="cursor-pointer">
                <UserIcon className="h-4 w-4 mr-2" />
                Profil
              </DropdownMenuItem>
            </Link>
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
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 max-w-full">
        <div className="flex-1 p-4 md:p-8 w-full max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
