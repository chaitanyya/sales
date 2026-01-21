"use client";

import { motion, AnimatePresence } from "motion/react";
import { IconCircleCheck, IconCircle, IconCircleDot } from "@tabler/icons-react";

export type OnboardingStepData = {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
};

type OnboardingStepProps = {
  step: OnboardingStepData;
  isActive: boolean;
  onClick: () => void;
};

export function OnboardingStep({ step, isActive, onClick }: OnboardingStepProps) {
  return (
    <div
      className={`relative ${isActive ? "border-l-2 border-primary -ml-0.5" : ""}`}
    >
      <button
        onClick={onClick}
        className="flex items-center gap-2 w-full px-2 py-1 text-left rounded hover:bg-white/5 transition-colors"
      >
        {step.isCompleted ? (
          <motion.div
            key="completed"
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 0.25 }}
          >
            <IconCircleCheck className="w-4 h-4 text-primary" />
          </motion.div>
        ) : isActive ? (
          <IconCircleDot className="w-4 h-4 text-primary" />
        ) : (
          <IconCircle className="w-4 h-4 text-muted-foreground/50" />
        )}
        <span
          className={`text-[13px] ${
            step.isCompleted
              ? "text-muted-foreground line-through"
              : isActive
                ? "text-foreground"
                : "text-muted-foreground"
          }`}
        >
          {step.title}
        </span>
      </button>

      <AnimatePresence>
        {isActive && !step.isCompleted && (
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
            <div className="pl-8 pr-2 pb-2">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
