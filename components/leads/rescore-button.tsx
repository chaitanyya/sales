"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IconTargetArrow, IconLoader2 } from "@tabler/icons-react";
import { useStreamPanelStore } from "@/lib/store/stream-panel-store";
import { useSettingsStore } from "@/lib/store/settings-store";
import { toast } from "sonner";

interface RescoreButtonProps {
  leadId: number;
  companyName: string;
  size?: "sm" | "default";
}

export function RescoreButton({ leadId, companyName, size = "default" }: RescoreButtonProps) {
  const [isScoring, setIsScoring] = useState(false);
  const addTab = useStreamPanelStore((state) => state.addTab);
  const setOpen = useStreamPanelStore((state) => state.setOpen);
  const selectedModel = useSettingsStore((state) => state.selectedModel);

  const handleRescore = async () => {
    setIsScoring(true);

    try {
      const response = await fetch("/api/scoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, mode: "single", model: selectedModel }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.jobId) {
          addTab({
            jobId: data.jobId,
            label: `Score: ${companyName}`,
            type: "company",
            entityId: leadId,
            status: "running",
          });
          setOpen(true);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error("Failed to start scoring", {
          description: errorData.error || "An unexpected error occurred",
        });
      }
    } catch {
      toast.error("Failed to start scoring");
    } finally {
      setIsScoring(false);
    }
  };

  return (
    <Button variant="outline" size={size} onClick={handleRescore} disabled={isScoring}>
      {isScoring ? (
        <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <IconTargetArrow className="w-4 h-4 mr-2" />
      )}
      {size === "sm" ? "Score" : "Score Lead"}
    </Button>
  );
}
