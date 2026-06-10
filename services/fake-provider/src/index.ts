import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import axios from "axios";
import crypto from "crypto";

dotenv.config();

const PORT = parseInt(process.env.PORT ?? "5001", 10);
const HOST = process.env.HOST ?? "0.0.0.0";
const CRM_WEBHOOK_URL = process.env.CRM_WEBHOOK_URL ?? "http://localhost:4000/api/webhooks/provider";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "dev_secret";
const PROVIDER_NAME = process.env.PROVIDER_NAME ?? "alpha-sim";

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "fake-provider", provider: PROVIDER_NAME });
});

type SendPayload = {
  campaignId: string;
  customerId: string;
  channel: "whatsapp" | "sms" | "email" | "rcs";
  content: { subject?: string; body: string; variant?: string };
};

// Simulate delivery lifecycle with random delays/outcomes
app.post("/send", async (req, res) => {
  const payload = req.body as SendPayload;
  const messageId = `${PROVIDER_NAME}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  res.json({ ok: true, messageId });

  // Queue async simulation
  runLifecycleSimulation({ ...payload, messageId }).catch((e) =>
    console.error("Simulation error:", e)
  );
});

app.post("/callback", (_req, res) => {
  // Not used by CRM; provided for completeness
  res.json({ ok: true });
});

function sign(body: any): string {
  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
  return hmac.update(JSON.stringify(body)).digest("hex");
}

async function emit(event: {
  campaignId: string;
  customerId: string;
  messageId: string;
  eventType: "sent" | "delivered" | "failed" | "opened" | "clicked" | "purchased";
  timestamp: string;
  meta?: Record<string, any>;
}) {
  const headers = { "x-signature": sign(event) };
  await axios.post(CRM_WEBHOOK_URL, event, { headers }).catch((e) => {
    console.error("Webhook POST failed:", e?.response?.data ?? e.message);
  });
}

async function runLifecycleSimulation(input: SendPayload & { messageId: string }) {
  const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const now = () => new Date().toISOString();
  const { campaignId, customerId, messageId } = input;

  // sent
  await delay(rand(50, 300));
  await emit({ campaignId, customerId, messageId, eventType: "sent", timestamp: now() });

  // early fail chance
  const failEarly = Math.random() < 0.05;
  if (failEarly) {
    await delay(rand(100, 600));
    await emit({
      campaignId,
      customerId,
      messageId,
      eventType: "failed",
      timestamp: now(),
      meta: { reason: "network_error" }
    });
    // retry once
    await delay(rand(300, 1200));
    await emit({ campaignId, customerId, messageId, eventType: "sent", timestamp: now(), meta: { retry: 1 } });
  }

  // delivered
  await delay(rand(100, 1500));
  await emit({ campaignId, customerId, messageId, eventType: "delivered", timestamp: now() });

  // opened (probabilistic)
  const opened = Math.random() < 0.6;
  if (opened) {
    await delay(rand(200, 5000));
    await emit({ campaignId, customerId, messageId, eventType: "opened", timestamp: now() });
  }

  // clicked (conditionally)
  const clicked = opened && Math.random() < 0.35;
  if (clicked) {
    await delay(rand(500, 6000));
    await emit({ campaignId, customerId, messageId, eventType: "clicked", timestamp: now() });
  }

  // purchased (rare)
  const purchased = clicked && Math.random() < 0.18;
  if (purchased) {
    await delay(rand(1000, 10000));
    await emit({
      campaignId,
      customerId,
      messageId,
      eventType: "purchased",
      timestamp: now(),
      meta: { orderAmount: rand(500, 10000) }
    });
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

app.listen(PORT, HOST, () => {
  console.log(`Fake provider listening on http://${HOST}:${PORT}`);
});

