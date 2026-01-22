import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { ClientLogEntry, JobStatus } from "@/lib/types/claude";
import { ConnectionStatus } from "@/lib/stream";

// Maximum logs to persist per tab to avoid localStorage quota issues (5-10MB limit)
const MAX_PERSISTED_LOGS = 500;

export type StreamTabType = "company" | "person" | "conversation";

export interface StreamTab {
  jobId: string;
  label: string;
  type: StreamTabType;
  entityId: number;
  status: JobStatus | "running";
  logs: ClientLogEntry[];
  createdAt: number;
  connectionStatus: ConnectionStatus;
  lastEventIndex: number;
}

interface StreamPanelState {
  isOpen: boolean;
  tabs: StreamTab[];
  activeTabId: string | null;

  // Actions
  setOpen: (open: boolean) => void;
  toggle: () => void;
  addTab: (
    tab: Omit<StreamTab, "logs" | "createdAt" | "connectionStatus" | "lastEventIndex">
  ) => void;
  removeTab: (jobId: string) => void;
  setActiveTab: (jobId: string | null) => void;
  appendLogs: (jobId: string, logs: ClientLogEntry[]) => void;
  updateStatus: (jobId: string, status: StreamTab["status"]) => void;
  updateConnectionStatus: (jobId: string, status: ConnectionStatus) => void;
  incrementLastEventIndex: (jobId: string) => void;
  getLastEventIndex: (jobId: string) => number;
  getActiveTab: () => StreamTab | undefined;
  findTabByEntity: (entityId: number, type: StreamTabType) => StreamTab | undefined;
}

export const useStreamPanelStore = create<StreamPanelState>()(
  persist(
    immer((set, get) => ({
      isOpen: false,
      tabs: [],
      activeTabId: null,

      setOpen: (open) => set({ isOpen: open }),

      toggle: () =>
        set((state) => {
          state.isOpen = !state.isOpen;
        }),

      addTab: (tab) =>
        set((state) => {
          // Check if tab with same jobId already exists
          const existingTabByJobId = state.tabs.find((t) => t.jobId === tab.jobId);
          if (existingTabByJobId) {
            state.activeTabId = tab.jobId;
            state.isOpen = true;
            return;
          }

          // Check if tab with same entityId and type exists - replace it
          const existingTabIndex = state.tabs.findIndex(
            (t) => t.entityId === tab.entityId && t.type === tab.type
          );

          const newTab: StreamTab = {
            ...tab,
            logs: [],
            createdAt: Date.now(),
            connectionStatus: "idle",
            lastEventIndex: 0,
          };

          if (existingTabIndex !== -1) {
            // Replace existing tab with new one (direct mutation with Immer)
            state.tabs[existingTabIndex] = newTab;
          } else {
            state.tabs.push(newTab);
          }

          state.activeTabId = tab.jobId;
          state.isOpen = true;
        }),

      removeTab: (jobId) =>
        set((state) => {
          const removedIndex = state.tabs.findIndex((t) => t.jobId === jobId);
          if (removedIndex === -1) return;

          state.tabs.splice(removedIndex, 1);

          // If we're removing the active tab, switch to another one
          if (state.activeTabId === jobId) {
            if (state.tabs.length > 0) {
              const newIndex = Math.min(removedIndex, state.tabs.length - 1);
              state.activeTabId = state.tabs[newIndex]?.jobId ?? null;
            } else {
              state.activeTabId = null;
            }
          }

          if (state.tabs.length === 0) {
            state.isOpen = false;
          }
        }),

      setActiveTab: (jobId) => set({ activeTabId: jobId }),

      // Phase 3.2: Efficient log appending with Immer - O(1) push instead of O(n) spread
      appendLogs: (jobId, logs) =>
        set((state) => {
          const tab = state.tabs.find((t) => t.jobId === jobId);
          if (tab) {
            tab.logs.push(...logs); // Direct mutation with Immer
          }
        }),

      updateStatus: (jobId, status) =>
        set((state) => {
          const tab = state.tabs.find((t) => t.jobId === jobId);
          if (tab) {
            tab.status = status;
          }
        }),

      updateConnectionStatus: (jobId, status) =>
        set((state) => {
          const tab = state.tabs.find((t) => t.jobId === jobId);
          if (tab) {
            tab.connectionStatus = status;
          }
        }),

      incrementLastEventIndex: (jobId) =>
        set((state) => {
          const tab = state.tabs.find((t) => t.jobId === jobId);
          if (tab) {
            tab.lastEventIndex += 1;
          }
        }),

      getLastEventIndex: (jobId) => {
        const state = get();
        const tab = state.tabs.find((t) => t.jobId === jobId);
        return tab?.lastEventIndex ?? 0;
      },

      getActiveTab: () => {
        const state = get();
        return state.tabs.find((t) => t.jobId === state.activeTabId);
      },

      findTabByEntity: (entityId, type) => {
        const state = get();
        return state.tabs.find((t) => t.entityId === entityId && t.type === type);
      },
    })),
    {
      name: "stream-panel-storage",
      // Phase 3.3: Persist with log limiting to avoid localStorage quota issues
      partialize: (state) => ({
        isOpen: state.isOpen,
        activeTabId: state.activeTabId,
        tabs: state.tabs.map((tab) => ({
          ...tab,
          // Limit persisted logs to avoid localStorage quota (5-10MB limit)
          logs: tab.logs.slice(-MAX_PERSISTED_LOGS),
          connectionStatus: "idle" as ConnectionStatus, // Reset on reload
        })),
      }),
      // Skip hydration on server
      skipHydration: true,
      // Handle storage errors gracefully
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("[stream-panel-store] Hydration error:", error);
        }
      },
    }
  )
);
