/**
 * In-process channel simulator for Vercel / local demo (no external channel-service).
 */
import { CHANNEL_RATES } from "@xenopilot/shared";
import type { Channel, EventType } from "@xenopilot/database";
import { applyReceipt } from "./campaigns";
import type { DispatchJob } from "./queue";

function roll(p: number) {
  return Math.random() < p;
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function useInternalChannelSimulator(): boolean {
  if (process.env.SIMULATE_CHANNEL === "1") return true;
  if (process.env.VERCEL === "1") return true;
  const url = process.env.CHANNEL_SERVICE_URL ?? "";
  return !url || url.includes("localhost");
}

export async function simulateSendFast(job: DispatchJob) {
  const channel = job.channel as Channel;
  const rates = CHANNEL_RATES[channel] ?? CHANNEL_RATES.WHATSAPP;
  const messageId = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = () => new Date().toISOString();
  const base = {
    communicationId: job.communicationId,
    campaignId: job.campaignId,
    customerId: job.customerId
  };

  const emit = (eventType: EventType, eventId: string, meta?: Record<string, unknown>) =>
    applyReceipt({ ...base, eventType, eventId, timestamp: now(), meta });

  await emit("SENT", `${messageId}_sent`, { provider: "pulse-crm-sim" });

  if (!roll(rates.delivered)) {
    await emit("FAILED", `${messageId}_fail`, { reason: "delivery_dropped" });
    return;
  }

  await emit("DELIVERED", `${messageId}_del`, { deliveryLatencyMs: rand(80, 400) });

  const readType: EventType = channel === "EMAIL" ? "OPENED" : "READ";
  const opened = roll(rates.readOrOpen);
  if (opened) {
    await emit(readType, `${messageId}_read`, { device: "Mobile", app: channel });
  }

  if (opened && roll(rates.click)) {
    await emit("CLICKED", `${messageId}_click`, { platform: "web" });
    if (roll(rates.convert)) {
      await emit("CONVERTED", `${messageId}_conv`, { orderAmount: rand(800, 8000) });
    }
  }
}
