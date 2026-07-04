import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useAuth } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { frFR } from "@clerk/localizations";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

import NotFound from "@/pages/not-found";
import { Home } from "@/pages/home";
import { Dashboard } from "@/pages/dashboard";
import { OrganizationsList } from "@/pages/organizations/index";
import { OrganizationNew } from "@/pages/organizations/new";
import { OrganizationDetail } from "@/pages/organizations/detail";
import { OrganizationSettings } from "@/pages/organizations/settings";
import { OrganizationMembers } from "@/pages/organizations/members";
import { UserSettings } from "@/pages/settings";
import { AdminDashboard } from "@/pages/admin/index";
import { AdminOrganizations } from "@/pages/admin/organizations";
import { AdminOrganizationDetail } from "@/pages/admin/organization-detail";
import { AdminUsers } from "@/pages/admin/users";
import { Resources } from "@/pages/resources";
import {
  Enjeux,
  Biodiversite,
  DemarcheRse,
  BilanCarbone,
  NumeriqueResponsable,
  ImpactScore,
  RapportRse,
} from "@/pages/stubs";
import { PartiesPrenantes } from "@/pages/parties-prenantes";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Leaf } from "lucide-react";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

if (!clerkPubKey) throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");

const clerkLocalization = {
  ...frFR,
  signIn: {
    ...frFR.signIn,
    start: {
      ...(frFR.signIn?.start ?? {}),
      subtitle: "pour continuer vers cocci",
    },
  },
  signUp: {
    ...frFR.signUp,
    start: {
      ...(frFR.signUp?.start ?? {}),
      subtitle: "pour créer votre compte cocci",
    },
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);
  return null;
}

function ClerkAuthTokenSetup() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);
  return null;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(175 73% 18%)",
    colorForeground: "hsl(222.2 84% 4.9%)",
    colorMutedForeground: "hsl(215.4 16.3% 46.9%)",
    colorDanger: "hsl(0 84.2% 60.2%)",
    colorBackground: "hsl(0 0% 100%)",
    colorInput: "hsl(0 0% 100%)",
    colorInputForeground: "hsl(222.2 84% 4.9%)",
    colorNeutral: "hsl(214.3 31.8% 91.4%)",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.25rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white dark:bg-slate-950 rounded-md w-[440px] max-w-full overflow-hidden border border-border shadow-sm",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-2xl font-bold text-foreground tracking-tight",
    headerSubtitle: "text-sm text-muted-foreground",
    socialButtonsBlockButtonText: "text-sm font-medium text-foreground",
    formFieldLabel: "text-sm font-medium text-foreground",
    footerActionLink: "text-sm font-medium text-primary hover:text-primary/90",
    footerActionText: "text-sm text-muted-foreground",
    dividerText: "text-xs text-muted-foreground uppercase",
    identityPreviewEditButton: "text-primary hover:text-primary/90",
    formFieldSuccessText: "text-sm text-green-600",
    alertText: "text-sm text-destructive",
    logoBox: "hidden",
    logoImage: "hidden",
    socialButtonsBlockButton: "border-input bg-background hover:bg-muted/50",
    formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-sm h-10 font-medium",
    formFieldInput: "flex h-10 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    footerAction: "mt-6 border-t border-border pt-6",
    dividerLine: "bg-border",
    alert: "bg-destructive/10 border-destructive/20 text-destructive rounded-sm",
    otpCodeFieldInput: "border-input text-foreground",
    formFieldRow: "mb-4",
    main: "flex flex-col gap-4",
  },
};

function AuthBrand() {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      <Leaf className="h-7 w-7 text-primary" />
      <span className="text-2xl font-bold tracking-tight text-foreground">cocci</span>
    </div>
  );
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-[440px]">
        <AuthBrand />
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-[440px]">
        <AuthBrand />
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      </div>
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { isSuperAdmin, isLoading } = useIsSuperAdmin();
  return (
    <>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
      <Show when="signed-in">
        {isLoading ? null : isSuperAdmin ? <Component /> : <Redirect to="/dashboard" />}
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      localization={clerkLocalization}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <ClerkAuthTokenSetup />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />

            <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
            <Route path="/organizations"><ProtectedRoute component={OrganizationsList} /></Route>
            <Route path="/organizations/new"><ProtectedRoute component={OrganizationNew} /></Route>
            <Route path="/organizations/:id"><ProtectedRoute component={OrganizationDetail} /></Route>
            <Route path="/organizations/:id/settings"><ProtectedRoute component={OrganizationSettings} /></Route>
            <Route path="/organizations/:id/members"><ProtectedRoute component={OrganizationMembers} /></Route>
            <Route path="/settings"><ProtectedRoute component={UserSettings} /></Route>

            <Route path="/admin"><AdminRoute component={AdminDashboard} /></Route>
            <Route path="/admin/organizations"><AdminRoute component={AdminOrganizations} /></Route>
            <Route path="/admin/organizations/:id"><AdminRoute component={AdminOrganizationDetail} /></Route>
            <Route path="/admin/users"><AdminRoute component={AdminUsers} /></Route>

            <Route path="/resources"><ProtectedRoute component={Resources} /></Route>

            <Route path="/enjeux"><ProtectedRoute component={Enjeux} /></Route>
            <Route path="/parties-prenantes"><ProtectedRoute component={PartiesPrenantes} /></Route>
            <Route path="/biodiversite"><ProtectedRoute component={Biodiversite} /></Route>
            <Route path="/demarche-rse"><ProtectedRoute component={DemarcheRse} /></Route>
            <Route path="/bilan-carbone"><ProtectedRoute component={BilanCarbone} /></Route>
            <Route path="/numerique-responsable"><ProtectedRoute component={NumeriqueResponsable} /></Route>
            <Route path="/impact-score"><ProtectedRoute component={ImpactScore} /></Route>
            <Route path="/rapport-rse"><ProtectedRoute component={RapportRse} /></Route>

            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}
