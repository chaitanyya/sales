import { getPromptByType } from "@/lib/db/queries";
import { PromptEditor } from "./prompt-editor";
import { IconTypography } from "@tabler/icons-react";

export const dynamic = "force-dynamic";

export default async function PromptPage() {
  const [companyPrompt, personPrompt, companyOverviewPrompt, conversationTopicsPrompt] = await Promise.all([
    getPromptByType("company"),
    getPromptByType("person"),
    getPromptByType("company_overview"),
    getPromptByType("conversation_topics"),
  ]);

  return (
    <>
      <header className="h-10 border-b border-white/5 flex items-center px-4 gap-2">
        <IconTypography className="w-4 h-4" />
        <h1 className="text-sm font-medium">Prompt Configuration</h1>
      </header>

      <PromptEditor
        companyPromptContent={companyPrompt?.content || ""}
        personPromptContent={personPrompt?.content || ""}
        companyOverviewContent={companyOverviewPrompt?.content || ""}
        conversationTopicsContent={conversationTopicsPrompt?.content || ""}
      />
    </>
  );
}
