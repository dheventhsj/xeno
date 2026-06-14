import { NextResponse } from "next/server";
import { createQuickCampaign } from "@/lib/campaigns";
import type { Channel } from "@xenopilot/database";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json()) as { goal?: string; channel?: Channel };
  const goal = body.goal?.trim();
  if (!goal) return NextResponse.json({ error: "goal required" }, { status: 400 });

  const channel = body.channel ?? "WHATSAPP";
  const campaign = await createQuickCampaign(goal, channel);
  return NextResponse.json(campaign);
}
