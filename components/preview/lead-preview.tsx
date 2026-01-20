"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkdownPreview } from "./markdown-preview";
import { IconUser, IconBuilding } from "@tabler/icons-react";

interface LeadPreviewProps {
  contactResearch: string | null;
  companyResearch: string | null;
}

export function LeadPreview({ contactResearch, companyResearch }: LeadPreviewProps) {
  return (
    <Tabs defaultValue="contact" className="h-full flex flex-col">
      <TabsList variant="line">
        <TabsTrigger value="contact" className="flex items-center gap-2">
          <IconUser className="h-4 w-4" />
          Contact
        </TabsTrigger>
        <TabsTrigger value="company" className="flex items-center gap-2">
          <IconBuilding className="h-4 w-4" />
          Company
        </TabsTrigger>
      </TabsList>
      <TabsContent value="contact" className="flex-1 mt-4">
        <MarkdownPreview content={contactResearch || ""} className="h-full" />
      </TabsContent>
      <TabsContent value="company" className="flex-1 mt-4">
        <MarkdownPreview content={companyResearch || ""} className="h-full" />
      </TabsContent>
    </Tabs>
  );
}
