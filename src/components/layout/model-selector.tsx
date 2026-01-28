"use client";

import { useEffect } from "react";
import { IconBrain, IconBolt, IconChevronDown } from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useSettingsStore, MODEL_OPTIONS, ClaudeModel } from "@/lib/store/settings-store";

const ModelIcon = ({ model, className }: { model: ClaudeModel; className?: string }) => {
  if (model === "opus") {
    return <IconBrain className={className} />;
  }
  return <IconBolt className={className} />;
};

export function ModelSelector() {
  const selectedModel = useSettingsStore((state) => state.selectedModel);
  const setSelectedModel = useSettingsStore((state) => state.setSelectedModel);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const isInitialized = useSettingsStore((state) => state.isInitialized);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const currentModel = MODEL_OPTIONS.find((m) => m.value === selectedModel) || MODEL_OPTIONS[1];

  if (!isInitialized) {
    return (
      <div className="flex items-center gap-2 w-full px-2 py-1 text-muted-foreground text-sm">
        <IconBolt className="w-3.5 h-3.5" />
        <span>Sonnet</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 w-full px-2 py-1 rounded text-muted-foreground hover:bg-[var(--hover-overlay)] hover:text-foreground transition-colors text-sm outline-none">
          <ModelIcon model={currentModel.value} className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">{currentModel.label}</span>
          <IconChevronDown className="w-3 h-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        <DropdownMenuLabel>Claude Model</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={selectedModel}
          onValueChange={(value) => setSelectedModel(value as ClaudeModel)}
        >
          {MODEL_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              <ModelIcon model={option.value} className="w-4 h-4" />
              <span>{option.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
