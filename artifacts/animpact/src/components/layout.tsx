import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { useListExercises, useListOrganizations } from "@workspace/api-client-react";
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  User as UserIcon,
  Leaf,
  Wrench,
  BookOpen,
  Target,
  Users2,
  Sprout,
  ShoppingBag,
  BarChart3,
  Globe,
  Monitor,
  FolderOpen,
  Sparkles,
  FileText,
  Award,
  Smile,
  GraduationCap,
  ListChecks,
  TreePine,
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
import { useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import { useCurrentExercise } from "@/hooks/useCurrentExercise";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { useAdminViewOrg, setAdminViewOrg } from "@/hooks/useAdminView";
import { ExerciseSelector } from "@/components/ExerciseSelector";
import { GroupSwitcher } from "@/components/GroupSwitcher";
import { ClosedExerciseBanner } from "@/components/ClosedExerciseBanner";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navGroups: NavItem[][] = [
  [
    { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  ],
  [
    { href: "/parties-prenantes", label: "Mes parties prenantes", icon: Users2 },
    { href: "/enjeux", label: "Matrice de matérialité", icon: Target },
    { href: "/biodiversite", label: "Mes dépendances à la biodiversité", icon: Sprout },
    { href: "/achats-responsables", label: "Achats & Fournisseurs Responsables", icon: ShoppingBag },
  ],
  [
    { href: "/bilan-carbone", label: "Mon bilan carbone", icon: Globe },
    { href: "/numerique-responsable", label: "Ma démarche Numérique Responsable", icon: Monitor },
  ],
  [
    { href: "/barometre-social", label: "Baromètre Social", icon: Smile },
    { href: "/capital-humain", label: "Capital Humain", icon: GraduationCap },
  ],
  [
    { href: "/mes-actions", label: "Mes actions RSE", icon: ListChecks },
  ],
  [
    { href: "/impact-score", label: "Mon Impact Score", icon: Sparkles },
    { href: "/mes-labels", label: "Mes labels", icon: Award },
    { href: "/captation-carbone", label: "Ma captation carbone", icon: TreePine },
  ],
  [
    { href: "/diagnostic", label: "Mon diagnostic RSE", icon: BarChart3 },
    { href: "/rapport-rse", label: "Mon rapport RSE", icon: FileText },
  ],
  [
    { href: "/resources", label: "Mes ressources", icon: BookOpen },
    { href: "/mes-documents", label: "Mes documents", icon: FolderOpen },
  ],
  [
    { href: "/settings", label: "Mes paramètres", icon: Settings },
  ],
];

const allNavItems = navGroups.flat();

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const { currentOrgId } = useCurrentOrganization();
  const adminViewOrgId = useAdminViewOrg();
  const { data: allOrgs = [] } = useListOrganizations(
    adminViewOrgId ? { viewAs: adminViewOrgId } : undefined,
  );
  const rootOrg = allOrgs.find((o) => !o.parentId) ?? null;
  // Exercise selector always shows the root org's exercises so subsidiaries
  // (which have no exercises of their own) can still see and select an exercise.
  const exerciseOrgId = rootOrg?.id ?? currentOrgId;

  const isAdminRoute = location.startsWith("/admin");
  const isOnboardingRoute = location.startsWith("/onboarding");
  const showExerciseUi = !isAdminRoute && !isOnboardingRoute && exerciseOrgId != null;

  const { currentExerciseId } = useCurrentExercise();
  const { data: exercises } = useListExercises(exerciseOrgId ?? 0, {
    query: { queryKey: ["/api/organizations", exerciseOrgId, "exercises"], enabled: showExerciseUi },
  });
  const currentExercise = exercises?.find((e) => e.id === currentExerciseId);
  // When the active exercise is closed, the whole workspace becomes
  // read-only: mutating controls (forms, buttons, inputs) in the main
  // content area are made inert. Navigation (sidebar) and the exercise
  // selector itself stay interactive so the user can switch/reopen.
  const isExerciseClosed = showExerciseUi && currentExercise?.status === "closed";
  const { isSuperAdmin } = useIsSuperAdmin();

  function isActive(item: NavItem) {
    return location === item.href || location.startsWith(`${item.href}/`);
  }

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border bg-sidebar shrink-0">
        <Leaf className="h-6 w-6 text-sidebar-primary mr-2 shrink-0" />
        <span className="text-sidebar-foreground font-bold tracking-tight">Cocci</span>
      </div>

      <div className="flex-1 py-3 px-3 flex flex-col overflow-y-auto">
        {/* Entreprise / Groupe + sélecteur de filiale */}
        {!isAdminRoute && (
          <div className="mb-1">
            <GroupSwitcher />
          </div>
        )}

        {/* Sélecteur d'exercice */}
        {showExerciseUi && exerciseOrgId && (
          <div className="mb-2">
            <ExerciseSelector orgId={exerciseOrgId} />
            <div className="my-2.5 h-px bg-sidebar-border/40 mx-1" />
          </div>
        )}

        {/* Nav groups */}
        <div className="flex flex-col">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {gi > 0 && <div className="my-1.5 h-px bg-sidebar-border/35 mx-1" />}
              {group.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start h-9 px-3 mb-0.5",
                      isActive(item)
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4 mr-3 shrink-0" />
                    <span className="truncate text-[13px]">{item.label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Bouton switch Administration — superadmin uniquement */}
      {isSuperAdmin && (
        <div className="px-3 pb-2">
          <div className="h-px bg-sidebar-border/35 mx-1 mb-2" />
          <Link href="/admin">
            <Button
              variant="ghost"
              className="w-full justify-start h-9 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            >
              <Wrench className="h-4 w-4 mr-3" />
              Administration
            </Button>
          </Link>
        </div>
      )}

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
          <span className="font-bold text-foreground">Cocci</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {allNavItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <DropdownMenuItem className="cursor-pointer">
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </DropdownMenuItem>
              </Link>
            ))}
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
        {/* Admin-view banner */}
        {adminViewOrgId && rootOrg && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 shrink-0">
            <span>
              👁 Vue admin — vous consultez l'espace de <strong>{rootOrg.name}</strong>
            </span>
            <Link href="/admin">
              <button
                onClick={() => setAdminViewOrg(null)}
                className="ml-4 underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200 transition-colors"
              >
                Retourner à l'administration
              </button>
            </Link>
          </div>
        )}
        <div
          className="flex-1 p-4 md:p-8 w-full max-w-6xl mx-auto"
          // @ts-expect-error -- `inert` is a valid HTML boolean attribute (React 19+) not yet in JSX types.
          inert={isExerciseClosed ? "" : undefined}
        >
          {showExerciseUi && <ClosedExerciseBanner />}
          {children}
          <div className="mt-12 pt-6 border-t border-border/50 text-center">
            <p className="text-xs text-muted-foreground">Besoin d'un accompagnement ?</p>
            <a
              href="mailto:bonjour@a-nim-pact.fr"
              className="text-xs font-medium text-primary hover:underline"
            >
              bonjour@a-nim-pact.fr
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
