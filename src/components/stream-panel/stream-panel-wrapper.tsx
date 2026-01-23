"use client";

import { useStreamTabs } from "@/lib/hooks/use-stream-tabs";
import { StreamPanel } from "./stream-panel";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

export function StreamPanelWrapper({ children }: { children: React.ReactNode }) {
  const { tabs } = useStreamTabs();
  const hasTabs = tabs.length > 0;

  // If no tabs, just render children without resizable panels
  if (!hasTabs) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      </div>
    );
  }

  // Always render same structure to prevent remounting children
  return (
    <ResizablePanelGroup direction="vertical" className="flex-1">
      <ResizablePanel defaultSize={65}>
        <main className="h-full flex flex-col overflow-hidden">{children}</main>
      </ResizablePanel>

      <ResizableHandle
        className="h-1 bg-transparent hover:bg-white/20 transition-colors cursor-row-resize"
        disabled={false}
      />

      <ResizablePanel
        defaultSize={35}
        minSize={15}
      >
        <StreamPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
