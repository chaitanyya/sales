"use client";

import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { StreamPanelWrapper } from "@/components/stream-panel/stream-panel-wrapper";
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>Qual2 - Lead Research</title>
        <meta name="description" content="AI-powered lead research and qualification" />
      </head>
      <body className="font-sans antialiased">
        <div className="flex h-screen bg-background bg-terminal-pattern">
          <Sidebar />
          <StreamPanelWrapper>{children}</StreamPanelWrapper>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
