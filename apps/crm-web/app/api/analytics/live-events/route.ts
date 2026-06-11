import { NextResponse } from "next/server";
import { prisma } from "@xenopilot/database";

export const runtime = "nodejs";

export async function GET() {
  try {
    const events = await prisma.communicationEvent.findMany({
      orderBy: { timestamp: "desc" },
      take: 25,
      include: {
        communication: {
          include: {
            customer: {
              select: {
                name: true,
                email: true
              }
            },
            campaign: {
              select: {
                goal: true
              }
            }
          }
        }
      }
    });

    const formatted = events.map((ev) => ({
      id: ev.id,
      communicationId: ev.communicationId,
      eventType: ev.eventType,
      eventId: ev.eventId,
      timestamp: ev.timestamp.toISOString(),
      meta: ev.meta ? JSON.parse(ev.meta) : null,
      customerName: ev.communication?.customer?.name ?? "Unknown Shopper",
      customerEmail: ev.communication?.customer?.email ?? "",
      channel: ev.communication?.channel ?? "UNKNOWN",
      campaignGoal: ev.communication?.campaign?.goal ?? "System Event"
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
