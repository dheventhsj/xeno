import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import crypto from "crypto";
import axios from "axios";
import { CHANNEL_RATES } from "@xenopilot/shared";
import type { Channel } from "@xenopilot/database";
import fs from "fs";
import path from "path";

dotenv.config();

const PORT = parseInt(process.env.PORT ?? "5001", 10);
const HOST = process.env.HOST ?? "0.0.0.0";
const CRM_WEBHOOK_URL = process.env.CRM_WEBHOOK_URL ?? "http://localhost:3000/api/webhooks/receipt";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "dev_secret";
const PROVIDER = process.env.PROVIDER_NAME ?? "xenopilot-sim";

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "channel-service", provider: PROVIDER });
});

type SendBody = {
  communicationId: string;
  campaignId: string;
  customerId: string;
  recipient: { email?: string; phone?: string };
  channel: Channel;
  message: { body: string; subject?: string };
};

app.post("/send", (req, res) => {
  const body = req.body as SendBody;
  const messageId = `${PROVIDER}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  res.json({ ok: true, messageId });

  simulateLifecycle(body, messageId).catch((e) => console.error("sim error", e));
});

function sign(payload: object) {
  return crypto.createHmac("sha256", WEBHOOK_SECRET).update(JSON.stringify(payload)).digest("hex");
}

async function emit(payload: {
  communicationId: string;
  campaignId: string;
  customerId: string;
  eventType: string;
  eventId: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}) {
  const headers = { "x-signature": sign(payload) };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await axios.post(CRM_WEBHOOK_URL, payload, { headers, timeout: 5000 });
      return;
    } catch (e) {
      await delay(200 * (attempt + 1));
    }
  }
  console.error("webhook failed after retries", payload.eventType);
}

const DEVICES = ["iPhone 15 Pro", "iPhone 14", "Samsung S24 Ultra", "Pixel 8 Pro", "MacBook Pro M3", "Windows 11 PC", "iPad Pro"];
const APPS = {
  EMAIL: ["Gmail App", "Apple Mail", "Outlook Mobile", "Chrome Browser"],
  SMS: ["Messages App (iOS)", "Android Messages", "Samsung Messages"],
  WHATSAPP: ["WhatsApp for iOS", "WhatsApp for Android", "WhatsApp Web"],
  RCS: ["Google Messages", "Samsung Messages"]
};

const EMAIL_ERRORS = [
  { errorCode: "SMTP_550", errorText: "5.1.1 User Unknown: Mailbox deactivated", carrier: "Google MX Server" },
  { errorCode: "SMTP_552", errorText: "5.2.2 Mailbox Full: Recipient storage exceeded", carrier: "Outlook SMTP Gateway" },
  { errorCode: "SMTP_554", errorText: "5.7.1 Message Blocked: Rejected by spam filter", carrier: "SpamAssassin Guard" }
];
const PHONE_ERRORS = [
  { errorCode: "SMS_30003", errorText: "Unreachable destination handset (Offline / Out of Coverage)", carrier: "Jio SMS Gateway" },
  { errorCode: "SMS_30005", errorText: "Carrier undelivered: Blocked by carrier spam filter", carrier: "Airtel SMS Gateway" },
  { errorCode: "SMS_30006", errorText: "Landline or non-SMS capable number", carrier: "Vi Network Gateway" }
];

function randItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function simulateLifecycle(input: SendBody, messageId: string) {
  const { communicationId, campaignId, customerId, channel } = input;
  
  // Read simulation settings profile dynamically
  let profile = "standard";
  let speedFactor = 1.0;
  let rates = { ...CHANNEL_RATES[channel] };

  try {
    const paths = [
      path.resolve(process.cwd(), "../../simulation-profile.json"),
      path.resolve(__dirname, "../../../simulation-profile.json")
    ];
    let foundPath = "";
    for (const p of paths) {
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    if (foundPath) {
      const parsed = JSON.parse(fs.readFileSync(foundPath, "utf-8"));
      if (parsed.profile) {
        profile = parsed.profile;
        if (profile === "black-friday") {
          rates = { delivered: 1.0, readOrOpen: 0.95, click: 0.70, convert: 0.40 };
          speedFactor = 0.35; // 3x faster dispatches (safe for SQLite)
        } else if (profile === "outage") {
          rates = { delivered: 0.0, readOrOpen: 0.0, click: 0.0, convert: 0.0 };
          speedFactor = 0.2;
        } else if (profile === "high-churn") {
          rates = { delivered: 0.98, readOrOpen: 0.0, click: 0.0, convert: 0.0 };
          speedFactor = 0.5;
        }
      }
    }
  } catch (e) {
    console.error("Failed to read simulation settings profile", e);
  }

  const now = () => new Date().toISOString();
  const roll = (p: number) => Math.random() < p;
  const adjustDelay = (ms: number) => Math.max(10, Math.round(ms * speedFactor));

  // 1. SENT stage
  await delay(adjustDelay(rand(30, 120)));
  await emit({
    communicationId,
    campaignId,
    customerId,
    eventType: "SENT",
    eventId: `${messageId}_sent`,
    timestamp: now(),
    meta: {
      provider: PROVIDER,
      gateway: "primary-route-ap",
      simulationProfile: profile
    }
  });

  // Random network warning fail/retry
  if (profile !== "black-friday" && roll(0.03)) {
    await delay(adjustDelay(rand(100, 400)));
    await emit({
      communicationId,
      campaignId,
      customerId,
      eventType: "FAILED",
      eventId: `${messageId}_fail`,
      timestamp: now(),
      meta: { 
        reason: "temporary_network_retry",
        carrier: channel === "EMAIL" ? "Google MX" : "Airtel Gateway"
      }
    });
    await delay(adjustDelay(rand(300, 800)));
    if (!roll(rates.delivered)) return;
  }

  // 2. DELIVERED / FAILED stage
  if (!roll(rates.delivered)) {
    const errorDetails = channel === "EMAIL" ? randItem(EMAIL_ERRORS) : randItem(PHONE_ERRORS);
    await emit({
      communicationId,
      campaignId,
      customerId,
      eventType: "FAILED",
      eventId: `${messageId}_fail_final`,
      timestamp: now(),
      meta: {
        reason: "delivery_dropped",
        ...errorDetails
      }
    });
    return;
  }

  await delay(adjustDelay(rand(80, 600)));
  await emit({
    communicationId,
    campaignId,
    customerId,
    eventType: "DELIVERED",
    eventId: `${messageId}_del`,
    timestamp: now(),
    meta: {
      deliveryLatencyMs: rand(150, 850),
      carrierHandshake: "success"
    }
  });

  // 3. OPENED / READ stage
  const readEvent = channel === "EMAIL" ? "OPENED" : "READ";
  const hasOpened = roll(rates.readOrOpen);
  
  if (hasOpened) {
    await delay(adjustDelay(rand(200, 4000)));
    const clientDevice = randItem(DEVICES);
    const clientApp = randItem(APPS[channel]);
    const ipAddr = `192.168.10.${rand(10, 254)}`;
    
    await emit({
      communicationId,
      campaignId,
      customerId,
      eventType: readEvent,
      eventId: `${messageId}_read`,
      timestamp: now(),
      meta: {
        device: clientDevice,
        app: clientApp,
        ip: ipAddr,
        userAgent: `${clientApp} on ${clientDevice}`
      }
    });
  }

  // 4. CLICKED stage
  if (hasOpened && roll(rates.click)) {
    await delay(adjustDelay(rand(500, 5000)));
    const platform = randItem(["iOS", "Android", "macOS", "Windows"]);
    await emit({
      communicationId,
      campaignId,
      customerId,
      eventType: "CLICKED",
      eventId: `${messageId}_click`,
      timestamp: now(),
      meta: {
        referrer: "utm_campaign_xenopilot",
        platform,
        interactionX: rand(10, 300),
        interactionY: rand(100, 800)
      }
    });

    // 5. CONVERTED stage
    if (roll(rates.convert)) {
      await delay(adjustDelay(rand(1000, 8000)));
      await emit({
        communicationId,
        campaignId,
        customerId,
        eventType: "CONVERTED",
        eventId: `${messageId}_conv`,
        timestamp: now(),
        meta: {
          orderAmount: rand(500, 12000),
          itemsCount: rand(1, 4),
          paymentGateway: "Stripe Checkout",
          transactionStatus: "approved"
        }
      });
    }
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

app.listen(PORT, HOST, () => {
  console.log(`Channel service on http://${HOST}:${PORT}`);
});
