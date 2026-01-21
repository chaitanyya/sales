"use client";

import { useState, useCallback } from "react";
import { useStreamPanelStore, StreamTabType } from "@/lib/store/stream-panel-store";

interface UseAgentActionOptions {
  entityId: number;
  entityType: StreamTabType;
  entityLabel: string;
  apiEndpoint: string;
  killEndpoint: string;
}

interface StartActionOptions {
  body?: Record<string, unknown>;
  tabLabelSuffix?: string;
}

export function useAgentAction(options: UseAgentActionOptions) {
  const { entityId, entityType, entityLabel, apiEndpoint, killEndpoint } = options;

  const [isStarting, setIsStarting] = useState(false);
  const addTab = useStreamPanelStore((state) => state.addTab);
  const findTabByEntity = useStreamPanelStore((state) => state.findTabByEntity);

  const startAction = useCallback(
    async (actionOptions?: StartActionOptions) => {
      setIsStarting(true);

      try {
        // Kill existing job for this entity if running
        const existingTab = findTabByEntity(entityId, entityType);
        if (existingTab && existingTab.status === "running") {
          try {
            await fetch(`${killEndpoint}/${existingTab.jobId}/kill`, {
              method: "POST",
            });
          } catch (error) {
            console.error("Failed to kill existing job:", error);
          }
        }

        const res = await fetch(apiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(actionOptions?.body || {}),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || `Failed to start action: ${res.statusText}`);
        }

        const { jobId } = data;

        // Build tab label
        const tabLabel = actionOptions?.tabLabelSuffix
          ? `${entityLabel} - ${actionOptions.tabLabelSuffix}`
          : entityLabel;

        // Add tab to stream panel
        addTab({
          jobId,
          label: tabLabel,
          type: entityType,
          entityId,
          status: "running",
        });

        return { jobId, success: true };
      } catch (error) {
        console.error("Failed to start action:", error);
        return { success: false, error };
      } finally {
        setIsStarting(false);
      }
    },
    [entityId, entityType, entityLabel, apiEndpoint, killEndpoint, addTab, findTabByEntity]
  );

  return { startAction, isStarting };
}
