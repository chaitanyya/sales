import { Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Sidebar } from "@/components/layout/sidebar";
import { StreamPanelWrapper } from "@/components/stream-panel/stream-panel-wrapper";
import { Toaster } from "@/components/ui/sonner";
import { useEventBridge } from "@/lib/tauri/use-event-bridge";
import { queryClient } from "@/lib/query/query-client";

// Pages
import LeadListPage from "@/pages/lead/list";
import LeadDetailPage from "@/pages/lead/detail";
import PeopleListPage from "@/pages/people/list";
import PersonDetailPage from "@/pages/people/detail";
import PromptPage from "@/pages/prompt";
import ScoringPage from "@/pages/scoring";

export default function App() {
  // Initialize Tauri event → Zustand bridge
  useEventBridge();

  return (
    <QueryClientProvider client={queryClient}>
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
          </Routes>
        </StreamPanelWrapper>
        <Toaster />
      </div>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
