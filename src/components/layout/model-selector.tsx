"use client";

import { useEffect } from "react";
import { IconBrain, IconBolt, IconChevronDown, IconLoader2 } from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  useSettingsStore,
  MODEL_OPTIONS,
  DEFAULT_MODEL,
  ClaudeModel,
} from "@/lib/store/settings-store";

const ModelIcon = ({ model, className }: { model: ClaudeModel; className?: string }) => {
  if (MODEL_OPTIONS.find((option) => option.value === model)?.icon === "brain") {
    return <IconBrain className={className} />;
  }
  return <IconBolt className={className} />;
};

export function ModelSelector() {
  const selectedModel = useSettingsStore((state) => state.selectedModel);
  const setSelectedModel = useSettingsStore((state) => state.setSelectedModel);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const isInitialized = useSettingsStore((state) => state.isInitialized);
  const isUpdatingModel = useSettingsStore((state) => state.isUpdatingModel);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const currentModel =
    MODEL_OPTIONS.find((model) => model.value === selectedModel) ||
    MODEL_OPTIONS.find((model) => model.value === DEFAULT_MODEL)!;

  if (!isInitialized) {
    return (
      <div className="flex items-center gap-2 w-full px-2 py-1 text-muted-foreground text-sm">
        <IconBolt className="size-3.5" />
        <span>Sonnet 5</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 w-full px-2 py-1 rounded text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors text-sm outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          disabled={isUpdatingModel}
        >
          {isUpdatingModel ? (
            <IconLoader2 className="size-3.5 animate-spin" />
          ) : (
            <ModelIcon model={currentModel.value} className="size-3.5" />
          )}
          <span className="flex-1 text-left">{currentModel.label}</span>
          <IconChevronDown className="size-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel>Claude Model</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={selectedModel}
          onValueChange={(value) => !isUpdatingModel && setSelectedModel(value as ClaudeModel)}
        >
          {MODEL_OPTIONS.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              disabled={isUpdatingModel}
            >
              <ModelIcon model={option.value} className="size-4" />
              <span title={option.description}>{option.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
