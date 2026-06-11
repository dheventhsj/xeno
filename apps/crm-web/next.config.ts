import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@xenopilot/database",
    "@xenopilot/shared",
    "@xenopilot/ai-engine",
    "@xenopilot/analytics"
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb"
    }
  }
};

export default nextConfig;
