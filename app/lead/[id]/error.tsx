"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[lead/[id]] Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
      <div className="flex items-center gap-2 text-destructive">
        <IconAlertTriangle className="h-6 w-6" />
        <h2 className="text-lg font-semibold">Something went wrong</h2>
      </div>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        Failed to load lead details. This could be a temporary issue.
      </p>
      <Button onClick={reset} variant="outline" size="sm">
        <IconRefresh className="h-4 w-4 mr-2" />
        Try again
      </Button>
    </div>
  );
}
