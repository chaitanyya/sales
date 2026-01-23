import { useEffect, useState, useCallback } from "react";
import { PromptEditor } from "@/components/prompt/prompt-editor";
import { IconTypography, IconLoader2 } from "@tabler/icons-react";
import { getPromptByType } from "@/lib/tauri/commands";
import type { PromptType } from "@/lib/tauri/types";

export default function PromptPage() {
  const [companyPrompt, setCompanyPrompt] = useState("");
  const [personPrompt, setPersonPrompt] = useState("");
  const [companyOverview, setCompanyOverview] = useState("");
  const [conversationTopics, setConversationTopics] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchPrompts = useCallback(async () => {
    try {
      setLoading(true);
      const types: PromptType[] = ["company", "person", "company_overview", "conversation_topics"];
      const results = await Promise.all(types.map((type) => getPromptByType(type)));

      setCompanyPrompt(results[0]?.content || "");
      setPersonPrompt(results[1]?.content || "");
      setCompanyOverview(results[2]?.content || "");
      setConversationTopics(results[3]?.content || "");
    } catch (error) {
      console.error("Failed to fetch prompts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  if (loading) {
    return (
      <>
        <header className="h-10 border-b border-white/5 flex items-center px-4 gap-2">
          <IconTypography className="w-4 h-4" />
          <h1 className="text-sm font-medium">Prompt Configuration</h1>
        </header>
        <div className="flex items-center justify-center h-64">
          <IconLoader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      <header className="h-10 border-b border-white/5 flex items-center px-4 gap-2">
        <IconTypography className="w-4 h-4" />
        <h1 className="text-sm font-medium">Prompt Configuration</h1>
      </header>

      <PromptEditor
        companyPromptContent={companyPrompt}
        personPromptContent={personPrompt}
        companyOverviewContent={companyOverview}
        conversationTopicsContent={conversationTopics}
      />
    </>
  );
}
