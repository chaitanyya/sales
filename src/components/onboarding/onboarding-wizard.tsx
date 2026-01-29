"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OnboardingStep } from "@/components/onboarding/onboarding-step";
import { WizardStepBasicInfo } from "@/components/onboarding/wizard-step-basic-info";
import { WizardStepAnalysis } from "@/components/onboarding/wizard-step-analysis";
import { WizardStepReview } from "@/components/onboarding/wizard-step-review";
import { WizardStepComplete } from "@/components/onboarding/wizard-step-complete";
import { useCompanyProfile } from "@/lib/hooks/use-company-profile";
import type { ParsedCompanyProfile } from "@/lib/tauri/types";

interface OnboardingWizardProps {
  open: boolean;
  onComplete?: () => void;
  existingProfile?: ParsedCompanyProfile | null;
}

type WizardStep = 1 | 2 | 3 | 4;

const STEPS = [
  { id: 1, title: "Basic Info", description: "Tell us about your company" },
  { id: 2, title: "AI Analysis", description: "We'll analyze your website" },
  { id: 3, title: "Review", description: "Refine the extracted insights" },
  { id: 4, title: "Complete", description: "All set!" },
];

type AnalysisStatus = "idle" | "running" | "completed" | "failed";

export function OnboardingWizard({ open, onComplete, existingProfile }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [wizardData, setWizardData] = useState<{
    companyName: string;
    productName: string;
    website: string;
  }>({
    companyName: existingProfile?.companyName || "",
    productName: existingProfile?.productName || "",
    website: existingProfile?.website || "",
  });
  // Track analysis state at wizard level so it persists when navigating
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [analysisJobId, setAnalysisJobId] = useState<string | null>(null);
  const [shouldRefetchProfile, setShouldRefetchProfile] = useState(false);

  const { profile, isLoading: profileLoading, startResearch } = useCompanyProfile();

  // When dialog opens, check if there's an existing completed profile
  useEffect(() => {
    if (open && existingProfile && existingProfile.researchStatus === "completed") {
      setAnalysisStatus("completed");
    }
  }, [open, existingProfile]);

  // When moving to review step, trigger a profile refetch
  useEffect(() => {
    if (currentStep === 3 && shouldRefetchProfile) {
      // The useCompanyProfile hook will refetch due to query invalidation
      // Just need to wait a moment for the data to be saved
      const timer = setTimeout(() => {
        setShouldRefetchProfile(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentStep, shouldRefetchProfile]);

  const handleStep1Complete = (data: { companyName: string; productName: string; website: string }) => {
    setWizardData(data);
    setCurrentStep(2);
  };

  const handleAnalysisComplete = useCallback((jobId?: string) => {
    // Add a small delay to ensure data is saved before advancing
    setTimeout(() => {
      setAnalysisStatus("completed");
      setShouldRefetchProfile(true);
      setCurrentStep(3);
    }, 1500);
  }, []);

  const handleAnalysisStarted = useCallback((jobId: string) => {
    setAnalysisStatus("running");
    setAnalysisJobId(jobId);
  }, []);

  const handleAnalysisFailed = useCallback(() => {
    setAnalysisStatus("failed");
  }, []);

  const handleReviewComplete = () => {
    setCurrentStep(4);
  };

  const handleComplete = () => {
    onComplete?.();
  };

  const canGoBack = currentStep > 1 && currentStep !== 4;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="sm:max-w-2xl h-[80vh] flex flex-col p-0 overflow-hidden"
      >
        <DialogHeader className="px-6 pb-4">
          <DialogTitle>Set up your company profile</DialogTitle>
          <DialogDescription>
            {currentStep === 1 && "Tell us about your company so we can tailor research to your business"}
            {currentStep === 2 && "Our AI will analyze your website to extract key insights"}
            {currentStep === 3 && "Review and refine the extracted information"}
            {currentStep === 4 && "Your company profile is ready!"}
          </DialogDescription>
        </DialogHeader>

        {/* Steps sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Step indicator */}
          <div className="w-48 border-r bg-muted/30 p-4 space-y-2">
            {STEPS.map((step) => (
              <OnboardingStep
                key={step.id}
                step={step}
                isActive={currentStep === step.id}
                isCompleted={currentStep > step.id}
                onClick={() => {
                  // Can only navigate back to previous steps
                  if (step.id < currentStep) {
                    setCurrentStep(step.id as WizardStep);
                  }
                }}
              />
            ))}
          </div>

          {/* Step content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {currentStep === 1 && (
              <WizardStepBasicInfo
                initialData={wizardData}
                existingProfile={existingProfile}
                onNext={handleStep1Complete}
              />
            )}

            {currentStep === 2 && (
              <WizardStepAnalysis
                companyName={wizardData.companyName}
                productName={wizardData.productName}
                website={wizardData.website}
                onComplete={handleAnalysisComplete}
                onStarted={handleAnalysisStarted}
                onFailed={handleAnalysisFailed}
                initialStatus={analysisStatus}
                initialJobId={analysisJobId}
              />
            )}

            {currentStep === 3 && (
              <WizardStepReview
                profile={profile}
                isLoading={profileLoading || shouldRefetchProfile}
                onNext={handleReviewComplete}
              />
            )}

            {currentStep === 4 && (
              <WizardStepComplete
                companyName={wizardData.companyName}
                onComplete={handleComplete}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
