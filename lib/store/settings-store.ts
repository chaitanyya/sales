import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  setSelectedModel: (model: ClaudeModel) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      selectedModel: "sonnet",
      setSelectedModel: (model) => set({ selectedModel: model }),
    }),
    {
      name: "settings-storage",
      skipHydration: true,
    }
  )
);
