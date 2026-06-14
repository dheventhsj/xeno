import { NextResponse } from "next/server";
import { prisma } from "@xenopilot/database";
import { applyReceipt } from "@/lib/campaigns";
import type { EventType } from "@xenopilot/database";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = await params;
  try {
    const { eventType, amount } = await req.json();
    if (!eventType) {
      return NextResponse.json({ error: "eventType is required" }, { status: 400 });
    }

    // Find a communication record under this campaign to target
    const comm = await prisma.communication.findFirst({
      where: { campaignId }
    });

    if (!comm) {
      return NextResponse.json({ error: "No communications found for this campaign. Make sure the campaign is launched." }, { status: 400 });
    }

    const eventId = `sandbox_trigger_${eventType.toLowerCase()}_${Date.now()}`;
    const timestamp = new Date().toISOString();
    const meta = eventType === "CONVERTED" 
      ? { orderAmount: amount ?? Math.floor(Math.random() * 8000) + 500, paymentGateway: "Sandbox Override" }
      : eventType === "FAILED"
      ? { reason: "sandbox_manual_fail", errorCode: "SMTP_550", errorText: "Sandbox Manual Override Bounce" }
      : { clientOverride: true };

    await applyReceipt({
      communicationId: comm.id,
      campaignId,
      customerId: comm.customerId,
      eventType: eventType as EventType,
      eventId,
      timestamp,
      meta
    });

    return NextResponse.json({ ok: true, eventId, customerId: comm.customerId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
