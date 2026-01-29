import { Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
// ReactQueryDevtools removed - was causing crash
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useAuth } from "@clerk/clerk-react";
import { Sidebar } from "@/components/layout/sidebar";
import { StreamPanelWrapper } from "@/components/stream-panel/stream-panel-wrapper";
import { Toaster } from "@/components/ui/sonner";
import { AuthGuard, PublicRoute } from "@/components/auth/auth-guard";
import { useEventBridge } from "@/lib/tauri/use-event-bridge";
import { queryClient } from "@/lib/query/query-client";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { OrgRegistrationDialog } from "@/components/org";
import { useOnboardingStatus } from "@/lib/query";
import { useCompanyProfile } from "@/lib/hooks/use-company-profile";
import { useOrgBinding } from "@/lib/hooks/use-org-binding";
import { useAuthStore } from "@/lib/store/auth-store";
import { IconLoader2 } from "@tabler/icons-react";
import { AuthLoadingPage } from "@/pages/auth/login";
import { SubscriptionLock } from "@/components/subscription";
import { useState, useEffect } from "react";
import { isOrgBound } from "@/lib/tauri/commands";
import type { OrgBinding } from "@/lib/tauri/types";

// Pages
import LeadListPage from "@/pages/lead/list";
import LeadDetailPage from "@/pages/lead/detail";
import PeopleListPage from "@/pages/people/list";
import PersonDetailPage from "@/pages/people/detail";
import PromptPage from "@/pages/prompt";
import ScoringPage from "@/pages/scoring";
import CompanyProfilePage from "@/pages/company-profile";
import LoginPage from "@/pages/auth/login";
import SignUpPage from "@/pages/auth/signup";

function AppContent() {
  const { isSignedIn, isLoaded: isAuthLoaded } = useAuth();
  const { user } = useAuthStore();
  const { data: onboardingStatus, isLoading } = useOnboardingStatus();
  const { profile: companyProfile } = useCompanyProfile();
  const { orgBinding, isLoading: isLoadingOrg, refetch } = useOrgBinding();
  const [showRegistration, setShowRegistration] = useState(false);

  // Show registration dialog only when user is authenticated AND synced to Zustand
  useEffect(() => {
    if (isAuthLoaded && isSignedIn && user && !isLoadingOrg && !orgBinding) {
      setShowRegistration(true);
    } else if (!isSignedIn) {
      setShowRegistration(false);
    }
  }, [isAuthLoaded, isSignedIn, user, isLoadingOrg, orgBinding]);

  if (isLoading || isLoadingOrg) {
    return (
      <div className="flex h-screen items-center justify-center bg-background bg-terminal-pattern">
        <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleOrgRegistrationComplete = (binding: OrgBinding) => {
    setShowRegistration(false);
    refetch();
  };

  const handleOnboardingComplete = () => {
    // Invalidate queries to refresh onboarding status
    queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
  };

  const showOnboardingWizard = onboardingStatus && !onboardingStatus.hasCompanyProfile;

  return (
    <>
      <OrgRegistrationDialog
        open={showRegistration}
        onComplete={handleOrgRegistrationComplete}
      />

      {/* Show onboarding wizard for users without a company profile */}
      {isAuthLoaded && isSignedIn && user && showOnboardingWizard && (
        <OnboardingWizard
          open={true}
          onComplete={handleOnboardingComplete}
          existingProfile={companyProfile}
        />
      )}

      <Routes>
        {/* Public routes - redirect to app if authenticated */}
        <Route
          path="/auth/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/auth/signup"
          element={
            <PublicRoute>
              <SignUpPage />
            </PublicRoute>
          }
        />

        {/* Protected routes - require authentication */}
        <Route
          path="/*"
          element={
            <AuthGuard>
              <div className="flex h-screen bg-background bg-terminal-pattern font-sans antialiased">
                <Sidebar />
                <StreamPanelWrapper>
                  <Routes>
                    <Route path="/" element={<Navigate to="/lead" replace />} />
                    <Route path="/lead" element={<LeadListPage />} />
                    <Route path="/lead/:id" element={<LeadDetailPage />} />
                    <Route path="/people" element={<PeopleListPage />} />
                    <Route path="/people/:id" element={<PersonDetailPage />} />
                    <Route path="/prompt" element={<PromptPage />} />
                    <Route path="/scoring" element={<ScoringPage />} />
                    <Route path="/company-profile" element={<CompanyProfilePage />} />
                    {/* Catch all - redirect to leads */}
                    <Route path="*" element={<Navigate to="/lead" replace />} />
                  </Routes>
                </StreamPanelWrapper>
                <Toaster />
              </div>
            </AuthGuard>
          }
        />
      </Routes>
    </>
  );
}

export default function App() {
  // Initialize Tauri event → Zustand bridge
  useEventBridge();

  return (
    <QueryClientProvider client={queryClient}>
      <SubscriptionLock />
      <AppContent />
      {/* ReactQueryDevtools disabled - was causing app crash */}
    </QueryClientProvider>
  );
}
