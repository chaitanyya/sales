"use client";

import { useEffect } from "react";
import { useStreamPanelStore } from "@/lib/store/stream-panel-store";
import { StreamPanel } from "./stream-panel";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

export function StreamPanelWrapper({ children }: { children: React.ReactNode }) {
  const { tabs } = useStreamPanelStore();

  // Rehydrate store on client mount
  useEffect(() => {
    useStreamPanelStore.persist.rehydrate();
  }, []);

  const hasTabs = tabs.length > 0;

  // If no tabs, just render children without resizable panels
  if (!hasTabs) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      </div>
    );
  }

  return (
    <ResizablePanelGroup direction="vertical" className="flex-1">
      <ResizablePanel defaultSize={75} minSize={20}>
        <main className="h-full flex flex-col overflow-hidden">{children}</main>
      </ResizablePanel>

      <ResizableHandle className="h-1 bg-white/10 hover:bg-white/20 transition-colors" />

      <ResizablePanel defaultSize={25} minSize={5} maxSize={60}>
        <StreamPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
