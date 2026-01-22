"use client";

import { useEffect, useState } from "react";
import { useStreamPanelStore } from "@/lib/store/stream-panel-store";
import { useShallow } from "zustand/react/shallow";
import { StreamPanel } from "./stream-panel";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

export function StreamPanelWrapper({ children }: { children: React.ReactNode }) {
  // Phase 4.1: Track hydration state to prevent flash
  const [isHydrated, setIsHydrated] = useState(false);

  // Use shallow comparison for state that changes together
  const { tabs, isOpen } = useStreamPanelStore(
    useShallow((s) => ({ tabs: s.tabs, isOpen: s.isOpen }))
  );

  // Rehydrate store on client mount and track hydration completion
  useEffect(() => {
    useStreamPanelStore.persist.rehydrate();
    setIsHydrated(true);
  }, []);

  const hasTabs = tabs.length > 0;

  // Render without panel until hydration is complete to prevent flash
  if (!isHydrated) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      </div>
    );
  }

  // If no tabs, just render children without resizable panels
  if (!hasTabs) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      </div>
    );
  }

  const collapsedSize = 4;
  const expandedMinSize = 30;
  const expandedMaxSize = 60;

  // Always render same structure to prevent remounting children
  return (
    <ResizablePanelGroup direction="vertical" className="flex-1">
      <ResizablePanel defaultSize={isOpen ? 65 : 96} minSize={20}>
        <main className="h-full flex flex-col overflow-hidden">{children}</main>
      </ResizablePanel>

      <ResizableHandle
        className="h-1 bg-white/10 hover:bg-white/20 transition-colors"
        disabled={!isOpen}
      />

      <ResizablePanel
        defaultSize={isOpen ? 35 : collapsedSize}
        minSize={isOpen ? expandedMinSize : collapsedSize}
        maxSize={isOpen ? expandedMaxSize : collapsedSize}
      >
        <StreamPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
