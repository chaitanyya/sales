"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { IconCircleX } from "@tabler/icons-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex h-screen items-center justify-center bg-black">
      <div className="text-center max-w-md px-4">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <IconCircleX className="w-6 h-6 text-red-500" />
          </div>
        </div>
        <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
        <p className="text-muted-foreground mb-6">
          {error.message || "An unexpected error occurred"}
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="default">
            Try again
          </Button>
          <Button onClick={() => (window.location.href = "/")} variant="outline">
            Go home
          </Button>
        </div>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 mt-4">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
