"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <article className="prose prose-sm prose-invert max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-xl prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3 prose-p:text-muted-foreground prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-strong:font-semibold prose-code:text-primary prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-[''] prose-code:after:content-[''] prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10 prose-blockquote:border-l-primary prose-blockquote:bg-white/[0.02] prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic prose-li:text-muted-foreground prose-li:marker:text-muted-foreground/50 prose-table:text-sm prose-th:text-left prose-th:font-medium prose-th:text-foreground prose-th:border-b prose-th:border-white/10 prose-th:pb-2 prose-td:border-b prose-td:border-white/5 prose-td:py-2 prose-hr:border-white/10">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </article>
  );
}
