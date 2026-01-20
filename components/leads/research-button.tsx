"use client";

import { Button } from "@/components/ui/button";
import { IconFlask } from "@tabler/icons-react";
import { Lead } from "@/db/schema";
import { useRouter } from "next/navigation";

export function ResearchButton({ lead }: { lead: Lead }) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/lead/${lead.id}`);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={lead.researchStatus === "in_progress"}
    >
      <IconFlask className="h-4 w-4 mr-2" />
      Enrich
    </Button>
  );
}
