"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconX, IconCommand } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { useSelectionStore } from "@/lib/store/selection-store";
import { ActionCommandMenu, type ActionConfig } from "./action-command-menu";

interface FloatingActionBarProps {
  actions: ActionConfig[];
}

export function FloatingActionBar({ actions }: FloatingActionBarProps) {
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const selectedCount = useSelectionStore((state) => state.getSelectedCount());
  const clearAll = useSelectionStore((state) => state.clearAll);

  const isVisible = selectedCount > 0;

  // Keyboard shortcut to open command menu
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isVisible && (e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandMenuOpen(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible]);

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-background border border-border px-3 py-2 shadow-lg"
          >
            <span className="text-sm font-medium tabular-nums">{selectedCount} selected</span>

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={clearAll}
              className="text-muted-foreground hover:text-foreground"
            >
              <IconX className="size-4" />
              <span className="sr-only">Clear selection</span>
            </Button>

            <div className="h-4 w-px bg-border mx-1" />

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCommandMenuOpen(true)}
              className="gap-1.5"
            >
              Actions
              <kbd className="ml-1 text-[10px] text-muted-foreground bg-muted px-1 py-0.5 flex items-center gap-1">
                <IconCommand className="size-3" /> K
              </kbd>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <ActionCommandMenu
        open={commandMenuOpen}
        onOpenChange={setCommandMenuOpen}
        actions={actions}
      />
    </>
  );
}
