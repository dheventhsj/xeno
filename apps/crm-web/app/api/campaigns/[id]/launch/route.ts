import { NextResponse } from "next/server";
import { launchCampaign } from "@/lib/campaigns";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const result = await launchCampaign(id);
    return NextResponse.json({ ok: true, campaignId: id, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
