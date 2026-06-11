import { NextResponse } from "next/server";
import crypto from "crypto";
import { applyReceipt } from "@/lib/campaigns";
import type { EventType } from "@xenopilot/database";

export const runtime = "nodejs";

const SECRET = process.env.WEBHOOK_SECRET ?? "dev_secret";

function verify(body: string, signature: string | null) {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", SECRET).update(body).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-signature");
  if (!verify(raw, sig)) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  const payload = JSON.parse(raw) as {
    communicationId: string;
    campaignId: string;
    customerId: string;
    eventType: EventType;
    eventId: string;
    timestamp: string;
    meta?: Record<string, unknown>;
  };

  await applyReceipt(payload);
  return NextResponse.json({ ok: true });
}
