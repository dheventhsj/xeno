import { NextResponse } from "next/server";
import { generateWarRoomReport, suggestHealing, simulateChannelBattle } from "@xenopilot/ai-engine";
import { prisma } from "@xenopilot/database";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id }, include: { segment: true } });
    if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [warRoom, healing] = await Promise.all([
      generateWarRoomReport(id).catch(() => null),
      suggestHealing(id).catch(() => [])
    ]);

    const battle = simulateChannelBattle(
      campaign.totalRecipients || 100,
      2500,
      1.0,
      campaign.recommendedChannel as any
    );

    let explainability: string[] = [];
    if (campaign.segment?.aiReasoning) {
      try {
        explainability = JSON.parse(campaign.segment.aiReasoning);
      } catch {
        explainability = [campaign.segment.aiReasoning];
      }
    }

    return NextResponse.json({ warRoom, healing, battle, explainability });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
