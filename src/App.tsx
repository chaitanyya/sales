import { Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Sidebar } from "@/components/layout/sidebar";
import { StreamPanelWrapper } from "@/components/stream-panel/stream-panel-wrapper";
import { Toaster } from "@/components/ui/sonner";
import { AuthGuard, PublicRoute } from "@/components/auth/auth-guard";
import { useEventBridge } from "@/lib/tauri/use-event-bridge";
import { queryClient } from "@/lib/query/query-client";
import { CompanyOverviewDialog } from "@/components/onboarding/company-overview-dialog";
import { useOnboardingStatus } from "@/lib/query";
import { IconLoader2 } from "@tabler/icons-react";
import { AuthLoadingPage } from "@/pages/auth/login";
import { SubscriptionLock } from "@/components/subscription";

// Pages
import LeadListPage from "@/pages/lead/list";
import LeadDetailPage from "@/pages/lead/detail";
import PeopleListPage from "@/pages/people/list";
import PersonDetailPage from "@/pages/people/detail";
import PromptPage from "@/pages/prompt";
import ScoringPage from "@/pages/scoring";
import LoginPage from "@/pages/auth/login";
import SignUpPage from "@/pages/auth/signup";

function AppContent() {
  const { data: onboardingStatus, isLoading } = useOnboardingStatus();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background bg-terminal-pattern">
        <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <CompanyOverviewDialog hasCompanyOverview={onboardingStatus?.hasCompanyOverview ?? false} />
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
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
