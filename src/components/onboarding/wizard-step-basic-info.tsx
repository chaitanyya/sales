"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface WizardStepBasicInfoProps {
  initialData?: {
    companyName: string;
    productName: string;
    website: string;
  };
  existingProfile?: {
    companyName: string;
    productName: string;
    website: string;
  } | null;
  onNext: (data: { companyName: string; productName: string; website: string }) => void;
}

export function WizardStepBasicInfo({ initialData, existingProfile, onNext }: WizardStepBasicInfoProps) {
  const [companyName, setCompanyName] = useState(initialData?.companyName ?? "");
  const [productName, setProductName] = useState(initialData?.productName ?? "");
  const [website, setWebsite] = useState(initialData?.website ?? "");

  const isValid = companyName.trim() && productName.trim() && website.trim();

  const handleNext = () => {
    if (!isValid) {
      toast.error("Please fill in all fields");
      return;
    }

    // Basic URL validation
    const urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(website.trim())) {
      toast.error("Please enter a valid website URL (starting with http:// or https://)");
      return;
    }

    onNext({
      companyName: companyName.trim(),
      productName: productName.trim(),
      website: website.trim(),
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name *</Label>
          <Input
            id="companyName"
            placeholder="Acme Inc"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={!!existingProfile}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="productName">Product Name *</Label>
          <Input
            id="productName"
            placeholder="Your main product or service"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            disabled={!!existingProfile}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website URL *</Label>
          <Input
            id="website"
            type="url"
            placeholder="https://yourcompany.com"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            disabled={!!existingProfile}
          />
          <p className="text-xs text-muted-foreground">
            We'll analyze this website to understand your company better
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleNext} disabled={!isValid}>
          Continue
        </Button>
      </div>
    </div>
  );
}
