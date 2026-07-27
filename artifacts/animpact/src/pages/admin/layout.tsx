import { type ReactNode, useState, useRef, useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Receipt,
  BarChart3,
  Settings,
  Search,
  Bell,
  HelpCircle,
  ChevronDown,
  LogOut,
  Shield,
  Check,
  ArrowLeft,
  BookOpen,
  MessageSquare,
} from "lucide-react";
import { useUser, useClerk } from "@clerk/react";
import {
  useListAdminOrganizations,
  getListAdminOrganizationsQueryKey,
  useGetAdminEchangesStats,
  getAdminEchangesStatsQueryKey,
} from "@workspace/api-client-react";
import { useCurrentOrganization, setCurrentOrg } from "@/hooks/useCurrentOrganization";
import { setAdminViewOrg } from "@/hooks/useAdminView";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

const NAV_ITEMS = [
  { href: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
  { href: "/admin/organizations", label: "Organisations", icon: Building2, exact: false },
  { href: "/admin/users", label: "Utilisateurs", icon: Users, exact: false },
  { href: "/admin/resources", label: "Bibliothèque globale", icon: BookOpen, exact: false },
  { href: "/admin/echanges", label: "Échanges avec Cocci", icon: MessageSquare, exact: false },
  { href: null, label: "Factures", icon: CreditCard },
  { href: null, label: "Abonnements", icon: Receipt },
  { href: null, label: "Analytics", icon: BarChart3 },
  { href: null, label: "Paramètres", icon: Settings },
];

function orgInitials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function EspaceClientPanel() {
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { currentOrgId } = useCurrentOrganization();
  const [, navigate] = useLocation();

  // Sync selected org with the org detail page currently open in the admin
  const [matchDetail, paramsDetail] = useRoute("/admin/organizations/:id");
  useEffect(() => {
    if (matchDetail && paramsDetail?.id) {
      const id = Number(paramsDetail.id);
      if (Number.isFinite(id) && id > 0 && id !== currentOrgId) {
        setCurrentOrg(id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchDetail, paramsDetail?.id]);

  const { data: orgs } = useListAdminOrganizations({
    query: { queryKey: getListAdminOrganizationsQueryKey() },
  });

  const currentOrg = orgs?.find((o) => o.id === (matchDetail && paramsDetail?.id ? Number(paramsDetail.id) : currentOrgId));

  const filtered = (orgs ?? [])
    .filter((o) => !search || o.name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, search ? 20 : 10);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearch("");
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  function selectOrg(id: number) {
    setCurrentOrg(id);
    setDropdownOpen(false);
    setSearch("");
    navigate(`/admin/organizations/${id}`);
  }

  return (
    <div className="px-3 pb-3">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-sidebar-foreground/35 px-1 mb-2">
        Espace client
      </p>
      <div className="bg-black/20 rounded-lg p-2.5 space-y-2" ref={containerRef}>
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sidebar-foreground/35 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setDropdownOpen(true); }}
            onFocus={() => setDropdownOpen(true)}
            placeholder="Rechercher une entreprise..."
            className="w-full bg-white/5 hover:bg-white/8 text-sidebar-foreground placeholder:text-sidebar-foreground/30 text-[11px] pl-8 pr-3 py-2 rounded-md outline-none focus:ring-1 focus:ring-sidebar-ring transition-colors"
          />
        </div>

        {/* Dropdown results */}
        {dropdownOpen && filtered.length > 0 && (
          <div className="bg-sidebar border border-sidebar-border rounded-md overflow-hidden shadow-lg">
            {filtered.map((org) => (
              <button
                key={org.id}
                onMouseDown={(e) => { e.preventDefault(); selectOrg(org.id); }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-[11px] transition-colors text-left",
                  currentOrgId === org.id
                    ? "bg-sidebar-accent text-sidebar-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <div className="h-5 w-5 rounded bg-sidebar-primary/70 flex items-center justify-center text-[9px] font-bold text-sidebar-primary-foreground shrink-0">
                  {orgInitials(org.name)}
                </div>
                <span className="flex-1 truncate font-medium">{org.name}</span>
                {currentOrgId === org.id && <Check className="h-3 w-3 shrink-0 text-primary-foreground/70" />}
              </button>
            ))}
          </div>
        )}

        {/* Selected org display */}
        {currentOrg && !dropdownOpen && (
          <div className="space-y-1">
            <p className="text-[9px] uppercase tracking-widest text-sidebar-foreground/30 font-medium px-0.5">
              Entreprise sélectionnée
            </p>
            <div className="flex items-center gap-1">
              <Link href={`/admin/organizations/${currentOrg.id}`} className="flex-1">
                <button className="w-full flex items-center gap-2 bg-sidebar-accent/60 hover:bg-sidebar-accent rounded-md px-2 py-1.5 transition-colors">
                  <div className="h-6 w-6 rounded bg-sidebar-primary flex items-center justify-center text-[10px] font-bold text-sidebar-primary-foreground shrink-0">
                    {orgInitials(currentOrg.name)}
                  </div>
                  <span className="flex-1 text-[11px] font-semibold text-sidebar-foreground truncate text-left">
                    {currentOrg.name}
                  </span>
                </button>
              </Link>
              <button
                onClick={() => setDropdownOpen(true)}
                className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-white/10 transition-colors"
                title="Changer d'entreprise"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {!currentOrg && !dropdownOpen && (
          <p className="text-[11px] text-sidebar-foreground/30 text-center py-0.5">
            Aucune entreprise sélectionnée
          </p>
        )}

        {/* Link to client view — impersonate the selected org if one is chosen */}
        <button
          onClick={() => {
            if (currentOrg) {
              setAdminViewOrg(currentOrg.id);
              setCurrentOrg(currentOrg.id);
            } else {
              setAdminViewOrg(null);
            }
            navigate("/dashboard");
          }}
          className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] text-sidebar-foreground/50 hover:bg-white/8 hover:text-sidebar-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
          Voir l'espace client{currentOrg ? ` — ${currentOrg.name}` : ""}
        </button>
      </div>
    </div>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const { data: echangesStats } = useGetAdminEchangesStats({
    query: { queryKey: getAdminEchangesStatsQueryKey() },
  });
  const newFeedbackCount = echangesStats?.newFeedbackCount ?? 0;

  const displayName = user?.fullName || user?.firstName || "Utilisateur";
  const email = user?.emailAddresses[0]?.emailAddress ?? "";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Sidebar ─────────────────────────────── */}
      <aside className="w-60 shrink-0 bg-sidebar flex flex-col h-full">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-5 shrink-0">
          <div className="h-7 w-7 rounded-md bg-destructive/90 flex items-center justify-center shrink-0">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-sidebar-foreground">
            Back-office cocci
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-3 flex flex-col gap-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            if (!item.href) {
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium text-sidebar-foreground/25 cursor-not-allowed select-none"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </div>
              );
            }
            const isActive = item.exact
              ? location === item.href
              : location.startsWith(item.href) && !location.startsWith(item.href + "/organizations/") || location.startsWith(item.href) && item.href !== "/admin";
            const active = item.exact
              ? location === item.href
              : location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-foreground"
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.href === "/admin/echanges" && newFeedbackCount > 0 && (
                    <span className="ml-auto h-4 min-w-[1rem] rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center px-1 shrink-0">
                      {newFeedbackCount}
                    </span>
                  )}
                </button>
              </Link>
            );
          })}
        </nav>

        {/* Espace client */}
        <EspaceClientPanel />

        {/* User profile */}
        <div className="px-3 pb-3 border-t border-sidebar-border shrink-0 pt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start px-2 h-auto py-2 hover:bg-sidebar-accent/50 gap-2.5"
              >
                <Avatar className="h-8 w-8 shrink-0 border border-sidebar-border">
                  <AvatarImage src={user?.imageUrl} />
                  <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start flex-1 overflow-hidden min-w-0">
                  <span className="text-[13px] font-medium text-sidebar-foreground truncate w-full text-left leading-tight">
                    {displayName}
                  </span>
                  <span className="text-[11px] text-sidebar-foreground/45 truncate w-full text-left leading-tight">
                    {email}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-sidebar-foreground/40 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Superadmin
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer text-sm"
                onClick={() => signOut({ redirectUrl: basePath || "/" })}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 shrink-0 bg-background border-b border-border flex items-center gap-4 px-6">
          {/* Search bar */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Rechercher..."
              className="h-9 w-full rounded-md border border-border bg-muted/40 pl-9 pr-10 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40"
              readOnly
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 bg-muted rounded border border-border text-muted-foreground/50 font-sans pointer-events-none select-none">
              ⌘K
            </kbd>
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
              <Bell className="h-4.5 w-4.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
              <HelpCircle className="h-4.5 w-4.5" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2.5 h-9 px-2">
                <Avatar className="h-7 w-7 border border-border">
                  <AvatarImage src={user?.imageUrl} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden sm:block">{displayName}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">{email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer text-sm"
                onClick={() => signOut({ redirectUrl: basePath || "/" })}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-muted/30">
          <div className="p-6 max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
