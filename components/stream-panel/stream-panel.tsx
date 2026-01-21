"use client";

import { useStreamPanelStore } from "@/lib/store/stream-panel-store";
import { StreamPanelHeader } from "./stream-panel-header";
import { StreamPanelContent } from "./stream-panel-content";

export function StreamPanel() {
  const { isOpen } = useStreamPanelStore();

  return (
    <div className="bg-black flex flex-col h-full">
      <StreamPanelHeader />

      {/* Content area */}
      {isOpen && (
        <div className="flex-1 flex flex-col min-h-0">
          <StreamPanelContent />
        </div>
      )}
    </div>
  );
}
