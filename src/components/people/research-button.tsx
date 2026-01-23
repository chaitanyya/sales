import { Button } from "@/components/ui/button";
import { IconFlask, IconLoader2 } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useIsJobActive } from "@/lib/hooks/use-stream-tabs";

interface PersonResearchButtonProps {
  personId: number;
  researchStatus: string | null;
}

export function PersonResearchButton({ personId, researchStatus }: PersonResearchButtonProps) {
  const navigate = useNavigate();
  const isJobActive = useIsJobActive(personId, "person");
  const isDisabled = researchStatus === "in_progress" || isJobActive;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/people/${personId}`);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isDisabled}
      className="h-7 text-xs"
    >
      {isDisabled ? (
        <IconLoader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
      ) : (
        <IconFlask className="h-3.5 w-3.5 mr-1.5" />
      )}
      {isDisabled ? "Researching..." : "Research"}
    </Button>
  );
}
