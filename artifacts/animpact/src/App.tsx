import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useAuth } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { frFR } from "@clerk/localizations";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import {
  useListOrganizations,
  getListOrganizationsQueryKey,
  useGetOnboardingProgress,
  getGetOnboardingProgressQueryKey,
} from "@workspace/api-client-react";

import NotFound from "@/pages/not-found";
import { Home } from "@/pages/home";
import { Demo } from "@/pages/demo";
import { Dashboard } from "@/pages/dashboard";
import { OrganizationsList } from "@/pages/organizations/index";
import { OrganizationNew } from "@/pages/organizations/new";
import { OrganizationDetail } from "@/pages/organizations/detail";
import { OrganizationSettings } from "@/pages/organizations/settings";
import { OrganizationMembers } from "@/pages/organizations/members";
import { UserSettings } from "@/pages/settings";
import { LegalPage } from "@/pages/legal";
import { AdminDashboard } from "@/pages/admin/index";
import { AdminOrganizations } from "@/pages/admin/organizations";
import { AdminOrganizationDetail } from "@/pages/admin/organization-detail";
import { AdminUsers } from "@/pages/admin/users";
import { AdminResources } from "@/pages/admin/resources";
import { AdminEchanges } from "@/pages/admin/echanges";
import { AdminSecurite } from "@/pages/admin/securite";
import { AdminReferentiel } from "@/pages/admin/referentiel";
import { AdminAbonnements } from "@/pages/admin/abonnements";
import { EchangesCocci } from "@/pages/echanges/index";
import { Resources } from "@/pages/resources";
import { DiagnosticRse } from "@/pages/diagnostic/index";
import { DiagnosticQuestionnaire } from "@/pages/diagnostic/questionnaire";
import { RapportRse } from "@/pages/rapport-rse";
import { ReportViewer } from "@/pages/rapport-rse/ReportViewer";
import { Biodiversite } from "@/pages/biodiversite";
import { AchatsResponsables } from "@/pages/achats-responsables";
import { ImpactScore } from "@/pages/impact-score";
import { NumeriqueResponsable } from "@/pages/numerique-responsable";
import { BilanCarbone } from "@/pages/bilan-carbone";
import { PartiesPrenantes } from "@/pages/parties-prenantes";
import { Materialite } from "@/pages/materialite";
import { MesDocuments } from "@/pages/mes-documents";
import { MesLabels } from "@/pages/mes-labels";
import { CaptationCarbone } from "@/pages/captation-carbone";
import { BarometreSocial } from "@/pages/barometre-social";
import { BarometreSocialPublic } from "@/pages/barometre-social/public";
import { PublicRsePage } from "@/pages/public-rse";
import { PagePubliqueRse } from "@/pages/page-publique-rse";
import { Abonnement } from "@/pages/abonnement";
import { SubscriptionConfirmation } from "@/pages/abonnement/confirmation";
import { CapitalHumain } from "@/pages/employment";
import { MesActions } from "@/pages/mes-actions";
import { GuideRSE } from "@/pages/guide-rse";
import { Onboarding } from "@/pages/onboarding/index";
import { OnboardingFiliales } from "@/pages/onboarding/filiales";
import { OnboardingEffectif } from "@/pages/onboarding/effectif";
import { OnboardingAbonnement } from "@/pages/onboarding/abonnement";
import {
  ONBOARDING_CONTINUATION_SESSION_KEY,
  SUBSCRIPTION_INTENT_SESSION_KEY,
} from "@/pages/onboarding/plans";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { setCurrentOrg, setCurrentOrgUser, useCurrentOrganization } from "@/hooks/useCurrentOrganization";
import {
  hasActiveOrganizationSubscription,
  useOrganizationSubscription,
} from "@/hooks/useOrganizationSubscription";
import { setAuthTokenGetter, setBaseUrl, setExerciseIdGetter } from "@workspace/api-client-react";
import { getCurrentExerciseId } from "@/hooks/useCurrentExercise";
import { runPostAuthRedirect } from "@/lib/authRedirect";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

if (!clerkPubKey) throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");

setExerciseIdGetter(() => getCurrentExerciseId());
setBaseUrl(import.meta.env.VITE_API_URL);

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
      setCurrentOrgUser(userId);
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);
  return null;
}

function ClerkUserScopedState() {
  const { isLoaded, userId } = useAuth();
  useEffect(() => {
    if (isLoaded) setCurrentOrgUser(userId);
  }, [isLoaded, userId]);
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
    logoImageUrl: `${window.location.origin}${basePath}/logo-dark.png`,
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
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  return (
    <div className="flex items-center justify-center mb-6">
      <img src={`${basePath}/logo-dark.png`} alt="Cocci" className="h-10 w-auto" />
    </div>
  );
}

function usePostAuthRedirect() {
  const [, setLocation] = useLocation();
  const { isLoaded, isSignedIn } = useAuth();
  const {
    data: organizations,
    isLoading: organizationsLoading,
    isFetching: organizationsFetching,
  } = useListOrganizations(
    undefined,
    {
      query: {
        enabled: isLoaded && isSignedIn,
        queryKey: getListOrganizationsQueryKey(),
      },
    },
  );
  const {
    data: onboarding,
    isLoading: onboardingLoading,
    isFetching: onboardingFetching,
  } = useGetOnboardingProgress({
    query: {
      enabled: isLoaded && isSignedIn,
      queryKey: getGetOnboardingProgressQueryKey(),
    },
  });

  useEffect(() => {
    runPostAuthRedirect(
      {
        isLoaded,
        isSignedIn,
        organizations,
        organizationsLoading,
        organizationsFetching,
        hasSubscriptionIntent: Boolean(
          sessionStorage.getItem(SUBSCRIPTION_INTENT_SESSION_KEY),
        ),
        onboardingStatus: onboarding?.status,
        hasPrimaryOrganization: onboarding?.primaryOrganizationId != null,
        onboardingLoading,
        onboardingFetching,
      },
      {
        navigate: setLocation,
        clearOnboardingSession: () => {
          sessionStorage.removeItem(SUBSCRIPTION_INTENT_SESSION_KEY);
          sessionStorage.removeItem(ONBOARDING_CONTINUATION_SESSION_KEY);
        },
      },
    );
  }, [
    isLoaded,
    isSignedIn,
    organizations,
    organizationsFetching,
    organizationsLoading,
    onboarding,
    onboardingFetching,
    onboardingLoading,
    setLocation,
  ]);
}

function SignInPage() {
  usePostAuthRedirect();

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-[440px]">
        <AuthBrand />
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
          forceRedirectUrl={`${basePath}/dashboard`}
          fallbackRedirectUrl={`${basePath}/dashboard`}
        />
      </div>
    </div>
  );
}

function SignUpPage() {
  // A visitor may arrive here from the pricing flow. Once Clerk has finished
  // signing them in, resume organization setup instead of sending them to the
  // dashboard where they would have to find onboarding manually.
  usePostAuthRedirect();

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

type OnboardingStepPath =
  | "/onboarding"
  | "/onboarding/filiales"
  | "/onboarding/effectif"
  | "/onboarding/abonnement"
  | "/dashboard";

function resolveOnboardingStepPath(
  status: string,
  organizations: readonly { parentId?: number | null; type?: string | null }[],
): OnboardingStepPath {
  if (status === "completed") return "/dashboard";

  const rootOrganization = organizations.find((organization) => !organization.parentId);
  if (status === "organization_created" && rootOrganization?.type === "groupe") {
    return "/onboarding/filiales";
  }
  if (status === "organization_created" || status === "subsidiaries_configured") {
    return "/onboarding/effectif";
  }
  if (
    status === "workforce_completed"
    || status === "subscription_selected"
    || status === "payment_pending"
  ) {
    return "/onboarding/abonnement";
  }
  return "/onboarding";
}

/**
 * Protects the secondary onboarding URLs from reopening setup for an existing
 * account. The continuation marker is set immediately after the first
 * organization is created so the normal onboarding flow can still reach these
 * steps.
 */
function OnboardingStepGuard({
  component: Component,
  requiresAuth = false,
  stepPath,
}: {
  component: React.ComponentType;
  requiresAuth?: boolean;
  stepPath: Exclude<OnboardingStepPath, "/onboarding" | "/dashboard">;
}) {
  const [, setLocation] = useLocation();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const {
    data: orgs,
    isLoading,
    isFetching,
  } = useListOrganizations(
    undefined,
    {
      query: {
        enabled: isAuthLoaded && isSignedIn,
        queryKey: getListOrganizationsQueryKey(),
      },
    },
  );
  const {
    data: onboarding,
    isLoading: onboardingLoading,
    isFetching: onboardingFetching,
  } = useGetOnboardingProgress({
    query: {
      enabled: isAuthLoaded && isSignedIn,
      queryKey: getGetOnboardingProgressQueryKey(),
    },
  });

  const targetPath = onboarding && orgs
    ? resolveOnboardingStepPath(onboarding.status, orgs)
    : null;

  useEffect(() => {
    if (
      !isAuthLoaded
      || !isSignedIn
      || isLoading
      || isFetching
      || onboardingLoading
      || onboardingFetching
      || !orgs
      || !onboarding
    ) return;

    const nextPath = resolveOnboardingStepPath(onboarding.status, orgs);
    if (nextPath === stepPath) return;

    if (nextPath === "/dashboard") {
      sessionStorage.removeItem(SUBSCRIPTION_INTENT_SESSION_KEY);
      sessionStorage.removeItem(ONBOARDING_CONTINUATION_SESSION_KEY);
    }
    setLocation(nextPath, { replace: true });
  }, [
    isAuthLoaded,
    isFetching,
    isLoading,
    isSignedIn,
    onboarding,
    onboardingFetching,
    onboardingLoading,
    orgs,
    setLocation,
    stepPath,
  ]);

  if (!isAuthLoaded) return null;
  if (!isSignedIn) {
    return requiresAuth ? <Redirect to="/sign-in" /> : <Component />;
  }
  if (isLoading || isFetching || onboardingLoading || onboardingFetching || !orgs || !onboarding) return null;
  if (targetPath !== stepPath) return null;
  return <Component />;
}

/**
 * Wraps workspace pages: if the user has no org yet, redirect to onboarding.
 * Uses React Query cache (already loaded by AppLayout) so no extra fetch.
 */
function WorkspaceGuard({ component: Component }: { component: React.ComponentType }) {
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { data: orgs, isLoading, isFetching } = useListOrganizations();
  const { currentOrgId } = useCurrentOrganization();
  const { data: onboarding, isLoading: onboardingLoading } = useGetOnboardingProgress({
    query: {
      enabled: isAuthLoaded && isSignedIn,
      queryKey: getGetOnboardingProgressQueryKey(),
    },
  });
  const { isSuperAdmin, isLoading: isSuperAdminLoading } = useIsSuperAdmin();

  useEffect(() => {
    if (orgs && orgs.length > 0 && onboarding?.status === "completed") {
      sessionStorage.removeItem(ONBOARDING_CONTINUATION_SESSION_KEY);
    }
  }, [onboarding?.status, orgs]);

  // L'abonnement d'un groupe est porté par son organisation racine. La vue
  // peut toutefois être positionnée sur une filiale.
  const rootOrg = orgs?.find((org) => !org.parentId) ?? null;
  useEffect(() => {
    if (rootOrg && (!currentOrgId || !orgs?.some((org) => org.id === currentOrgId))) {
      setCurrentOrg(rootOrg.id);
    }
  }, [currentOrgId, orgs, rootOrg]);
  const subscriptionOrgId = rootOrg?.id ?? currentOrgId ?? orgs?.[0]?.id ?? null;
  const {
    subscription,
    isLoading: subscriptionLoading,
    error: subscriptionError,
  } = useOrganizationSubscription(subscriptionOrgId);
  const hasWorkspaceSubscription = hasActiveOrganizationSubscription(subscription);
  const onboardingAllowsWorkspace =
    onboarding?.status === "completed"
    || (
      onboarding?.status === "payment_pending"
      && subscription?.status === "trial"
      && hasWorkspaceSubscription
    );

  if (!isAuthLoaded) return null;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  if (isLoading || isFetching || onboardingLoading || subscriptionLoading || !onboarding) return null;
  if (orgs && orgs.length === 0) return <Redirect to="/onboarding" />;
  if (isSuperAdminLoading || subscriptionLoading) return null;
  if (
    !isSuperAdmin
    && (
      subscriptionError
      || !hasWorkspaceSubscription
    )
    && (onboarding.status === "completed" || onboarding.status === "payment_pending")
  ) {
    return <Redirect to="/abonnement?reason=subscription_required" />;
  }
  if (!onboardingAllowsWorkspace) return <Redirect to="/onboarding" />;

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
      appearance={clerkAppearance}
      localization={clerkLocalization}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <ClerkUserScopedState />
        <ClerkAuthTokenSetup />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/demo"><Demo /></Route>
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />

            {/* Onboarding — first-time setup (no AppLayout) */}
            <Route path="/onboarding">
              <ProtectedRoute component={Onboarding} />
            </Route>
            <Route path="/onboarding/filiales">
              <OnboardingStepGuard
                component={OnboardingFiliales}
                requiresAuth
                stepPath="/onboarding/filiales"
              />
            </Route>
            <Route path="/onboarding/effectif">
              <OnboardingStepGuard
                component={OnboardingEffectif}
                stepPath="/onboarding/effectif"
              />
            </Route>
            <Route path="/onboarding/abonnement">
              <OnboardingStepGuard
                component={OnboardingAbonnement}
                stepPath="/onboarding/abonnement"
              />
            </Route>

            {/* Workspace module pages — redirect to onboarding if no org */}
            <Route path="/dashboard"><WorkspaceGuard component={Dashboard} /></Route>
            <Route path="/enjeux"><WorkspaceGuard component={Materialite} /></Route>
            <Route path="/parties-prenantes"><WorkspaceGuard component={PartiesPrenantes} /></Route>
            <Route path="/biodiversite"><WorkspaceGuard component={Biodiversite} /></Route>
            <Route path="/achats-responsables"><WorkspaceGuard component={AchatsResponsables} /></Route>
            <Route path="/diagnostic"><WorkspaceGuard component={DiagnosticRse} /></Route>
            <Route path="/diagnostic/:categoryId/:subcategoryId"><WorkspaceGuard component={DiagnosticQuestionnaire} /></Route>
            <Route path="/bilan-carbone"><WorkspaceGuard component={BilanCarbone} /></Route>
            <Route path="/numerique-responsable"><WorkspaceGuard component={NumeriqueResponsable} /></Route>
            <Route path="/impact-score"><WorkspaceGuard component={ImpactScore} /></Route>
            <Route path="/rapport-rse"><WorkspaceGuard component={RapportRse} /></Route>
            <Route path="/page-publique-rse"><WorkspaceGuard component={PagePubliqueRse} /></Route>
            <Route path="/abonnement/confirmation" component={SubscriptionConfirmation} />
            <Route path="/abonnement"><ProtectedRoute component={Abonnement} /></Route>
            <Route path="/rapport-rse/viewer"><WorkspaceGuard component={ReportViewer} /></Route>
            <Route path="/mes-documents"><WorkspaceGuard component={MesDocuments} /></Route>
            <Route path="/mes-labels"><WorkspaceGuard component={MesLabels} /></Route>
            <Route path="/captation-carbone"><WorkspaceGuard component={CaptationCarbone} /></Route>
            <Route path="/barometre-social"><WorkspaceGuard component={BarometreSocial} /></Route>
            <Route path="/capital-humain"><WorkspaceGuard component={CapitalHumain} /></Route>
            <Route path="/guide-rse"><WorkspaceGuard component={GuideRSE} /></Route>
            <Route path="/mes-actions"><WorkspaceGuard component={MesActions} /></Route>
            <Route path="/resources"><WorkspaceGuard component={Resources} /></Route>
            <Route path="/settings"><ProtectedRoute component={UserSettings} /></Route>
            <Route path="/legal" component={LegalPage} />

            {/* Org management (settings, members) */}
            <Route path="/organizations"><ProtectedRoute component={OrganizationsList} /></Route>
            <Route path="/organizations/new"><ProtectedRoute component={OrganizationNew} /></Route>
            <Route path="/organizations/:id"><ProtectedRoute component={OrganizationDetail} /></Route>
            <Route path="/organizations/:id/settings"><ProtectedRoute component={OrganizationSettings} /></Route>
            <Route path="/organizations/:id/members"><ProtectedRoute component={OrganizationMembers} /></Route>

            {/* Admin */}
            <Route path="/admin"><AdminRoute component={AdminDashboard} /></Route>
            <Route path="/admin/organizations"><AdminRoute component={AdminOrganizations} /></Route>
            <Route path="/admin/organizations/:id"><AdminRoute component={AdminOrganizationDetail} /></Route>
            <Route path="/admin/users"><AdminRoute component={AdminUsers} /></Route>
            <Route path="/admin/resources"><AdminRoute component={AdminResources} /></Route>
            <Route path="/admin/echanges"><AdminRoute component={AdminEchanges} /></Route>
            <Route path="/admin/securite"><AdminRoute component={AdminSecurite} /></Route>
            <Route path="/admin/referentiel"><AdminRoute component={AdminReferentiel} /></Route>
            <Route path="/admin/abonnements"><AdminRoute component={AdminAbonnements} /></Route>

            <Route path="/echanges"><WorkspaceGuard component={EchangesCocci} /></Route>

            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/repondre/:token">
        <QueryClientProvider client={queryClient}>
          <BarometreSocialPublic />
        </QueryClientProvider>
      </Route>
      <Route path="/p/:token">
        <QueryClientProvider client={queryClient}>
          <PublicRsePage />
        </QueryClientProvider>
      </Route>
      <Route>
        <ClerkProviderWithRoutes />
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <AppRoutes />
    </WouterRouter>
  );
}
