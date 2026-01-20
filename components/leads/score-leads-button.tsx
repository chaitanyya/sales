"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { IconTargetArrow, IconChevronDown, IconLoader2 } from "@tabler/icons-react";
import { useStreamPanelStore } from "@/lib/store/stream-panel-store";

interface ScoreLeadsButtonProps {
  unscoredCount: number;
  totalCount: number;
}

export function ScoreLeadsButton({ unscoredCount, totalCount }: ScoreLeadsButtonProps) {
  const [isScoring, setIsScoring] = useState(false);
  const addTab = useStreamPanelStore((state) => state.addTab);
  const setOpen = useStreamPanelStore((state) => state.setOpen);

  const handleScore = async (mode: "unscored" | "all") => {
    setIsScoring(true);

    try {
      const response = await fetch("/api/scoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.jobId) {
          addTab({
            jobId: data.jobId,
            label: mode === "unscored" ? "Score Unscored" : "Rescore All",
            type: "company",
            entityId: 0,
            status: "running",
          });
          setOpen(true);
        }
      }
    } catch (error) {
      console.error("Failed to start scoring:", error);
    } finally {
      setIsScoring(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs" disabled={isScoring}>
          {isScoring ? (
            <IconLoader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
          ) : (
            <IconTargetArrow className="w-3.5 h-3.5 mr-1" />
          )}
          Score Leads
          <IconChevronDown className="w-3 h-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => handleScore("unscored")} disabled={unscoredCount === 0}>
          <span>Score Unscored</span>
          <span className="ml-auto text-muted-foreground text-xs">{unscoredCount}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleScore("all")} disabled={totalCount === 0}>
          <span>Rescore All</span>
          <span className="ml-auto text-muted-foreground text-xs">{totalCount}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
