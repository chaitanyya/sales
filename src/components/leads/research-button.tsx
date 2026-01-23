import { Button } from "@/components/ui/button";
import { IconFlask, IconLoader2 } from "@tabler/icons-react";
import type { Lead } from "@/lib/tauri/types";
import { useNavigate } from "react-router-dom";
import { useIsJobActive } from "@/lib/hooks/use-stream-tabs";

export function ResearchButton({ lead }: { lead: Lead }) {
  const navigate = useNavigate();
  const isJobActive = useIsJobActive(lead.id, "company");
  const isDisabled = lead.researchStatus === "in_progress" || isJobActive;

  const handleClick = () => {
    navigate(`/lead/${lead.id}`);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isDisabled}
    >
      {isDisabled ? (
        <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <IconFlask className="h-4 w-4 mr-2" />
      )}
      {isDisabled ? "Enriching..." : "Enrich"}
    </Button>
  );
}
