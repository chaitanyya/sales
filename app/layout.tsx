import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { StreamPanelWrapper } from "@/components/stream-panel/stream-panel-wrapper";
import { Toaster } from "@/components/ui/sonner";
import { CompanyOverviewDialog } from "@/components/onboarding/company-overview-dialog";
import { getCompanyOverview } from "@/app/actions/company-overview";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const companyOverview = await getCompanyOverview();

  return (
    <html lang="en">
      <script
        crossOrigin="anonymous"
        async
        src="//unpkg.com/react-scan/dist/auto.global.js"
      ></script>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <CompanyOverviewDialog hasCompanyOverview={!!companyOverview} />
        <div className="flex h-screen bg-background bg-terminal-pattern">
          <Sidebar />
          <StreamPanelWrapper>{children}</StreamPanelWrapper>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
