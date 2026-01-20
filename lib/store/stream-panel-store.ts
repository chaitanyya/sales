import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ClientLogEntry, JobStatus } from "@/lib/types/claude";
import { ConnectionStatus } from "@/lib/stream";

export type StreamTabType = "company" | "person";

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
    (set, get) => ({
      isOpen: false,
      tabs: [],
      activeTabId: null,

      setOpen: (open) => set({ isOpen: open }),

      toggle: () => set((state) => ({ isOpen: !state.isOpen })),

      addTab: (tab) =>
        set((state) => {
          // Check if tab with same jobId already exists
          const existingTabByJobId = state.tabs.find((t) => t.jobId === tab.jobId);
          if (existingTabByJobId) {
            return { activeTabId: tab.jobId, isOpen: true };
          }

          // Check if tab with same entityId and type exists - replace it
          const existingTabByEntity = state.tabs.find(
            (t) => t.entityId === tab.entityId && t.type === tab.type
          );

          const newTab: StreamTab = {
            ...tab,
            logs: [],
            createdAt: Date.now(),
            connectionStatus: "idle",
            lastEventIndex: 0,
          };

          if (existingTabByEntity) {
            // Replace existing tab with new one
            return {
              tabs: state.tabs.map((t) =>
                t.entityId === tab.entityId && t.type === tab.type ? newTab : t
              ),
              activeTabId: tab.jobId,
              isOpen: true,
            };
          }

          return {
            tabs: [...state.tabs, newTab],
            activeTabId: tab.jobId,
            isOpen: true,
          };
        }),

      removeTab: (jobId) =>
        set((state) => {
          const newTabs = state.tabs.filter((t) => t.jobId !== jobId);
          let newActiveTabId = state.activeTabId;

          // If we're removing the active tab, switch to another one
          if (state.activeTabId === jobId) {
            const removedIndex = state.tabs.findIndex((t) => t.jobId === jobId);
            if (newTabs.length > 0) {
              // Try to select the tab before it, or the first one
              const newIndex = Math.min(removedIndex, newTabs.length - 1);
              newActiveTabId = newTabs[newIndex]?.jobId ?? null;
            } else {
              newActiveTabId = null;
            }
          }

          return {
            tabs: newTabs,
            activeTabId: newActiveTabId,
            isOpen: newTabs.length > 0 ? state.isOpen : false,
          };
        }),

      setActiveTab: (jobId) => set({ activeTabId: jobId }),

      appendLogs: (jobId, logs) =>
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.jobId === jobId ? { ...tab, logs: [...tab.logs, ...logs] } : tab
          ),
        })),

      updateStatus: (jobId, status) =>
        set((state) => ({
          tabs: state.tabs.map((tab) => (tab.jobId === jobId ? { ...tab, status } : tab)),
        })),

      updateConnectionStatus: (jobId, status) =>
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.jobId === jobId ? { ...tab, connectionStatus: status } : tab
          ),
        })),

      incrementLastEventIndex: (jobId) =>
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.jobId === jobId ? { ...tab, lastEventIndex: tab.lastEventIndex + 1 } : tab
          ),
        })),

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
    }),
    {
      name: "stream-panel-storage",
      // Persist logs so they survive page reloads
      // Reset connectionStatus on reload (will reconnect for running jobs)
      partialize: (state) => ({
        isOpen: state.isOpen,
        activeTabId: state.activeTabId,
        tabs: state.tabs.map((tab) => ({
          ...tab,
          connectionStatus: "idle" as ConnectionStatus, // Reset on reload
        })),
      }),
      // Skip hydration on server
      skipHydration: true,
    }
  )
);
