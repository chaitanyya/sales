"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveCompanyOverview } from "@/app/actions/company-overview";
import { IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";

interface CompanyOverviewDialogProps {
  hasCompanyOverview: boolean;
}

export function CompanyOverviewDialog({ hasCompanyOverview }: CompanyOverviewDialogProps) {
  const [open, setOpen] = useState(!hasCompanyOverview);
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!content.trim()) {
      toast.error("Please describe your company");
      return;
    }

    startTransition(async () => {
      try {
        await saveCompanyOverview(content);
        setOpen(false);
      } catch (e) {
        toast.error("Failed to save", {
          description: e instanceof Error ? e.message : "An unexpected error occurred",
        });
      }
    });
  };

  if (hasCompanyOverview) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>Tell us about your company</DialogTitle>
          <DialogDescription>
            Before you begin, describe what your company does. This helps tailor research and
            qualification to your business.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          placeholder="We sell enterprise SaaS solutions that help companies automate their workflows..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-32"
          disabled={isPending}
        />

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isPending || !content.trim()}>
            {isPending && <IconLoader2 className="animate-spin" />}
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
