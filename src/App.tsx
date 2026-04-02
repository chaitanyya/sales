import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { LazyMotion, domAnimation } from "motion/react";
import { Sidebar } from "@/components/layout/sidebar";
import { StreamPanelWrapper } from "@/components/stream-panel/stream-panel-wrapper";
import { Toaster } from "@/components/ui/sonner";
import { useEventBridge } from "@/lib/tauri/use-event-bridge";
import { queryClient } from "@/lib/query/query-client";
import { CompanyOverviewDialog } from "@/components/onboarding/company-overview-dialog";
import { useOnboardingStatus } from "@/lib/query";
import { IconLoader2 } from "@tabler/icons-react";

// Pages (lazy loaded)
const LeadListPage = lazy(() => import("@/pages/lead/list"));
const LeadDetailPage = lazy(() => import("@/pages/lead/detail"));
const PeopleListPage = lazy(() => import("@/pages/people/list"));
const PersonDetailPage = lazy(() => import("@/pages/people/detail"));
const PromptPage = lazy(() => import("@/pages/prompt"));
const ScoringPage = lazy(() => import("@/pages/scoring"));

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
      <div className="flex h-screen bg-background bg-terminal-pattern font-sans antialiased">
        <Sidebar />
        <StreamPanelWrapper>
          <Suspense fallback={<div className="flex-1 flex items-center justify-center"><IconLoader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
            <Routes>
              <Route path="/" element={<Navigate to="/lead" replace />} />
              <Route path="/lead" element={<LeadListPage />} />
              <Route path="/lead/:id" element={<LeadDetailPage />} />
              <Route path="/people" element={<PeopleListPage />} />
              <Route path="/people/:id" element={<PersonDetailPage />} />
              <Route path="/prompt" element={<PromptPage />} />
              <Route path="/scoring" element={<ScoringPage />} />
            </Routes>
          </Suspense>
        </StreamPanelWrapper>
        <Toaster />
      </div>
    </>
  );
}

export default function App() {
  // Initialize Tauri event → Zustand bridge
  useEventBridge();

  return (
    <QueryClientProvider client={queryClient}>
      <LazyMotion features={domAnimation}>
        <AppContent />
      </LazyMotion>
    </QueryClientProvider>
  );
}
