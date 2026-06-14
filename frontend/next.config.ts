import type { NextConfig } from "next";
import path from "path";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaPlugin } = require("@prisma/nextjs-monorepo-workaround-plugin");

const nextConfig: NextConfig = {
  transpilePackages: [
    "@xenopilot/database",
    "@xenopilot/shared",
    "@xenopilot/ai-engine",
    "@xenopilot/analytics"
  ],
  serverExternalPackages: ["@prisma/client", "prisma"],
  outputFileTracingRoot: path.join(__dirname, ".."),
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./node_modules/.prisma/client/**/*",
      "./node_modules/@prisma/client/**/*"
    ],
    "/*": ["./node_modules/.prisma/client/**/*"]
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }
    return config;
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb"
    }
  }
};

export default nextConfig;
