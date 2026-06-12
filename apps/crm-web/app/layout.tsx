import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Sidebar } from "@/components/sidebar";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { XenoCopilot } from "@/components/XenoCopilot";

export const metadata: Metadata = {
  title: "Pulse CRM — AI Marketing OS",
  description: "AI-native shopper engagement platform. Describe business goals in natural language — the AI orchestrates segmentation, channel selection, campaign generation, execution, and insight generation.",
  keywords: ["AI", "marketing", "CRM", "campaign", "engagement", "shopper"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <AnimatedBackground />
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 overflow-auto">
              <div className="mx-auto max-w-[1400px] px-6 py-6 lg:px-8">
                {children}
              </div>
            </main>
          </div>
          <XenoCopilot />
        </Providers>
      </body>
    </html>
  );
}
