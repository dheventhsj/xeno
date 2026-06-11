import { NextResponse } from "next/server";
import { prisma } from "@xenopilot/database";
import { createCampaignFromDraft } from "@/lib/campaigns";
import type { CampaignDraft } from "@xenopilot/shared";

export const runtime = "nodejs";

export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { segment: true, analytics: true }
  });
  return NextResponse.json(campaigns);
}

export async function POST(req: Request) {
  const body = (await req.json()) as { draft?: CampaignDraft };
  if (!body.draft) return NextResponse.json({ error: "draft required" }, { status: 400 });
  const campaign = await createCampaignFromDraft(body.draft);
  return NextResponse.json(campaign);
}
