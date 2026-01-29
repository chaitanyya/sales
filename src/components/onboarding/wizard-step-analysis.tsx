"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { IconLoader2, IconCheck, IconWorld, IconBrain, IconFileText, IconUsers } from "@tabler/icons-react";
import { toast } from "sonner";
import { useCompanyProfile } from "@/lib/hooks/use-company-profile";
import { StreamPanelContent } from "@/components/stream-panel/stream-panel-content";
import { listen } from "@tauri-apps/api/event";
import { useStreamPanelStore } from "@/lib/store/stream-panel-store";

interface WizardStepAnalysisProps {
  companyName: string;
  productName: string;
  website: string;
  onComplete: (jobId?: string) => void;
  onStarted?: (jobId: string) => void;
  onFailed?: () => void;
  initialStatus?: AnalysisStatus;
  initialJobId?: string | null;
}

type AnalysisStatus = "idle" | "running" | "completed" | "failed";

type AnalysisStage = "browsing" | "analyzing" | "extracting" | "finalizing";

const ANALYSIS_STAGES: { key: AnalysisStage; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "browsing", label: "Browsing Website", icon: IconWorld },
  { key: "analyzing", label: "Analyzing Content", icon: IconBrain },
  { key: "extracting", label: "Extracting Insights", icon: IconFileText },
  { key: "finalizing", label: "Finalizing Profile", icon: IconUsers },
];

export function WizardStepAnalysis({
  companyName,
  productName,
  website,
  onComplete,
  onStarted,
  onFailed,
  initialStatus,
  initialJobId,
}: WizardStepAnalysisProps) {
  // Use initial status if provided (for state persistence when navigating back)
  const [status, setStatus] = useState<AnalysisStatus>(initialStatus ?? "idle");
  const [jobId, setJobId] = useState<string | null>(initialJobId ?? null);
  const [currentStage, setCurrentStage] = useState<AnalysisStage>("browsing");
  const [elapsedTime, setElapsedTime] = useState(0);
  const { startResearch, isResearching } = useCompanyProfile();

  // Estimate ~2 minutes per stage
  const ESTIMATED_TIME_MS = 8 * 60 * 1000; // 8 minutes total
  const progressPercent = Math.min(95, Math.round((elapsedTime / ESTIMATED_TIME_MS) * 100));

  // Track elapsed time
  useEffect(() => {
    if (status === "running") {
      const interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1000);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status]);

  // Update stage based on elapsed time
  useEffect(() => {
    if (status !== "running") return;

    const stageDuration = ESTIMATED_TIME_MS / 4;
    const stageIndex = Math.min(3, Math.floor(elapsedTime / stageDuration));
    setCurrentStage(ANALYSIS_STAGES[stageIndex].key);
  }, [elapsedTime, status]);

  const handleStartAnalysis = async () => {
    setStatus("running");
    setElapsedTime(0); // Reset timer
    setCurrentStage("browsing"); // Reset to first stage

    try {
      const result = await startResearch(companyName, productName, website);
      setJobId(result.jobId);
      onStarted?.(result.jobId);
    } catch (error) {
      console.error("Failed to start research:", error);
      toast.error("Failed to start analysis", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      });
      setStatus("failed");
      onFailed?.();
    }
  };

  // Set active tab when jobId changes
  useEffect(() => {
    if (jobId) {
      useStreamPanelStore.getState().setActiveTab(jobId);
    }
  }, [jobId]);

  // Listen for job status changes to detect completion
  useEffect(() => {
    if (!jobId) return;

    const unlistenPromise = listen<{ jobId: string; status: string }>("job-status-changed", (event) => {
      if (event.payload.jobId === jobId) {
        if (event.payload.status === "completed") {
          setStatus("completed");
        } else if (event.payload.status === "error") {
          setStatus("failed");
        }
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [jobId]);

  // Auto-advance when complete
  useEffect(() => {
    if (status === "completed") {
      const timer = setTimeout(() => {
        onComplete(jobId ?? undefined);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [status, onComplete, jobId]);

  return (
    <div className="space-y-6">
      {status === "idle" && (
        <div className="space-y-4">
          <div className="text-center py-8">
            <p className="text-lg font-medium mb-2">Ready to analyze your company</p>
            <p className="text-muted-foreground">
              We'll browse <strong>{website}</strong> and extract:
            </p>
            <ul className="text-left text-sm text-muted-foreground space-y-1 max-w-xs mx-auto mt-4">
              <li>• Target audience and buyer personas</li>
              <li>• Your unique selling propositions</li>
              <li>• Marketing and sales narratives</li>
              <li>• Key competitors</li>
              <li>• Market insights and trends</li>
            </ul>
          </div>
          <div className="flex justify-center">
            <Button onClick={handleStartAnalysis} size="lg">
              Start Analysis
            </Button>
          </div>
        </div>
      )}

      {(status === "running" || status === "completed") && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            {status === "running" && (
              <>
                <IconLoader2 className="animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">
                  {ANALYSIS_STAGES.find((s) => s.key === currentStage)?.label || "Processing..."}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {Math.floor(elapsedTime / 1000)}s
                </span>
              </>
            )}
            {status === "completed" && (
              <>
                <IconCheck className="text-green-600" />
                <span className="text-green-600">Analysis complete!</span>
              </>
            )}
          </div>

          {/* Progress bar */}
          {status === "running" && (
            <div className="space-y-2">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Starting analysis</span>
                <span>~{Math.floor(ESTIMATED_TIME_MS / 60000)} min estimate</span>
              </div>
            </div>
          )}

          {/* Stage indicators */}
          {status === "running" && (
            <div className="flex items-center justify-between gap-2 py-2">
              {ANALYSIS_STAGES.map((stage, index) => {
                const Icon = stage.icon;
                const isCurrent = stage.key === currentStage;
                const isPast = ANALYSIS_STAGES.findIndex((s) => s.key === currentStage) > index;

                return (
                  <div key={stage.key} className="flex items-center gap-1 flex-1">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                        isPast
                          ? "bg-green-100 border-green-500 text-green-600"
                          : isCurrent
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-muted border-muted-foreground/30 text-muted-foreground"
                      }`}
                    >
                      {isPast ? (
                        <IconCheck className="w-4 h-4" />
                      ) : (
                        <Icon className={`w-4 h-4 ${isCurrent ? "animate-pulse" : ""}`} />
                      )}
                    </div>
                    <span className={`text-xs hidden sm:block ${isCurrent ? "font-medium" : "text-muted-foreground"}`}>
                      {stage.label}
                    </span>
                    {index < ANALYSIS_STAGES.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 ${isPast ? "bg-green-500" : "bg-muted"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Streaming output */}
          <div className="border rounded-lg bg-muted/30 min-h-64 max-h-64 overflow-hidden">
            {jobId ? (
              <StreamPanelContent />
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Initializing...
              </div>
            )}
          </div>

          {status === "completed" && (
            <div className="flex justify-center pt-4">
              <Button onClick={() => onComplete(jobId ?? undefined)}>Continue to Review</Button>
            </div>
          )}
        </div>
      )}

      {status === "failed" && (
        <div className="space-y-4 text-center">
          <p className="text-destructive">Analysis failed. Please try again.</p>
          <div className="flex justify-center gap-2">
            <Button variant="outline" onClick={() => setStatus("idle")}>
              Go Back
            </Button>
            <Button onClick={handleStartAnalysis}>
              Try Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
