"use client";

import { useEffect } from "react";
import { IconSun, IconMoon, IconDeviceDesktop, IconChevronDown } from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useSettingsStore, THEME_OPTIONS } from "@/lib/store/settings-store";
import type { Theme } from "@/lib/tauri/commands";

const ThemeIcon = ({ theme, className }: { theme: Theme; className?: string }) => {
  if (theme === "light") {
    return <IconSun className={className} />;
  }
  if (theme === "dark") {
    return <IconMoon className={className} />;
  }
  return <IconDeviceDesktop className={className} />;
};

export function ThemeToggle() {
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const isInitialized = useSettingsStore((state) => state.isInitialized);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const currentTheme = THEME_OPTIONS.find((t) => t.value === theme) || THEME_OPTIONS[1];

  if (!isInitialized) {
    return (
      <div className="flex items-center gap-2 w-full px-2 py-1 text-muted-foreground text-sm">
        <IconMoon className="w-3.5 h-3.5" />
        <span>Dark</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 w-full px-2 py-1 rounded text-muted-foreground hover:bg-[var(--hover-overlay)] hover:text-foreground transition-colors text-sm outline-none">
          <ThemeIcon theme={currentTheme.value} className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">{currentTheme.label}</span>
          <IconChevronDown className="w-3 h-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-36">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value as Theme)}
        >
          {THEME_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              <ThemeIcon theme={option.value} className="w-4 h-4" />
              <span>{option.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
