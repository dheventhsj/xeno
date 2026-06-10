import "./globals.css";
import type { ReactNode } from "react";
import { Nav } from "../components/Nav";

export const metadata = {
  title: "Xeno AI Marketing Strategist",
  description: "AI-native Mini CRM for marketing engagement"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto max-w-7xl p-6">
          <Nav />
          {children}
        </div>
      </body>
    </html>
  );
}
