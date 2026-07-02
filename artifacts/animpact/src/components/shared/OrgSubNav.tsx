import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrgSubNavProps {
  orgId: number;
}

const tabs = [
  { href: (id: number) => `/organizations/${id}`, label: "Aperçu", icon: LayoutDashboard, exact: true },
  { href: (id: number) => `/organizations/${id}/members`, label: "Membres", icon: Users, exact: false },
  { href: (id: number) => `/organizations/${id}/settings`, label: "Paramètres", icon: Settings, exact: false },
];

export function OrgSubNav({ orgId }: OrgSubNavProps) {
  const [location] = useLocation();

  return (
    <nav className="flex gap-1 border-b border-border mb-6 -mt-2">
      {tabs.map((tab) => {
        const href = tab.href(orgId);
        const isActive = tab.exact ? location === href : location.startsWith(href);
        return (
          <Link key={href} href={href}>
            <button
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          </Link>
        );
      })}
    </nav>
  );
}
