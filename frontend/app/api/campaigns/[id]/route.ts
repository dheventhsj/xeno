import { NextResponse } from "next/server";
import { getCampaignAnalytics } from "@xenopilot/analytics";
import { deleteCampaign } from "@/lib/campaigns";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const result = await getCampaignAnalytics(id);
    if (!result.campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteCampaign(id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Delete failed";
    const status = msg === "Campaign not found" ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
