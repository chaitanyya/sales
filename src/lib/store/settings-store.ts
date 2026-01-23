import { create } from "zustand";
import { getSettings, updateSettings as updateSettingsCmd } from "@/lib/tauri/commands";

export type ClaudeModel = "opus" | "sonnet";

export interface ModelOption {
  value: ClaudeModel;
  label: string;
  icon: "brain" | "lightning";
}

export const MODEL_OPTIONS: ModelOption[] = [
  { value: "opus", label: "Claude Opus", icon: "brain" },
  { value: "sonnet", label: "Claude Sonnet", icon: "lightning" },
];

interface SettingsState {
  selectedModel: ClaudeModel;
  useChrome: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  loadSettings: () => Promise<void>;
  setSelectedModel: (model: ClaudeModel) => Promise<void>;
  setUseChrome: (useChrome: boolean) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  selectedModel: "sonnet",
  useChrome: false,
  isLoading: false,
  isInitialized: false,

  loadSettings: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true });
    try {
      const settings = await getSettings();
      set({
        selectedModel: settings.model as ClaudeModel,
        useChrome: settings.useChrome,
        isInitialized: true,
      });
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  setSelectedModel: async (model: ClaudeModel) => {
    const { useChrome } = get();
    set({ selectedModel: model });
    try {
      await updateSettingsCmd(model, useChrome);
    } catch (error) {
      console.error("Failed to update model setting:", error);
    }
  },

  setUseChrome: async (useChrome: boolean) => {
    const { selectedModel } = get();
    set({ useChrome });
    try {
      await updateSettingsCmd(selectedModel, useChrome);
    } catch (error) {
      console.error("Failed to update useChrome setting:", error);
    }
  },
}));
