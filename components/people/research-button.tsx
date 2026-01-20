"use client";

import { Button } from "@/components/ui/button";
import { IconFlask } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

interface PersonResearchButtonProps {
  personId: number;
  researchStatus: string | null;
}

export function PersonResearchButton({ personId, researchStatus }: PersonResearchButtonProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/people/${personId}`);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={researchStatus === "in_progress"}
      className="h-7 text-xs"
    >
      <IconFlask className="h-3.5 w-3.5 mr-1.5" />
      Research
    </Button>
  );
}
