"use client";

import { Button } from "@/components/ui/button";
import { IconCheck, IconConfetti } from "@tabler/icons-react";

interface WizardStepCompleteProps {
  companyName: string;
  onComplete: () => void;
}

export function WizardStepComplete({ companyName, onComplete }: WizardStepCompleteProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
        <IconCheck className="w-8 h-8 text-green-600" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold">You're all set!</h2>
        <p className="text-muted-foreground">
          Your company profile for <strong>{companyName}</strong> is ready.
        </p>
      </div>

      <div className="max-w-sm space-y-2 text-left text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg">
        <p className="flex items-center gap-2">
          <IconCheck className="w-4 h-4 text-green-600" />
          <span>We'll use this profile to tailor lead research and scoring</span>
        </p>
        <p className="flex items-center gap-2">
          <IconCheck className="w-4 h-4 text-green-600" />
          <span>You can always edit it later in Settings</span>
        </p>
        <p className="flex items-center gap-2">
          <IconCheck className="w-4 h-4 text-green-600" />
          <span>Re-run analysis anytime as your company evolves</span>
        </p>
      </div>

      <Button onClick={onComplete} size="lg">
        Start Using Liidi
      </Button>
    </div>
  );
}
