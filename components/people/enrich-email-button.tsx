"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  IconMailSearch,
  IconLoader2,
  IconCheck,
  IconX,
  IconMail,
} from "@tabler/icons-react";

interface EnrichEmailButtonProps {
  personId: number;
  currentEmail: string | null;
}

interface EnrichResult {
  email: string | null;
  score: number | null;
  verified: boolean | null;
  verificationStatus: string | null;
  error: string | null;
}

export function EnrichEmailButton({ personId, currentEmail }: EnrichEmailButtonProps) {
  const [isEnriching, setIsEnriching] = useState(false);
  const [result, setResult] = useState<EnrichResult | null>(null);

  const enrichEmail = async () => {
    setIsEnriching(true);
    setResult(null);

    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId, verifyEmails: true }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Enrichment failed");
      }

      const enrichResult = data.results?.[0];
      if (enrichResult) {
        setResult(enrichResult);
        // Refresh after a short delay to show the result
        if (enrichResult.email) {
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      }
    } catch (error) {
      console.error("Enrichment failed:", error);
      setResult({
        email: null,
        score: null,
        verified: null,
        verificationStatus: null,
        error: "Failed to enrich",
      });
    } finally {
      setIsEnriching(false);
    }
  };

  // Already has email - show verify option
  if (currentEmail && !result) {
    return (
      <div className="space-y-2">
        <a
          href={`mailto:${currentEmail}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <IconMail className="w-4 h-4" />
          <span className="truncate">{currentEmail}</span>
        </a>
        <Button
          variant="ghost"
          size="sm"
          onClick={enrichEmail}
          disabled={isEnriching}
          className="w-full justify-start text-xs h-7"
        >
          {isEnriching ? (
            <IconLoader2 className="h-3 w-3 mr-2 animate-spin" />
          ) : (
            <IconCheck className="h-3 w-3 mr-2" />
          )}
          {isEnriching ? "Verifying..." : "Verify Email"}
        </Button>
      </div>
    );
  }

  // Show result
  if (result) {
    return (
      <div className="space-y-2">
        {result.email ? (
          <>
            <a
              href={`mailto:${result.email}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <IconMail className="w-4 h-4" />
              <span className="truncate">{result.email}</span>
            </a>
            <div className="flex items-center gap-2 text-xs">
              {result.verified ? (
                <span className="flex items-center gap-1 text-green-500">
                  <IconCheck className="w-3 h-3" />
                  Verified
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Confidence: {result.score}%
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <IconX className="w-3 h-3" />
            <span>Email not found</span>
          </div>
        )}
      </div>
    );
  }

  // No email - show find button
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={enrichEmail}
      disabled={isEnriching}
      className="w-full"
    >
      {isEnriching ? (
        <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <IconMailSearch className="h-4 w-4 mr-2" />
      )}
      {isEnriching ? "Finding..." : "Find Email"}
    </Button>
  );
}
