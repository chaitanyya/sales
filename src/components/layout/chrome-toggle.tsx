"use client";

import { useEffect } from "react";
import { IconBrandChrome } from "@tabler/icons-react";
import { useSettingsStore } from "@/lib/store/settings-store";

export function ChromeToggle() {
  const useChrome = useSettingsStore((state) => state.useChrome);
  const setUseChrome = useSettingsStore((state) => state.setUseChrome);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const isInitialized = useSettingsStore((state) => state.isInitialized);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  if (!isInitialized) {
    return (
      <div className="flex items-center gap-2 w-full px-2 py-1 text-muted-foreground text-sm">
        <IconBrandChrome className="w-3.5 h-3.5" />
        <span>Chrome Access</span>
      </div>
    );
  }

  return (
    <button
      onClick={() => setUseChrome(!useChrome)}
      className="flex items-center gap-2 w-full px-2 py-1 rounded text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors text-sm outline-none"
    >
      <IconBrandChrome className="w-3.5 h-3.5" />
      <span className="flex-1 text-left">Chrome Access</span>
      <div
        className={`w-7 h-4 rounded-full transition-colors ${
          useChrome ? "bg-primary" : "bg-white/20"
        } relative`}
      >
        <div
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
            useChrome ? "translate-x-3.5" : "translate-x-0.5"
          }`}
        />
      </div>
    </button>
  );
}
