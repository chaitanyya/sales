import { create } from "zustand";
import { toast } from "sonner";
import { getSettings, updateSettings as updateSettingsCmd } from "@/lib/tauri/commands";
import modelConfig from "@/config/claude-models.json";

export type ClaudeModel =
  "claude-fable-5" | "claude-opus-4-8" | "claude-sonnet-5" | "claude-haiku-4-5";

export interface ModelOption {
  value: ClaudeModel;
  label: string;
  icon: "brain" | "lightning";
  description: string;
}

export const MODEL_OPTIONS = modelConfig.models as ModelOption[];
export const DEFAULT_MODEL = modelConfig.defaultModel as ClaudeModel;

export function isClaudeModel(value: string): value is ClaudeModel {
  return MODEL_OPTIONS.some((model) => model.value === value);
}

interface SettingsState {
  selectedModel: ClaudeModel;
  useChrome: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  isUpdatingModel: boolean;
  isUpdatingChrome: boolean;
  loadSettings: () => Promise<void>;
  setSelectedModel: (model: ClaudeModel) => Promise<void>;
  setUseChrome: (useChrome: boolean) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  selectedModel: DEFAULT_MODEL,
  useChrome: false,
  isLoading: false,
  isInitialized: false,
  isUpdatingModel: false,
  isUpdatingChrome: false,

  loadSettings: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true });
    try {
      const settings = await getSettings();
      set({
        selectedModel: isClaudeModel(settings.model) ? settings.model : DEFAULT_MODEL,
        useChrome: settings.useChrome,
        isInitialized: true,
      });
    } catch (error) {
      console.error("Failed to load settings:", error);
      toast.error("Failed to load settings");
    } finally {
      set({ isLoading: false });
    }
  },

  setSelectedModel: async (model: ClaudeModel) => {
    const { useChrome, selectedModel: previousModel } = get();

    // Pessimistic update: set loading state first
    set({ isUpdatingModel: true });

    try {
      // Wait for backend to confirm the update
      await updateSettingsCmd(model, useChrome);

      // Only update UI state after successful backend update
      set({ selectedModel: model });

      // Show success feedback
      const modelLabel = MODEL_OPTIONS.find((m) => m.value === model)?.label || model;
      toast.success(`Model updated to ${modelLabel}`);
    } catch (error) {
      console.error("Failed to update model setting:", error);

      // Revert to previous model on error
      set({ selectedModel: previousModel });

      // Show error with retry option
      toast.error("Failed to update model", {
        description: "The model selection could not be saved.",
        action: {
          label: "Retry",
          onClick: () => get().setSelectedModel(model),
        },
      });
    } finally {
      set({ isUpdatingModel: false });
    }
  },

  setUseChrome: async (useChrome: boolean) => {
    const { selectedModel, useChrome: previousUseChrome } = get();

    // Pessimistic update: set loading state first
    set({ isUpdatingChrome: true });

    try {
      // Wait for backend to confirm the update
      await updateSettingsCmd(selectedModel, useChrome);

      // Only update UI state after successful backend update
      set({ useChrome });

      // Show success feedback
      toast.success(`Browser integration ${useChrome ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Failed to update useChrome setting:", error);

      // Revert to previous value on error
      set({ useChrome: previousUseChrome });

      // Show error with retry option
      toast.error("Failed to update browser integration", {
        description: "The setting could not be saved.",
        action: {
          label: "Retry",
          onClick: () => get().setUseChrome(useChrome),
        },
      });
    } finally {
      set({ isUpdatingChrome: false });
    }
  },
}));
