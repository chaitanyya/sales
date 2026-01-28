import { create } from "zustand";
import { getSettings, updateSettings as updateSettingsCmd, type Theme } from "@/lib/tauri/commands";

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

export interface ThemeOption {
  value: Theme;
  label: string;
  icon: "sun" | "moon" | "device";
}

export const THEME_OPTIONS: ThemeOption[] = [
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "system", label: "System", icon: "device" },
];

interface SettingsState {
  selectedModel: ClaudeModel;
  useChrome: boolean;
  useGlmGateway: boolean;
  theme: Theme;
  isLoading: boolean;
  isInitialized: boolean;
  loadSettings: () => Promise<void>;
  setSelectedModel: (model: ClaudeModel) => Promise<void>;
  setUseChrome: (useChrome: boolean) => Promise<void>;
  setUseGlmGateway: (useGlmGateway: boolean) => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
}

// Apply theme to document
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");

  if (theme === "system") {
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.add(systemDark ? "dark" : "light");
  } else {
    root.classList.add(theme);
  }
}

// Listen for system theme changes
let mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null;

function setupSystemThemeListener(theme: Theme) {
  // Remove any existing listener
  if (mediaQueryListener) {
    window.matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", mediaQueryListener);
    mediaQueryListener = null;
  }

  // Only add listener if using system theme
  if (theme === "system") {
    mediaQueryListener = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(e.matches ? "dark" : "light");
    };
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", mediaQueryListener);
  }
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  selectedModel: "sonnet",
  useChrome: false,
  useGlmGateway: true, // Default to true
  theme: "dark",
  isLoading: false,
  isInitialized: false,

  loadSettings: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true });
    try {
      const settings = await getSettings();
      const theme = (settings.theme as Theme) || "dark";
      set({
        selectedModel: settings.model as ClaudeModel,
        useChrome: settings.useChrome,
        useGlmGateway: settings.useGlmGateway,
        theme,
        isInitialized: true,
      });
      applyTheme(theme);
      setupSystemThemeListener(theme);
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  setSelectedModel: async (model: ClaudeModel) => {
    const { useChrome, useGlmGateway, theme } = get();
    set({ selectedModel: model });
    try {
      await updateSettingsCmd(model, useChrome, useGlmGateway, theme);
    } catch (error) {
      console.error("Failed to update model setting:", error);
    }
  },

  setUseChrome: async (useChrome: boolean) => {
    const { selectedModel, useGlmGateway, theme } = get();
    set({ useChrome });
    try {
      await updateSettingsCmd(selectedModel, useChrome, useGlmGateway, theme);
    } catch (error) {
      console.error("Failed to update useChrome setting:", error);
    }
  },

  setUseGlmGateway: async (useGlmGateway: boolean) => {
    const { selectedModel, useChrome, theme } = get();
    set({ useGlmGateway });
    try {
      await updateSettingsCmd(selectedModel, useChrome, useGlmGateway, theme);
    } catch (error) {
      console.error("Failed to update useGlmGateway setting:", error);
    }
  },

  setTheme: async (theme: Theme) => {
    const { selectedModel, useChrome, useGlmGateway } = get();
    set({ theme });
    applyTheme(theme);
    setupSystemThemeListener(theme);
    try {
      await updateSettingsCmd(selectedModel, useChrome, useGlmGateway, theme);
    } catch (error) {
      console.error("Failed to update theme setting:", error);
    }
  },
}));
