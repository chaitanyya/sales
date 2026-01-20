"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { IconDeviceFloppy, IconLoader2, IconBuilding, IconUser, IconInfoCircle } from "@tabler/icons-react";

interface PromptEditorProps {
  companyPromptContent: string;
  personPromptContent: string;
  companyOverviewContent: string;
}

export function PromptEditor({ companyPromptContent, personPromptContent, companyOverviewContent }: PromptEditorProps) {
  const [activeTab, setActiveTab] = useState<"company" | "person" | "company_overview">("company_overview");
  const [companyContent, setCompanyContent] = useState(companyPromptContent);
  const [personContent, setPersonContent] = useState(personPromptContent);
  const [overviewContent, setOverviewContent] = useState(companyOverviewContent);
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const currentContent = activeTab === "company" ? companyContent : activeTab === "person" ? personContent : overviewContent;
  const setCurrentContent = activeTab === "company" ? setCompanyContent : activeTab === "person" ? setPersonContent : setOverviewContent;

  const handleSave = () => {
    setSaveStatus("saving");
    startTransition(async () => {
      try {
        const response = await fetch("/api/prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: currentContent,
            type: activeTab,
          }),
        });

        if (response.ok) {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } else {
          setSaveStatus("error");
          setTimeout(() => setSaveStatus("idle"), 3000);
        }
      } catch (error) {
        console.error("Failed to save prompt:", error);
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    });
  };

  const tabs = [
    { id: "company_overview" as const, label: "Company Overview", icon: IconInfoCircle },
    { id: "company" as const, label: "Company", icon: IconBuilding },
    { id: "person" as const, label: "Person", icon: IconUser },
  ];

  return (
    <>
      {/* Tabs */}
      <div className="border-b border-white/5 px-4">
        <div className="flex gap-4">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-1 py-2 text-sm border-b-2 transition-colors -mb-px ${
                  isActive
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <TabIcon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-3xl">
          <p className="text-sm text-muted-foreground mb-2">
            {activeTab === "company_overview"
              ? "Add details about your business so the agent has context on what you are building."
              : `Configure the prompt template used when researching ${activeTab === "company" ? "companies" : "people"}.`}
          </p>

          <div className="space-y-4">
            <textarea
              value={currentContent}
              onChange={(e) => setCurrentContent(e.target.value)}
              placeholder={activeTab === "company_overview"
                ? "Enter details about your business, products, services, target customers, value proposition, etc..."
                : `Enter your ${activeTab} research prompt template...`}
              className="w-full h-96 bg-white/5 border border-white/5 p-3 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />

            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={isPending || saveStatus === "saving"}>
                {isPending || saveStatus === "saving" ? (
                  <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <IconDeviceFloppy className="w-4 h-4 mr-2" />
                )}
                Save {activeTab === "company_overview" ? "Company Overview" : activeTab === "company" ? "Company Prompt" : "Person Prompt"}
              </Button>

              {saveStatus === "saved" && (
                <span className="text-sm text-green-500">Saved successfully!</span>
              )}
              {saveStatus === "error" && (
                <span className="text-sm text-red-500">Failed to save. Please try again.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
