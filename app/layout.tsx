import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { StreamPanelWrapper } from "@/components/stream-panel/stream-panel-wrapper";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Sales Qualification",
    template: "%s | Sales Qual",
  },
  description: "AI-powered lead research and qualification",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* paste this BEFORE any scripts */}
      <script
        crossOrigin="anonymous"
        async
        src="//unpkg.com/react-scan/dist/auto.global.js"
      ></script>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <div className="flex h-screen bg-background bg-terminal-pattern">
          <Sidebar />
          <StreamPanelWrapper>{children}</StreamPanelWrapper>
        </div>
      </body>
    </html>
  );
}
