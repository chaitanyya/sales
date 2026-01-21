"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  compact?: boolean;
  className?: string;
}

export function MarkdownRenderer({ content, compact, className }: MarkdownRendererProps) {
  return (
    <article className={cn("max-w-none", compact ? "prose-terminal-compact" : "prose-terminal", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </article>
  );
}
