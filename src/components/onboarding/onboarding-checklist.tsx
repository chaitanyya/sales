"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { IconChevronDown } from "@tabler/icons-react";
import { OnboardingStep, type OnboardingStepData } from "./onboarding-step";
import type { OnboardingStatus } from "@/lib/tauri/types";

type OnboardingChecklistProps = {
  status: OnboardingStatus;
};

const STEPS_CONFIG: Omit<OnboardingStepData, "isCompleted">[] = [
  {
    id: "create-lead",
    title: "Create lead",
    description:
      "Go to Companies and add a company you want to qualify. You can import from CSV or add manually.",
  },
  {
    id: "start-research",
    title: "Start research",
    description: "Click Research on a company details page to run analysis and enrich the lead.",
  },
  {
    id: "score-lead",
    title: "Score lead",
    description:
      "Set up your scoring criteria on the Scoring page, then score leads to prioritize them as hot, warm, or nurture.",
  },
  {
    id: "research-person",
    title: "Research the person",
    description: "Run person-level research to build detailed profiles of key decision makers.",
  },
  {
    id: "conversation-insights",
    title: "Conversation insights",
    description:
      "Generate personalized talking points and conversation starters based on the person's background and interests.",
  },
];

function getFirstIncompleteStepId(status: OnboardingStatus): string | null {
  const completions = [
    { id: "create-lead", completed: status.hasLead },
    { id: "start-research", completed: status.hasResearchedLead },
    { id: "score-lead", completed: status.hasScoredLead },
    { id: "research-person", completed: status.hasResearchedPerson },
    { id: "conversation-insights", completed: status.hasConversationTopics },
  ];
  const firstIncomplete = completions.find((c) => !c.completed);
  return firstIncomplete?.id ?? null;
}

export function OnboardingChecklist({ status }: OnboardingChecklistProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeStepId, setActiveStepId] = useState<string | number | null>(() =>
    getFirstIncompleteStepId(status)
  );

  const steps: OnboardingStepData[] = useMemo(
    () => [
      { ...STEPS_CONFIG[0], isCompleted: status.hasLead },
      { ...STEPS_CONFIG[1], isCompleted: status.hasResearchedLead },
      { ...STEPS_CONFIG[2], isCompleted: status.hasScoredLead },
      { ...STEPS_CONFIG[3], isCompleted: status.hasResearchedPerson },
      { ...STEPS_CONFIG[4], isCompleted: status.hasConversationTopics },
    ],
    [status]
  );

  const completedCount = steps.filter((s) => s.isCompleted).length;
  const allCompleted = completedCount === steps.length;

  // Don't render if all steps are completed
  if (allCompleted) {
    return null;
  }

  return (
    <div className="px-2 py-2 border-t border-white/5">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between w-full px-2 py-1 text-left hover:bg-white/5 rounded transition-colors"
      >
        <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
          Getting Started
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">
            {completedCount}/{steps.length}
          </span>
          <motion.div animate={{ rotate: isCollapsed ? -90 : 0 }} transition={{ duration: 0.2 }}>
            <IconChevronDown className="w-3 h-3 text-muted-foreground" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
              opacity: { duration: 0.2 },
            }}
            style={{ overflow: "hidden" }}
          >
            <div className="mt-1 space-y-px">
              {steps.map((step) => (
                <OnboardingStep
                  key={step.id}
                  step={step}
                  isActive={activeStepId === step.id}
                  onClick={() => setActiveStepId(step.id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
