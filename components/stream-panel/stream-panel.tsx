"use client";

import { useStreamPanelStore } from "@/lib/store/stream-panel-store";
import { StreamPanelHeader } from "./stream-panel-header";
import { StreamPanelContent } from "./stream-panel-content";

export function StreamPanel() {
  // Use individual selector to only re-render when isOpen changes
  const isOpen = useStreamPanelStore((s) => s.isOpen);

  return (
    <div className="bg-black flex flex-col h-full">
      <StreamPanelHeader />

      {isOpen && (
        <div className="flex-1 flex flex-col min-h-0">
          <StreamPanelContent />
        </div>
      )}
    </div>
  );
}
