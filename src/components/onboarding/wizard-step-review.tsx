"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IconCheck, IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { useCompanyProfile } from "@/lib/hooks/use-company-profile";
import { cn } from "@/lib/utils";
import type { ParsedCompanyProfile } from "@/lib/tauri/types";

interface WizardStepReviewProps {
  profile: ParsedCompanyProfile | null;
  onNext: () => void;
  isLoading?: boolean;
}

interface SectionConfig {
  id: string;
  title: string;
  description: string;
  renderPreview: (data: ParsedCompanyProfile) => React.ReactNode;
  isEmpty: (data: ParsedCompanyProfile) => boolean;
}

const SECTIONS: SectionConfig[] = [
  {
    id: "targetAudience",
    title: "Target Audience",
    description: "Who you sell to",
    renderPreview: (data) => (
      <div className="space-y-2">
        {data.targetAudience.map((audience, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className="font-medium">{audience.segment}:</span>
            <span className="text-muted-foreground">{audience.description}</span>
          </div>
        ))}
      </div>
    ),
    isEmpty: (data) => data.targetAudience.length === 0,
  },
  {
    id: "usps",
    title: "Unique Selling Propositions",
    description: "What makes you different",
    renderPreview: (data) => (
      <div className="space-y-2">
        {data.usps.map((usp, i) => (
          <div key={i} className="text-sm">
            <p className="font-medium">{usp.headline}</p>
            <p className="text-muted-foreground text-xs">{usp.explanation}</p>
          </div>
        ))}
      </div>
    ),
    isEmpty: (data) => data.usps.length === 0,
  },
  {
    id: "marketingNarrative",
    title: "Marketing Narrative",
    description: "Your brand positioning",
    renderPreview: (data) => (
      <div className="text-sm whitespace-pre-wrap line-clamp-4">{data.marketingNarrative}</div>
    ),
    isEmpty: (data) => !data.marketingNarrative,
  },
  {
    id: "salesNarrative",
    title: "Sales Narrative",
    description: "How to talk about your company",
    renderPreview: (data) => (
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium">Elevator Pitch:</span>
          <p className="text-muted-foreground">{data.salesNarrative.elevatorPitch}</p>
        </div>
        {data.salesNarrative.talkingPoints.length > 0 && (
          <div>
            <span className="font-medium">Key Points:</span>
            <ul className="list-disc pl-4 text-muted-foreground text-xs">
              {data.salesNarrative.talkingPoints.map((point, i) => (
                <li key={i}>{point.content}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    ),
    isEmpty: (data) => !data.salesNarrative.elevatorPitch && data.salesNarrative.talkingPoints.length === 0,
  },
  {
    id: "competitors",
    title: "Competitors",
    description: "Who you compete with",
    renderPreview: (data) => (
      <div className="flex flex-wrap gap-2">
        {data.competitors.map((competitor, i) => (
          <span key={i} className="px-2 py-1 bg-muted rounded-md text-xs">
            {competitor.name}
          </span>
        ))}
      </div>
    ),
    isEmpty: (data) => data.competitors.length === 0,
  },
  {
    id: "marketInsights",
    title: "Market Insights",
    description: "Industry trends and context",
    renderPreview: (data) => (
      <div className="space-y-2">
        {data.marketInsights.map((insight, i) => (
          <div key={i} className="text-sm">
            <span className="font-medium text-xs">{insight.category}:</span>
            <p className="text-muted-foreground text-xs">{insight.content}</p>
          </div>
        ))}
      </div>
    ),
    isEmpty: (data) => data.marketInsights.length === 0,
  },
];

export function WizardStepReview({ profile, onNext, isLoading }: WizardStepReviewProps) {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());

  // Empty profile for fallback - declared before use
  const emptyProfile: ParsedCompanyProfile = {
    id: 0,
    companyName: "",
    productName: "",
    website: "",
    targetAudience: [],
    usps: [],
    marketingNarrative: "",
    salesNarrative: { elevatorPitch: "", talkingPoints: [] },
    competitors: [],
    marketInsights: [],
    rawAnalysis: "",
    researchStatus: "pending",
    researchedAt: null,
    createdAt: 0,
    updatedAt: 0,
  };

  // Show loading state while fetching profile data
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground">Loading your profile...</p>
      </div>
    );
  }

  // Show empty state if no profile data
  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
        <p className="text-muted-foreground">No profile data found. Please complete the analysis first.</p>
      </div>
    );
  }

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const markSectionComplete = (sectionId: string) => {
    setCompletedSections((prev) => {
      const newSet = new Set(prev);
      newSet.add(sectionId);
      return newSet;
    });
  };

  const allComplete = SECTIONS.every((section) => completedSections.has(section.id) || section.isEmpty(profile ?? emptyProfile));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Review each section and mark it as complete. You can edit sections after setup in Settings.
      </p>

      <div className="space-y-3">
        {SECTIONS.map((section) => {
          const isComplete = completedSections.has(section.id) || section.isEmpty(profile);
          const isOpen = openSections.has(section.id);

          return (
            <Collapsible key={section.id} open={isOpen} onOpenChange={(open) => toggleSection(section.id)}>
              <Card className={cn(!isOpen && "hover:bg-muted/50")}>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center",
                            isComplete ? "bg-green-600 border-green-600 text-white" : "border-muted-foreground"
                          )}
                        >
                          {isComplete ? <IconCheck className="w-3 h-3" /> : null}
                        </div>
                        <div className="text-left">
                          <CardTitle className="text-sm">{section.title}</CardTitle>
                          <CardDescription className="text-xs">{section.description}</CardDescription>
                        </div>
                      </div>
                      <IconChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          isOpen && "rotate-180"
                        )}
                      />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="px-4 pb-4 pt-0">
                    {!section.isEmpty(profile) ? (
                      <div>{section.renderPreview(profile)}</div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No data available</p>
                    )}
                    <div className="flex gap-2 mt-4">
                      {!section.isEmpty(profile) && (
                        <Button
                          size="sm"
                          variant={isComplete ? "outline" : "default"}
                          onClick={() => markSectionComplete(section.id)}
                        >
                          {isComplete ? "Completed" : "Mark Complete"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-muted-foreground"
                        onClick={() => toast.info("You can edit this section in Settings after setup")}
                      >
                        Edit in Settings
                      </Button>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      <div className="flex justify-between pt-4 border-t">
        <p className="text-xs text-muted-foreground self-center">
          {completedSections.size} of {SECTIONS.length} sections marked complete
        </p>
        <Button onClick={onNext} disabled={!allComplete}>
          Complete Setup
        </Button>
      </div>
    </div>
  );
}
