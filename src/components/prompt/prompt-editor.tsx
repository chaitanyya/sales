import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  IconDeviceFloppy,
  IconLoader2,
  IconBuilding,
  IconUser,
  IconInfoCircle,
  IconMessageCircle,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { savePromptByType } from "@/lib/tauri/commands";
import type { PromptType } from "@/lib/tauri/types";

interface PromptEditorProps {
  companyPromptContent: string;
  personPromptContent: string;
  companyOverviewContent: string;
  conversationTopicsContent: string;
}

export function PromptEditor({
  companyPromptContent,
  personPromptContent,
  companyOverviewContent,
  conversationTopicsContent,
}: PromptEditorProps) {
  const [activeTab, setActiveTab] = useState<PromptType>("company_overview");
  const [companyContent, setCompanyContent] = useState(companyPromptContent);
  const [personContent, setPersonContent] = useState(personPromptContent);
  const [overviewContent, setOverviewContent] = useState(companyOverviewContent);
  const [conversationContent, setConversationContent] = useState(conversationTopicsContent);
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);

  const getCurrentContent = () => {
    switch (activeTab) {
      case "company":
        return companyContent;
      case "person":
        return personContent;
      case "company_overview":
        return overviewContent;
      case "conversation_topics":
        return conversationContent;
    }
  };

  const setCurrentContent = (value: string) => {
    switch (activeTab) {
      case "company":
        setCompanyContent(value);
        break;
      case "person":
        setPersonContent(value);
        break;
      case "company_overview":
        setOverviewContent(value);
        break;
      case "conversation_topics":
        setConversationContent(value);
        break;
    }
  };

  const currentContent = getCurrentContent();

  const handleSave = () => {
    setIsSaving(true);
    startTransition(async () => {
      try {
        await savePromptByType(activeTab, currentContent);
        toast.success("Prompt saved");
      } catch (error) {
        toast.error("Failed to save prompt", {
          description: error instanceof Error ? error.message : "An unexpected error occurred",
        });
      } finally {
        setIsSaving(false);
      }
    });
  };

  const tabs = [
    { id: "company_overview" as const, label: "Company Overview", icon: IconInfoCircle },
    { id: "company" as const, label: "Company", icon: IconBuilding },
    { id: "person" as const, label: "Person", icon: IconUser },
    { id: "conversation_topics" as const, label: "Conversation", icon: IconMessageCircle },
  ];

  return (
    <>
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

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-3xl">
          <div className="text-sm text-muted-foreground mb-4 space-y-1">
            {activeTab === "company_overview" && (
              <>
                <p>
                  Describe your company and ideal customer profile. This context is injected into{" "}
                  <strong>all</strong> research prompts.
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Tip: Include what you do, who you sell to, problems you solve, and key
                  differentiators.
                </p>
              </>
            )}
            {activeTab === "company" && (
              <>
                <p>
                  Instructions for comapny research. The target company&apos;s details are{" "}
                  <strong>automatically provided</strong>.
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Auto-injected: Company name, website, industry, size, LinkedIn URL, location.
                  Focus on what to discover.
                </p>
              </>
            )}
            {activeTab === "person" && (
              <>
                <p>
                  Instructions for researching people. The person&apos;s details AND their company
                  info are <strong>automatically provided</strong>.
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Auto-injected: Name, title, email, LinkedIn, company details. Focus on what to
                  research about them.
                </p>
              </>
            )}
            {activeTab === "conversation_topics" && (
              <>
                <p>
                  Instructions for generating conversation prep. The person&apos;s profile and
                  company info are <strong>automatically provided</strong>.
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Auto-injected: Person details, company details. Focus on what call prep to
                  generate.
                </p>
              </>
            )}
          </div>

          <div className="space-y-4">
            <textarea
              value={currentContent}
              onChange={(e) => setCurrentContent(e.target.value)}
              placeholder={
                activeTab === "company_overview"
                  ? "Enter details about your business, products, services, target customers, value proposition, etc..."
                  : activeTab === "conversation_topics"
                    ? "Enter your conversation topics prompt template..."
                    : `Enter your ${activeTab} research prompt template...`
              }
              className="w-full h-96 bg-white/5 border border-white/5 p-3 text-xs font-mono resize-none rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
            />

            <div className="flex items-center gap-3">
              <Button onClick={handleSave} disabled={isPending || isSaving}>
                {isPending || isSaving ? (
                  <IconLoader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <IconDeviceFloppy className="w-4 h-4" />
                )}
                {isPending || isSaving
                  ? "Saving..."
                  : `Save ${
                      activeTab === "company_overview"
                        ? "Company Overview"
                        : activeTab === "company"
                          ? "Company Prompt"
                          : activeTab === "person"
                            ? "Person Prompt"
                            : "Conversation Prompt"
                    }`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
