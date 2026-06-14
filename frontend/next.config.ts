import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@xenopilot/database",
    "@xenopilot/shared",
    "@xenopilot/ai-engine",
    "@xenopilot/analytics"
  ],
  serverExternalPackages: ["@prisma/client", "prisma"],
  ...(process.env.VERCEL
    ? {}
    : { outputFileTracingRoot: path.join(__dirname, "../../") }),
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb"
    }
  }
};

export default nextConfig;
