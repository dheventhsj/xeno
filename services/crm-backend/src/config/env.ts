import dotenv from "dotenv";
dotenv.config();

function required(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env: ${name}`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  // Bind to 0.0.0.0 by default so the service is reachable over the LAN.
  host: process.env.HOST ?? "0.0.0.0",
  port: parseInt(process.env.PORT ?? "4000", 10),
  // Empty string => use the in-memory MongoDB fallback (no install required).
  mongoUri: process.env.MONGO_URI ?? "",
  // Comma-separated list of allowed browser origins. "*" reflects any origin (handy on LAN).
  clientOrigin: required("CLIENT_ORIGIN", "*"),
  providerBaseUrl: required("PROVIDER_BASE_URL", "http://localhost:5001"),
  webhookSecret: required("WEBHOOK_SECRET", "dev_secret"),
  openAiApiKey: process.env.OPENAI_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY
};

export function corsOrigin() {
  if (!env.clientOrigin || env.clientOrigin === "*") return true; // reflect request origin
  return env.clientOrigin.split(",").map((s) => s.trim());
}
